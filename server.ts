import RecoveryModule from "./modules/recovery/RecoveryModule";
import ConfigModule from "./modules/config/ConfigModule";
import authentication from "./modules/authentication/AuthenticationModule";
import FTP from "./modules/ftp/FTPModule";
import input from "./modules/input/InputModule";
import logger from "./modules/logger/LoggerModule";
import output from "./modules/output/OutputModule";
import selfLearning from "./modules/selfLearning/SelfLearningModule";
import serial from "./modules/serial/SerialModule";
import site from "./modules/site/SiteModule";
import table from "./modules/table/TableModule";
import store from "./store";
import constants from "./constants";

const usedModules = {
  recovery: RecoveryModule(),
};

if (typeof usedModules.recovery != "boolean") {
  usedModules.recovery.bindStore(store);

  const config = ConfigModule(store);

  const modules = {
    authentication,
    FTP,
    input,
    logger,
    output,
    selfLearning,
    serial,
    site,
    table,
  };

  const { enabledModules } = constants;

  for (const moduleName in modules) {
    if (enabledModules[moduleName]) {
      let moduleType = modules[moduleName];
      let moduleConfig = config[moduleName];
      console.log(moduleType);

      try {
        usedModules[moduleName] = moduleType(moduleConfig, store);
      } catch (err) {
        store.dispatch({
          type: "ERROR_OCCURRED",
          payload: err,
        });
      }
    }
  }
}
