const {
  LOG_ENTRY,
  LOG_RESET,
  LOG_UNIQUE_OVERWRITE,
  LOG_RECOVER,
  SL_SUCCESS,
} = require('../actions/types');

const {table, serial, logger} = require('../configs/current');
const {name} = require('../config.static');

const initialState = {
  legend: ['Device', 'LogID', 'date', ...serial.coms.map(element=>element.name), ...table.cells.map(element=>element.name), 'TU'],
  accessors: ['name', 'id', 'date', ...serial.coms.map((_,i)=>`coms[${i}]`), ...table.cells.map((_,i)=>`cells[${i}]`), 'TU'],
  digits: [-1, -1, -1, ...serial.coms.map(element=>element.digits), ...table.cells.map(element=>element.digits), 0],
  entries: [],
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case LOG_ENTRY:{
      const entry = action.payload;
      const newEntries =  Array.from(state.entries);
      newEntries.push(entry);
      return {
        ...state,
        entries: newEntries,
      }
    }
    case LOG_RESET:{
      return initialState;
    }
    case LOG_UNIQUE_OVERWRITE:{
      const index = action.payload;
      const newEntries =  Array.from(state.entries);
      newEntries[index].TU = '';
      return {
        ...state,
        entries: newEntries,
      }
    }
    case LOG_RECOVER: {
      return action.payload;
    }
    case SL_SUCCESS:{
      const {comIndex, calibration, tolerance} = action.payload;
      const newEntries = state.entries.filter((entry, index, entries) => {
        const testValue = Number(entry.coms[comIndex]);

        if ((testValue >= calibration* (1 - tolerance)) && (testValue <= calibration * (1 + tolerance))){
          return true
        } else if (logger.unique!=='off' && entry.TU) {
          const uniqueIndex = Number(logger.unique[3]);
          const uniqueValue = entry.coms[uniqueIndex];

          for (let i = 0; i < entries.length; i++){
            const subTestValue = Number(entries[i].coms[comIndex]);
            if (entries[i].coms[uniqueIndex]===uniqueValue && 
              (testValue >= calibration * (1 - tolerance)) && 
              (testValue <= calibration * (1 + tolerance)) &&
              !entries[i].TU){
                entries[i].TU = entry.TU;
              }
          }

          return false;
        } else {
          return false
        }
      });
      
      return {
        ...state,
        entries: newEntries,
      }
    }
    default:
      return state;
  }
};