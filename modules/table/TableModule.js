const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const {
  HANDLE_TABLE,
  RESET_LAST_ACTION,
} = require('../../actions/types');
const Cell = require('./Cell');

const excelPath = path.join(__dirname, '../..', 'data', 'data.xls');

function sheetToArray(sheet){
  const result = [];
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for(let rowNum = range.s.r; rowNum <= range.e.r; rowNum++){
    const row = [];
    for(let colNum = range.s.c; colNum <= range.e.c; colNum++){
      var nextCell = sheet[
        XLSX.utils.encode_cell({r: rowNum, c: colNum})
      ];
      if( typeof nextCell === 'undefined' ){
        row.push(void 0);
      } else row.push(nextCell.v);
    }
    result.push(row);
  }
  return result;
};

function TableModule(config, store) {
  const {trigger, useFile, waitForOther, searchColumn, cells} = config;

  let excelSheet;
  if (fs.existsSync(excelPath)){
    let excelFile = XLSX.readFile(excelPath);
    let sheetName = excelFile.Workbook.Sheets[0].name;
    excelSheet = sheetToArray(excelFile.Sheets[sheetName]);
  }

  store.listen((lastAction)=>{
    const state = store.getState();

    switch (lastAction.type){
      case HANDLE_TABLE:{
        if (useFile && excelSheet){
          const foundRow = excelSheet.find((row) =>{
            return (row[searchColumn] === state.serial.coms[trigger].entry);
          });
          if (foundRow) {
            store.dispatch({
              type: EXCEL_FOUND_ROW, 
              payload: {
                found: true,
                foundRow,
              }
            });
          } else {
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
    }
  });

  const tempCells = cells.map((cell, index) => new Cell(index, {...cell, waitForOther}, store));
  store.dispatch({
    type: HANDLE_TABLE,
  });
 
  return {
    cells: tempCells,
  };
}

module.exports = TableModule;