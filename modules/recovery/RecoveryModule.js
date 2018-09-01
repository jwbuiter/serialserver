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
  constructor(store){
    this.store = store;

    const resetGPIO = new Gpio(resetPin, 'in');

    if (!resetGPIO.readSync()){
      reset();

      const onlineGPIO = new Gpio(onlinePin, 'out');

      setInterval(() =>{
        onlineGPIO.writeSync(!onlineGPIO.readSync());
        if (resetGPIO.readSync())
          shutdown();
      }, 1000);
    }
      

    this.store.subscribe(()=>{
      const lastAction = this.store.getState().lastAction;
      switch (lastAction.type){
        case ERROR_OCCURRED:{
          setTimeout(()=>{
            reset();
            shutdown();
          }, 5000);
          break;
        }
        case SHUTDOWN:{
          shutdown();
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
    onlinePin.writeSync(0);
    console.log('Rebooting...');
    process.exit();
  }
}

module.exports = RecoveryModule;