const Com = require('./Com.js');

function SerialModule(config, store) {
  const {coms, testMode} = config;
  return {
    coms: coms.map((com, index) => {
      const zeroReset = (com.resetTrigger==='on' || com.resetTrigger==='com'+index);
    
      return new Com(index, {...com, testMode, zeroReset}, store);
    }),
  }
}

module.exports = SerialModule;