const XLSX = require('XLSX');
const scheduler = require('node-schedule');

class LoggerModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};
  }
}

module.exports = LoggerModule;