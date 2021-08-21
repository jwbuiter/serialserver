import { mergeConfig } from "./utils/objectUtils";

type ComConfig = {
  mode: "serial" | "reader" | "test";
  port: string;
  baudRate: number;
  readerPort: number;
  stopBits: number;
  bits: number;
  parity: "none" | "even" | "odd" | "mark" | "space";
  RTSCTS: boolean;
  XONXOFF: boolean;
  name: string;
  average: boolean;
  timeout: number;
  timeoutReset: boolean;
  digits: number;
  entries: number;
  factor: number;
  alwaysPositive: boolean;
  prefix: string;
  postfix: string;
  testMessage: string;
  numeric: boolean;
  autoCommandEnabled: boolean;
  autoCommandMin: number;
  autoCommandMax: number;
  autoCommandTime: number;
  autoCommandText: string;
};

export interface ISerialConfig {
  testMode: boolean;
  resetTrigger: "off" | "on" | "com0" | "com1";
  coms: ComConfig[];
}

type CellConfig = {
  name: string;
  formula: string;
  numeric: boolean;
  digits: number;
  resetOnExe: boolean;
  type: "normal" | "date" | "manual" | "menu" | "reader";
  menuOptions: { key: number; value: string }[];
  colorConditions: { key: string; value: string }[];
  readerPort: number;
  visible: boolean;
  showInLog: boolean;
};

export interface ITableConfig {
  trigger: number;
  useFile: boolean;
  fileExtension: "xls" | "xlsx";
  waitForOther: boolean;
  searchColumn: number;
  individualColumn: number;
  dateColumn: number;
  exitColumn: number;
  cells: CellConfig[];
}

export interface IOutputConfig {
  name: string;
  formula: string;
  execute: boolean;
  holdOnExecute: boolean;
  seconds: number;
  manualConfirmation: boolean;
  visible: boolean;
  warning: boolean;
  warningPeriod: number;
  hardwareOutput: number;
}

export interface IOutputsConfig {
  ports: IOutputConfig[];
}

export interface IInputConfig {
  name: string;
  formula:
    | "exe"
    | "exebl"
    | "reset"
    | "teach"
    | "restart"
    | "shutdown"
    | "command"
    | "resetSerial";
  follow: number;
  timeout: number;
  invert: boolean;
  manualTimeout: number;
  manualConfirmation: boolean;
  commandCom: string;
  commandValue: string;
  visible: boolean;
  hardwareInput: number;
  normalState: "open" | "closed";
}

export interface IInputsConfig {
  ports: IInputConfig[];
}

export interface ILoggerConfig {
  writeToFile: boolean;
  csvSeparator: "," | ";";
  resetMode: "off" | "time" | "interval";
  resetTime: string;
  resetInterval: number;
  logID: string;
  unique: "off" | "com0" | "com1";
}

interface IFTPTargetConfig {
  address: string;
  folder: string;
  username: string;
  password: string;
}

export interface IFTPConfig {
  automatic: boolean;
  uploadExcel: boolean;
  targets: IFTPTargetConfig[];
}

export interface ISelfLearningConfig {
  enabled: "off" | "com0" | "com1" | "com0ind" | "com1ind";
  startCalibration: number;
  totalNumber: number;
  numberPercentage: number;
  tolerance: number;
  startTolerance: number;
  individualTolerance: number;
  individualToleranceAbs: number;
  individualToleranceShift: number;
  individualCorrectionIncrement: number;
  individualCorrectionLimit: number;
  individualCycleLimit: number;
  individualCycleLimitDateColunn: number;
  individualAverageNumber: number;
  activityCounter: boolean;
  firstTopFormula: string;
  firstTopDigits: number;
  secondTopFormula: string;
  secondTopDigits: number;
  exitOptions: { key: string; value: any }[];
  extraColumns: { topFormula: string; formula: string }[];
  success: number;
}

export interface IConfig {
  serial: ISerialConfig;
  table: ITableConfig;
  output: IOutputsConfig;
  input: IInputsConfig;
  logger: ILoggerConfig;
  FTP: IFTPConfig;
  selfLearning: ISelfLearningConfig;
  version: string;
}

export let template: IConfig = require("./configs/template");
let config = template;

try {
  config = mergeConfig(config, require("./configs/current"));
} catch {}

export default config;
