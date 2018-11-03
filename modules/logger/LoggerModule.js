const XLSX = require('xlsx');
const schedule = require('node-schedule');
const dateFormat = require('dateformat');
const path = require('path');

const constants = require('../../config.static');

const {
  STATE_CHANGED,
  LOG_ENTRY,
  LOG_MAKE_ENTRY,
  LOG_RESET,
  LOG_UNIQUE_OVERWRITE,
  LOG_SAVE,
} = require('../../actions/types')

function LoggerModule(config, store) {
  const {resetValue, resetMode, writeToFile, logID, unique} = config;
  const time = resetValue.split(':');
  let fileName;

  function resetLog(){
    if (fileName)
      store.dispatch({type: LOG_RESET, payload: fileName});
    fileName = constants.name + '_' + dateFormat(new Date(),'yyyy-mm-dd_HH-MM-ss') +'.csv';
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
      case LOG_MAKE_ENTRY:{
        store.dispatch({type: STATE_CHANGED});
        let newRow = [constants.name, logID, dateFormat(new Date(),'yyyy-mm-dd HH:MM:ss')];
        newRow = newRow.concat(state.serial.coms.map(com=>com.entry));
        newRow = newRow.concat(state.table.cells.map(cell=>cell.entry));

        if(unique === 'off'){
          newRow = newRow.concat(['']);
        } else {
          const uniqueIndex = Number(unique.slice(-1));
          const comValue = state.serial.coms[uniqueIndex].entry;
          let uniqueTimes = 1;

          foundOther = state.logger.entries.reduce((found, entry, index) => {
            if (entry[3 + uniqueIndex] === comValue && entry[entry.length-1] !== 0){
              uniqueTimes = entry[entry.length-1] + 1;
              return index;
            }
            return found;
          }, -1)

          if(foundOther !== -1){
            store.dispatch({
              type: LOG_UNIQUE_OVERWRITE,
              payload: foundOther,
            })
          }
          newRow = newRow.concat([uniqueTimes]);
        }
        
        store.dispatch({
          type: LOG_ENTRY,
          payload: newRow,
        });
        store.dispatch({
          type: LOG_SAVE,
          payload: newRow,
        });
        break;
      }
      case LOG_SAVE:{
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