const XLSX = require('xlsx');
const scheduler = require('node-schedule');
const dateFormat = require('dateformat');
const path = require('path');

const constants = require('../../config.static');

const {
  LOG_ENTRY,
  LOG_RESET,
  EXECUTE_START,
} = require('../../actions/types')

class LoggerModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);

    this.resetLog()

    const time = this.resetValue.split(':');
    switch(this.resetMode){
    case 'interval':
      setInterval(()=>{
        this.resetLog();
      },(Number(time[0])*60 + Number(time[1]))*60*1000);
      break;
    case 'time':
      schedule.scheduleJob(time[1]+' '+time[0]+' * * *', ()=>{
        resetLog();
      });
      break;
    }

    this.store.subscribe(()=>{
      let state =  this.store.getState();
      const lastAction = state.lastAction;
      switch (lastAction.type){
        case EXECUTE_START:{
          let newRow = [dateFormat(new Date(),'yyyy-mm-dd HH:MM:ss')];
          newRow = newRow.concat(state.serial.entries);
          newRow = newRow.concat(state.table.entries);

          this.store.dispatch({
            type: LOG_ENTRY,
            payload: newRow,
          })

          state = this.store.getState();
          const saveArray = [state.logger.legend].concat(state.logger.entries);

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.aoa_to_sheet(saveArray);
          XLSX.utils.book_append_sheet(wb, ws, 'data');
          XLSX.writeFile(wb, path.join(constants.saveFileLocation, this.fileName));
          break;
        }
      }
    });
  }

  resetLog(){
    this.fileName = dateFormat(new Date(),'yyyy-mm-dd_HH-MM-ss') +'.csv';
    this.store.dispatch({type: LOG_RESET});
  }
}

module.exports = LoggerModule;