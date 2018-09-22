const {
  ERROR_OCCURRED
} = require('../../actions/types');
const {tableColumns} = require('../../config.static');

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
    x=parseInt(x[2])-1;
    assert(x>=0 && x<store.getState().input.ports.length, 'Input index out of bounds');
  
    return 'store.getState().input.ports['+x+'].state';
  }
  
  function parseOutput(x){
    x=parseInt(x[2])-1;
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
  
    if (store.getState().serial.coms[x].factor === 0)
      return 'store.getState().serial.coms[' + x + '].entry';
    else
      return 'Number(store.getState().serial.coms[' + x + '].entry)';
  }
  
  function parseStatistic(x){
    //if (!saveArray)
     // return '0';
    
    const operator = x.slice(1,3);
    const state = store.getState();
  
    x = x.slice(3);
  
    if (isNaN(Number(x)))
      x = (x.charCodeAt(0) - 65)*tableColumns + Number(x[1]) + 2;
    else
      x = Number(x) + 1;

    
    let data = state.logger.entries.map((elem)=>Number(elem[x]));

    if (state.selfLearning.success === 0){
      return '0';
    }

    let functions = { 
      tn : (x)=> data.length,
      to : (x)=> data.reduce((acc, cur)=>acc+cur, 0),
      mi : (x)=> data.reduce((acc, cur)=>Math.min(acc, cur)),
      ma : (x)=> data.reduce((acc, cur)=>Math.max(acc, cur)),
      sp : (x)=> {
        let mean = data.reduce((acc, cur)=>acc+cur, 0) / (data.length || 1);
        let spread = data.reduce((acc, cur)=> acc + (cur - mean)*(cur - mean), 0);
        return Math.sqrt(spread / (data.length || 1));
      },
      un : (x)=> data.reduce((acc, cur)=>{
        if (acc.includes(cur)) {
          return acc;
        } else {
          acc.push(cur);
          return acc;
        }
      }, []).length,
    }

    if (store.getState().selfLearning.success)
      return functions[operator](x).toString();

    return '';
  }

  function parseSelfLearning(x){
    const property = x.slice(1);
    const state = store.getState().selfLearning;

    const properties = {
      SC: state.calibration,
      SCmin: state.calibration*(1 - state.tolerance),
      SCmax: state.calibration*(1 + state.tolerance),
      SN: state.entries.length,
      ST: (state.endTime?(state.endTime - state.startTime):(new Date() - state.startTime))/60000,
    }

    return properties[property].toString();
  }

  return {
    parse: (formula) => {
      let result;
      try {
        formula = formula
          .replace('and', '&&')
          .replace('or', '||')
          .replace(/#[A-G][0-9]/g, parseTable)
          .replace(/#I[0-9]/g, parseInput)
          .replace(/#O[0-9]/g, parseOutput)
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