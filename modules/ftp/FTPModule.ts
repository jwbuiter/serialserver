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
  const { automatic, uploadExcel } = config;
  let { targets } = config;
  targets = targets.concat(constants.FTPtargets)
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
    // the clients can report an error after a result was already reported
    // (e.g. socket error on close), so make sure we only report once
    let reported = false;
    const once = (msg) => {
      if (reported) return;
      reported = true;
      callback(msg);
    };

    if (address.endsWith(":22"))
      uploadSftp(
        address.slice(0, -3),
        folder,
        username,
        password,
        sourceFile,
        fileName,
        once
      );
    else
      uploadFtp(
        address,
        folder,
        username,
        password,
        sourceFile,
        fileName,
        once
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
    const remotePath = path.posix.join(folder || "", fileName);

    const put = (mkdirErr?) => {
      c.put(sourceFile, remotePath, (err) => {
        c.end();
        if (err) {
          let msg = `Failed to upload ${fileName}: ${err.message}`;
          if (mkdirErr)
            msg += ` (creating folder ${folder} failed: ${mkdirErr.message})`;
          callback(msg);
          return;
        }
        callback("Successfully uploaded " + fileName);
      });
    };

    c.on("ready", () => {
      if (folder) c.mkdir(folder, true, (err) => put(err));
      else put();
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
    const remotePath = path.posix.join(folder || "", fileName);

    c.on("ready", function () {
      c.sftp(function (err, sftp) {
        if (err) {
          c.end();
          callback(`Failed to start SFTP session: ${err.message}`);
          return;
        }

        mkdirSftp(sftp, folder, () => {
          sftp.fastPut(sourceFile, remotePath, (err) => {
            c.end();
            if (err) {
              callback(`Failed to upload ${fileName}: ${err.message}`);
              return;
            }
            callback("Successfully uploaded " + fileName);
          });
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

  // Create every segment of `folder` on the SFTP server. Errors are ignored:
  // most servers return a generic failure for "already exists", and if the
  // folder really can't be created, the upload itself reports the error.
  function mkdirSftp(sftp, folder, done) {
    if (!folder) {
      done();
      return;
    }

    const segments = folder.split("/").filter((s) => s);
    let current = folder.startsWith("/") ? "/" : "";
    let i = 0;

    const next = () => {
      if (i >= segments.length) {
        done();
        return;
      }
      current = path.posix.join(current, segments[i++]);
      sftp.mkdir(current, () => next());
    };
    next();
  }

  function uploadToAllTargets(fileName, callback) {
    const indices = targets
      .map((target, index) => index)
      .filter((index) => targets[index].address);

    if (indices.length == 0) {
      callback("No FTP targets configured");
      return;
    }

    const jobs = [];
    for (const index of indices) {
      jobs.push((done) => uploadFile(index, fileName, done));
      if (uploadExcel) jobs.push((done) => uploadDataFile(index, done));
    }

    const results = [];
    let finished = 0;
    jobs.forEach((job, jobIndex) => {
      let reported = false;
      job((msg) => {
        // underlying clients may report more than once (e.g. error after put)
        if (reported) return;
        reported = true;
        results[jobIndex] = msg;
        finished++;
        if (finished == jobs.length) {
          const failed = results.filter((m) => !m.startsWith("Success"));
          if (failed.length == 0)
            callback(`Successfully uploaded ${fileName} to all FTP targets`);
          else
            callback(
              `${jobs.length - failed.length}/${jobs.length} uploads succeeded:\n` +
                failed.join("\n")
            );
        }
      });
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
      case "LOG_UPLOAD_ALL": {
        const { fileName, callback } = lastAction.payload;
        uploadToAllTargets(fileName, callback);
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
