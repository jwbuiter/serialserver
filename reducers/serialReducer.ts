import { Action } from "../actions/types";
import config from "../config";
const { serial } = config;

type History = { entry: string; time: Date | null }[];
type Com = {
  time: Date | null;
  entry: string;
  average: string;
  numeric: boolean;
};

export interface ISerialState {
  histories: History[];
  coms: Com[];
}

const initialState: ISerialState = {
  histories: Array.from({ length: serial.coms.length }, () => []),
  coms: Array.from({ length: serial.coms.length }, (_, i) => ({
    time: null,
    entry: "",
    average: "",
    numeric: serial.coms[i].factor !== 0,
  })),
};

export default function (
  state: ISerialState = initialState,
  action: Action
): ISerialState {
  switch (action.type) {
    case "SERIAL_ENTRY": {
      const { index, entry } = action.payload;

      const newHistories: History[] = Array.from(state.histories);
      if (state.coms[index].entry) {
        newHistories[index].push({
          entry: state.coms[index].entry,
          time: state.coms[index].time,
        });

        const historyLength = serial.coms[index].entries;
        newHistories[index] = newHistories[index].slice(-historyLength);
      }

      const newComs: Com[] = Array.from(state.coms);
      newComs[index] = {
        ...newComs[index],
        entry,
        time: new Date(),
      };

      return {
        ...state,
        coms: newComs,
        histories: newHistories,
      };
    }
    case "SERIAL_AVERAGE": {
      const { index, average } = action.payload;
      const newComs: Com[] = Array.from(state.coms);

      newComs[index] = { ...newComs[index], average };

      return {
        ...state,
        coms: newComs,
      };
    }
    case "SERIAL_RESET": {
      if (typeof action.payload !== "undefined") {
        const index = action.payload;

        const newHistories: History[] = Array.from(state.histories);
        if (state.coms[index].entry) {
          newHistories[index].push({
            entry: state.coms[index].entry,
            time: state.coms[index].time,
          });

          const historyLength = serial.coms[index].entries;
          newHistories[index] = newHistories[index].slice(-historyLength);
        }

        const newComs = Array.from(state.coms);
        newComs[index] = initialState.coms[index];

        return {
          ...state,
          coms: newComs,
          histories: newHistories,
        };
      } else {
        const newHistories = Array.from(state.histories).map(
          (history, index) => {
            if (state.coms[index].entry) {
              history.push({
                entry: state.coms[index].entry,
                time: state.coms[index].time,
              });

              const historyLength = serial.coms[index].entries;
              history = history.slice(-historyLength);
            }
            return history;
          }
        );

        return {
          ...state,
          coms: initialState.coms,
          histories: newHistories,
        };
      }
    }
    default:
      return state;
  }
}
