const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
} = require('../actions/types.js');

const {serial} = require('../config.js');

const initialState = {
  entries: Array(serial.coms.length).fill('0'),
  averages: Array(serial.coms.length).fill('0'),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
  case SERIAL_ENTRY:
    const {index, entry} = action.payload;
    const newEntries = Obect.assign({}, state.entries);
    newEntries[index] = entry;
    return {
      ...state,
      entries: newEntries,
    }
  case SERIAL_AVERAGE:
    const {index, average} = action.payload;
    const newAverages = Object.assign({}, state.averages);
    newAverages[index] = average;
    return {
      ...state,
      averages: newAverages,
    }
  case SERIAL_RESET:
    if (action.payload){
      const index = action.payload;
      const newEntries = Obect.assign({}, state.entries);
      newEntries[index] = initialState.entries[index];
      return {
        ...state,
        entries: newEntries,
      }
    } else {
      return {
        ...state,
        entries: initialState.entries,
      }
    }
  }
};