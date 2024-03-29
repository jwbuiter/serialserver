import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import dateFormat from "dateformat";

import { getExcelDate } from "../../utils/dateUtils";
import Cell from "./Cell";
import { IStore } from "../../store";
import constants from "../../constants";
import config, { ITableConfig } from "../../config";

function TableModule(
  {
    trigger,
    useFile,
    fileExtension,
    waitForOther,
    searchColumn,
    currentCalibrationColumn,
    startingCalibrationColumn,
    dateColumn,
    exitColumn,
    cells,
  }: ITableConfig,
  store: IStore
) {
  const excelFormat = path.join(constants.baseDirectory, "data", "data.");
  const excelPath = excelFormat + fileExtension;
  const tempPath = path.join(
    constants.baseDirectory,
    "data",
    "temp." + fileExtension
  );

  function sheetToArray(sheet: XLSX.WorkSheet) {
    const result: any[][] = [];
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
      const row = [];
      for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        var nextCell =
          sheet[
            XLSX.utils.encode_cell({
              r: rowNum,
              c: colNum,
            })
          ];
        if (typeof nextCell === "undefined") {
          row.push(void 0);
        } else {
          let value = nextCell.v;
          if (colNum == searchColumn) value = String(value);
          row.push(value);
        }
      }
      result.push(row);
    }
    return result;
  }

  function saveExcel(array: any[][]) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(array);
    XLSX.utils.book_append_sheet(wb, ws, "data");
    XLSX.writeFile(wb, excelPath);

    let fileName;

    if (constants.saveExcelDateStamp) {
      const fileStats = fs.statSync(excelPath);
      const modifyDate = new Date(fileStats.mtimeMs);
      fileName = `${constants.name}_${config.logger.logID}_${dateFormat(
        modifyDate,
        "yyyy-mm-dd"
      )}.${fileExtension}`;
    } else {
      fileName = `${constants.name}_${config.logger.logID}.${fileExtension}`;
    }
    XLSX.writeFile(wb, path.join(constants.saveLogLocation, fileName));
  }

  function loadSelfLearningFromExcel() {
    const currentTeaching = store.getState().selfLearning.teaching;
    if (!currentTeaching)
      store.dispatch({
        type: "SL_TEACH",
        payload: true,
      });

    const currentEntries =
      store.getState().selfLearning.individual.individualEntries;
    for (let row of excelSheet.slice(1)) {
      const key = row[searchColumn];
      const calibration = row[currentCalibrationColumn];
      if (!key || !calibration) continue;
      if (
        key in currentEntries &&
        currentEntries[key].calibration == calibration
      )
        continue;

      store.dispatch({
        type: "SL_ENTRY",
        payload: {
          key,
          entry: calibration,
        },
      });
    }

    if (!currentTeaching)
      store.dispatch({
        type: "SL_TEACH",
        payload: false,
      });
  }

  let excelSheet: any[][];

  const existingPath = [
    excelPath,
    excelFormat + "xls",
    excelFormat + "xlsx",
  ].find((p) => fs.existsSync(p));
  if (existingPath != undefined) {
    try {
      let excelFile = XLSX.readFile(existingPath);
      // @ts-ignore
      let sheetName = excelFile.Workbook.Sheets[0].name;
      excelSheet = sheetToArray(excelFile.Sheets[sheetName]);

      loadSelfLearningFromExcel();
      saveExcel(excelSheet);

      if (existingPath != excelPath) {
        fs.unlinkSync(existingPath);
      }
    } catch (e) {
      console.log("Invalid Excel file, deleting...");
      fs.unlinkSync(existingPath);
      excelSheet = [];
    }
  }

  function findRow(key: any): any[] | undefined {
    return excelSheet.find((row) => {
      return row[searchColumn] === key;
    });
  }

  store.listen((lastAction) => {
    const state = store.getState();

    switch (lastAction.type) {
      case "HANDLE_TABLE": {
        if (!useFile || !excelSheet) break;
        const searchEntry = state.serial.coms[trigger].entry;
        if (!searchEntry) break;

        const foundRow = findRow(searchEntry);

        if (foundRow) {
          console.log("found");
          store.dispatch({
            type: "EXCEL_FOUND_ROW",
            payload: {
              found: true,
              foundRow,
            },
          });
        } else {
          console.log("not found");
          store.dispatch({
            type: "EXCEL_FOUND_ROW",
            payload: {
              found: false,
              foundRow,
            },
          });
        }

        break;
      }
      case "EXCEL_UPDATE": {
        if (!excelSheet) break;

        let updateSheet: any[][];

        if (!fs.existsSync(tempPath)) break;
        let excelFile = XLSX.readFile(tempPath);
        // @ts-ignore
        let sheetName = excelFile.Workbook.Sheets[0].name;
        updateSheet = sheetToArray(excelFile.Sheets[sheetName]);
        fs.unlinkSync(tempPath);

        for (let updateRow of updateSheet.slice(1)) {
          let existingRow = findRow(updateRow[searchColumn]);

          if (!existingRow) {
            excelSheet.push(updateRow);
            continue;
          }

          for (let i = 0; i < updateRow.length; i++) {
            if (i == currentCalibrationColumn && existingRow[i]) continue; //preserve calibration unless there is none
            if (updateRow[i]) {
              existingRow[i] = updateRow[i];
            }
          }
        }
        saveExcel(excelSheet);
        loadSelfLearningFromExcel();
        break;
      }
      case "SL_INDIVIDUAL_UPGRADE": {
        if (!useFile || !excelSheet) break;

        const { key, calibration } = lastAction.payload;

        let keyRow = findRow(key);
        if (keyRow) {
          if (!keyRow[startingCalibrationColumn])
            keyRow[startingCalibrationColumn] = calibration;
          if (!keyRow[dateColumn]) keyRow[dateColumn] = getExcelDate();
        } else {
          keyRow = [];

          keyRow[searchColumn] = key;
          keyRow[startingCalibrationColumn] = calibration;
          keyRow[dateColumn] = getExcelDate();

          excelSheet.push(keyRow);
        }
        keyRow[currentCalibrationColumn] = calibration;
        saveExcel(excelSheet);

        break;
      }
      case "SL_RESET_INDIVIDUAL":
      case "SL_INDIVIDUAL_DELETE_INDIVIDUAL": {
        if (!useFile || !excelSheet) break;

        let deletedKey = undefined;
        if (lastAction.type == "SL_INDIVIDUAL_DELETE_INDIVIDUAL") {
          const { key, message, callback } = lastAction.payload;
          deletedKey = key;

          const exitCode = Number(message);
          if (exitCode && constants.individualSLDecrementTotal) {
            store.dispatch({
              type: "SL_INDIVIDUAL_DECREMENT_TOTAL",
              payload: callback,
            });
          }

          const foundIndex = excelSheet.findIndex((row) => {
            return row[searchColumn] === key;
          });
          if (foundIndex !== -1) {
            if (constants.individualSLRemoveExcel && exitCode)
              excelSheet = excelSheet.filter((_, index) => index != foundIndex);
            else excelSheet[foundIndex][exitColumn] = exitCode;
          }
        }

        for (let row of excelSheet) {
          if (deletedKey && row[searchColumn] !== deletedKey) continue;

          row[currentCalibrationColumn] = "";
        }

        saveExcel(excelSheet);

        break;
      }
      case "SL_ENTRY": {
        if (!useFile || !excelSheet) break;

        const { key } = lastAction.payload;
        const entries =
          store.getState().selfLearning.individual.individualEntries;

        if (!key || !(key in entries)) break;

        const foundIndex = excelSheet.findIndex((row) => {
          return row[searchColumn] === key;
        });
        if (foundIndex == -1) break;

        excelSheet[foundIndex][currentCalibrationColumn] =
          entries[key].calibration;

        saveExcel(excelSheet);

        break;
      }
      case "SL_INDIVIDUAL_DOWNGRADE": {
        if (!useFile || !excelSheet) break;

        const { key } = lastAction.payload;

        if (constants.individualSLRemoveExcel)
          excelSheet = excelSheet.filter((row) => row[searchColumn] !== key);
        else {
          const foundIndex = excelSheet.findIndex((row) => {
            return row[searchColumn] === key;
          });
          if (foundIndex == -1) break;
          excelSheet[foundIndex][currentCalibrationColumn] = "";
        }

        saveExcel(excelSheet);

        break;
      }
      case "SL_INDIVIDUAL_INCREMENT": {
        if (
          !useFile ||
          !excelSheet ||
          config.selfLearning.individualCycleLimit <= 0
        )
          break;

        for (const row of excelSheet) {
          let rowDate = Number(
            row[config.selfLearning.individualCycleLimitDateColumn]
          );
          if (rowDate == 0 || Number.isNaN(rowDate))
            rowDate = Number(row[dateColumn]);

          if (rowDate == 0 || Number.isNaN(rowDate)) continue;

          if (
            getExcelDate() - rowDate >
            config.selfLearning.individualCycleLimit
          ) {
            const key = row[searchColumn];
            store.dispatch({
              type: "SL_INDIVIDUAL_DOWNGRADE",
              payload: {
                key,
              },
            });
            excelSheet = excelSheet.filter((row) => row[searchColumn] !== key);
            saveExcel(excelSheet);
          }
        }

        break;
      }
    }
  });

  const tempCells = cells.map(
    (cell, index: number) =>
      new Cell(
        index,
        {
          ...cell,
          waitForOther,
        },
        store
      )
  );
  store.dispatch({
    type: "HANDLE_TABLE",
  });

  return {
    cells: tempCells,
  };
}

export default TableModule;
