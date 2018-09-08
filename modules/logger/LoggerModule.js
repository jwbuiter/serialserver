const XLSX = require('xlsx');
const scheduler = require('node-schedule');
const dateFormat = require('dateformat');
const path = require('path');

const constants = require('../../config.static');

const {
  LOG_ENTRY,
  LOG_RESET,
  EXECUTE_START,
  SL_SUCCESS,
} = require('../../actions/types')

function LoggerModule(config, store) {
  const {resetValue, resetMode, writeToFile} = config;
  const time = resetValue.split(':');
  let fileName;

  function resetLog(){
    fileName = dateFormat(new Date(),'yyyy-mm-dd_HH-MM-ss') +'.csv';
    store.dispatch({type: LOG_RESET});
  }

  resetLog();
  
  switch(resetMode){
    case 'interval':
      setInterval(()=>{
        resetLog();
      },(Number(time[0])*60 + Number(time[1]))*60*1000);
      break;
    case 'time':
      schedule.scheduleJob(time[1]+' '+time[0]+' * * *', ()=>{
        resetLog();
      });
      break;
  }

  store.listen((lastAction)=>{
    let state =  store.getState();
    
    switch (lastAction.type){
      case EXECUTE_START:{
        let newRow = [dateFormat(new Date(),'yyyy-mm-dd HH:MM:ss')];
        newRow = newRow.concat(state.serial.entries);
        newRow = newRow.concat(state.table.entries);
        
        store.dispatch({
          type: LOG_ENTRY,
          payload: newRow,
        });
      }
      case SL_SUCCESS:{
        state = store.getState();
        const saveArray = [state.logger.legend].concat(state.logger.entries);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(saveArray);
        XLSX.utils.book_append_sheet(wb, ws, 'data');
        XLSX.writeFile(wb, path.join(constants.saveLogLocation, fileName));
        break;
      }
    }
  });

  return {};
}

module.exports = LoggerModule;