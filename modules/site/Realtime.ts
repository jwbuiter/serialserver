import { exec } from "child_process";
import socketio from "socket.io";
import fs from "fs";
import path from "path";
import ip from "ip";

import constants from "../../constants";
import oldConfig, { template } from "../../config";
import { IStore } from "../../store";
import { IInputPort } from "../../reducers/inputReducer";
import { IOutputPort } from "../../reducers/outputReducer";

const configPath = path.join(constants.baseDirectory, "configs");
const logPath = constants.saveLogLocation;
const version = constants.version;

function Realtime(server, config, store: IStore) {
  const { fileExtension } = store.getState().config.table;
  const io = socketio.listen(server);

  function emitInput(port: IInputPort, index) {
    let state;
    if (port.isForced) {
      state = port.forcedState ? "forcedOn" : "forcedOff";
    } else {
      state = port.state ? "on" : "off";
    }
    io.emit("state", {
      name: "input" + index,
      state,
    });
    io.emit("input", {
      index,
      ...port,
    });
  }
  function emitOutput(port: IOutputPort, index: number) {
    let state;
    if (port.isForced) {
      state = port.forcedState ? "forcedOn" : "forcedOff";
    } else {
      if (!port.state && port.result) state = "execute";
      else state = port.state ? "on" : "off";
    }
    io.emit("state", {
      name: "output" + index,
      state,
    });
    io.emit("output", {
      index,
      ...port,
    });
  }

  function emitSelfLearning() {
    const state = store.getState();

    switch (state.selfLearning.type) {
      case "individual": {
        const { calibration, tolerance, success, comIndex } =
          state.selfLearning;
        io.emit("selfLearning", {
          individual: true,
          calibration,
          tolerance,
          success,
          comIndex,
          ...state.selfLearning.individual,
        });
        break;
      }
      case "global": {
        const { calibration, tolerance, success, comIndex } =
          state.selfLearning;
        const { matchedTolerance } = state.selfLearning.global;
        io.emit("selfLearning", {
          individual: false,
          calibration,
          tolerance,
          success,
          comIndex,
          matchedTolerance,
        });
        break;
      }
    }
  }

  function emitAllState(socket) {
    const state = store.getState();

    state.input.ports.forEach((port, index) => {
      emitInput(port, index);
    });

    state.output.ports.forEach((port, index) => {
      emitOutput(port, index);
    });

    state.table.cells.forEach((cell, index) => {
      socket.emit("table", {
        index,
        value: cell.entry,
        manual: cell.manual,
      });
      socket.emit("tableColor", {
        index,
        color: cell.color,
      });
    });

    // state.serial.histories.forEach((history, index) => {
    //   history.forEach(({entry, time}) => {
    //     io.emit('entry', {index, entryTime: time, entry});
    //   });
    // });

    state.serial.coms.forEach(({ entry, time, average }, index) => {
      if (!time) return;

      socket.emit("entry", {
        index,
        entryTime: time.getTime(),
        entry,
      });
      socket.emit("average", {
        index,
        average,
      });
    });

    if (constants.enabledModules.selfLearning) {
      emitSelfLearning();
    }
  }

  function saveCurrentConfig(config, confirm) {
    checkConfigConsistency(config, (consistent) => {
      store.dispatch({
        type: "CONFIG_UPDATE",
        payload: config,
      });

      if (consistent) {
        store.dispatch({
          type: "LOG_BACKUP",
        });
      } else {
        store.dispatch({
          type: "RESTART",
        });
      }
    });
  }

  function configExists(name, callback) {
    if (!name.endsWith(".json")) name = name + "V" + version + ".json";

    callback({
      result: fs.existsSync(path.join(configPath, name)),
      name,
    });
  }

  function saveConfig(msg) {
    const name = path.join(configPath, msg.name + "V" + version + ".json");

    store.dispatch({
      type: "CONFIG_SAVE",
      payload: {
        name,
        config: msg.config,
      },
    });
  }

  function loadConfig(name, callback) {
    const config = fs.readFileSync(path.join(configPath, name)).toString();
    callback(config.match(/{.*}/s)[0]);
  }

  function deleteConfig(name) {
    try {
      fs.accessSync(path.join(configPath, name));
      fs.unlinkSync(path.join(configPath, name));
    } catch (err) {}
  }

  function deleteLog(name) {
    try {
      fs.accessSync(path.join(logPath, name));
      fs.unlinkSync(path.join(logPath, name));
    } catch (err) {}
  }

  function uploadLog({ name, index }, callback) {
    store.dispatch({
      type: "LOG_UPLOAD",
      payload: {
        fileName: name,
        ftpIndex: index,
        callback,
      },
    });
  }

  function setDateTime(dateTimeString) {
    console.log("setting date and time to: " + dateTimeString);
    exec(`hwclock --set --date="${dateTimeString}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${err}`);
        return;
      }
      exec(`hwclock -s`, (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          return;
        }
      });
    });
  }

  function getLogList(msg, callback) {
    fs.readdir(logPath, (err, files) => {
      const logList = files.filter((element) => element.endsWith(".csv"));
      const sortedLogList = logList.sort((a, b) => {
        const dateA = a.slice(-23);
        const dateB = b.slice(-23);

        if (dateA < dateB) {
          return 1;
        }
        if (dateA > dateB) {
          return -1;
        }

        // dates must be equal
        return 0;
      });
      callback(sortedLogList);
    });
  }

  function getConfigList(msg, callback) {
    const mayorVersion = version.split(".")[0];
    fs.readdir(configPath, (err, files) => {
      callback(
        files
          .filter((element) => element.match(/V[0-9]+.[0-9]+.json$/))
          .filter((element) => {
            const elementVersion = element.match(/V[0-9]+./)[0];
            const elementMayorVersion = elementVersion.slice(1, -1);
            return elementMayorVersion === mayorVersion;
          })
          .sort()
      );
    });
  }

  function forceInput(index) {
    const port = store.getState().input.ports[index];

    if (port.isForced) {
      if (port.previousForced) {
        store.dispatch({
          type: "INPUT_FORCED_CHANGED",
          payload: {
            index,
            isForced: false,
            previousForced: true,
            forcedState: false,
          },
        });
      } else {
        store.dispatch({
          type: "INPUT_FORCED_CHANGED",
          payload: {
            index,
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          },
        });
      }
    } else {
      store.dispatch({
        type: "INPUT_FORCED_CHANGED",
        payload: {
          index,
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        },
      });
    }
    store.dispatch({
      type: "HANDLE_TABLE",
    });
    store.dispatch({
      type: "HANDLE_OUTPUT",
    });
  }

  function forceOutput(index) {
    const port = store.getState().output.ports[index];

    if (port.isForced) {
      if (port.previousForced) {
        store.dispatch({
          type: "OUTPUT_FORCED_CHANGED",
          payload: {
            index,
            isForced: false,
            previousForced: true,
            forcedState: false,
          },
        });
      } else {
        store.dispatch({
          type: "OUTPUT_FORCED_CHANGED",
          payload: {
            index,
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          },
        });
      }
    } else {
      store.dispatch({
        type: "OUTPUT_FORCED_CHANGED",
        payload: {
          index,
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        },
      });
    }
    store.dispatch({
      type: "HANDLE_TABLE",
    });
    store.dispatch({
      type: "HANDLE_OUTPUT",
    });
  }

  function handleManual(msg) {
    store.dispatch({
      type: "TABLE_ENTRY",
      payload: {
        index: msg.index,
        entry: msg.value,
        manual: true,
      },
    });
    store.dispatch({
      type: "TABLE_EMIT",
      payload: {
        index: msg.index,
        entry: msg.value,
        manual: true,
      },
    });
    store.dispatch({
      type: "HANDLE_TABLE",
    });
    store.dispatch({
      type: "HANDLE_OUTPUT",
    });
  }

  function deleteGeneralSL(key) {
    store.dispatch({
      type: "SL_INDIVIDUAL_DELETE_GENERAL",
      payload: key,
    });
  }

  function deleteIndividualSL({ key, message }, callback) {
    store.dispatch({
      type: "SL_INDIVIDUAL_DELETE_INDIVIDUAL",
      payload: { key, message, callback },
    });
  }

  function resetIndividualSL() {
    store.dispatch({
      type: "SL_RESET_INDIVIDUAL",
    });
  }

  function deleteSLData({ logID, startCalibration, totalNumber }, callback) {
    store.dispatch({
      type: "SL_RESET_INDIVIDUAL",
    });

    store.dispatch({
      type: "CONFIG_UPDATE",
      payload: {
        logger: {
          ...oldConfig.logger,
          logID,
        },
        selfLearning: {
          ...oldConfig.selfLearning,
          startCalibration,
          totalNumber,
        },
      },
    });

    const dataFormat = path.join(constants.baseDirectory, "data", "data.");
    const templateFormat = path.join(
      constants.baseDirectory,
      "data",
      "template."
    );

    const dataFile = [
      dataFormat + fileExtension,
      dataFormat + "xls",
      dataFormat + "xlsx",
    ].find((p) => fs.existsSync(p));
    const templateFile = [
      templateFormat + fileExtension,
      templateFormat + "xls",
      templateFormat + "xlsx",
    ].find((p) => fs.existsSync(p));

    if (dataFile) {
      fs.unlinkSync(dataFile);
    }

    if (templateFile) {
      fs.copyFileSync(templateFile, dataFile);
    }

    callback(true);

    if (!constants.newCycleResetHard)
      setTimeout(() => {
        store.dispatch({
          type: "RESTART",
        });
      }, 1000);
  }

  function checkConfigConsistency(newConfig, callback) {
    for (let i = 0; i < oldConfig.serial.coms.length; i++) {
      if (oldConfig.serial.coms[i].name !== newConfig.serial.coms[i].name) {
        callback(false);
        return;
      }
    }

    for (let i = 0; i < oldConfig.table.cells.length; i++) {
      if (oldConfig.table.cells[i].name !== newConfig.table.cells[i].name) {
        callback(false);
        return;
      }
      if (
        oldConfig.table.cells[i].showInLog !==
        newConfig.table.cells[i].showInLog
      ) {
        callback(false);
        return;
      }
    }

    callback(true);
  }

  function confirmPassword(password, callback) {
    callback(constants.configPassword == password);
  }

  function hardReboot() {
    store.dispatch({
      type: "HARD_REBOOT",
    });
  }

  setInterval(() => {
    io.emit("time", new Date().getTime());
  }, 1000);

  store.listen((lastAction) => {
    const state = store.getState();
    switch (lastAction.type) {
      case "INPUT_EMIT": {
        const index = lastAction.payload;
        const port = state.input.ports[index];

        emitInput(port, index);
        break;
      }
      case "OUTPUT_EMIT": {
        const index = lastAction.payload;
        const port = state.output.ports[index];

        emitOutput(port, index);
        break;
      }
      case "SERIAL_ENTRY": {
        const { index, entry } = lastAction.payload;

        io.emit("entry", {
          index,
          entry,
          entryTime: new Date().getTime(),
        });
        break;
      }
      case "SERIAL_AVERAGE": {
        const { index, average } = lastAction.payload;

        io.emit("average", {
          index,
          average,
          entryTime: new Date().getTime(),
        });
        break;
      }
      case "SERIAL_RESET": {
        if (typeof lastAction.payload !== "undefined") {
          const index = lastAction.payload;

          io.emit("entry", {
            index,
            entry: "",
            entryTime: new Date().getTime(),
          });
        } else {
          io.emit("clearSerial");
        }
        break;
      }
      case "TABLE_EMIT": {
        const { index, entry, manual } = lastAction.payload;

        io.emit("table", {
          index,
          value: entry,
          manual: manual ? true : false,
        });
        break;
      }
      case "TABLE_COLOR": {
        io.emit("tableColor", lastAction.payload);
        break;
      }
      case "EXCEL_FOUND_ROW": {
        io.emit("notfound", !lastAction.payload.found);
        break;
      }
      case "ERROR_OCCURRED": {
        const err = lastAction.payload;

        io.emit("error", err.message);
        break;
      }
      case "SL_RESET_INDIVIDUAL":
      case "SL_RESET_GLOBAL":
      case "SL_INDIVIDUAL_DELETE_GENERAL":
      case "SL_INDIVIDUAL_DELETE_INDIVIDUAL":
      case "SL_ENTRY":
      case "SL_SUCCESS":
      case "SL_INDIVIDUAL_ACTIVITY": {
        emitSelfLearning();
        break;
      }
      case "EXECUTE_START": {
        io.emit("executeStart");
        break;
      }
      case "SET_WARNING": {
        io.emit("setWarning", lastAction.payload);
        break;
      }
    }
  });

  io.on("connection", (socket) => {
    console.log("a user connected");
    socket.emit("ip", ip.address());
    emitAllState(socket);

    const commands = {
      configExists: configExists,
      settings: saveCurrentConfig,
      saveConfig: saveConfig,
      loadConfig: loadConfig,
      deleteConfig: deleteConfig,
      deleteLog: deleteLog,
      uploadLog: uploadLog,
      setDateTime: setDateTime,
      getLogList: getLogList,
      getConfigList: getConfigList,
      forceInput: forceInput,
      forceOutput: forceOutput,
      manual: handleManual,
      deleteGeneralSL: deleteGeneralSL,
      deleteIndividualSL: deleteIndividualSL,
      resetIndividualSL: resetIndividualSL,
      deleteSLData: deleteSLData,
      checkConfigConsistency: checkConfigConsistency,
      confirmPassword: confirmPassword,
      hardReboot: hardReboot,
    };

    for (let command in commands) {
      socket.on(command, (msg, callback) => commands[command](msg, callback));
    }
  });
}

export default Realtime;
