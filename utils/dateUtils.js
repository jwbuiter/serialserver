function getExcelDateTime(){
  const date = new Date();

  const seconds = date.getTime()/1000 - 60 * date.getTimezoneOffset();
    
  return seconds / 86400 + 25569;
}

function getExcelDate(){
  return Math.floor(getExcelDateTime());
}

module.exports = { getExcelDate, getExcelDateTime }