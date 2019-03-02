const {
  ERROR_OCCURRED
} = require('../../actions/types');
const {tableColumns} = require('../../config.static');
const config = require('../../configs/current');

function Parser(store){

  function assert(condition, message){
    if (!condition){
      message = message || "Assertion failed";
      if (typeof Error !== "undefined") {
        throw new Error(message);
      }
      throw message; // Fallback
    }
  }
  
  function parseTable(x){
    let row = x.charCodeAt(1) - 65;
    let column = parseInt(x[2]);
    assert((row*tableColumns + column - 1)>=0 && (row*tableColumns + column - 1)<store.getState().table.cells.length, 'Out of bounds of table contents');
  
    return 'store.getState().table.cells[' + (row*tableColumns + column - 1) + '].entry';
  }
  
  function parseInput(x){
    x=parseInt(x.slice(2))-1;
    assert(x>=0 && x<store.getState().input.ports.length, 'Input index out of bounds');
  
    return 'store.getState().input.ports['+x+'].state';
  }
  
  function parseOutput(x){
    x=parseInt(x.slice(2))-1;
    assert(x>=0 && x<store.getState().output.ports.length, 'Output index out of bounds');
  
    return 'store.getState().output.ports['+x+'].state';
  }
  
  function parseExcel(x){
    x = x.charCodeAt(1) - 65;
    assert(x>=0 && x<=26, 'Out of bounds of excel table');
  
    return 'store.getState().table.foundRow['+x+']';
  }
  
  function parseCom(x){
    x=parseInt(x[3]);
    assert(x>=0 && x<store.getState().serial.coms.length, 'Com port out of bounds');

    if (config.serial.coms[x].factor === 0)
      return 'store.getState().serial.coms[' + x + '].entry';
    else
      return 'Number(store.getState().serial.coms[' + x + '].entry)';
  }

  function parseStatistic(x){
    const state = store.getState();
    
    const unique = x.includes('U');
    const operator = x.slice(1,3);

    x = x.slice(-2);
  
    if (x.match(/[A-E][0-9]/))
      x = (x.charCodeAt(0) - 65)*tableColumns + Number(x[1]) + 4;
    else
      x = Number(x[1]) + 3;

    let data;
    if (unique)
      data = state.logger.entries
        .filter(entry=>entry[entry.length-1] !== '' )
        .map(entry => entry.map(val =>Number(val)));
    else
      data = state.logger.entries.map(entry => entry.map(val =>Number(val)));

    const statisticFunctions = { 
      tn : (x)=> data.length,
      to : (x)=> data.map(entry => entry[x]).reduce((acc, cur)=>acc+cur, 0),
      mi : (x)=> Math.min(...data.map(entry => entry[x])),
      ma : (x)=> Math.max(...data.map(entry => entry[x])),
      sp : (x)=> {
        data = data.map(entry => entry[x])
        const mean = data.reduce((acc, cur)=>acc+cur, 0) / (data.length || 1);
        const spread = data.reduce((acc, cur)=> acc + (cur - mean)*(cur - mean), 0);
        return Math.sqrt(spread / (data.length || 1));
      },
      un : (x)=> data.map(entry => entry[x]).reduce((acc, cur)=>{
        if (acc.includes(cur)) {
          return acc;
        } else {
          acc.push(cur);
          return acc;
        }
      }, []).length,
      TU : (x)=> {
        if (data.length === 0) return '0';
        const lastEntry = data[data.length-1];
        return lastEntry[lastEntry.length-1];
      },
    }

    return statisticFunctions[operator](x).toString();
  }

  const selfLearningFunctions = {
    SC: (state, tolerance, calibration) => calibration,
    SCmin: (state, tolerance, calibration) => calibration*(1 - tolerance),
    SCmax: (state, tolerance, calibration) => calibration*(1 + tolerance),
    SN: (state) => state.global.entries.length,
    ST: (state) => (state.endTime?(state.endTime - state.startTime):(new Date() - state.startTime))/60000,
    SIN: (state) => Object.values(state.individual.individualEntries).length,
    SIC: (state) => Object.values(state.individual.individualEntries).reduce((acc, cur) => acc + cur.increments, 0),
    SIT: (state) => Object.values(state.individual.individualEntries).reduce((acc, cur) => acc + cur.calibration, 0),
    SImi: (state) => Math.min(...Object.values(state.individual.individualEntries).map(entry => entry.calibration)),
    SIma: (state) => Math.max(...Object.values(state.individual.individualEntries).map(entry => entry.calibration)),
    SIsp: (state) => {
      const data = Object.values(state.individual.individualEntries).map(entry => entry.calibration)
      const mean = data.reduce((acc, cur)=>acc+cur, 0) / (data.length || 1);
      const spread = data.reduce((acc, cur)=> acc + (cur - mean)*(cur - mean), 0);
      return Math.sqrt(spread / (data.length || 1));
    },
    SSN: (state) => Object.values(state.individual.generalEntries).length,
    SST: (state) => Object.values(state.individual.generalEntries).reduce((acc, cur) => acc + cur[0], 0),
    SI0: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===0).length,
    SI1: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===1).length,
    SI2: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===2).length,
    SI3: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===3).length,
    SI4: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===4).length,
    SI5: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===5).length,
    SI6: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===6).length,
    SI7: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===7).length,
    SI8: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===8).length,
    SI9: (state) => Object.values(state.individual.individualEntries).filter(entry=>entry.increments===9).length,
  }

  function parseSelfLearning(x){
    const property = x.slice(1);
    const state = store.getState().selfLearning;

    let tolerance, calibration;

    if (state.type==='individual'){
      const key = store.getState().serial.coms[1-state.comIndex].entry;

      if (key in state.individual.individualEntries){
        calibration = state.individual.individualEntries[key].calibration;
        tolerance = state.individual.individualEntries[key].tolerance/calibration;
      } else {
        tolerance = state.tolerance;
        calibration = state.calibration;
      }
    } else {
      tolerance = state.tolerance;
      calibration = state.calibration;
    }

    if (state.teaching){
      switch (property){
        case 'SCmax':{
          tolerance = 1;
          break;
        }
        case 'SCmin': {
          tolerance = 0.5;
          break;
        }
      }
    }
    
    return selfLearningFunctions[property](state, tolerance, calibration).toString();
  }

  return {
    parse: (formula) => {
      let result;
      try {
        formula = formula
          .replace('and', '&&')
          .replace('or', '||')
          .replace(/#[A-G][0-9]/g, parseTable)
          .replace(/#I[0-9]+/g, parseInput)
          .replace(/#O[0-9]+/g, parseOutput)
          .replace(/\$[A-Z]/g, parseExcel)
          .replace(/com[0-9]/g, parseCom)
          .replace(/\&[a-zA-Z0-9]+/g, parseStatistic)
          .replace(/#\w+/g, parseSelfLearning)
          .replace(/date/g, (new Date().getTime()/1000/86400 + 25569).toString());
        result = eval(formula);
      }
      catch (err) {
        store.dispatch({
          type: ERROR_OCCURRED, 
          payload: err
        });
      }
      return (typeof(result)==='undefined')?'':result;
    },
  }
}

module.exports = Parser;