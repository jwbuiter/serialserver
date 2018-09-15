const {
  TABLE_ENTRY,
  TABLE_RESET,
  TABLE_RESET_CELL,
  EXCEL_FOUND_ROW,
} = require('../actions/types');

const {table} = require('../configs/current');

const initialState = {
  cells: table.cells.map(cell =>({
    entry: '',
    manual: cell.formula === '#',
  })),
  foundRow: Array(26).fill(''),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case TABLE_ENTRY:{
      const {index, entry} = action.payload;
      const newCells = Array.from(state.cells);
      newCells[index].entry = entry;
      return {
        ...state,
        cells: newCells,
      }
    }
    case TABLE_RESET_CELL:{
      const index = action.payload;
      const newCells = Array.from(state.cells);
      newCells[index] = initialState.cells[index];
      return {
        ...state,
        cells: newCells,
      }
    }
    case EXCEL_FOUND_ROW:{
      const {found, foundRow} = action.payload;
      if (found){
        return {
          ...state,
          foundRow,
        }
      } else {
        return {
          ...state,
          foundRow: initialState.foundRow
        };
      }
    }
    default:
      return state;
  }
};