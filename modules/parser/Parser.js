const {
  ERROR_OCCURRED
} = require('../../actions/types');
const {tableColumns} = require('../../config.static');

function assert(condition, message){
  if (!condition){
    message = message || "Assertion failed";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message; // Fallback
  }
}

class Parser{
  constructor(store){
    this.store = store;
  }

  parseTable(x){
    let row = x.charCodeAt(1) - 65;
    let column = parseInt(x[2]);
    assert((row*tableColumns + column - 1)>=0 && (row*tableColumns + column - 1)<tableContent.length, 'Out of bounds of table contents');

    return 'this.store.getState().table.cells[' + (row*tableColumns + column - 1) + ']';
  }

  parseInput(x){
    x=parseInt(x[2])-1;
    assert(x>=0 && x<config.input.length, 'Input index out of bounds');

    return 'this.store.getState().input.state['+x+']';
  }

  parseOutput(x){
    x=parseInt(x[2])-1;
    assert(x>=0 && x<config.output.length, 'Output index out of bounds');

    return 'this.store.getState().output.state['+x+']';
  }

  parseExcel(x){
    x = x.charCodeAt(1) - 65;
    assert(x>=0 && x<=26, 'Out of bounds of excel table');

    return 'this.store.getState().table.foundRow['+x+']';
  }

  parseCom(x){
    x=parseInt(x[3]);
    assert(x>=0 && x<config.serial.length, 'Com port out of bounds');

    if (config.serial[x].factor === 0)
      return 'latestLogEntry[' + x + ']';
    else
      return 'Number(latestLogEntry[' + x + '])';
  }

  parseStatistic(x){
    if (!saveArray)
      return '0';
    
    let operator = x.slice(1,3);

    x = x.slice(3);

    if (isNaN(Number(x)))
      x = (x.charCodeAt(0) - 65)*tableColumns + Number(x[1]) + 2;
    else
      x = Number(x) + 1;

    if (saveArray[0][x] === undefined)
      return '0';
    
    let data = this.store.getState().logger.entries.map((elem)=>Number(elem[x]));

    if (data.length === 0)
      return '0';

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
        if (acc.includes(cur))
          return acc;
        else
          return acc.push(cur);
      }, []).length,
    }
    
    return functions[operator](x).toString();
  }

  parse(){
    let result;
    try {
      formula = formula
        .replace(/#[A-G][0-9]/g, parseTable)
        .replace(/#I[0-9]/g, parseInput)
        .replace(/#O[0-9]/g, parseOutput)
        .replace(/\$[A-Z]/g, parseExcel)
        .replace(/com[0-9]/g, parseCom)
        .replace(/\&[a-zA-Z0-9]+/g, parseStatistic)
        .replace(/date/g, (new Date().getTime()/1000/86400 + 25569).toString())
        .replace('and', '&&')
        .replace('or', '||');

      result = eval(formula);
    }
    catch (err) {
      this.store.dispatch({
        type: ERROR_OCCURRED, 
        payload: err
      });
    }
    return (typeof(result)==='undefined')?'':result;
  }

}

module.exports = Parser;