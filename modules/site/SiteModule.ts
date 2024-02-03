import express from "express";
import fileUpload from "express-fileupload";
import path from "path";
import zip from "express-easy-zip";
import fs from "fs";
import { exec } from "child_process";
import dateFormat from "dateformat";

import constants from "../../constants";
import fullConfig from "../../config";
import { IStore } from "../../store";
import Realtime from "./Realtime";
import { createLogLine } from "../../utils/logUtils";

const app = express();
app.use(zip());
const logPath = constants.saveLogLocation;
const titleString = "<title>" + constants.name + "</title>";

function SiteModule(config, store: IStore) {
  const { fileExtension } = store.getState().config.table;

  function saveFile(
    req,
    res,
    filename: string,
    targetFilename: string,
    action: () => void = () => {}
  ) {
    console.log(req.files, filename, targetFilename);
    if (!req.files[filename]) {
      return res
        .status(400)
        .send(
          titleString +
            '<meta http-equiv="refresh" content="1; url=/" />No files were uploaded.'
        );
    }

    let uploadedFile = req.files[filename];

    uploadedFile.mv(targetFilename, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(
        titleString +
          '<meta http-equiv="refresh" content="5; url=/" /> File uploaded.'
      );
      action();
    });
  }

  function importExcel(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    saveFile(
      req,
      res,
      "excelFile",
      path.join(constants.baseDirectory, "data", "data." + fileExtension),
      () => {
        store.dispatch({
          type: "LOG_BACKUP",
        });
      }
    );
  }

  function updateExcel(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    saveFile(
      req,
      res,
      "excelFile",
      path.join(constants.baseDirectory, "data", "temp." + fileExtension),
      () => {
        console.log("start update");
        store.dispatch({
          type: "EXCEL_UPDATE",
        });
      }
    );
  }

  function importExcelTemplate(req, res) {
    saveFile(
      req,
      res,
      "templateFile",
      path.join(constants.baseDirectory, "data", "template." + fileExtension)
    );
  }

  function uploadConfig(req, res) {
    saveFile(
      req,
      res,
      "configFile",
      path.join(constants.baseDirectory, "configs", req.files.configFile.name)
    );
  }

  const functionRoutes = {
    "/static": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.send(constants);
    },
    "/slstate": (req, res) => {
      res.send(JSON.stringify(store.getState().selfLearning, null, 2));
    },
    "/config": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.send(fullConfig);
    },
    "/com": (req, res) =>
      res.send(store.getState().input.executing ? "1" : "0"),
    "/coml": (req, res) => {
      res.send(createLogLine(store.getState().logger));
    },
    "/comlog": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      const loggerState = store.getState().logger;
      const entries = loggerState.entries.slice().reverse();

      res.send(
        JSON.stringify(
          {
            ...loggerState,
            entries,
          },
          null,
          2
        )
      );
    },
    "/comlogu": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      const loggerState = store.getState().logger;
      const entries = loggerState.entries
        .filter((entry) => entry.TU !== "")
        .reverse();

      res.send(
        JSON.stringify(
          {
            ...loggerState,
            entries,
          },
          null,
          2
        )
      );
    },
    "/downloadExcel": (req, res) => {
      res.header(`Access-Control-Allow-Origin`, `*`);
      const logID = store.getState().config.logger.logID;
      const fileName = `${constants.name}_${logID}.${fileExtension}`;
      res.download(
        path.join(constants.baseDirectory, "data", "data." + fileExtension),
        fileName
      );
    },
    "/downloadConfig": (req, res) =>
      res.download(
        path.join(constants.baseDirectory, "configs", req.query.file)
      ),
    "/downloadLog": (req, res) => {
      if (req.query.multiFile) {
        const files = req.query.multiFile.split(",").map((element) => ({
          path: path.join(logPath, element),
          name: element,
        }));
        const logID = store.getState().config.logger.logID;
        const date = dateFormat(new Date(), "yyyy-mm-dd_HH-MM-ss");

        res.zip({ files, filename: `${constants.name}_${logID}_${date}.zip` });
      } else if (req.query.file) {
        res.download(path.join(logPath, req.query.file));
      } else {
        res.download(path.join(logPath, store.getState().logger.logFileName));
      }
    },
    "/shutdown": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.send(titleString + "Shutting down now.");
      exec("shutdown now", (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          return;
        }
      });
    },
    "/restart": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.send(
        titleString +
          '<meta http-equiv="refresh" content="5; url=/" />Restarting now.'
      );
      store.dispatch({
        type: "RESTART",
      });
    },
    "/hard_reboot": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      res.send(
        titleString +
          '<meta http-equiv="refresh" content="5; url=/" />Hard rebooting now.'
      );
      store.dispatch({
        type: "HARD_REBOOT",
      });
    },
    "/logo": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );

      const logo = path.join(constants.baseDirectory, "logo", "logo.jpg");
      if (fs.existsSync(logo)) res.sendFile(logo);
      else {
        res.status(404);
        res.send("No logo");
      }
    },
  };

  function addTableRoute(i, j) {
    functionRoutes[`/${String.fromCharCode(65 + i)}${j + 1}`] = (req, res) => {
      res.send(String(store.getState().table.cells[i * 5 + j].entry));
    };
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 5; j++) {
      addTableRoute(i, j);
    }
  }

  function addIORoutes(i) {
    functionRoutes[`/I${i + 1}`] = (req, res) => {
      res.send(String(Number(store.getState().input.ports[i].state)));
    };
    functionRoutes[`/O${i + 1}`] = (req, res) => {
      res.send(String(Number(store.getState().output.ports[i].state)));
    };
  }

  for (let i = 0; i < 10; i++) {
    addIORoutes(i);
  }

  const uploadRoutes = {
    "/importFile": importExcel,
    "/importExcel": importExcel,
    "/updateExcel": updateExcel,
    "/importTemplate": importExcelTemplate,
    "/uploadConfig": uploadConfig,
  };

  app.use(
    "/",
    express.static(path.join(constants.baseDirectory, "client2", "build"))
  );

  for (let route in functionRoutes) {
    app.get(route, functionRoutes[route]);
  }

  for (let i = 0; i < store.getState().serial.coms.length; i++) {
    app.get("/com" + i, (req, res) => {
      const com = store.getState().serial.coms[i];
      let sendString = "";
      if (com.average === "") {
        sendString += com.entry;
      } else {
        sendString += com.average;
      }
      res.send(sendString);
    });

    for (let route in uploadRoutes) {
      app.use(route, fileUpload());
      app.post(route, uploadRoutes[route]);
    }
  }

  const server = app.listen(constants.port, () =>
    console.log("Server listening on port " + constants.port)
  );
  const realtime = new Realtime(server, {}, store);

  return {};
}

export default SiteModule;
