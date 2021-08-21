import { getExcelDate, getExcelDateTime } from "../../utils/dateUtils";
import { IStore } from "../../store";
import { ISelfLearningState } from "../../reducers/selfLearning/selfLearningReducer";
import constants from "../../constants";
import config from "../../config";

const { tableColumns } = constants;

export default function Parser(store: IStore) {
  function assert(condition: boolean, message: string) {
    if (!condition) {
      message = message || "Assertion failed";
      if (typeof Error !== "undefined") {
        throw new Error(message);
      }
      throw message; // Fallback
    }
  }

  function parseTable(x: string) {
    const row = x.charCodeAt(1) - 65;
    const column = parseInt(x[2]);
    assert(
      row * tableColumns + column - 1 >= 0 &&
        row * tableColumns + column - 1 < store.getState().table.cells.length,
      "Out of bounds of table contents"
    );

    return (
      "store.getState().table.cells[" +
      (row * tableColumns + column - 1) +
      "].entry"
    );
  }

  function parseInput(x: string) {
    const i = parseInt(x.slice(2)) - 1;
    assert(
      i >= 0 && i < store.getState().input.ports.length,
      "Input index out of bounds"
    );

    return "store.getState().input.ports[" + i + "].state";
  }

  function parseOutput(x: string) {
    const i = parseInt(x.slice(2)) - 1;
    assert(
      i >= 0 && i < store.getState().output.ports.length,
      "Output index out of bounds"
    );

    return "store.getState().output.ports[" + i + "].state";
  }

  function parseExcel(x: string) {
    const i = x.charCodeAt(1) - 65;
    assert(i >= 0 && i <= 26, "Out of bounds of excel table");

    return "store.getState().table.foundRow[" + i + "]";
  }

  function parseCom(x: string) {
    const i = parseInt(x[3]);
    assert(
      i >= 0 && i < store.getState().serial.coms.length,
      "Com port out of bounds"
    );

    if (config.serial.coms[i].factor === 0)
      return "store.getState().serial.coms[" + i + "].entry";
    else return "Number(store.getState().serial.coms[" + i + "].entry)";
  }

  function parseStatistic(x: string) {
    const state = store.getState();

    switch (x) {
      case "&TAT":
        return String(
          state.logger.entries
            .map((entry) => Number(entry.TA))
            .reduce((acc, cur) => acc + cur, 0)
        );
      case "&TU": {
        if (state.logger.entries.length === 0) return "0";

        return Number(
          state.logger.entries[state.logger.entries.length - 1].TU
        ).toString();
      }
      case "&TA": {
        if (state.logger.entries.length === 0) return "0";

        return Number(
          state.logger.entries[state.logger.entries.length - 1].TA
        ).toString();
      }
    }

    const unique = x[3] === "U";
    const operator = x.slice(1, 3);

    x = x.slice(3 + Number(unique));

    let i: number;

    let table: boolean;
    if (x.match(/[A-E][0-9]/)) {
      table = true;
      i = (x.charCodeAt(0) - 65) * tableColumns + Number(x[1]) - 1;
    } else {
      table = false;
      i = Number(x);
    }

    const data = state.logger.entries
      .filter((entry) => entry.full)
      .filter((entry) => !unique || entry.TU !== "")
      .map((entry) => (table ? entry.cells[i] : entry.coms[i]))
      .map((entry) => Number(entry));

    const statisticFunctions: Record<string, () => number> = {
      TN: () => data.length,
      TO: () => data.reduce((acc, cur) => acc + cur, 0),
      MI: () => Math.min(...data),
      MA: () => Math.max(...data),
      SP: () => {
        const mean =
          data.reduce((acc, cur) => acc + cur, 0) / (data.length || 1);
        const spread = data.reduce(
          (acc, cur) => acc + (cur - mean) * (cur - mean),
          0
        );
        return Math.sqrt(spread / (data.length || 1));
      },
      UN: () =>
        data.reduce((acc: number[], cur) => {
          if (acc.includes(cur)) {
            return acc;
          } else {
            acc.push(cur);
            return acc;
          }
        }, []).length,
    };

    return statisticFunctions[operator]().toString();
  }

  function average(list: number[]) {
    const sum = list.reduce((acc, cur) => acc + cur, 0);

    if (typeof sum !== "number") {
      return 0;
    }

    return sum / list.length;
  }

  const selfLearningFunctions: Record<
    string,
    (
      state: ISelfLearningState,
      tolerance: number,
      calibration: number
    ) => number
  > = {
    SCT: () => config.selfLearning.totalNumber,
    SCN: () =>
      Math.round(
        (config.selfLearning.totalNumber *
          config.selfLearning.numberPercentage) /
          100
      ),
    SC: (state, tolerance, calibration) => calibration,
    SCMIN: (state, tolerance, calibration) => calibration * (1 - tolerance),
    SCMAX: (state, tolerance, calibration) => calibration * (1 + tolerance),
    SN: (state) => state.global.entries.length,
    ST: (state) =>
      (state.endTime
        ? state.endTime?.getTime() - state.startTime?.getTime()
        : new Date().getTime() - state.startTime?.getTime()) / 60000,

    SLC: (state) => state.calibration,
    SLCMIN: (state) => state.calibration * (1 - state.tolerance),
    SLCMAX: (state) => state.calibration * (1 + state.tolerance),
    SLN: (state) => Object.values(state.individual.generalEntries).length,
    SIN: (state) => Object.values(state.individual.individualEntries).length,
    SIT: (state) =>
      Object.values(state.individual.individualEntries).reduce(
        (acc, cur) => acc + cur.calibration,
        0
      ),
    SIA: (state) =>
      average(
        Object.values(state.individual.individualEntries).map(
          (entry) => entry.calibration
        )
      ),
    SIMI: (state) =>
      Math.min(
        ...Object.values(state.individual.individualEntries).map(
          (entry) => entry.calibration
        )
      ),
    SIMA: (state) =>
      Math.max(
        ...Object.values(state.individual.individualEntries).map(
          (entry) => entry.calibration
        )
      ),
    SISP: (state) => {
      const data = Object.values(state.individual.individualEntries).map(
        (entry) => entry.calibration
      );
      const mean = data.reduce((acc, cur) => acc + cur, 0) / (data.length || 1);
      const spread = data.reduce(
        (acc, cur) => acc + (cur - mean) * (cur - mean),
        0
      );
      return Math.sqrt(spread / (data.length || 1));
    },
    SIC: (state) =>
      Object.values(state.individual.individualEntries).reduce(
        (acc, cur) => acc + cur.increments,
        0
      ),
  };

  const selfLearningNumberedFunctions: Record<
    string,
    (index: number, state: ISelfLearningState) => number
  > = {
    SI: (index, state) =>
      Object.values(state.individual.individualEntries).filter(
        (entry) => entry.increments === index
      ).length,
    SIT: (index, state) =>
      Object.values(state.individual.individualEntries).reduce(
        (acc, cur) => acc + Number(cur.extra[index - 3]),
        0
      ),
    SIA: (index, state) =>
      average(
        Object.values(state.individual.individualEntries).map((entry) =>
          Number(entry.extra[index - 3])
        )
      ),
  };

  function parseSelfLearning(x: string) {
    const property = x.slice(1);
    const state = store.getState().selfLearning;

    const isNumbered = property.match(/[0-9]+$/);

    if (isNumbered) {
      const index = Number(isNumbered[0]);
      const numberedProperty = property.slice(0, -1);

      return selfLearningNumberedFunctions[numberedProperty](
        index,
        state
      ).toString();
    }

    let tolerance, calibration;

    if (state.type === "individual") {
      const key = store.getState().serial.coms[1 - state.comIndex].entry;

      if (key in state.individual.individualEntries) {
        calibration = state.individual.individualEntries[key].calibration;
        tolerance =
          state.individual.individualEntries[key].tolerance / calibration;

        // individualToleranceShift only affects learned entries in individual mode and only SCMAX and SCMIN
        const shift = config.selfLearning.individualToleranceShift / 100;
        switch (property) {
          case "SCMAX": {
            tolerance *= 1 + shift;
            break;
          }
          case "SCMIN": {
            tolerance *= 1 - shift;
            break;
          }
        }
      } else {
        tolerance = state.tolerance;
        calibration = state.calibration;
      }
    } else {
      tolerance = state.tolerance;
      calibration = state.calibration;
    }

    if (state.teaching) {
      calibration = state.calibration;
      switch (property) {
        case "SCMAX": {
          tolerance = 1;
          break;
        }
        case "SCMIN": {
          tolerance = 0.5;
          break;
        }
      }
    }

    return selfLearningFunctions[property](
      state,
      tolerance,
      calibration
    ).toString();
  }

  return {
    parse: (formula: string) => {
      let result;
      try {
        formula = formula
          .toUpperCase()
          .replace(/ AND /g, " && ")
          .replace(/ OR /g, " || ")
          .replace(/#[A-G][0-9]/g, parseTable)
          .replace(/#I[0-9]+/g, parseInput)
          .replace(/#O[0-9]+/g, parseOutput)
          .replace(/\$[A-Z]/g, parseExcel)
          .replace(/COM[0-9]/g, parseCom)
          .replace(/\&[A-Z0-9]+/g, parseStatistic)
          .replace(/#\w+[0-9]*/g, parseSelfLearning)
          .replace(/DATETIME/g, () => String(getExcelDateTime()))
          .replace(/DATE/g, () => String(getExcelDate()));
        result = eval(formula);
      } catch (err) {
        store.dispatch({
          type: "ERROR_OCCURRED",
          payload: err,
        });
      }
      return typeof result === "undefined" ? "" : result;
    },
  };
}
