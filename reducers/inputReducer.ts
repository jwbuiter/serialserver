import { Action } from "../actions/types";
import config from "../config";
const { input } = config;

export interface IInputPort {
  state: boolean;
  physical: boolean;
  isForced: boolean;
  previousForced: boolean;
  forcedState: boolean;
  isFollowing: boolean;
  blocking: boolean;
}

export interface IInputState {
  ports: IInputPort[];
  executing: boolean;
}

const initialState: IInputState = {
  ports: Array.from({ length: input.ports.length }, (u) => ({
    state: false,
    physical: false,
    isForced: false,
    previousForced: false,
    forcedState: false,
    isFollowing: false,
    blocking: false,
  })),
  executing: false,
};

function calculateState(port: IInputPort) {
  if (port.isForced) return port.forcedState;

  if (port.isFollowing) return true;

  return port.physical;
}

export default function (
  state: IInputState = initialState,
  action: Action
): IInputState {
  switch (action.type) {
    case "INPUT_PHYSICAL_CHANGED": {
      const { index, physical } = action.payload;
      const newPorts: IInputPort[] = Array.from(state.ports);
      newPorts[index].physical = physical;
      return {
        ...state,
        ports: newPorts,
      };
    }
    case "INPUT_FORCED_CHANGED": {
      const { index, previousForced, isForced, forcedState } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].isForced = isForced;
      newPorts[index].previousForced = previousForced;
      newPorts[index].forcedState = forcedState;
      return {
        ...state,
        ports: newPorts,
      };
    }
    case "INPUT_FOLLOWING_CHANGED": {
      const { index, isFollowing } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].isFollowing = isFollowing;
      return {
        ...state,
        ports: newPorts,
      };
    }
    case "INPUT_BLOCKING_CHANGED": {
      const { index, blocking } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].blocking = blocking;
      return {
        ...state,
        ports: newPorts,
      };
    }
    case "INPUT_CALCULATE_STATE": {
      const { index } = action.payload;
      const newPorts = Array.from(state.ports);
      newPorts[index].state = calculateState(newPorts[index]);
      return {
        ...state,
        ports: newPorts,
      };
    }
    case "EXECUTE_START": {
      return {
        ...state,
        executing: true,
      };
    }
    case "EXECUTE_STOP": {
      return {
        ...state,
        executing: false,
      };
    }
    default:
      return state;
  }
}
