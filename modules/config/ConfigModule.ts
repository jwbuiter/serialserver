import fs from "fs";
import path from "path";

import fullConfig from "../../config";
import constants from "../../constants";
import { IStore } from "../../store";
import { Action } from "../../actions/types";

const configPath = path.join(__dirname, "../../..", "configs");

function ConfigModule(store: IStore) {
  const mayorVersion = constants.version.split(".")[0];
  const configMayorVersion = fullConfig.version.split(".")[0];
  if (mayorVersion != configMayorVersion)
    store.dispatch({ type: "ERROR_OCCURRED", payload: Error("Config has wrong mayor version") });

  let config = fullConfig;

  function saveConfig(config, name) {
    console.log("Saving config: " + name);
    let conf = JSON.stringify(config, null, 2);

    try {
      fs.accessSync(name);
      fs.unlinkSync(name);
    } catch (err) { }

    fs.writeFileSync(name, conf);
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case "CONFIG_UPDATE": {
        config = Object.assign(config, lastAction.payload);

        const name = path.join(configPath, "current.json");

        fs.copyFileSync(name, path.join(configPath, "lastgood.json"));
        saveConfig(config, name);
        break;
      }
      case "CONFIG_SAVE": {
        const { config, name } = lastAction.payload;
        saveConfig(config, name);
        break;
      }
    }
  });

  return config;
}

export default ConfigModule;
