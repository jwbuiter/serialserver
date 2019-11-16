const fs = require("fs");
const XLSX = require("xlsx");
const schedule = require("node-schedule");
const dateFormat = require("dateformat");
const path = require("path");

const constants = require("../../config.static");
const backupPath = path.join(constants.saveLogLocation, "backup.json");

const {
  STATE_CHANGED,
  LOG_ENTRY,
  LOG_MAKE_ENTRY,
  LOG_MAKE_PARTIAL,
  LOG_RESET,
  LOG_OVERWRITE,
  LOG_UNIQUE_OVERWRITE,
  LOG_ACTIVITY_OVERWRITE,
  LOG_SAVE,
  LOG_BACKUP,
  LOG_RECOVER,
  RESTART
} = require("../../actions/types");

function LoggerModule(config, store) {
  const {
    resetTime,
    resetInterval,
    resetMode,
    writeToFile,
    logID,
    unique
  } = config;
  const { activityCounter, enabled } = store.getState().config.selfLearning;
  const activityIndex = 1 - Number(enabled[3]);

  let fileName;

  function resetLog() {
    if (fileName)
      store.dispatch({
        type: LOG_RESET,
        payload: fileName
      });
    fileName = `${constants.name}_${logID}_${dateFormat(
      new Date(),
      "yyyy-mm-dd_HH-MM-ss"
    )}.csv`;
  }

  resetLog();

  if (fs.existsSync(backupPath)) {
    try {
      const backup = require(backupPath);
      fs.unlinkSync(backupPath);
      store.dispatch({
        type: LOG_RECOVER,
        payload: backup
      });
    } catch (err) {
      console.log(err);
    }
  }

  switch (resetMode) {
    case "interval": {
      setInterval(() => {
        resetLog();
      }, resetInterval * 60 * 1000);
      break;
    }
    case "time": {
      const time = resetTime.split(":");
      schedule.scheduleJob(time[1] + " " + time[0] + " * * *", () => {
        resetLog();
      });
      break;
    }
  }

  function updateActivity(activityEntry, full) {
    const logEntries = store.getState().logger.entries;
    const oldEntry = logEntries.find(
      entry => entry.coms[activityIndex] === activityEntry && entry.TA
    );

    if (!oldEntry) {
      store.dispatch({
        type: LOG_ACTIVITY_OVERWRITE,
        payload: {
          index: logEntries.length - 1,
          newValue: 1
        }
      });
      return;
    }

    const TA = logEntries.filter(
      entry => entry.coms[activityIndex] === activityEntry
    ).length;
    const oldIndex = logEntries.findIndex(
      entry => entry.coms[activityIndex] === activityEntry && entry.TA
    );
    const newIndex = full || !oldEntry.full ? logEntries.length - 1 : oldIndex;

    if (oldIndex !== newIndex) {
      store.dispatch({
        type: LOG_ACTIVITY_OVERWRITE,
        payload: {
          index: oldIndex,
          newValue: ""
        }
      });
    }

    store.dispatch({
      type: LOG_ACTIVITY_OVERWRITE,
      payload: {
        index: newIndex,
        newValue: TA
      }
    });
  }

  store.listen(lastAction => {
    switch (lastAction.type) {
      case LOG_MAKE_ENTRY: {
        const state = store.getState();

        const newRow = {
          name: constants.name,
          id: logID,
          date: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
          coms: state.serial.coms.map(com =>
            com.numeric ? Number(com.entry) : com.entry
          ),
          cells: state.table.cells.map(cell =>
            cell.numeric ? Number(cell.entry) : cell.entry
          ),
          TU: "",
          TA: "",
          full: true
        };

        if (unique !== "off") {
          const uniqueIndex = Number(unique.slice(-1));
          const comValue = state.serial.coms[uniqueIndex].entry;
          let uniqueTimes = 1;

          foundOther = state.logger.entries.reduce((found, entry, index) => {
            if (entry.coms[uniqueIndex] === comValue && entry.TU !== "") {
              uniqueTimes = entry.TU + 1;
              return index;
            }
            return found;
          }, -1);

          if (foundOther !== -1) {
            store.dispatch({
              type: LOG_UNIQUE_OVERWRITE,
              payload: foundOther
            });
          }

          newRow.TU = uniqueTimes;
        }

        if (activityCounter) {
          store.dispatch({
            type: LOG_OVERWRITE,
            payload: newRow
          });
          updateActivity(state.serial.coms[activityIndex].entry, true);
        } else {
          store.dispatch({
            type: LOG_ENTRY,
            payload: newRow
          });
        }

        store.dispatch({
          type: LOG_SAVE,
          payload: fileName
        });

        store.dispatch({
          type: STATE_CHANGED
        });
        break;
      }
      case LOG_MAKE_PARTIAL: {
        const { index, entry } = lastAction.payload;
        const state = store.getState();

        const newRow = {
          name: constants.name,
          id: logID,
          date: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
          coms: state.serial.coms
            .map(com => (com.numeric ? Number(com.entry) : com.entry))
            .map((entry, comIndex) => (comIndex === index ? entry : "")),
          cells: state.table.cells.map(cell => ""),
          TU: "",
          TA: "",
          full: false
        };

        store.dispatch({
          type: LOG_ENTRY,
          payload: newRow
        });

        updateActivity(entry, false);

        store.dispatch({
          type: LOG_SAVE,
          payload: fileName
        });

        store.dispatch({
          type: STATE_CHANGED
        });
        break;
      }
      case LOG_SAVE: {
        if (!writeToFile) break;
        const fileName = lastAction.payload;
        const state = store.getState();
        const saveArray = [state.logger.legend].concat(
          state.logger.entries.map(entry => [
            entry.name,
            entry.id,
            entry.date,
            ...entry.coms,
            ...entry.cells,
            entry.TU,
            entry.TA
          ])
        );

        const ws = XLSX.utils.aoa_to_sheet(saveArray);
        const csvFile = XLSX.utils.sheet_to_csv(ws, {
          FS: config.csvSeparator
        });
        fs.writeFileSync(
          path.join(constants.saveLogLocation, fileName),
          csvFile
        );
        break;
      }
      case LOG_BACKUP: {
        const logger = store.getState().logger;

        fs.writeFile(backupPath, JSON.stringify(logger), "utf8", err => {
          if (err) {
            console.log(err);
          }

          store.dispatch({
            type: RESTART
          });
        });
        break;
      }
    }
  });

  return {};
}

module.exports = LoggerModule;
