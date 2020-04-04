import Client from "ftp";
import path from "path";
import fs from "fs";
import dateFormat from "dateformat";

import constants from "../../constants";

const xlsxDir = path.join(__dirname, "../../../data/data.xls");
const ftpBacklogDir = path.join(__dirname, "../../../data/ftpBacklog.json");

function FTPModule(config, store) {
  const { targets, automatic, uploadExcel } = config;
  const { logID } = store.getState().config.logger;

  let ftpBacklog = [];

  function addToBackLog(fileName) {
    ftpBacklog.push(fileName);
    tryBacklog();
  }

  function tryBacklog() {
    for (let fileName of ftpBacklog) {
      let numSuccess = 0;
      const callback = (msg) => {
        if (!msg.startsWith("Success")) return;

        numSuccess++;

        if (numSuccess == targets.length) {
          ftpBacklog = ftpBacklog.filter((name) => name != fileName);
          saveFtpBacklog();
        }
      };

      for (let i = 0; i < targets.length; i++) {
        upload(i, fileName, callback);
      }
    }
    saveFtpBacklog();
  }

  function saveFtpBacklog() {
    fs.writeFile(ftpBacklogDir, JSON.stringify(ftpBacklog), "utf8", (err) => {
      if (err) {
        console.log(err);
      }
    });
  }

  function upload(index, fileName, callback) {
    const { address, folder, username, password } = targets[index];

    if (!address) {
      callback("Success: nothing to do");
      return;
    }

    const localPath = constants.saveLogLocation;

    let c = new Client();
    c.on("ready", () => {
      c.mkdir(folder, true, () => {
        c.put(
          path.join(localPath, fileName),
          path.join(folder, fileName),
          (err) => {
            c.end();
            callback("Successfully uploaded " + fileName);
          }
        );
      });
    });
    c.on("error", (err) => {
      callback(err.message);
    });

    if (!(username && password)) {
      callback("No username and password set");
      return;
    }
    c.connect({
      host: address,
      user: username,
      password,
    });
  }

  function uploadDataFile(index) {
    const { address, folder, username, password } = targets[index];

    if (!fs.existsSync(xlsxDir)) return;

    const fileStats = fs.statSync(xlsxDir);
    const modifyDate = new Date(fileStats.mtimeMs);
    const fileName = `${constants.name}_${logID}_${dateFormat(
      modifyDate,
      "yyyy-mm-dd_HH-MM-ss"
    )}.xls`;

    const c = new Client();
    c.on("ready", () => {
      c.mkdir(folder, true, () => {
        c.put(xlsxDir, path.join(folder, fileName), (err) => {
          c.end();
        });
      });
    });

    c.on("error", (err) => {
      console.log("FTP Error:" + err.message);
    });

    c.connect({
      host: address,
      user: username,
      password,
    });
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case "LOG_UPLOAD": {
        const { fileName, ftpIndex, callback } = lastAction.payload;
        upload(ftpIndex, fileName, callback);
        if (uploadExcel) uploadDataFile(ftpIndex);
        break;
      }
      case "LOG_RESET": {
        const fileName = lastAction.payload;
        if (automatic) addToBackLog(fileName);
        for (let i = 0; i < targets.length; i++) {
          if (uploadExcel) uploadDataFile(i);
        }
        break;
      }
    }
  });

  if (fs.existsSync(ftpBacklogDir)) {
    try {
      ftpBacklog = require(ftpBacklogDir);
    } catch (err) {
      console.log(err);
    }
  }

  setInterval(tryBacklog, 3600000);
  tryBacklog();

  return {};
}

export default FTPModule;
