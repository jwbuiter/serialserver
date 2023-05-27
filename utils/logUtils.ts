import { ILoggerState } from "../reducers/loggerReducer";

export function createLogLine(loggerState: ILoggerState) {
  const entries = loggerState.entries.slice(-1);
  const legend = loggerState.legend;
  const accessors = loggerState.accessors;

  return JSON.stringify(
    {
      entries,
      legend,
      accessors,
    },
    null
  );
}
