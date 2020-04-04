type ComConfig = {
  mode: string;
  port: string;
  baudRate: number;
  readerPort: number;
  stopBits: number;
  bits: number;
  parity: string;
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

type CellConfig = {
  name: string;
  formula: string;
  numeric: boolean;
  digits: number;
  resetOnExe: boolean;
  type: string;
  menuOptions: { key: number; value: string }[];
  colorConditions: { key: string; value: string }[];
  readerPort: number;
  visible: boolean;
  showInLog: boolean;
};

type OutputConfig = {
  name: string;
  formula: string;
  execute: boolean;
  seconds: number;
  manualConfirmation: boolean;
  visible: boolean;
  warning: boolean;
  warningPeriod: number;
  hardwareOutput: number;
};

type InputConfig = {
  name: string;
  formula: string;
  follow: number;
  timeout: number;
  invert: boolean;
  manualTimeout: number;
  manualConfirmation: boolean;
  commandCom: string;
  commandValue: string;
  visible: boolean;
  hardwareInput: number;
};

type FTPTargetConfig = {
  address: string;
  folder: string;
  username: string;
  password: string;
};

interface IConfig {
  serial: { testMode: boolean; resetTrigger: string; coms: ComConfig[] };
  table: {
    trigger: number;
    useFile: boolean;
    waitForOther: boolean;
    searchColumn: number;
    individualColumn: number;
    dateColumn: number;
    exitColumn: number;
    cells: CellConfig[];
  };
  output: { ports: OutputConfig[] };
  input: { ports: InputConfig[] };
  logger: {
    writeToFile: boolean;
    csvSeparator: string;
    resetMode: string;
    resetTime: string;
    resetInterval: number;
    logID: string;
    unique: string;
  };
  FTP: { automatic: boolean; uploadExcel: boolean; targets: FTPTargetConfig[] };
  selfLearning: {
    enabled: string;
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
    individualAverageNumber: number;
    activityCounter: boolean;
    firstTopFormula: string;
    firstTopDigits: number;
    secondTopFormula: string;
    secondTopDigits: number;
    exitOptions: { key: string; value: any }[];
    extraColumns: { topFormula: string; formula: string }[];
    success: number;
  };
  version: string;
}

export let template: IConfig = require("../configs/template");
let config: IConfig;

try {
  config = require("../configs/current");
} catch {
  config = template;
}

export default config;
