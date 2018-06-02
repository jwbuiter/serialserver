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
module.exports={sheetToArray, assert};