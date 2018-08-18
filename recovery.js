const Gpio = require('onoff').Gpio;
const fs = require('fs');
const resetPin = require('./config.static').resetPin;

function bootCheck() {
  resetGPIO = new Gpio(resetPin, 'in');
  if (!resetGPIO.readSync())
    reset();
}

function reset() {
  if (fs.existsSync('config.lastgood.js')){
    fs.copyFileSync('config.lastgood.js', 'config.js');
    fs.unlinkSync('config.lastgood.js')
  }
  else
  {
    fs.copyFileSync('config.template.js', 'config.js');
  }
  console.log('Resetting configuration and rebooting...');
  process.exit();
}

module.exports = {
  bootCheck,
  reset,
};