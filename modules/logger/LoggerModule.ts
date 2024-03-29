import fs from "fs";
import XLSX from "xlsx";
import schedule from "node-schedule";
import dateFormat from "dateformat";
import path from "path";

import constants from "../../constants";
import { IEntry } from "../../reducers/loggerReducer";
import { ILoggerConfig } from "../../config";
import { IStore } from "../../store";

const backupPath = path.join(constants.saveLogLocation, "backup.json");

function LoggerModule(config: ILoggerConfig, store: IStore) {
  const { resetTime, resetInterval, resetMode, writeToFile, logID, unique } =
    config;
  const { activityCounter, enabled } = store.getState().config.selfLearning;
  const uniqueIndex = Number(unique.slice(-1));
  const activityIndex = 1 - Number(enabled[3]);

  let fileName: string;

  function resetLog(onBoot: boolean) {
    if (fileName)
      store.dispatch({
        type: "LOG_RESET",
        payload: fileName,
      });
    fileName = `${constants.name}_${logID}_${dateFormat(
      new Date(),
      "yyyy-mm-dd_HH-MM-ss"
    )}.csv`;

    store.dispatch({
      type: "LOG_SET_FILE",
      payload: fileName,
    });

    if (!onBoot && constants.autoResetHard)
      setTimeout(() => {
        store.dispatch({
          type: "HARD_REBOOT",
        });
      }, 1000);
  }

  resetLog(true);

  if (fs.existsSync(backupPath)) {
    try {
      const backup = require(backupPath);
      fs.unlinkSync(backupPath);
      store.dispatch({
        type: "LOG_RECOVER",
        payload: backup,
      });
    } catch (err) {
      console.log(err);
    }
  }

  switch (resetMode) {
    case "interval": {
      setInterval(() => {
        resetLog(false);
      }, resetInterval * 60 * 1000);
      break;
    }
    case "time": {
      const time = resetTime.split(":");
      schedule.scheduleJob(time[1] + " " + time[0] + " * * *", () => {
        resetLog(false);
      });
      break;
    }
  }

  function updateActivity(activityEntry, full, index) {
    const logEntries = store.getState().logger.entries;
    const oldEntry = logEntries.find(
      (entry) => entry.coms[index] === activityEntry && entry.TA
    );

    if (!oldEntry) {
      store.dispatch({
        type: "LOG_ACTIVITY_OVERWRITE",
        payload: {
          index: logEntries.length - 1,
          newValue: 1,
        },
      });
      return;
    }

    const TA = logEntries.filter(
      (entry) => entry.coms[index] === activityEntry
    ).length;
    const oldIndex = logEntries.findIndex(
      (entry) => entry.coms[index] === activityEntry && entry.TA
    );
    const newIndex = full || !oldEntry.full ? logEntries.length - 1 : oldIndex;

    if (oldIndex !== newIndex) {
      store.dispatch({
        type: "LOG_ACTIVITY_OVERWRITE",
        payload: {
          index: oldIndex,
          newValue: "",
        },
      });
    }

    store.dispatch({
      type: "LOG_ACTIVITY_OVERWRITE",
      payload: {
        index: newIndex,
        newValue: TA,
      },
    });
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case "LOG_MAKE_ENTRY": {
        const state = store.getState();

        const newRow: IEntry = {
          name: constants.name,
          id: logID,
          date: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
          coms: state.serial.coms.map((com) =>
            com.numeric ? Number(com.entry) : com.entry
          ),
          cells: state.table.cells.map((cell) =>
            cell.numeric ? Number(cell.entry) : cell.entry
          ),
          TU: "",
          TA: "",
          list: "",
          full: true,
        };

        if (!Number.isNaN(uniqueIndex)) {
          const comValue = state.serial.coms[uniqueIndex].entry;
          let uniqueTimes = 1;

          let foundOther = state.logger.entries.reduce(
            (found, entry, index) => {
              if (entry.coms[uniqueIndex] === comValue && entry.TU !== "") {
                uniqueTimes = entry.TU + 1;
                return index;
              }
              return found;
            },
            -1
          );

          if (foundOther !== -1) {
            store.dispatch({
              type: "LOG_UNIQUE_OVERWRITE",
              payload: foundOther,
            });
          }

          newRow.TU = uniqueTimes;
        }

        if (!Number.isNaN(activityIndex) && activityCounter) {
          store.dispatch({
            type: "LOG_OVERWRITE",
            payload: newRow,
          });
          updateActivity(
            state.serial.coms[activityIndex].entry,
            true,
            activityIndex
          );
        } else if (!Number.isNaN(uniqueIndex) && activityCounter) {
          store.dispatch({
            type: "LOG_ENTRY",
            payload: newRow,
          });
          updateActivity(
            state.serial.coms[uniqueIndex].entry,
            true,
            uniqueIndex
          );
        } else {
          store.dispatch({
            type: "LOG_ENTRY",
            payload: newRow,
          });
        }

        store.dispatch({
          type: "LOG_SAVE",
        });

        store.dispatch({
          type: "STATE_CHANGED",
        });
        break;
      }
      case "LOG_MAKE_PARTIAL": {
        const { index, entry } = lastAction.payload;
        const state = store.getState();

        const newRow: IEntry = {
          name: constants.name,
          id: logID,
          date: dateFormat(new Date(), "yyyy-mm-dd HH:MM:ss"),
          coms: state.serial.coms
            .map((com) => (com.numeric ? Number(com.entry) : com.entry))
            .map((entry, comIndex) => (comIndex === index ? entry : "")),
          cells: state.table.cells.map((cell) => ""),
          TU: "",
          TA: "",
          list: "",
          full: false,
        };

        store.dispatch({
          type: "LOG_ENTRY",
          payload: newRow,
        });

        updateActivity(entry, false, activityIndex);

        store.dispatch({
          type: "LOG_SAVE",
          payload: fileName,
        });

        store.dispatch({
          type: "STATE_CHANGED",
        });
        break;
      }
      case "LOG_LIST_OVERWRITE":
      case "LOG_SAVE": {
        if (!writeToFile) break;
        const state = store.getState();
        const saveArray = [state.logger.legend].concat(
          state.logger.entries.map((entry) => [
            entry.name,
            entry.id,
            entry.date,
            ...entry.coms.map((val) => String(val)),
            ...entry.cells.map((val) => String(val)),
            String(entry.TU),
            String(entry.TA),
            String(entry.list),
          ])
        );

        const ws = XLSX.utils.aoa_to_sheet(saveArray);
        const csvFile = XLSX.utils.sheet_to_csv(ws, {
          FS: config.csvSeparator,
        });
        fs.writeFileSync(
          path.join(constants.saveLogLocation, fileName),
          csvFile
        );
        break;
      }
      case "LOG_BACKUP": {
        const logger = store.getState().logger;

        fs.writeFile(backupPath, JSON.stringify(logger), "utf8", (err) => {
          if (err) {
            console.log(err);
          }

          store.dispatch({
            type: "RESTART",
          });
        });
        break;
      }
    }
  });

  return {};
}

export default LoggerModule;
