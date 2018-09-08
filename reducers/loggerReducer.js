const {
  LOG_ENTRY,
  LOG_RESET,
  SL_SUCCESS,
} = require('../actions/types');

const {table, serial} = require('../configs/current');

const initialState = {
  legend: ['date'].concat(serial.coms.map(element=>element.name)).concat(table.cells.map(element=>element.name)),
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
    case SL_SUCCESS:{
      const {comIndex, calibration, tolerance} = action.payload;
      const newEntries = state.entries.filter(entry => {
        const testValue = Number(entry[comIndex+1]);
        return ((testValue > calibration* (1 - tolerance)) && (testValue < testValue * (1 + tolerance)))
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