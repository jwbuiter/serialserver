const Gpio = require('onoff').Gpio;
const fs = require('fs');
const path = require('path');

const {resetPin, onlinePin} = require('../../config.static');
const  {
  ERROR_OCCURRED,
  SHUTDOWN,
} = require('../../actions/types');

const configPath = path.join(__dirname, '../..', 'configs');

function RecoveryModule() {
  const onlineGPIO =new Gpio(onlinePin, 'out');
  const resetGPIO = new Gpio(resetPin, 'in');

  onlineGPIO.writeSync(1);

  function reset(){
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

  function shutdown(){
    onlineGPIO.writeSync(0);
    console.log('Rebooting...');
    process.exit();
  }

  let store;
  function bindStore(newStore){
    store = newStore;
  
    store.listen((lastAction)=>{
      switch (lastAction.type){
        case ERROR_OCCURRED:{
          console.log(lastAction)
          console.log(lastAction.payload.message);
          setTimeout(()=>{
            reset();
            shutdown();
          }, 2000);
          break;
        }
        case SHUTDOWN:{
          shutdown();
          break;
        }
      }
    });
  }

  if (!fs.existsSync(path.join(configPath, 'current.js'))){
    console.log('No config found, config will be reset to template.')
    reset();
    shutdown();
  }

  if (!resetGPIO.readSync()){
    reset();

    setInterval(() =>{
      onlineGPIO.writeSync(!onlineGPIO.readSync());
      if (resetGPIO.readSync())
        shutdown();
    }, 1000);

    return false;
  }

  // Catch CTRL+C
  process.on ('SIGINT', () => {
    store.dispatch({type: 'SHUTDOWN'});
  });
  
  return {
    bindStore
  }
}

module.exports = RecoveryModule;