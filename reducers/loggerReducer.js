const {
  LOG_ENTRY,
  LOG_RESET,
  LOG_UNIQUE_OVERWRITE,
  SL_SUCCESS,
} = require('../actions/types');

const {table, serial} = require('../configs/current');
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
      newEntries[index][state.legend.length-1] = 0;
      return {
        ...state,
        entries: newEntries,
      }
    }
    case SL_SUCCESS:{
      const {comIndex, calibration, tolerance} = action.payload;
      const newEntries = state.entries.filter(entry => {
        const testValue = Number(entry[comIndex+3]);
        return ((testValue >= calibration* (1 - tolerance)) && (testValue <= testValue * (1 + tolerance)))
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