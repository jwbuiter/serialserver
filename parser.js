const {assert} = require('./auxiliaryFunctions');

class Parser {
  constructor(table, latestEntries){
    this.table = table;
    this.latestEntries = latestEntries;
    this.inputs = {};
    this.outputs = {};

    this.foundRow = {};
  }

  setOutputs(outputs){
    this.outputs = outputs;
  }

  setInputs(inputs){
    this.inputs = inputs;
  }

  setFoundRow(foundRow){
    this.foundRow = foundRow;
  }

  calculateFormula(){
    if (!this.outputs || !this.inputs)
      return undefined;

    let formula = this.formula.replace(/#[A-G][0-9]/g, (x) =>{

      let row = x.charCodeAt(1) - 65;
      let column = parseInt(x[2]);
      assert((row*tableColumns + column - 1)>=0 && (row*tableColumns + column - 1)<tableContent.length, 'Out of bounds of table contents');

      return 'this.table[' + (row*tableColumns + column - 1) + ']';

    }).replace(/#I[0-9]/g, (x) =>{

      x=parseInt(x[2])-1;
      assert(x>=0 && x<this.inputs.length, 'Input index out of bounds');

      if (inputs[x].is)
        return (inputForced[x]-1)?'true':'false';
      else
        return (inputDebouncedState[x] | inputFollowing[x])?'true':'false';

    }).replace(/#O[0-9]/g, (x) =>{

      x=parseInt(x[2])-1;
      assert(x>=0 && x<this.outputs.length, 'Output index out of bounds');

      if (outputForced[x])
        return (outputForced[x]-1)?'true':'false';
      else
        return outputGPIO[x].readSync()?'true':'false';

    }).replace(/\$[A-Z]/g, (x) =>{

      x = x.charCodeAt(1) - 65;
      assert(x>=0 && x<foundRow.length, 'Out of bounds of excel table');

      return 'this.foundRow['+x+']';

    }).replace(/com[0-9]/g, (x) =>{

      x=parseInt(x[3]);
      assert(x>=0 && x<this.latestEntries.length, 'Com port out of bounds');

      if (config.serial[x].factor === 0)
        return 'this.latestEntries[' + x + ']';
      else
        return 'Number(this.latestEntries[' + x + '])';

    }).replace(/date/g, (x) =>{

      return new Date().getTime()/1000/86400 + 25569;

    }).replace('and', '&&')
    .replace('or', '||');
  
    let result = eval(formula);
    return (typeof(result)==='undefined')?'':result;
  }
}

module.exports = Parser;