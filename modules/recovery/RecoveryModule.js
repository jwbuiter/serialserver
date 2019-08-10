const Gpio = require("onoff").Gpio;
const fs = require("fs");
const path = require("path");

const { resetPin, onlinePin } = require("../../config.static");
const { ERROR_OCCURRED, RESTART } = require("../../actions/types");

const configPath = path.join(__dirname, "../..", "configs");

function RecoveryModule() {
  const onlineGPIO = new Gpio(onlinePin, "out");
  const resetGPIO = new Gpio(resetPin, "in");

  function reset() {
    console.log("Resetting configuration.");
    if (fs.existsSync(path.join(configPath, "lastgood.json"))) {
      fs.copyFileSync(
        path.join(configPath, "lastgood.json"),
        path.join(configPath, "current.json")
      );
      fs.unlinkSync(path.join(configPath, "lastgood.json"));
    } else {
      fs.copyFileSync(
        path.join(configPath, "template.json"),
        path.join(configPath, "current.json")
      );
    }
  }

  function restart() {
    onlineGPIO.writeSync(0);
    console.log("Rebooting...");
    process.exit();
  }

  let store;

  function bindStore(newStore) {
    store = newStore;

    store.listen(lastAction => {
      switch (lastAction.type) {
        case ERROR_OCCURRED: {
          console.log(lastAction);
          console.log(lastAction.payload.message);
          setTimeout(() => {
            reset();
            restart();
          }, 2000);
          break;
        }
        case RESTART: {
          restart();
          break;
        }
      }
    });
  }

  if (!fs.existsSync(path.join(configPath, "current.json"))) {
    console.log("No config found, config will be reset to template.");
    reset();
    restart();
  }

  if (!resetGPIO.readSync()) {
    reset();
    reset();
    let gpioState = 1;

    setInterval(() => {
      gpioState = 1 - gpioState;
      console.log("Blink " + gpioState);
      onlineGPIO.writeSync(gpioState);
      if (resetGPIO.readSync()) restart();
    }, 1000);

    return false;
  }

  try {
    eval("require(path.join(configPath, 'current.json'))");
  } catch (err) {
    console.log(err);
    reset();
    restart();
  }

  // Catch CTRL+C
  process.on("SIGINT", () => {
    store.dispatch({
      type: RESTART
    });
  });

  onlineGPIO.writeSync(1);

  return {
    bindStore
  };
}

module.exports = RecoveryModule;
