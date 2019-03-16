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
  const {resetTime, resetInterval, resetMode, writeToFile, logID, unique} = config;

  let fileName;

  function resetLog(){
    if (fileName)
      store.dispatch({type: LOG_RESET, payload: fileName});
    fileName = constants.name + '_' + dateFormat(new Date(),'yyyy-mm-dd_HH-MM-ss') +'.csv';
  }

  resetLog();
  
  switch(resetMode){
    case 'interval':{
      setInterval(()=>{
        resetLog();
      }, resetInterval*60*1000);
      break;
    }
    case 'time':{
      const time = resetTime.split(':');
      schedule.scheduleJob(time[1]+' '+time[0]+' * * *', ()=>{
        resetLog();
      });
      break;
    }
  }

  store.listen((lastAction)=>{
    
    
    switch (lastAction.type){
      case LOG_MAKE_ENTRY:{
        const state =  store.getState();
        store.dispatch({type: STATE_CHANGED});

        const newRow = {
          name: constants.name, 
          id: logID, 
          date: dateFormat(new Date(),'yyyy-mm-dd HH:MM:ss'), 
          coms: state.serial.coms.map(com=>com.numeric?Number(com.entry):com.entry), 
          cells: state.table.cells.map(cell=>cell.numeric?Number(cell.entry):cell.entry),
          TU: ''
        };

        if(unique !== 'off'){
          const uniqueIndex = Number(unique.slice(-1));
          const comValue = state.serial.coms[uniqueIndex].entry;
          let uniqueTimes = 1;

          foundOther = state.logger.entries.reduce((found, entry, index) => {
            if (entry.coms[uniqueIndex] === comValue && entry.TU !== ''){
              uniqueTimes = entry.TU + 1;
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

          newRow.TU = uniqueTimes;
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
        const state = store.getState();
        const saveArray = [state.logger.legend].concat(state.logger.entries.map(entry=>([
          entry.name, 
          entry.name, 
          entry.date, 
          ...entry.coms, 
          ...entry.cells, 
          entry.TU
        ])));

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