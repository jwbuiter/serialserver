const XLSX = require('xlsx');
const schedule = require('node-schedule');
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
  const {resetValue, resetMode, writeToFile, logID} = config;
  const time = resetValue.split(':');
  let fileName;

  function resetLog(){
    if (fileName)
      store.dispatch({type: LOG_RESET, payload: fileName});
    fileName = logID + '_' + dateFormat(new Date(),'yyyy-mm-dd_HH-MM-ss') +'.csv';
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
        newRow = newRow.concat(state.serial.coms.map(com=>com.entry));
        newRow = newRow.concat(state.table.cells.map(cell=>cell.entry));
        
        store.dispatch({
          type: LOG_ENTRY,
          payload: newRow,
        });
      }
      case SL_SUCCESS:{
        if(!writeToFile) break;
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