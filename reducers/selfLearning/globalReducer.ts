import { Action } from "../../actions/types";

export interface IGlobalSelfLearningState {
  entries: number[];
  matchedTolerance: number;
}

export const initialStateGlobal: IGlobalSelfLearningState = {
  entries: [],
  matchedTolerance: 0
};

export default function globalReducer(
  state: IGlobalSelfLearningState = initialStateGlobal,
  action: Action
): IGlobalSelfLearningState {
  switch (action.type) {
    case "SL_ENTRY": {
      const { entry } = action.payload;
      const newEntries: number[] = Array.from(state.entries);
      newEntries.push(entry);
      return {
        ...state,
        entries: newEntries
      };
    }
    case "SL_SUCCESS": {
      const { matchedTolerance } = action.payload;
      return {
        ...state,
        matchedTolerance
      };
    }
    default:
      return state;
  }
}
