var XLSX = require('xlsx');

function sheetToArray(sheet){
  var result = [];
  var row;
  var rowNum;
  var colNum;
  var range = XLSX.utils.decode_range(sheet['!ref']);
  for(rowNum = range.s.r; rowNum <= range.e.r; rowNum++){
    row = [];
    for(colNum=range.s.c; colNum<=range.e.c; colNum++){
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

function assert(condition, message){
  if (!condition){
    message = message || "Assertion failed";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message; // Fallback
  }
}

function timeString(){
  let date = new Date();
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().replace(/T/, '_').replace(/:/g,'-').replace(/\..+/, '') + '.csv';
}

module.exports={sheetToArray, assert, timeString};