const {
  LOG_ENTRY,
  LOG_RESET,
} = require('../actions/types');

const {table, serial} = require('../configs/current');

const initialState = {
  legend: ['date'].concat(serial.coms.map(element=>element.name)).concat(table.cells.map(element=>element.name)),
  entries: [],
  numEntries: 0,
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case LOG_ENTRY:{
      const entry = action.payload;
      const newEntries =  Obect.assign({}, state.entries);
      newEntries[state.numEntries + 1] = entry;
      return {
        ...state,
        entries: newEntries,
        numEntries: state.numEntries + 1,
      }
    }
    case LOG_RESET:{
      return initialState;
    }
    default:
      return state;
  }
};