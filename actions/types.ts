import { IEntry, ILoggerState } from "../reducers/loggerReducer";
import {
  GeneralEntry,
  IndividualEntry,
} from "../reducers/selfLearning/individualReducer";

type ActionType =
  | "CONFIG_SAVE"
  | "CONFIG_UPDATE"
  | "ERROR_OCCURRED"
  | "EXCEL_FOUND_ROW"
  | "EXECUTE_START"
  | "EXECUTE_STOP"
  | "HANDLE_ALL"
  | "HANDLE_INPUT"
  | "HANDLE_OUTPUT"
  | "HANDLE_TABLE"
  | "INPUT_BLOCKING_CHANGED"
  | "INPUT_CALCULATE_STATE"
  | "INPUT_EMIT"
  | "INPUT_FOLLOWING_CHANGED"
  | "INPUT_FORCED_CHANGED"
  | "INPUT_PHYSICAL_CHANGED"
  | "LOG_ACTIVITY_OVERWRITE"
  | "LOG_BACKUP"
  | "LOG_DELETE"
  | "LOG_ENTRY"
  | "LOG_MAKE_ENTRY"
  | "LOG_MAKE_PARTIAL"
  | "LOG_OVERWRITE"
  | "LOG_RECOVER"
  | "LOG_RESET"
  | "LOG_SAVE"
  | "LOG_UNIQUE_OVERWRITE"
  | "LOG_LIST_OVERWRITE"
  | "LOG_UPLOAD"
  | "OUTPUT_EMIT"
  | "OUTPUT_EXECUTING_CHANGED"
  | "OUTPUT_FORCED_CHANGED"
  | "OUTPUT_RESULT_CHANGED"
  | "RESET_LAST_ACTION"
  | "RESTART"
  | "HARD_REBOOT"
  | "SERIAL_AVERAGE"
  | "SERIAL_COMMAND"
  | "SERIAL_ENTRY"
  | "SERIAL_RESET"
  | "SERIAL_TIMEOUT"
  | "SL_ENTRY"
  | "SL_INDIVIDUAL_ACTIVITY"
  | "SL_INDIVIDUAL_DECREMENT_TOTAL"
  | "SL_INDIVIDUAL_DELETE_GENERAL"
  | "SL_INDIVIDUAL_DELETE_INDIVIDUAL"
  | "SL_INDIVIDUAL_DOWNGRADE"
  | "SL_INDIVIDUAL_HEADERS"
  | "SL_INDIVIDUAL_INCREMENT"
  | "SL_INDIVIDUAL_LOAD"
  | "SL_INDIVIDUAL_UPGRADE"
  | "SL_INDIVIDUAL_EXTRA"
  | "SL_RESET_GLOBAL"
  | "SL_RESET_INDIVIDUAL"
  | "SL_SET_TOLERANCE"
  | "SL_START_INDIVIDUAL"
  | "SL_SUCCESS"
  | "SL_TEACH"
  | "STATE_CHANGED"
  | "TABLE_COLOR"
  | "TABLE_EMIT"
  | "TABLE_ENTRY"
  | "TABLE_RESET_CELL"
  | "TABLE_RESET"
  | "SET_WARNING";

export default interface IAction {
  type: ActionType;
}

export interface ConfigSaveAction extends IAction {
  type: "CONFIG_SAVE";
  payload: any;
}

export interface ConfigUpdateAction extends IAction {
  type: "CONFIG_UPDATE";
  payload: any;
}

export interface ErrorOccurredAction extends IAction {
  type: "ERROR_OCCURRED";
  payload: Error;
}

export interface ExcelFoundRowAction extends IAction {
  type: "EXCEL_FOUND_ROW";
  payload: {
    found: boolean;
    foundRow: string[];
  };
}

export interface ExecuteStartAction extends IAction {
  type: "EXECUTE_START";
}

export interface ExecuteStopAction extends IAction {
  type: "EXECUTE_STOP";
}

export interface HandleAllAction extends IAction {
  type: "HANDLE_ALL";
}

export interface HandleInputAction extends IAction {
  type: "HANDLE_INPUT";
}

export interface HandleOutputAction extends IAction {
  type: "HANDLE_OUTPUT";
}

export interface HandleTableAction extends IAction {
  type: "HANDLE_TABLE";
}

export interface InputBlockingChangedAction extends IAction {
  type: "INPUT_BLOCKING_CHANGED";
  payload: {
    index: number;
    blocking: boolean;
  };
}

export interface InputCalculateStateAction extends IAction {
  type: "INPUT_CALCULATE_STATE";
  payload: {
    index: number;
  };
}

export interface InputEmitAction extends IAction {
  type: "INPUT_EMIT";
  payload: number;
}

export interface InputFollowingChangedAction extends IAction {
  type: "INPUT_FOLLOWING_CHANGED";
  payload: {
    index: number;
    isFollowing: boolean;
  };
}

export interface InputForcedChangedAction extends IAction {
  type: "INPUT_FORCED_CHANGED";
  payload: {
    index: number;
    previousForced: boolean;
    isForced: boolean;
    forcedState: boolean;
  };
}

export interface InputPhysicalChangedAction extends IAction {
  type: "INPUT_PHYSICAL_CHANGED";
  payload: {
    index: number;
    physical: boolean;
  };
}

export interface LogActivityOverwriteAction extends IAction {
  type: "LOG_ACTIVITY_OVERWRITE";
  payload: {
    index: number;
    newValue: "" | number;
  };
}

export interface LogBackupAction extends IAction {
  type: "LOG_BACKUP";
}

export interface LogDeleteAction extends IAction {
  type: "LOG_DELETE";
}

export interface LogEntryAction extends IAction {
  type: "LOG_ENTRY";
  payload: IEntry;
}

export interface LogMakeEntryAction extends IAction {
  type: "LOG_MAKE_ENTRY";
}

export interface LogMakePartialAction extends IAction {
  type: "LOG_MAKE_PARTIAL";
  payload: {
    index: number;
    entry: string;
  };
}

export interface LogOverwriteAction extends IAction {
  type: "LOG_OVERWRITE";
  payload: IEntry;
}

export interface LogRecoverAction extends IAction {
  type: "LOG_RECOVER";
  payload: ILoggerState;
}

export interface LogResetAction extends IAction {
  type: "LOG_RESET";
  payload: string;
}

export interface LogSaveAction extends IAction {
  type: "LOG_SAVE";
}

export interface LogUniqueOverwriteAction extends IAction {
  type: "LOG_UNIQUE_OVERWRITE";
  payload: number;
}

export interface LogListOverwriteAction extends IAction {
  type: "LOG_LIST_OVERWRITE";
  payload: "UN" | "SL";
}

export interface LogUploadAction extends IAction {
  type: "LOG_UPLOAD";
  payload: { fileName: string; ftpIndex: number; callback };
}

export interface OutputEmitAction extends IAction {
  type: "OUTPUT_EMIT";
  payload: number;
}

export interface OutputExecutingChangedAction extends IAction {
  type: "OUTPUT_EXECUTING_CHANGED";
  payload: {
    index: number;
    executing: boolean;
  };
}

export interface OutputForcedChangedAction extends IAction {
  type: "OUTPUT_FORCED_CHANGED";
  payload: {
    index: number;
    isForced: boolean;
    previousForced: boolean;
    forcedState: boolean;
  };
}

export interface OutputResultChangedAction extends IAction {
  type: "OUTPUT_RESULT_CHANGED";
  payload: {
    index: number;
    result: boolean;
  };
}

export interface ResetLastAction extends IAction {
  type: "RESET_LAST_ACTION";
  payload: Action;
}

export interface RestartAction extends IAction {
  type: "RESTART";
}

export interface HardRebootAction extends IAction {
  type: "HARD_REBOOT";
}

export interface SerialAverageAction extends IAction {
  type: "SERIAL_AVERAGE";
  payload: {
    index: number;
    average: string;
  };
}

export interface SerialCommandAction extends IAction {
  type: "SERIAL_COMMAND";
}

export interface SerialEntryAction extends IAction {
  type: "SERIAL_ENTRY";
  payload: {
    index: number;
    entry: string;
  };
}

export interface SerialResetAction extends IAction {
  type: "SERIAL_RESET";
  payload?: number;
}

export interface SerialTimeoutAction extends IAction {
  type: "SERIAL_TIMEOUT";
}

export interface SLEntryAction extends IAction {
  type: "SL_ENTRY";
  payload: {
    entry: number;
    key?: string;
  };
}

export interface SLIndividualExtraAction extends IAction {
  type: "SL_INDIVIDUAL_EXTRA";
  payload: {
    key: string;
    extra: (number | string)[];
  };
}

export interface SLIndividualActivityAction extends IAction {
  type: "SL_INDIVIDUAL_ACTIVITY";
  payload: { key: string };
}

export interface SLIndividualDecrementTotalAction extends IAction {
  type: "SL_INDIVIDUAL_DECREMENT_TOTAL";
  payload: (totalNumber: number) => void;
}

export interface SLIndividualDeleteGeneralAction extends IAction {
  type: "SL_INDIVIDUAL_DELETE_GENERAL";
  payload: { key: string };
}

export interface SLIndividualDeleteIndividualAction extends IAction {
  type: "SL_INDIVIDUAL_DELETE_INDIVIDUAL";
  payload: { key: string; message: string; callback };
}

export interface SLIndividualDowngradeAction extends IAction {
  type: "SL_INDIVIDUAL_DOWNGRADE";
  payload: { key: string };
}

export interface SlIndividualHeadersAction extends IAction {
  type: "SL_INDIVIDUAL_HEADERS";
  payload: string[];
}

export interface SLIndividualIncrementAction extends IAction {
  type: "SL_INDIVIDUAL_INCREMENT";
}

export interface SLIndividualLoadAction extends IAction {
  type: "SL_INDIVIDUAL_LOAD";
  payload: {
    generalEntries: Record<string, GeneralEntry>;
    individualEntries: Record<string, IndividualEntry>;
  };
}

export interface SLIndividualUpgradeAction extends IAction {
  type: "SL_INDIVIDUAL_UPGRADE";
  payload: {
    calibration: number;
    key: string;
  };
}

export interface SLResetGlobalAction extends IAction {
  type: "SL_RESET_GLOBAL";
}

export interface SLResetIndividualAction extends IAction {
  type: "SL_RESET_INDIVIDUAL";
}

export interface SLSetToleranceAction extends IAction {
  type: "SL_SET_TOLERANCE";
}

export interface SLStartIndividualAction extends IAction {
  type: "SL_START_INDIVIDUAL";
}

export interface SLSuccessAction extends IAction {
  type: "SL_SUCCESS";
  payload: {
    success: number;
    calibration: number;
    matchedTolerance?: number;
    comIndex: number;
    tolerance: number;
    filterLog: boolean;
  };
}

export interface SLTeachAction extends IAction {
  type: "SL_TEACH";
  payload: boolean;
}

export interface StateChangedAction extends IAction {
  type: "STATE_CHANGED";
}

export interface TableColorAction extends IAction {
  type: "TABLE_COLOR";
  payload: {
    index: number;
    color: string;
  };
}

export interface TableEmitAction extends IAction {
  type: "TABLE_EMIT";
  payload: {
    index: number;
    entry: any;
    manual: boolean;
  };
}

export interface TableEntryAction extends IAction {
  type: "TABLE_ENTRY";
  payload: {
    index: number;
    entry: string | number;
  };
}

export interface TableResetAction extends IAction {
  type: "TABLE_RESET";
}

export interface TableResetCellAction extends IAction {
  type: "TABLE_RESET_CELL";
  payload: number;
}

export interface SetWarningAction extends IAction {
  type: "SET_WARNING";
  payload: boolean;
}

export type Action =
  | ConfigSaveAction
  | ConfigUpdateAction
  | ErrorOccurredAction
  | ExcelFoundRowAction
  | ExecuteStartAction
  | ExecuteStopAction
  | HandleAllAction
  | HandleInputAction
  | HandleOutputAction
  | HandleTableAction
  | InputBlockingChangedAction
  | InputCalculateStateAction
  | InputEmitAction
  | InputFollowingChangedAction
  | InputForcedChangedAction
  | InputPhysicalChangedAction
  | LogActivityOverwriteAction
  | LogBackupAction
  | LogDeleteAction
  | LogEntryAction
  | LogMakeEntryAction
  | LogMakePartialAction
  | LogOverwriteAction
  | LogRecoverAction
  | LogResetAction
  | LogSaveAction
  | LogUniqueOverwriteAction
  | LogListOverwriteAction
  | LogUploadAction
  | OutputEmitAction
  | OutputExecutingChangedAction
  | OutputForcedChangedAction
  | OutputResultChangedAction
  | ResetLastAction
  | RestartAction
  | HardRebootAction
  | SerialAverageAction
  | SerialCommandAction
  | SerialEntryAction
  | SerialResetAction
  | SerialTimeoutAction
  | SLEntryAction
  | SLIndividualActivityAction
  | SLIndividualDecrementTotalAction
  | SLIndividualDeleteGeneralAction
  | SLIndividualDeleteIndividualAction
  | SLIndividualDowngradeAction
  | SlIndividualHeadersAction
  | SLIndividualIncrementAction
  | SLIndividualLoadAction
  | SLIndividualUpgradeAction
  | SLIndividualExtraAction
  | SLResetGlobalAction
  | SLResetIndividualAction
  | SLSetToleranceAction
  | SLStartIndividualAction
  | SLSuccessAction
  | SLTeachAction
  | StateChangedAction
  | TableColorAction
  | TableEmitAction
  | TableEntryAction
  | TableResetAction
  | TableResetCellAction
  | SetWarningAction;
