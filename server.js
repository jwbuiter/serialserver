const {
  ERROR_OCCURRED,
} = require('./actions/types');

const usedModules = {
  recovery: require('./modules/recovery/RecoveryModule')()
};

if (!usedModules.recovery) process.exit();

const store = require('./store.js');
usedModules.recovery.bindStore(store);


const config = require('./modules/config/ConfigModule')(store);

const modules = {
  authentication: require('./modules/authentication/AuthenticationModule'),
  FTP: require('./modules/ftp/FTPModule'),
  input: require('./modules/input/InputModule'),
  logger: require('./modules/logger/LoggerModule'),
  output: require('./modules/output/OutputModule'),
  selfLearning: require('./modules/selfLearning/SelfLearningModule'),
  serial: require('./modules/serial/SerialModule'),
  site: require('./modules/site/SiteModule'),
  table: require('./modules/table/TableModule'),
}

const {enabledModules} = require('./config.static');

for(const moduleName in modules){
  if (enabledModules[moduleName]){
    let moduleType = modules[moduleName];
    let moduleConfig = config[moduleName];
    console.log(moduleType)

    try{
      usedModules[moduleName] = moduleType(moduleConfig, store);
    } catch(err){
      store.dispatch({
        type: ERROR_OCCURRED,
        payload: err,
      });
    }
  }
}
