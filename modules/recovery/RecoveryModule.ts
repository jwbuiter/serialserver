import { Gpio } from "onoff";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

import constants from "../../constants";
import { IStore } from "../../store";

const { resetPin, onlinePin } = constants;
const configPath = path.join(constants.baseDirectory, "configs");
const RESET_BUTTON_POLL = 100;
// How long the reset button has to be held while running to reset the network.
const NETWORK_RESET_HOLD = 5000;

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

  function hardReboot() {
    onlineGPIO.writeSync(0);
    console.log("Restarting...");
    exec("shutdown -r now");
  }

  let store: IStore;

  // Holding the reset button while the application runs resets the network
  // settings (handled by the wifi module). Holding it during startup still
  // resets the configuration, see below.
  function watchResetButton() {
    let heldFor = 0;
    let triggered = false;

    setInterval(() => {
      const pressed = !resetGPIO.readSync();
      if (!pressed) {
        heldFor = 0;
        triggered = false;
        return;
      }

      heldFor += RESET_BUTTON_POLL;
      if (heldFor >= NETWORK_RESET_HOLD && !triggered) {
        triggered = true;
        console.log("Reset button held, resetting network settings.");
        store.dispatch({ type: "NETWORK_RESET" });

        // Blink the online LED quickly to confirm.
        let blinks = 0;
        const blink = setInterval(() => {
          onlineGPIO.writeSync(blinks % 2 === 0 ? 0 : 1);
          if (++blinks >= 30) {
            clearInterval(blink);
            onlineGPIO.writeSync(1);
          }
        }, 100);
      }
    }, RESET_BUTTON_POLL);
  }

  function bindStore(newStore: IStore) {
    store = newStore;
    watchResetButton();

    store.listen((lastAction) => {
      switch (lastAction.type) {
        case "ERROR_OCCURRED": {
          console.log(lastAction);
          console.log(lastAction.payload.message);
          setTimeout(() => {
            reset();
            restart();
          }, 2000);
          break;
        }
        case "RESTART": {
          restart();
          break;
        }
        case "HARD_REBOOT": {
          hardReboot();
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
    let gpioState: 1 | 0 = 1;

    setInterval(() => {
      gpioState = gpioState === 1 ? 0 : 1;
      console.log("Blink " + gpioState);
      onlineGPIO.writeSync(gpioState);
      if (resetGPIO.readSync()) restart();
    }, 1000);

    return false;
  }

  try {
    eval("require(configPath+\"/\"+'current.json')");
  } catch (err) {
    console.log(err);
    reset();
    restart();
  }

  // Catch CTRL+C
  process.on("SIGINT", () => {
    store.dispatch({
      type: "RESTART",
    });
  });

  onlineGPIO.writeSync(1);

  return {
    bindStore,
  };
}

export default RecoveryModule;
