const {
  TABLE_ENTRY,
  TABLE_RESET,
} = require('../actions/types.js');

const {table} = require('../config.js');

const initialState = {
  entries: Array(table.cells.length)
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
  case TABLE_ENTRY:
    const {index, entry} = action.payload;
    const newEntries = Obect.assign({},state.entries);
    newEntries[index] = entry;
    return {
      ...state,
      entries: newEntries,
    }
  case TABLE_RESET:
    if (action.payload){
      const index = action.payload;
      const newEntries = Obect.assign({},state.entries);
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