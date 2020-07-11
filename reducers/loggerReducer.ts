import { Action } from "../actions/types";
import config from "../config";
const { table, serial, logger, selfLearning } = config;

export interface IEntry {
  name: string;
  id: string;
  date: string;
  coms: (string | number)[];
  cells: (string | number)[];
  TU: number | "";
  TA: number | "";
  list: "UN" | "SL" | "";
  full: boolean;
}

export interface ILoggerState {
  legend: string[];
  accessors: string[];
  digits: number[];
  visible: boolean[];
  entries: IEntry[];
}

type ComConfig = {
  name: string;
  digits: number;
};

type CellConfig = {
  name: string;
  digits: number;
  showInLog: boolean;
};

const initialState = {
  legend: [
    "Device",
    "LogID",
    "date",
    ...serial.coms.map((element: ComConfig) => element.name),
    ...table.cells.map((element: CellConfig) => element.name),
    "TU",
    "TA",
    "List"
  ],
  accessors: [
    "name",
    "id",
    "date",
    ...serial.coms.map((_: ComConfig, i: number) => `coms[${i}]`),
    ...table.cells.map((_: CellConfig, i: number) => `cells[${i}]`),
    "TU",
    "TA",
    "list"
  ],
  digits: [
    -1,
    -1,
    -1,
    ...serial.coms.map((element: ComConfig) => element.digits),
    ...table.cells.map((element: CellConfig) => element.digits),
    0,
    0,
    0,
  ],
  visible: [
    false,
    false,
    true,
    ...serial.coms.map((element: ComConfig) => element.name !== ""),
    ...table.cells.map((element: CellConfig) => element.showInLog),
    true,
    true,
    selfLearning.enabled.endsWith("ind"),
  ],
  entries: [],
};

export default function (
  state: ILoggerState = initialState,
  action: Action
): ILoggerState {
  switch (action.type) {
    case "LOG_ENTRY": {
      const entry = action.payload;
      const newEntries = Array.from(state.entries);
      newEntries.push(entry);
      return {
        ...state,
        entries: newEntries,
      };
    }
    case "LOG_RESET": {
      return initialState;
    }
    case "LOG_OVERWRITE": {
      const entry = action.payload;

      const newEntries = Array.from(state.entries);

      if (newEntries.length) newEntries[newEntries.length - 1] = entry;
      else newEntries.push(entry);

      return {
        ...state,
        entries: newEntries,
      };
    }
    case "LOG_UNIQUE_OVERWRITE": {
      const index = action.payload;

      const newEntries = Array.from(state.entries);
      newEntries[index].TU = "";

      return {
        ...state,
        entries: newEntries,
      };
    }
    case "LOG_LIST_OVERWRITE": {
      const list = action.payload;

      const newEntries = Array.from(state.entries);
      if (newEntries.length) newEntries[newEntries.length - 1].list = list;

      return {
        ...state,
        entries: newEntries
      }

    }
    case "LOG_ACTIVITY_OVERWRITE": {
      const { index, newValue } = action.payload;

      const newEntries = Array.from(state.entries);
      newEntries[index].TA = newValue;

      return {
        ...state,
        entries: newEntries,
      };
    }
    case "LOG_RECOVER": {
      return action.payload;
    }
    case "SL_SUCCESS": {
      if (!action.payload.filterLog) return state;

      const { comIndex, calibration, tolerance } = action.payload;
      const newEntries = state.entries.filter((entry, index, entries) => {
        const testValue = Number(entry.coms[comIndex]);

        if (
          testValue >= calibration * (1 - tolerance) &&
          testValue <= calibration * (1 + tolerance)
        ) {
          return true;
        } else if (logger.unique !== "off" && entry.TU) {
          const uniqueIndex = Number(logger.unique[3]);
          const uniqueValue = entry.coms[uniqueIndex];

          for (let i = 0; i < entries.length; i++) {
            const subTestValue = Number(entries[i].coms[comIndex]);
            if (
              entries[i].coms[uniqueIndex] === uniqueValue &&
              testValue >= calibration * (1 - tolerance) &&
              testValue <= calibration * (1 + tolerance) &&
              !entries[i].TU
            ) {
              entries[i].TU = entry.TU;
            }
          }

          return false;
        } else {
          return false;
        }
      });

      return {
        ...state,
        entries: newEntries,
      };
    }
    default:
      return state;
  }
}
