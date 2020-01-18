import { Action } from "../../actions/types";

const { selfLearning } = require("../../configs/current");

import globalReducer, {
  IGlobalSelfLearningState,
  initialStateGlobal
} from "./globalReducer";
import individualReducer, {
  IIndividualSelfLearningState,
  initialStateIndividual
} from "./individualReducer";

export interface ISelfLearningState {
  global: IGlobalSelfLearningState;
  individual: IIndividualSelfLearningState;
  calibration: number;
  tolerance: number;
  comIndex: number;
  type: "none" | "individual" | "global";
  success: number;
  teaching: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

function initialState(): ISelfLearningState {
  const { selfLearning } = require("../../configs/current");
  return {
    global: initialStateGlobal,
    individual: initialStateIndividual,
    calibration: selfLearning.startCalibration,
    tolerance: selfLearning.tolerance / 100,
    comIndex: Number(selfLearning.enabled[3]),
    type: "none",
    success: 1,
    teaching: false,
    startTime: null,
    endTime: null
  };
}

export default function(
  state: ISelfLearningState = initialState(),
  action: Action
): ISelfLearningState {
  const newState = {
    ...state,
    global: globalReducer(state.global, action),
    individual: individualReducer(state.individual, action)
  };

  switch (action.type) {
    case "SL_TEACH": {
      const teaching = action.payload;
      return {
        ...state,
        teaching
      };
    }
    case "SL_RESET_GLOBAL": {
      return {
        ...initialState(),
        type: "global",
        tolerance:
          (selfLearning.tolerance * (1 + selfLearning.startTolerance / 100)) /
          100,
        success: 0,
        startTime: new Date(),
        endTime: null
      };
    }
    case "SL_RESET_INDIVIDUAL": {
      return {
        ...initialState(),
        type: "individual",
        success: 0,
        startTime: new Date(),
        endTime: null
      };
    }
    case "SL_START_INDIVIDUAL": {
      return {
        ...state,
        type: "individual",
        success: 0,
        startTime: new Date(),
        endTime: null
      };
    }
    case "SL_SUCCESS": {
      const { success, calibration, matchedTolerance } = action.payload;
      return {
        ...newState,
        success,
        calibration,
        tolerance: selfLearning.tolerance / 100,
        endTime: new Date()
      };
    }
    default:
      return newState;
  }
}
