const {
  TABLE_ENTRY,
  TABLE_RESET,
  EXCEL_FOUND_ROW,
} = require('../actions/types');

const {table} = require('../configs/current');

const initialState = {
  entries: Array(table.cells.length),
  foundRow: [],
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case TABLE_ENTRY:{
      const {index, entry} = action.payload;
      const newEntries = Object.assign({},state.entries);
      newEntries[index] = entry;
      return {
        ...state,
        entries: newEntries,
      }
    }
    case TABLE_RESET:{
      if (action.payload){
        const index = action.payload;
        const newEntries = Object.assign({},state.entries);
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
    default:
      return state;
  }
};