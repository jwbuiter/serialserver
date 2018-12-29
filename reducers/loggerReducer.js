const {
  LOG_ENTRY,
  LOG_RESET,
  LOG_UNIQUE_OVERWRITE,
  SL_SUCCESS,
} = require('../actions/types');

const {table, serial, logger} = require('../configs/current');
const {name} = require('../config.static');

const initialState = {
  legend: ['Device', 'LogID', 'date', ...serial.coms.map(element=>element.name), ...table.cells.map(element=>element.name), 'TU'],
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
      newEntries[index][state.legend.length-1] = '';
      return {
        ...state,
        entries: newEntries,
      }
    }
    case SL_SUCCESS:{
      const {comIndex, calibration, tolerance} = action.payload;
      const newEntries = state.entries.filter((entry, index, array) => {
        const testValue = Number(entry[comIndex+3]);

        if ((testValue >= calibration* (1 - tolerance)) && (testValue <= calibration * (1 + tolerance))){
          return true
        } else if (logger.unique!=='off' && entry[entry.length-1]) {
          const uniqueIndex = Number(logger.unique[3]) + 3;
          const uniqueValue = entry[uniqueIndex];

          for (let i = 0; i < array.length; i++){
            const subTestValue = Number(array[i][comIndex+3]);
            if (array[i][uniqueIndex]===uniqueValue && 
              (testValue >= calibration * (1 - tolerance)) && 
              (testValue <= calibration * (1 + tolerance)) &&
              !array[i][entry.length-1]){
                array[i][entry.length-1]=entry[entry.length-1];
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