var config = require('./config');
var express = require('express');
var app = express();
var server = app.listen(config.port);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ip = require("ip");
const { exec } = require('child_process');
var serialPort = require('serialport');
var config = require('./config');

var serialLogPos = [];
var latestLogEntry = [];
var entryList = [];
var fullLog = [];

function decode(entry){
  return entry;
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
  serialLogPos[i] = 0;
  latestLogEntry[i] = '0';
  fullLog[i] = Buffer('0');

  if (config.serial[i].average)
    entryList[i] = [];

  try {
    fs.accessSync(`seriallog${config.serial[i].name}.txt`);
    fs.unlinkSync(`seriallog${config.serial[i].name}.txt`);
  } 
  catch (err) {
  }


  (function(index){
    var conf = config.serial[index];

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
      var contents = port.read();
      fullLog[index] = Buffer.concat([fullLog[index], contents]);

      var nextEntry, nextEntryEnd;
      var remainingEntries = fullLog[index].slice(serialLogPos[index]);

      if (remainingEntries.length===0)
        return;

      console.log(remainingEntries);

      if ((conf.prefix==='')&&(conf.postfix==='')){
        io.emit('entry', {name : conf.name, entry : fullLog[index].toString().slice(-conf.digits)});
        return
      }

      while((nextEntry = remainingEntries.indexOf(conf.prefix))>=0){

        nextEntryEnd = remainingEntries.indexOf(conf.postfix);

        if (nextEntryEnd===-1){
          break;
        }

        latestLogEntry[index] =  (remainingEntries.slice(nextEntry + Buffer(conf.prefix).length, (nextEntryEnd===0)?remainingEntries.length:nextEntryEnd)).toString();
        console.log(latestLogEntry[index]);

        if (conf.factor!=0)  // if input is numerical
        {
          io.emit('entry', {name : conf.name, entry : (parseFloat(latestLogEntry[index])*conf.factor).toFixed(conf.digits)});
        }
        else
        {
          io.emit('entry', {name : conf.name, entry : latestLogEntry[index].slice(-conf.digits)});
        }
        
        if (conf.average)
        {
          for (var j = conf.entries-1; j > 0; j--)
          {
            if (entryList[index][j-1]){
              entryList[index][j] = entryList[index][j - 1];
            }
          }
          entryList[index][0] = parseFloat(latestLogEntry[index]);

          io.emit('average', {name : conf.name, entry : (average(entryList[index])*conf.factor).toFixed(conf.digits).toString()});
        }
          

        serialLogPos[index] += nextEntryEnd + conf.postfix.length;
        remainingEntries=contents.slice(serialLogPos[index]);
      }  
    });

    app.get(`/${conf.name.toLowerCase()}full`, (request, response) => {
      response.send(fullLog[index]);
    });

    app.get(`/${conf.name.toLowerCase()}`, (request, response) => {
      response.send(latestLogEntry[index]);
    });

    if (conf.average){
      app.get(`/${conf.name.toLowerCase()}avg`, (request, response) => {
        
        response.send((average(entryList[index])*conf.factor).toFixed(conf.digits).toString());
      });
    }

    app.get(`/com${index}`, (request, response) => {
      let sendString='<title>MBDCcomUnit</title>';
      if ((conf.prefix==='')&&(conf.postfix==='')){
        sendString += fullLog[index].toString().slice(-conf.digits);
      }
      else if (conf.factor!=0){
        if (conf.average){
          sendString += (average(entryList[index])*conf.factor).toFixed(conf.digits).toString();
        }
        else
        {
          sendString += (parseFloat(latestLogEntry[index])*conf.factor).toFixed(conf.digits);
        }
      }
      else{
        sendString += latestLogEntry[index].slice(-conf.digits);
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

app.get('/full', (request, response) => {
  response.send(fullLog)
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

  response.send('<meta http-equiv="refresh" content="1; url=/" /><title>MBDCcomUnit</title>Restarting now.')
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

app.use(express.static('res'))

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
    process.exit();
  });
});



