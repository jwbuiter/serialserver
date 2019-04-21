function getExcelDate(){
  const date = new Date();

  const seconds = date.getTime()/1000 - 60 * date.getTimezoneOffset();
    
  return Math.floor(seconds / 86400 + 25569);
}

module.exports = { getExcelDate }