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

var latestLogEntry = [];
var tableContent = new Array(config.output.length ).fill('');
var entryList = {};
var remainingEntries = [];
var onlineGPIO = new Gpio(config.onlineGPIO, 'out');

var executeBlock = false;
var executeUp = true;
var numExecuting = 0;

var outputForced = new Array(config.output.length ).fill(0);
var inputForced = new Array(config.input.length ).fill(0);

var comGPIO = config.comGPIO.map(element =>{
  return new Gpio(element, 'out')
});

var outputGPIO = config.output.map(element =>{
  return new Gpio(element.GPIO, 'out')
});

var inputGPIO = config.input.map((element, index) =>{
  let newInput = new Gpio(element.GPIO, 'in');
  newInput.watch((err, val)=>{
    if (!inputForced[index])
      handleInput(index, val);
  });
  return new Gpio(element.GPIO, 'in');
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

var fileName;
var saveArray = [];
if (config.saveToFile){
  fileName = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + '.csv';
  saveArray[0]=['date'].concat(config.table.map(element=>element.name));
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

function handleTable(index){
  if (index === config.triggerCom){
    let foundRow = excelSheet.find((row) =>{
      return (row[config.searchColumn] === latestLogEntry[config.searchCom]);
    });
    if (foundRow){
      calculateValues(foundRow);  
    }
    else
    { 
      let sendData = {RFID: 'Not found'};
      io.emit('excelEntry', sendData);
    }
  }
}

function handleInput(index, value){
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
        outputGPIO[index].writeSync(result);
        result = result?'on':'off';
      }
      io.emit('state', {name: 'output' + index, state: result});
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
    break;
    case 'input':
      if (inputForced[index]){
        state = (inputForced[index]-1)?'forcedOn':'forcedOff';
      }
      else{
        state = (inputGPIO[index].readSync())?'on':'off';
      }
    break;
  }
  io.emit('state', {name:  type + index, state});
}

function emitAllState(){
  config.input.map((element, index)=>{
    let state;
    if (inputForced[index]){
      state = (inputForced[index]-1)?'forcedOn':'forcedOff';
    }
    else{
      state = (inputGPIO[index].readSync())?'on':'off';
    }
    io.emit('state', {name: 'input' + index, state});
  });

  config.output.map((element, index)=>{
    let state;
    if (outputForced[index]){
      state = (outputForced[index]-1)?'forcedOn':'forcedOff';
    }
    else{
      state = (outputGPIO[index].readSync())?'on':'off';
    }
    io.emit('state', {name: 'output' + index, state});
  });
}

function execute(){
  if (numExecuting!=0) return;
  console.log('execute')
  config.output.map((element, index)=>{
    if (element.execute && !outputForced[index]){
      let result = calculateFormula(element.formula);
      io.emit('state', {name: 'output' + index, state: result});
      outputGPIO[index].writeSync(result);
      numExecuting++;
      setTimeout(()=>{
        console.log('stop execute'+index)
        outputGPIO[index].writeSync(0);
        io.emit('state', {name: 'output' + index, state:'off'});
        numExecuting--;
      }, element.seconds*1000);
    }
  });
  if (fileName){
    let newRow = [new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')];
    newRow = newRow.concat(tableContent);
    saveArray.push(newRow);

    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.aoa_to_sheet(saveArray);
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    XLSX.writeFile(wb, __dirname + '/save/' + fileName);
    console.log(saveArray);
  }
}

function calculateValues(excelRow){
  config.table.map((element, index)=>{
    if (element.formula == '#') return;

    let result = calculateFormula(element.formula, excelRow);
    if (element.factor === 0 && typeof(result) === 'string'){
      result = result.slice(-element.digits);
    } else {
      result = (result*element.factor).toFixed(element.digits);
    }
    tableContent[index]=result;
    io.emit('value', {name: 'table' + index, value: result});
  });
}

function calculateFormula(formula, excelRow){
  formula = formula.replace(/#[A-G][0-9]/g, (x) =>{

    let row = x.charCodeAt(1) - 65;
    let column = parseInt(x[2]);
    return 'tableContent[' + (row*tableColumns + column - 1) + ']';

  }).replace(/#I[0-9]/g, (x) =>{

    x=parseInt(x[2]);
    if (inputForced[x])
      return inputForced[x]-1;
    else
      return inputGPIO[x].readSync();

  }).replace(/#O[0-9]/g, (x) =>{

    x=parseInt(x[2]);
    if (outputForced[x])
      return outputForced[x]-1;
    else
      return outputGPIO[x].readSync();

  }).replace(/\$[A-Z]/g, (x) =>{

    x = x.charCodeAt(1) - 65;
    return 'excelRow['+x+']';

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

  let result = eval(formula);
  return (typeof(result)==='undefined')?'':result;
}

for(i = 0; i < config.serial.length; i++){
  latestLogEntry[i] = '0';
  remainingEntries[i] = Buffer('0');

  if (config.serial[i].average)
    entryList[config.serial[i].name] = [];

  (function(index){
    var conf = config.serial[index];

    if (config.testMode){
      setInterval(()=> {
        decode(conf.testMessage, conf);
        if (excelSheet){
          handleTable(index);
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
          
          latestLogEntry[index] = decode(newEntry, conf);
          if(excelSheet){
            handleTable(index);
          }
          handleOutput();

          remainingEntries[index]=remainingEntries[index].slice(nextEntry + nextEntryEnd);
          //console.log(remainingEntries);
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
  emitAllState();

  socket.on('settings', function(config){

    let conf = JSON.stringify(config, null, 2).replace(/"/g, "'")
      .replace(/\\u00[0-9]{2}/g, match => String.fromCharCode(parseInt(match.slice(-2), 16)))
      .replace(/'[\w]+':/g, match => match.slice(1,-2)+' :');

    const name = 'config.js';
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
    inputForced[index] = (inputForced[index]+1)%3;
    if (inputForced[index]){
      handleInput(index, inputForced[index]-1);
    }
    else {
      handleInput(index, inputGPIO[index].readSync());
    }
    handleOutput();
    emitState('input', index);
  });

  socket.on('forceOutput', index =>{
    outputForced[index] = (outputForced[index]+1)%3;
    handleOutput();
    emitState('output', index);
  });

  socket.on('manual', msg =>{
    tableContent[msg.index] = msg.value;
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