require('./recovery.js').bootCheck();
const modules = {
  authentication: require('./modules/authentication/AuthenticationModule'),
  ftp: require('./modules/ftp/FTPModule'),
  input: require('./modules/input/InputModule'),
  logger: require('./modules/logger/LoggerModule'),
  output: require('./modules/output/OutputModule'),
  realtime: require('./modules/realtime/RealtimeModule'),
  recovery: require('./modules/recovery/RecoveryModule'),
  selfLearning: require('./modules/selfLearning/SelfLearningModule'),
  serial: require('./modules/serial/SerialModule'),
  table: require('./modules/table/TableModule'),
}

const store = require('./store.js');

const {enabledModules} = require('./config.static.js');
const config = require('./config.js');

const usedModules = {};

for(const moduleName in modules){
  if (enabledModules[moduleName]){
    let moduleType = modules[moduleName];
    let moduleConfig = config[moduleName];

    usedModules[moduleName] = new moduleType(moduleConfig, store);
  }
}