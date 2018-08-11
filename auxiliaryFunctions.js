const XLSX = require('xlsx');
const Client = require('ftp');
const fs = require('fs');

const constants = require('./config.static');

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

function ftpUpload(addressFolder, userPassword, fileName, response){
  const host = addressFolder.split('/')[0];
  const folder = addressFolder.split('/')[1] || '';
  const user = userPassword.split(':')[0];
  const password = userPassword.split(':')[1];
  const localPath = constants.saveFileLocation.replace(/\/+$/g, '') + '/';

  let c = new Client();
  c.on('ready', function() {
    c.mkdir(folder, true, ()=>{
      c.put(localPath + fileName, folder + '/' + fileName, function(err) {
        c.end();
        response(false);
      });
    });
  });
  c.on('error', (err)=>{
    response(err);
  })

  // connect to localhost:21 as anonymous
  if (!(user && password)){
    response({message: 'No username and password set'});
    return;
  }
  c.connect({host, user, password});
}

module.exports={sheetToArray, assert, timeString, ftpUpload};