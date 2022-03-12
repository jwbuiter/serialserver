import Client from "ftp";
import path from "path";
import fs from "fs";
import dateFormat from "dateformat";
import ssh2 from "ssh2";

import constants from "../../constants";
import { IFTPConfig } from "../../config";
import { IStore } from "../../store";

const ftpBacklogDir = path.join(
  constants.baseDirectory,
  "data",
  "ftpBacklog.json"
);

function FTPModule(config: IFTPConfig, store: IStore) {
  const { targets, automatic, uploadExcel } = config;
  const { logID } = store.getState().config.logger;
  const { fileExtension } = store.getState().config.table;
  const xlsxDir = path.join(
    constants.baseDirectory,
    "data",
    "data." + fileExtension
  );

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
        if (fileName == "excel") uploadDataFile(i, callback);
        else uploadFile(i, fileName, callback);
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

  function uploadFile(index, fileName, callback) {
    const { address, folder, username, password } = targets[index];

    if (!address) {
      callback("Success: nothing to do");
      return;
    }

    const localPath = constants.saveLogLocation;

    if (!(username && password)) {
      callback("No username and password set");
      return;
    }

    upload(
      address,
      folder,
      username,
      password,
      path.join(localPath, fileName),
      fileName,
      callback
    );
  }

  function uploadDataFile(index, callback) {
    const { address, folder, username, password } = targets[index];

    if (!address || !fs.existsSync(xlsxDir)) {
      callback("Success: nothing to do");
      return;
    }

    const fileStats = fs.statSync(xlsxDir);
    const modifyDate = new Date(fileStats.mtimeMs);
    const fileName = `${constants.name}_${logID}_${dateFormat(
      modifyDate,
      "yyyy-mm-dd_HH-MM-ss"
    )}.${fileExtension}`;

    upload(address, folder, username, password, xlsxDir, fileName, callback);
  }

  function upload(
    address,
    folder,
    username,
    password,
    sourceFile,
    fileName,
    callback
  ) {
    if (address.endsWith(":22"))
      uploadSftp(
        address.slice(0, -3),
        folder,
        username,
        password,
        sourceFile,
        fileName,
        callback
      );
    else
      uploadFtp(
        address,
        folder,
        username,
        password,
        sourceFile,
        fileName,
        callback
      );
  }

  function uploadFtp(
    address,
    folder,
    username,
    password,
    sourceFile,
    fileName,
    callback
  ) {
    const c = new Client();
    c.on("ready", () => {
      c.mkdir(folder, true, () => {
        c.put(sourceFile, path.join(folder, fileName), (err) => {
          c.end();
          callback("Successfully uploaded " + fileName);
        });
      });
    });

    c.on("error", (err) => {
      callback(err.message);
    });

    c.connect({
      host: address,
      user: username,
      password,
    });
  }

  function uploadSftp(
    address,
    folder,
    username,
    password,
    sourceFile,
    fileName,
    callback
  ) {
    const c = new ssh2.Client();
    c.on("ready", function () {
      c.sftp(function (err, sftp) {
        sftp.fastPut(sourceFile, path.join(folder, fileName), () => {
          callback("Successfully uploaded " + fileName);
        });
      });
    });

    c.on("error", (err) => {
      callback(err.message);
    });

    c.connect({
      host: address,
      port: 22,
      username,
      password,
    });
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case "LOG_UPLOAD": {
        const { fileName, ftpIndex, callback } = lastAction.payload;
        uploadFile(ftpIndex, fileName, callback);
        if (uploadExcel) uploadDataFile(ftpIndex, callback);
        break;
      }
      case "LOG_RESET": {
        const fileName = lastAction.payload;
        if (automatic) addToBackLog(fileName);
        if (uploadExcel) addToBackLog("excel");
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
  setTimeout(tryBacklog, 60000);

  return {};
}

export default FTPModule;
