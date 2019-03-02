const {
  TABLE_ENTRY,
  TABLE_COLOR,
  TABLE_RESET,
  TABLE_RESET_CELL,
  EXCEL_FOUND_ROW,
} = require('../actions/types');

const {table} = require('../configs/current');

const initialState = {
  cells: table.cells.map(cell =>({
    entry: '',
    color: '',
    manual: cell.formula === '#' || cell.formula.startsWith('#M'),
  })),
  foundRow: Array(26).fill(''),
};

module.exports = function(state = initialState, action) {
  switch(action.type) {
    case TABLE_ENTRY:{
      const {index, entry} = action.payload;
      const newCells = JSON.parse(JSON.stringify(state.cells));
      newCells[index].entry = entry;
      return {
        ...state,
        cells: newCells,
      }
    }
    case TABLE_COLOR:{
      const {index, color} = action.payload;
      const newCells = JSON.parse(JSON.stringify(state.cells));
      newCells[index].color = color;
      return {
        ...state,
        cells: newCells
      }
    }
    case TABLE_RESET_CELL:{
      const index = action.payload;
      const newCells = Array.from(state.cells);
      newCells[index] = Object.assign({}, initialState.cells[index]);
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