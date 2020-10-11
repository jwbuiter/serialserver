import { mergeConfig } from "./utils/objectUtils";

interface IConstants {
  name: string;
  QS: string;
  port: number;
  saveLogLocation: string;
  configPassword: string;
  exposeUpload: boolean;
  exposeShutdown: boolean;
  exposeSettings: boolean;
  showTolerance: boolean;
  tableColumns: number;
  resetPin: number;
  outputPin: number[];
  inputPin: number[];
  comPin: number[];
  onlinePin: number;
  enabledModules: {
    authentication: boolean;
    FTP: boolean;
    input: boolean;
    logger: boolean;
    output: boolean;
    site: boolean;
    selfLearning: boolean;
    serial: boolean;
    table: boolean;
  };
  autoResetHard: boolean;
  manualResetHard: boolean;
  inputResetHard: boolean;
  newCycleResetHard: boolean;
  version: string;
}

let constants: IConstants = require("../config.static.template");

try {
  constants = mergeConfig(constants, require("../config.static"));
} catch { }

export default constants;
