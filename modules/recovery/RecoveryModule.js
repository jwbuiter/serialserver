const Gpio = require('onoff').Gpio;
const fs = require('fs');
const path = require('path');

const {resetPin, onlinePin} = require('../../config.static');
const  {
  ERROR_OCCURRED,
  SHUTDOWN,
} = require('../../actions/types');

const configPath = path.join(__dirname, '../..', 'configs');

class RecoveryModule {
  constructor(){
    this.onlinePin =new Gpio(onlinePin, 'out');

    const resetGPIO = new Gpio(resetPin, 'in');

    if (!fs.existsSync(path.join(configPath, 'current.js'))){
      console.log('No config found, config will be reset to template.')
      this.reset();
      this.shutdown();
    }

    if (!resetGPIO.readSync()){
      this.reset();

      setInterval(() =>{
        this.onlineGPIO.writeSync(!this.onlineGPIO.readSync());
        if (resetGPIO.readSync())
        this.shutdown();
      }, 1000);
    }
  }

  bindStore(store){
    this.store = store;

    this.store.subscribe(()=>{
      const lastAction = this.store.getState().lastAction;
      switch (lastAction.type){
        case ERROR_OCCURRED:{
          setTimeout(()=>{
            this.reset();
            this.shutdown();
          }, 5000);
          break;
        }
        case SHUTDOWN:{
          this.shutdown();
        }
      }
    });
  }

  reset(){
    console.log('Resetting configuration.');
    if (fs.existsSync(path.join(configPath, 'lastgood.js'))){
      fs.copyFileSync(path.join(configPath, 'lastgood.js'), path.join(configPath, 'current.js'));
      fs.unlinkSync(path.join(configPath, 'lastgood.js'))
    }
    else
    {
      fs.copyFileSync(path.join(configPath, 'template.js'), path.join(configPath, 'current.js'));
    }
  }

  shutdown(){
    this.onlinePin.writeSync(0);
    console.log('Rebooting...');
    process.exit();
  }
}

module.exports = RecoveryModule;