var config = require('./config');
var express = require('express');
var fileUpload = require('express-fileupload');
var app = express();
var server = app.listen(config.port);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ip = require("ip");
var xlsx = require('node-xlsx');
const { exec } = require('child_process');
var serialPort = require('serialport');
var Gpio = require('onoff').Gpio;
var config = require('./config');

var latestLogEntry = [];
var entryList = {};
var remainingEntries = [];
var onlineGPIO = new Gpio(config.onlineGPIO, 'out');

var comGPIO = [];
comGPIO[0] = new Gpio(config.com0GPIO, 'out');
comGPIO[1] = new Gpio(config.com1GPIO, 'out');

onlineGPIO.writeSync(1);

// For reading the excel file
var excelFile;
var justReadRFID;
if (fs.existsSync(__dirname + '/data/data.xls')){
  excelFile = xlsx.parse(__dirname + '/data/data.xls');
}
 

function decode(entry, config, index){
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
  
  if (excelFile){
    console.log(index);
    if (index === 1){
      justReadRFID = decodedEntry;
    }
    if (index === 0 && justReadRFID !== undefined){
      let foundRow = excelFile[0].data.find((row) =>{
        return (row[0] === justReadRFID);
      });
      let currentWeigth = decodedEntry;
      if (foundRow){
        console.log('found row');
        let birthDate = foundRow[1] - 25569;
        let todayDate = new Date().getTime()/1000/86400;
        let aantalSpenen = foundRow[2] || 0;
        let index = foundRow[3] || 0;
        let age = todayDate - birthDate;
        let growthRate = 1000*(currentWeigth - 1.5)/(age);
        growthRate = Math.round(growthRate);
        let sendData = {RFID: justReadRFID, aantalSpenen, age, index, growthRate, currentWeigth};
        console.log(sendData);
        io.emit('excelEntry', sendData);
      }
      else
      { 
        let sendData = {RFID: 'Not found'};
        io.emit('excelEntry', sendData);
      }
      justReadRFID = undefined;
    }
  }
   
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

function average(list){
  if (list.length===0)
    return 0;

  var sum = 0;
  for (var j = 0; j <list.length; j++)
    sum+=list[j];

  return (sum / list.length);
}

for(i = 0; i < config.serial.length; i++){
  latestLogEntry[i] = '0';
  remainingEntries[i] = Buffer('0');

  if (config.serial[i].average)
    entryList[config.serial[i].name] = [];

  (function(index){
    var conf = config.serial[index];

    if (config.testMode){
      setInterval(()=> decode(conf.testMessage, conf, index), conf.timeout * 1000);
      latestLogEntry[index] = decode(conf.testMessage, conf, index);
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
          
          latestLogEntry[index] = decode(newEntry, conf, index);
            
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

app.get('/fileupload', function(request, response){
    response.sendFile('fileUpload.html', { root: __dirname});
});

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

app.get('/terminal', (request, response) => {
  response.send('<meta http-equiv="refresh" content="0; url=/" /><title>MBDCcomUnit</title>Opening terminal.')
  console.log('test');
  exec('export DISPLAY=:1 && xhost +localhost', (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
  });
  exec('DISPLAY=:1 lxterminal', (err, stdout, stderr) => {
    if (err) {
      console.error(`exec error: ${err}`);
      return;
    }
  });
  exec('bash DISPLAY=:1 lxterminal');
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