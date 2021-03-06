import http from "http";

import { IStore } from "../../store";
import Parser from "../parser/Parser";

export default function Cell(index: number, config: any, store: IStore) {
  const {
    formula,
    digits,
    numeric,
    resetOnExe,
    waitForOther,
    type,
    menuOptions,
    colorConditions,
    readerPort,
  } = config;
  const manual = type === "manual" || type === "menu" || type === "reader";
  const myParser = Parser(store);

  let content: string | number = "";
  let color: string = "";

  if (type === "reader" && readerPort) {
    const server = http.createServer((req, res) => {
      if (req.url === "/favicon.ico") {
        res.end();
        return;
      }
      const entry = decodeURI(req.url.slice(1));

      dispatch(entry);

      res.end();
    });
    server.on("error", (err) => {
      store.dispatch({
        type: "ERROR_OCCURRED",
        payload: err,
      });
    });

    server.listen(readerPort);
  }

  function resetCell() {
    color = "";
    if (type === "menu" && menuOptions[0]) {
      content = menuOptions[0].key;
      store.dispatch({
        type: "TABLE_ENTRY",
        payload: {
          index,
          entry: content,
        },
      });
    } else {
      content = "";
      store.dispatch({
        type: "TABLE_RESET_CELL",
        payload: index,
      });
    }
    store.dispatch({
      type: "TABLE_EMIT",
      payload: {
        index,
        entry: content,
        manual,
      },
    });
  }

  function dispatch(entry: string | number) {
    if (numeric) {
      entry = +Number(entry).toFixed(digits);
    } else if (typeof entry === "boolean") {
      entry = entry ? 1 : 0;
    } else {
      entry = String(entry).slice(-digits);
    }

    store.dispatch({
      type: "TABLE_ENTRY",
      payload: {
        index,
        entry,
      },
    });

    if (
      entry !== content &&
      !(typeof entry == "number" && Number.isNaN(entry))
    ) {
      content = entry;
      store.dispatch({
        type: "TABLE_EMIT",
        payload: {
          index,
          entry,
          manual,
        },
      });
      store.dispatch({
        type: "STATE_CHANGED",
      });
    }
  }

  function dispatchColor() {
    let newColor = "";
    for (let option of colorConditions) {
      if (myParser.parse(option.value)) {
        newColor = option.key;
        break;
      }
    }

    if (newColor !== color) {
      color = newColor;
      store.dispatch({
        type: "TABLE_COLOR",
        payload: {
          index,
          color,
        },
      });
    }
  }

  store.listen((lastAction) => {
    const state = store.getState();
    switch (lastAction.type) {
      case "STATE_CHANGED":
      case "HANDLE_TABLE": {
        const allEntries = state.serial.coms.reduce(
          (acc, cur) => acc && !(cur.entry === "0" || cur.entry === ""),
          true
        );
        if (!manual && (!waitForOther || allEntries)) {
          let entry = myParser.parse(formula);
          dispatch(entry);
        }

        dispatchColor();
        break;
      }
      case "LOG_RESET": {
        resetCell();
        break;
      }
      case "TABLE_RESET": {
        if (resetOnExe) {
          resetCell();
        }
        break;
      }
    }
  });

  resetCell();
}
