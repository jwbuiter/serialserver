const store = require('./store.js');

const usedModules = {
  recovery: new (require('./modules/recovery/RecoveryModule'))(store)
};

const modules = {
  authentication: require('./modules/authentication/AuthenticationModule'),
  ftp: require('./modules/ftp/FTPModule'),
  input: require('./modules/input/InputModule'),
  logger: require('./modules/logger/LoggerModule'),
  output: require('./modules/output/OutputModule'),
  selfLearning: require('./modules/selfLearning/SelfLearningModule'),
  serial: require('./modules/serial/SerialModule'),
  site: require('./modules/site/siteModule'),
  table: require('./modules/table/TableModule'),
}

const {enabledModules} = require('./config.static');
const config = require('./configs/current');

for(const moduleName in modules){
  if (enabledModules[moduleName]){
    let moduleType = modules[moduleName];
    let moduleConfig = config[moduleName];
    console.log(moduleType)

    usedModules[moduleName] = new moduleType(moduleConfig, store);
  }
}

// Catch CTRL+C
process.on ('SIGINT', () => {
  store.dispatch({type: 'SHUTDOWN'});
});