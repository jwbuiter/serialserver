const usedModules = {
  recovery: new (require('./modules/recovery/RecoveryModule'))()
};

if (!usedModules.recovery) return;


const store = require('./store.js');
usedModules.recovery.bindStore(store);
const {
  ERROR_OCCURRED,
} = require('./actions/types');

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
const config = require('./configs/current');

for(const moduleName in modules){
  if (enabledModules[moduleName]){
    let moduleType = modules[moduleName];
    let moduleConfig = config[moduleName];
    console.log(moduleType)

    try{
      usedModules[moduleName] = new moduleType(moduleConfig, store);
    } catch(err){
      store.dispatch({
        type: ERROR_OCCURRED,
        payload: err,
      });
    }
  }
}

// Catch CTRL+C
process.on ('SIGINT', () => {
  store.dispatch({type: 'SHUTDOWN'});
});