var config = require('./config');
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var server = app.listen(config.port);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ip = require("ip");
var XLSX = require('xlsx');
const { exec } = require('child_process');
var serialPort = require('serialport');
var Gpio = require('onoff').Gpio;
var config = require('./config');
var aux = require('./auxiliaryFunctions')

const tableColumns = 5;

var latestLogEntry = new Array(config.serial.length ).fill('0');
var tableContent = new Array(config.output.length ).fill('');
var entryList = {};
var remainingEntries = [];
var onlineGPIO = new Gpio(config.onlineGPIO, 'out');

var executeBlock = false;
var executeUp = true;

var outputExecuting = new Array(config.output.length ).fill(0);
var outputForced = new Array(config.output.length ).fill(0);
var outputForcedLast = new Array(config.output.length ).fill(false);

var inputForced = new Array(config.input.length ).fill(0);
var inputForcedLast = new Array(config.input.length).fill(false);
var inputFollowing = new Array(config.input.length ).fill(0);

var comGPIO = config.comGPIO.map(element =>{
  return new Gpio(element, 'out')
});

var outputGPIO = config.output.map(element =>{
  return new Gpio(element.GPIO, 'out')
});

var inputGPIO = config.input.map((element, index) =>{
  let newInput = new Gpio(element.GPIO, 'in', 'both');
  newInput.watch((err, val)=>{
    console.log('input'+index+' changed');
    if (!inputForced[index] && !inputFollowing[index]){
      handleInput(index, inputGPIO[index].readSync());
      handleTable();
      handleOutput();
    }
  });
  return newInput;
});

onlineGPIO.writeSync(1);

// For reading the excel file
var justReadRFID;
var excelSheet;
if (fs.existsSync(__dirname + '/data/data.xls')){
  let excelFile = XLSX.readFile(__dirname + '/data/data.xls');
  let sheetName = excelFile.Workbook.Sheets[0].name;
  excelSheet = aux.sheetToArray(excelFile.Sheets[sheetName]);
}
var foundRow = new Array(26).fill('');

var fileName;
var saveArray = [];
if (config.saveToFile){
  fileName = new Date().toISOString().replace(/T/, '_').replace(/:/g,'-').replace(/\..+/, '') + '.csv';
  saveArray[0]=['date'].concat(config.serial.map(element=>element.name)).concat(config.table.map(element=>element.name));
  console.log(saveArray);
}

function decode(entry, config){
  let decodedEntry;
  let time = new Date();

  if (config.factor!=0){
    entry = entry.replace(/ /g,'');
    decodedEntry = (parseFloat(entry)*config.factor).toFixed(config.digits);
    if (config.alwaysPositive && decodedEntry<0){
      decodedEntry = -decodedEntry;
    }
  }
  else
  {
    decodedEntry = entry.slice(-config.digits);
  }

  io.emit('entry', {name : config.name, entryTime: time.getTime(), entry : decodedEntry});
  
  if (config.average)
  {
    let averageList = entryList[config.name];
    for (var j = config.entries-1; j > 0; j--)
    {
      if (averageList.length>(j-1)){
        averageList[j] = averageList[j - 1];
      }
    }
    averageList[0] = parseFloat(decodedEntry);
    io.emit('average', {name : config.name, entry : (average(averageList)).toFixed(config.digits)});
  }
  return decodedEntry;
}

function handleTable(){
  if (config.waitForOther && latestLogEntry.reduce((acc, cur) => (acc || (cur == '0')), false)){
    console.log('other value not yet defined');
    return;
  }
  
  if (config.useFile && excelSheet){
    foundRow = excelSheet.find((row) =>{
      return (row[config.searchColumn] === latestLogEntry[config.triggerCom]);
    });
  }

  if (!foundRow && config.useFile){
    io.emit('notfound', true);
  }
  else{
    io.emit('notfound', false);
  }

  if (!foundRow){
    foundRow = new Array(26).fill('');
  }

  calculateValues();
}

function handleInput(index, value){
  value = value;

  let state;
  if (inputForced[index]){
    state = (value)?'forcedOn':'forcedOff';
  }
  else{
    state = (value)?'on':'off';
  }

  io.emit('state', {name: 'input' + index, state});
  switch(config.input[index].formula){
    case 'exe':
      if (value === 1 && !executeBlock && executeUp){
        execute();
      } else if (value === 0 && !executeBlock && executeUp){
        io.emit('clear');
        latestLogEntry = new Array(config.serial.length).fill('0');
        executeStop();
      }
      break;
    case 'exebl':
      executeBlock = (value === 1);
      break;
    case 'exeup':
      if (value)
        executeUp = true;
      break;
    case 'exedo':
      if (value)
          executeUp = false;
      break;
  }
}

function handleOutput(){
  config.output.map((element, index)=>{
    if (!outputForced[index]){
      let result = calculateFormula(element.formula);
      if (element.execute){
        if (outputGPIO[index].readSync())
          result = 'on';
        else
            result = result?'execute':'off';
      } else {
        setOutput(index, result?1:0);
        result = result?'on':'off';
      }
      io.emit('state', {name: 'output' + index, state: result});
    }
  });
}

function setOutput(index, value){
  outputGPIO[index].writeSync(value);
  config.input.forEach((element, inputIndex) =>{
    if (element.follow == index){
      if (inputFollowing[inputIndex] == value)
        return;

      inputFollowing[inputIndex] = value;
      
      if (!inputGPIO[inputIndex].readSync()){
        handleInput(inputIndex, value);
      }
    } 
  });
}

function average(list){
  if (list.length===0)
    return 0;

  var sum = 0;
  for (var j = 0; j <list.length; j++)
    sum+=list[j];

  return (sum / list.length);
}

function emitState(type, index){
  let state;
  switch(type){
    case 'output':
      if (outputForced[index]){
        state = (outputForced[index]-1)?'forcedOn':'forcedOff';
      }
      else{
        state = (outputGPIO[index].readSync())?'on':'off';
      }
      if (state == 'off' && config.output[index].execute && calculateFormula(config.output[index].formula)){
        state = 'execute';
      }
    break;
    case 'input':
      if (inputForced[index]){
        state = (inputForced[index]-1)?'forcedOn':'forcedOff';
      }
      else{
        state = (inputGPIO[index].readSync() | inputFollowing[index])?'on':'off';
      }
      
    break;
  }
  io.emit('state', {name:  type + index, state});
}

function emitAllState(){
  config.input.map((element, index)=>{
    emitState('input', index);
  });

  config.output.map((element, index)=>{
    emitState('output', index);
  });
}

function execute(){
  let max = outputExecuting.reduce(function(a, b) {
    return Math.max(a, b);
  });
  
  if (max!=0) return;
  console.log('execute')
  config.output.map((element, index)=>{
    if (element.execute && !outputForced[index]){
      let result = calculateFormula(element.formula);
      setOutput(index, result?1:0);
      emitState('output', index);
      outputExecuting[index]=1;
      if (element.seconds != 0){
        setTimeout(()=>{
          console.log('stop execute'+index)
          setOutput(index, 0);
          emitState('output', index);
          outputExecuting[index]=0;
        }, element.seconds*1000);
      }
    }
  });
  if (fileName){
    let newRow = [new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    newRow = newRow.concat(latestLogEntry);
    newRow = newRow.concat(tableContent);
    saveArray.push(newRow);

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(saveArray);
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    XLSX.writeFile(wb, config.saveFileLocation.replace(/\/+$/g, '') + '/'+ fileName);
    console.log(saveArray);
  }
}


function executeStop(){
  config.output.map((element, index) => {
    if (element.execute && element.seconds == 0 && outputExecuting[index]==1){
      setOutput(index, 0);
      emitState('output', index);
      outputExecuting[index]=0;
    }
  });
}

function calculateValues(){
  config.table.map((element, index)=>{
    if (element.formula == '#') return;

    let result = calculateFormula(element.formula);
    if (element.numeric){
      result = Number(result).toFixed(element.digits); 
    } else if (typeof(result) === 'boolean'){
      result = result?1:0;
    }else {
      result = String(result).slice(-element.digits);
    }
    tableContent[index]=result;
    io.emit('value', {name: 'table' + index, value: result});
  });
}

function calculateFormula(formula){
  formula = formula.replace(/#[A-G][0-9]/g, (x) =>{

    let row = x.charCodeAt(1) - 65;
    let column = parseInt(x[2]);
    return 'tableContent[' + (row*tableColumns + column - 1) + ']';

  }).replace(/#I[0-9]/g, (x) =>{

    x=parseInt(x[2])-1;
    if (inputForced[x])
      return (inputForced[x]-1)?'true':'false';
    else
      return (inputGPIO[x].readSync() | inputFollowing[x])?'true':'false';

  }).replace(/#O[0-9]/g, (x) =>{

    x=parseInt(x[2])-1;
    if (outputForced[x])
      return (outputForced[x]-1)?'true':'false';
    else
      return outputGPIO[x].readSync()?'true':'false';

  }).replace(/\$[A-Z]/g, (x) =>{

    x = x.charCodeAt(1) - 65;
    return 'foundRow['+x+']';

  }).replace(/com[0-9]/g, (x) =>{

    x=parseInt(x[3]);
    if (config.serial[x].factor === 0)
      return 'latestLogEntry[' + x + ']';
    else
      return 'Number(latestLogEntry[' + x + '])';

  }).replace(/date/g, (x) =>{

    return new Date().getTime()/1000/86400 + 25569;

  }).replace('and', '&&')
  .replace('or', '||');
  let result;
  try {
    result = eval(formula);
  }
  catch (err) {
    if (fs.existsSync('config.lastgood.js')){
      fs.copyFileSync('config.lastgood.js', 'config.js');
    }
    else
    {
      fs.copyFileSync('config.template.js', 'config.js');
    }
    
    setTimeout(function(){ 
      onlineGPIO.writeSync(0);
      io.emit('error', err.message);
      process.exit();
    }, 5000);
  }
  return (typeof(result)==='undefined')?'':result;
}

for(i = 0; i < config.serial.length; i++){
  remainingEntries[i] = Buffer('0');

  if (config.serial[i].average)
    entryList[config.serial[i].name] = [];

  (function(index){
    var conf = config.serial[index];

    if (config.testMode){
      setInterval(()=> {
        latestLogEntry[index] = decode(conf.testMessage, conf);
        if (excelSheet){
          handleTable();
        }
        handleOutput();
      }, conf.timeout * 1000);
      latestLogEntry[index] = decode(conf.testMessage, conf);
    } else {

      var port = new serialPort(conf.port, {
        baudRate: conf.baudRate,
        dataBits: conf.bits,
        stopBits: conf.stopBits,
        parity: conf.parity,
        rtscts: conf.RTSCTS,
        xon: conf.XONXOFF,
        xoff: conf.XONXOFF
      });

      port.on('readable', function() {
        console.log(remainingEntries);
        comGPIO[index].writeSync(1);
        setTimeout(() => comGPIO[index].writeSync(0), 250);


        var contents = port.read();
        remainingEntries[index] = Buffer.concat([remainingEntries[index], contents]);

        var nextEntry, nextEntryEnd;
        
        if (remainingEntries[index].length===0)
          return;


        if ((conf.prefix==='')&&(conf.postfix==='')){
          io.emit('entry', {name : conf.name, entry : remainingEntries[index].toString().slice(-conf.digits)});
          return
        }

        while((nextEntry = remainingEntries[index].indexOf(conf.prefix))>=0){

          nextEntryEnd = remainingEntries[index].slice(nextEntry).indexOf(conf.postfix);

          if (nextEntryEnd===-1){
            break;
          }

          let newEntry = (remainingEntries[index].slice(nextEntry + Buffer(conf.prefix).length, (nextEntryEnd===0)?remainingEntries[index].length:(nextEntryEnd+nextEntry))).toString();
          
          newEntry = decode(newEntry, conf);
          
          if (index == config.triggerCom && latestLogEntry[index] != newEntry){
            latestLogEntry = new Array(config.serial.length).fill('0');
          }
          latestLogEntry[index] = newEntry;
          
          handleTable();
          handleOutput();

          remainingEntries[index]=remainingEntries[index].slice(nextEntry + nextEntryEnd);
        }  
      });
    }

    if (conf.name != '')
    {
      app.get(`/${conf.name.toLowerCase()}`, (request, response) => {
        response.send(latestLogEntry[index]);
      });

      if (conf.average){
        app.get(`/${conf.name.toLowerCase()}avg`, (request, response) => {
          
          response.send((average(entryList[index])*conf.factor).toFixed(conf.digits).toString());
        });
      }
    }

    app.get(`/com${index}`, (request, response) => {
      let sendString='<title>MBDCcomUnit</title>';
      if ((conf.prefix==='')&&(conf.postfix==='')){
        sendString += fullLog[index].toString().slice(-conf.digits);
      }
      else if (conf.factor!=0){
        if (conf.average){
          sendString += (average(entryList[conf.name])).toFixed(conf.digits);
        }
        else
        {
          sendString += latestLogEntry[index];
        }
      }
      else{
        sendString += latestLogEntry[index];
      }
      response.send(sendString);
    });
    
  }(i)); //these statements have to be wrapped in an anonymous function so that the value of i is remembered when the inner functions are called in the future
}

app.get('/', (request, response) => {
   response.sendFile('debug.html', { root: __dirname});
});

app.get('/settings', function(request, response){
    response.sendFile('settings.html', { root: __dirname});
});

if (config.exposeUpload){
  app.get('/fileupload', function(request, response){
    response.sendFile('fileUpload.html', { root: __dirname});
  });
  app.get('/filesettings', function(request, response){
    response.sendFile('fileSettings.html', { root: __dirname});
  });
}

app.get('/config.js', function(request, response){
    response.sendFile('config.js', { root: __dirname});
});

app.get('/shutdown', (request, response) => {
  response.send('<title>MBDCcomUnit</title>Shutting down now.')
  exec('shutdown now', (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
  });
});

app.get('/restart', (request, response) => {
  response.send('<meta http-equiv="refresh" content="5; url=/" /><title>MBDCcomUnit</title>Restarting now.')
  onlineGPIO.writeSync(0);
  process.exit();
});

app.use('/res', express.static('res'))

app.use('/upload', fileUpload());

app.post('/upload', (req, res) => {
  if (!req.files.importFile){
    return res.send('<meta http-equiv="refresh" content="1; url=/" /><title>MBDCcomUnit</title> No files were uploaded.')
  }
 
  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.importFile;
 
  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv(__dirname + '/data/data.xls', function(err) {
    if (err){
        return res.status(500).send(err);
  }
    console.log(__dirname + '/data/data.xls');
    res.send('<meta http-equiv="refresh" content="5; url=/" /><title>MBDCcomUnit</title> File uploaded.')
    onlineGPIO.writeSync(0);
    process.exit();
  });
  

});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.emit('ip', ip.address());
  handleTable();
  handleOutput();
  emitAllState();

  socket.on('settings', function(config){
    const name = 'config.js';

    fs.copyFileSync(name, 'config.lastgood.js');

    let conf = JSON.stringify(config, null, 2).replace(/"/g, "'")
      .replace(/\\u00[0-9]{2}/g, match => String.fromCharCode(parseInt(match.slice(-2), 16)))
      .replace(/'[\w]+':/g, match => match.slice(1,-2)+' :');

    
    try {
      fs.accessSync(name);
      fs.unlinkSync(name);
    } 
    catch (err) {
    }

    conf = 'var config =' + conf + ';\n\nmodule.exports = config;';
    fs.writeFileSync(name, conf, (err) => {  
      if (err) throw err;

      console.log('Config saved!');
    });
    onlineGPIO.writeSync(0);
    process.exit();
  });

  socket.on('setDateTime', (dateTime) =>{
    exec(`timedatectl set-time @${dateTime}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${err}`);
        return;
      }
    });
  });

  socket.on('forceInput', index =>{
    let previousForced = inputForced[index];

    if (inputForced[index]){
      if (inputForcedLast[index]){
        inputForcedLast[index] = false;
        inputForced[index] = 0;
      }
      else {
        inputForcedLast[index] = true;
        inputForced[index] = 3 - inputForced[index];
      }
    }
    else {
      inputForced[index] = 2 - (inputGPIO[index].readSync() | inputFollowing[index]);
    }

    if (inputForced[index]){
      handleInput(index, inputForced[index]-1);
    }
    else if (previousForced-1 != (inputGPIO[index].readSync() | inputFollowing[index])) {
      handleInput(index, (inputGPIO[index].readSync() | inputFollowing[index]));
    }
    handleTable();
    handleOutput();
    emitState('input', index);
  });

  socket.on('forceOutput', index =>{
    if (outputForced[index]){
      if (outputForcedLast[index]){
        outputForcedLast[index] = false;
        outputForced[index] = 0;
      }
      else {
        outputForcedLast[index] = true;
        outputForced[index] = 3 - outputForced[index];
      }
    }
    else {
      outputForced[index] = 2 - outputGPIO[index].readSync();
    }
    
    if (outputForced[index]){
      setOutput(index, outputForced[index]-1);
    }
    else if (config.output[index].execute){
      setOutput(index, 0);
    }
    handleTable();
    handleOutput();
    emitState('output', index);
  });

  socket.on('manual', msg =>{
    tableContent[msg.index] = msg.value;
    handleTable();
    handleOutput();
    console.log(msg.value);
  })
});

setInterval(() =>{
  let time = new Date();
  io.emit('time', time.getTime());
}, 1000);

// Catch CTRL+C
process.on ('SIGINT', () => {
  onlineGPIO.writeSync(0);
  console.log ('\nCTRL+C...');
  process.exit (0);
});

handleOutput();