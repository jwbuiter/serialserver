const Com = require('./Com.js');

/*
class SerialModule {
  constructor(config, store){
    this.store = store;

    this = {...this, config};

    this.coms = config.coms.map(com => new Com(com, store))
  }
}
*/

module.exports = (config, store) => config.coms.map((com, index) => {
  const zeroReset = (com.resetTrigger==='on' || com.resetTrigger==='com'+index);

  return new Com(index, {...com, testMode: config.testMode, zeroReset}, store);
});