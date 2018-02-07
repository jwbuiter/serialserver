var config = require('./config');
var express = require('express');
var app = express();
var server = app.listen(config.port);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ip = require("ip");
var { exec } = require('child_process');
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
  for (var j = 0; j <entryList[index].length; j++)
    sum+=entryList[index][j];

  return (sum / list.length);
}

for(i = 0; i < config.serial.length; i++){
  serialLogPos[i] = 0;
  latestLogEntry[i] = '0';
  fullLog[i] = '0';

  if (config.serial[i].numerical)
    entryList[i] = [];

  try {
    fs.accessSync(`seriallog${config.serial[i].name}.txt`);
    fs.unlinkSync(`seriallog${config.serial[i].name}.txt`);
  } 
  catch (err) {
  }

  var stream = fs.createWriteStream(`/etc/minicom/minirc.${config.serial[i].name}`);
  stream.write("# Machine-generated file - do not edit.\n");
  stream.write(`pr port             ${config.serial[i].port}\n`);
  stream.write(`pu baudrate         ${config.serial[i].baudRate}\n`);
  stream.write(`pu bits             ${config.serial[i].bits}\n`);
  stream.write(`pu parity           ${config.serial[i].parity[0]}\n`);
  stream.write(`pu stopbits         ${config.serial[i].stopBits}\n`);
  stream.write(`pu rtscts           ${config.serial[i].RTSCTS}\n`);
  stream.write(`pu xonxoff          ${config.serial[i].XONXOFF}\n`);
  stream.end();

  exec(`minicom -o -C seriallog${config.serial[i].name}.txt ${config.serial[i].name}`, (err, stdout, stderr) => {
    if (err) {
        console.error('Could not open serial port or create serial file.');
        console.error(err);
      return;
    }
  });

  (function(index){
    fs.watchFile(`seriallog${config.serial[index].name}.txt`, (curr, prev) => {

      console.log(`the current mtime is: ${curr.mtime}`);
      console.log(`the previous mtime was: ${prev.mtime}`);

      fs.readFile(`seriallog${config.serial[index].name}.txt`, 'utf8', function(err, contents) {
        fullLog[index] = contents;
        var nextEntry, nextEntryEnd;
        var remainingEntries = contents.slice(serialLogPos[index]);

        if (remainingEntries.length===0)
          return;

        while((nextEntry = remainingEntries.indexOf(config.serial[index].prefix))>=0){
          if (!((nextEntryEnd = remainingEntries.indexOf(config.serial[index].postfix))>=0)){
            break;
          }

          latestLogEntry[index] =  remainingEntries.slice(nextEntry + config.serial[index].prefix.length, nextEntryEnd);

          
          if (config.serial[index].numerical){
            io.emit('entry', {name : config.serial[index].name, entry : parseFloat(latestLogEntry[index])});

            for (var j = config.serial[index].averages-1; j > 0; j--)
            {
              if (entryList[index][j-1]){
                entryList[index][j] = entryList[index][j - 1];
              }
            }
            entryList[index][0] = parseFloat(latestLogEntry[index]);
            var sum = 0;
            for (var j = 0; j <entryList[index].length; j++)
              sum+=entryList[index][j];

            io.emit('average', {name : config.serial[index].name, entry : (sum / entryList[index].length)});
          }
          else{
            io.emit('entry', {name : config.serial[index].name, entry : latestLogEntry[index]});
          }

          serialLogPos[index] += nextEntryEnd + config.serial[index].postfix.length;
          remainingEntries=contents.slice(serialLogPos[index]);
        }  
      });
    });

    app.get(`/${config.serial[index].name.toLowerCase()}full`, (request, response) => {
      response.send(fullLog[index]);
    });

    app.get(`/${config.serial[index].name.toLowerCase()}`, (request, response) => {
      response.send(latestLogEntry[index]);
    });

    if (config.serial[index].numerical){
      app.get(`/${config.serial[index].name.toLowerCase()}avg`, (request, response) => {
        
        response.send(average(entryList[index]).toString());
      });
    }

    app.get(`/com${index}`, (request, response) => {
      if (config.serial[index].numerical){
        response.send(average(entryList[index]).toString());
      }
      else{
        response.send(latestLogEntry[index]);
      }
    });
    
  }(i)); //these statements have to be wrapped in an anonymous function so that the value of i is remembered when the inner functions are called in the future
}
app.get('/', (request, response) => {
   response.sendFile('debug.html', { root: __dirname});
});

app.get('/full', (request, response) => {
  response.send(fullLog)
});

app.get('/config.js', function(request, response){
    response.sendFile('config.js', { root: __dirname});
});

io.on('connection', function(socket){
  console.log('a user connected');
  socket.emit('ip', ip.address());
});

