import { Action } from "../actions/types";

const { output } = require("../configs/current");

interface IPort {
  state: boolean;
  result: boolean;
  isForced: boolean;
  previousForced: boolean;
  forcedState: boolean;
  executing: boolean;
}

export interface IOutputState {
  ports: IPort[];
}

const initialState: IOutputState = {
  ports: Array.from({ length: output.ports.length }, u => ({
    state: false,
    result: false,
    isForced: false,
    previousForced: false,
    forcedState: false,
    executing: false
  }))
};

function calculateState(port: IPort, index: number) {
  if (port.isForced) return port.forcedState;

  if (output.ports[index].execute) return port.executing;

  return port.result;
}

export default function(state: IOutputState = initialState, action: Action) {
  switch (action.type) {
    case "OUTPUT_RESULT_CHANGED": {
      const { index, result } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].result = result ? true : false;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts
      };
    }
    case "OUTPUT_FORCED_CHANGED": {
      const { index, isForced, previousForced, forcedState } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].isForced = isForced;
      newPorts[index].previousForced = previousForced;
      newPorts[index].forcedState = forcedState;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts
      };
    }
    case "OUTPUT_EXECUTING_CHANGED": {
      const { index, executing } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].executing = executing;
      newPorts[index].state = calculateState(newPorts[index], index);
      return {
        ...state,
        ports: newPorts
      };
    }
    default:
      return state;
  }
}
