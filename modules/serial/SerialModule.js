const Com = require('./Com.js');

function SerialModule(config, store) {
  const {coms} = config;
  return {
    coms: coms.map((com, index) => {
      const zeroReset = (config.resetTrigger==='on' || config.resetTrigger==='com'+index);

      return new Com(index, {...com, zeroReset}, store);
    }),
  }
}

module.exports = SerialModule;