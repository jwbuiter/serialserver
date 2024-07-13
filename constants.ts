import fs from "fs";

import { mergeConfig } from "./utils/objectUtils";

interface IConstants {
  name: string;
  QS: string;
  port: number;
  baseDirectory: string;
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
    FTP: boolean;
    input: boolean;
    logger: boolean;
    output: boolean;
    site: boolean;
    selfLearning: boolean;
    serial: boolean;
    table: boolean;
    bluetooth: boolean;
  };
  autoResetHard: boolean;
  manualResetHard: boolean;
  inputResetHard: boolean;
  newCycleResetHard: boolean;
  individualSLMaxEntries: number;
  individualSLMatchEntries: number;
  individualSLRemoveExcel: boolean;
  individualSLDecrementTotal: boolean;
  saveExcelDateStamp: boolean;
  version: string;
  buildDate: string;
}

let constants: IConstants = require("./config.static.template");

try {
  constants = mergeConfig(constants, require("./config.static"));
} catch {}

constants.buildDate = fs.readFileSync("BUILDDATE").toString().trim();

console.log("build date: " + constants.buildDate);

export default constants;
