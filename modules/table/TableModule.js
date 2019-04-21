const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const dateFormat = require('dateformat');

const {
  HANDLE_TABLE,
  TABLE_RESET,
  EXCEL_FOUND_ROW,
  LOG_RESET,
  SL_INDIVIDUAL_UPGRADE
} = require('../../actions/types');
const Cell = require('./Cell');

const excelPath = path.join(__dirname, '../..', 'data', 'data.xls');

function sheetToArray(sheet) {
  const result = [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
    const row = [];
    for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
      var nextCell = sheet[
        XLSX.utils.encode_cell({
          r: rowNum,
          c: colNum
        })
      ];
      if (typeof nextCell === 'undefined') {
        row.push(void 0);
      } else row.push(nextCell.v);
    }
    result.push(row);
  }
  return result;
};

function saveExcel(array) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(array);
  XLSX.utils.book_append_sheet(wb, ws, 'data');
  XLSX.writeFile(wb, excelPath);
}

function TableModule(config, store) {
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
    let sheetName = excelFile.Workbook.Sheets[0].name;
    excelSheet = sheetToArray(excelFile.Sheets[sheetName]);
  }

  store.listen((lastAction) => {
    const state = store.getState();

    switch (lastAction.type) {
      case HANDLE_TABLE:
        {
          if (useFile && excelSheet) {
            const searchEntry = state.serial.coms[trigger].entry;
            if (!searchEntry) break;

            const foundRow = excelSheet.find((row) => {
              return (row[searchColumn] === searchEntry);
            });

            if (foundRow) {
              console.log('found')
              store.dispatch({
                type: EXCEL_FOUND_ROW,
                payload: {
                  found: true,
                  foundRow,
                }
              });
            } else {
              console.log('not found')
              store.dispatch({
                type: EXCEL_FOUND_ROW,
                payload: {
                  found: false,
                  foundRow,
                }
              });
            }
          }
          break;
        }
      case SL_INDIVIDUAL_UPGRADE:
        {
          if (useFile && excelSheet) {
            const {
              key,
              calibration,
            } = lastAction.payload;

            const foundRow = excelSheet.find((row) => {
              return (row[searchColumn] === key);
            });

            if (foundRow) return;

            const newRow = [];

            newRow[searchColumn] = key;
            newRow[individualColumn] = calibration;
            newRow[dateColumn] = dateFormat(new Date(), "dd-mm-yyyy");

            excelSheet.push(newRow);
            console.log(excelSheet)
            saveExcel(excelSheet);
          }
        }
    }
  });

  const tempCells = cells.map((cell, index) => new Cell(index, {
    ...cell,
    waitForOther
  }, store));
  store.dispatch({
    type: HANDLE_TABLE,
  });

  return {
    cells: tempCells,
  };
}

module.exports = TableModule;