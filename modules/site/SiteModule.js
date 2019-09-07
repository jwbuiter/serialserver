const express = require("express");
const fileUpload = require("express-fileupload");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const dateFormat = require("dateformat");

const { RESTART, LOG_BACKUP } = require("../../actions/types");
const Realtime = require("./Realtime");
const constants = require("../../config.static");

const app = express();
const clientPath = "../../client";
const logoPath = "../../logo";
const logPath = constants.saveLogLocation;
const titleString = "<title>" + constants.name + "</title>";

function SiteModule(config, store) {
  function importExcel(req, res) {
    console.log(req.files);
    if (!req.files.excelFile) {
      return res.send(
        titleString +
          '<meta http-equiv="refresh" content="1; url=/" />No files were uploaded.'
      );
    }

    let uploadedFile = req.files.excelFile;

    uploadedFile.mv(path.join(__dirname, "../..", "data", "data.xls"), err => {
      if (err) {
        return res.status(500).send(err);
      }
      res.send(
        titleString +
          '<meta http-equiv="refresh" content="5; url=/" /> File uploaded.'
      );
      store.dispatch({
        type: LOG_BACKUP
      });
    });
  }

  function importExcelTemplate(req, res) {
    console.log(req.files);
    if (!req.files.templateFile) {
      return res.send(
        titleString +
          '<meta http-equiv="refresh" content="1; url=/" />No files were uploaded.'
      );
    }

    let uploadedFile = req.files.templateFile;

    uploadedFile.mv(
      path.join(__dirname, "../..", "data", "template.xls"),
      err => {
        if (err) {
          return res.status(500).send(err);
        }
        res.send(
          titleString +
            '<meta http-equiv="refresh" content="5; url=/" /> File uploaded.'
        );
      }
    );
  }

  function uploadConfig(req, res) {
    console.log(req.files);

    if (!req.files.configFile) {
      return res.send(
        titleString +
          '<meta http-equiv="refresh" content="1; url=/" /> No files were uploaded.'
      );
    }

    let uploadedFile = req.files.configFile;

    uploadedFile.mv(
      path.join(__dirname, "../..", "configs", uploadedFile.name),
      err => {
        if (err) {
          return res.status(500).send(err);
        }

        res.send(
          titleString +
            '<meta http-equiv="refresh" content="1; url=/" /> Config uploaded.'
        );
      }
    );
  }

  const staticRoutes = {
    "/": "client.html",
    "/current.json": "../configs/current.json",
    "/config.static.json": "../config.static.json"
  };

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
      res.send(
        require(path.join(__dirname, "../..", "configs", "current.json"))
      );
    },
    "/com": (req, res) =>
      res.send(titleString + (store.getState().input.executing ? "1" : "0")),
    "/coml": (req, res) => {
      const loggerState = store.getState().logger;
      const entries = loggerState.entries.slice(-1);
      const legend = loggerState.legend;
      const accessors = loggerState.accessors;

      res.send(
        JSON.stringify(
          {
            entries,
            legend,
            accessors
          },
          null,
          2
        )
      );
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
            entries
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
        .filter(entry => entry.TU !== "")
        .reverse();

      res.send(
        JSON.stringify(
          {
            ...loggerState,
            entries
          },
          null,
          2
        )
      );
    },
    "/downloadExcel": (req, res) => {
      const logID = store.getState().config.logger.logID;
      const fileName = `${constants.name}_${logID}.xls`;
      res.download(path.join(__dirname, "../../data/data.xls"), fileName);
    },
    "/downloadConfig": (req, res) =>
      res.download(path.join(__dirname, "../..", "configs", req.query.file)),
    "/downloadLog": (req, res) => {
      if (req.query.multiFile) {
        const fileList = req.query.multiFile.split(",").map(element => ({
          path: path.join(logPath, element),
          name: element
        }));
        const logID = store.getState().config.logger.logID;
        const date = dateFormat(new Date(), "yyyy-mm-dd_HH-MM-ss");

        res.zip(fileList, `${constants.name}_${logID}_${date}.zip`);
      } else if (req.query.file) {
        res.download(path.join(logPath, req.query.file));
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
        type: RESTART
      });
      process.exit();
    },
    "/logo": (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );

      const logo = path.join(__dirname, logoPath, "logo.jpg");
      if (fs.existsSync(logo)) res.sendFile(logo);
      else {
        res.status(404);
        res.send("No logo");
      }
    }
  };

  const uploadRoutes = {
    "/importFile": importExcel,
    "/importExcel": importExcel,
    "/importTemplate": importExcelTemplate,
    "/uploadConfig": uploadConfig
  };

  app.use("/", express.static("client2/build"));

  for (let route in staticRoutes) {
    app.get(route, (req, res) => {
      res.sendFile(path.join(__dirname, clientPath, staticRoutes[route]));
    });
  }

  for (let route in functionRoutes) {
    app.get(route, functionRoutes[route]);
  }

  for (let i = 0; i < store.getState().serial.coms.length; i++) {
    app.get("/com" + i, (req, res) => {
      const com = store.getState().serial.coms[i];
      let sendString = titleString;
      console.log(store.getState().serial);

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

module.exports = SiteModule;
