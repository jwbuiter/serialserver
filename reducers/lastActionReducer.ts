import { Action } from "../actions/types";

export default function(state: Action | null = null, action: Action): Action {
  if (action.type === "RESET_LAST_ACTION") return action.payload;
  return action;
}
