import fs from "fs";
import path from "path";
import XLSX from "xlsx";

import { getExcelDate } from "../../utils/dateUtils";
import Cell from "./Cell";
import { StoreType } from "../../store";

const excelPath = path.join(__dirname, "../../..", "data", "data.xls");

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
            c: colNum
          })
        ];
      if (typeof nextCell === "undefined") {
        row.push(void 0);
      } else row.push(nextCell.v);
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
}

function TableModule(config, store: StoreType) {
  const {
    trigger,
    useFile,
    waitForOther,
    searchColumn,
    individualColumn,
    dateColumn,
    exitColumn,
    cells
  } = config;

  let excelSheet;
  if (fs.existsSync(excelPath)) {
    let excelFile = XLSX.readFile(excelPath);
    // @ts-ignore
    let sheetName = excelFile.Workbook.Sheets[0].name;
    excelSheet = sheetToArray(excelFile.Sheets[sheetName]);
  }

  store.listen(lastAction => {
    const state = store.getState();

    switch (lastAction.type) {
      case "HANDLE_TABLE": {
        if (useFile && excelSheet) {
          const searchEntry = state.serial.coms[trigger].entry;
          if (!searchEntry) break;

          const foundRow = excelSheet.find(row => {
            return row[searchColumn] === searchEntry;
          });

          if (foundRow) {
            console.log("found");
            store.dispatch({
              type: "EXCEL_FOUND_ROW",
              payload: {
                found: true,
                foundRow
              }
            });
          } else {
            console.log("not found");
            store.dispatch({
              type: "EXCEL_FOUND_ROW",
              payload: {
                found: false,
                foundRow
              }
            });
          }
        }
        break;
      }
      case "SL_INDIVIDUAL_UPGRADE": {
        if (useFile && excelSheet) {
          const { key, calibration } = lastAction.payload;

          const foundRow = excelSheet.find(row => {
            return row[searchColumn] === key;
          });

          if (foundRow) {
            if (!foundRow[individualColumn])
              foundRow[individualColumn] = calibration;
            if (!foundRow[dateColumn]) foundRow[dateColumn] = getExcelDate();
          } else {
            const newRow = [];

            newRow[searchColumn] = key;
            newRow[individualColumn] = calibration;
            newRow[dateColumn] = getExcelDate();

            excelSheet.push(newRow);
          }

          saveExcel(excelSheet);
        }
        break;
      }
      case "SL_INDIVIDUAL_DELETE_INDIVIDUAL": {
        if (useFile && excelSheet) {
          const { key, message, callback } = lastAction.payload;

          const exitCode = Number(message);

          if (exitCode) {
            store.dispatch({
              type: "SL_INDIVIDUAL_DECREMENT_TOTAL",
              payload: callback
            });
          }

          const foundRow = excelSheet.find(row => {
            return row[searchColumn] === key;
          });

          if (!foundRow) return;

          const foundIndex = excelSheet.findIndex(row => {
            return row[searchColumn] === key;
          });

          excelSheet[foundIndex][exitColumn] = exitCode;

          saveExcel(excelSheet);
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
          waitForOther
        },
        store
      )
  );
  store.dispatch({
    type: "HANDLE_TABLE"
  });

  return {
    cells: tempCells
  };
}

export default TableModule;
