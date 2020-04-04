import { Action } from "../actions/types";
import config from "../config";
const { table } = config;

type Cell = { entry: string; color: string; manual: boolean; numeric: boolean };

export interface ITableState {
  cells: Cell[];
  foundRow: string[];
}

const initialState = {
  cells: table.cells.map((cell: { formula: string; numeric: boolean }) => ({
    entry: "",
    color: "",
    manual: cell.formula === "#" || cell.formula.startsWith("#M"),
    numeric: cell.numeric,
  })),
  foundRow: Array<string>(26).fill(""),
};

export default function (state: ITableState = initialState, action: Action) {
  switch (action.type) {
    case "TABLE_ENTRY": {
      const { index, entry } = action.payload;
      const newCells = JSON.parse(JSON.stringify(state.cells));
      newCells[index].entry = entry;
      return {
        ...state,
        cells: newCells,
      };
    }
    case "TABLE_COLOR": {
      const { index, color } = action.payload;
      const newCells = JSON.parse(JSON.stringify(state.cells));
      newCells[index].color = color;
      return {
        ...state,
        cells: newCells,
      };
    }
    case "TABLE_RESET_CELL": {
      const index = action.payload;
      const newCells = Array.from(state.cells);
      newCells[index] = Object.assign({}, initialState.cells[index]);
      return {
        ...state,
        cells: newCells,
      };
    }
    case "EXCEL_FOUND_ROW": {
      const { found, foundRow } = action.payload;
      if (found) {
        return {
          ...state,
          foundRow,
        };
      } else {
        return {
          ...state,
          foundRow: initialState.foundRow,
        };
      }
    }
    default:
      return state;
  }
}
