var config = require('./config');
var express = require('express');
var app = express();
var server = app.listen(config.port);
var io = require('socket.io').listen(server);
var fs = require('fs');
var { exec } = require('child_process');
var config = require('./config');

var serialLogPos = [];
var latestLogEntry= [];
var fullLog = [];

for(i = 0; i < config.serial.length; i++){
  serialLogPos[i] = 0;
  latestLogEntry[i] = `No entries received yet for ${config.serial[i].name}`;
  fullLog[i] = `No serial data received yet for ${config.serial[i].name}`;

  var stream = fs.createWriteStream(`minicom${config.serial[i].name}.dfl`);
  stream.write("# Machine-generated file - do not edit.\n");
  stream.write(`pr port             ${config.serial[i].port}\n`);
  stream.write(`pu baudrate         ${config.serial[i].baudRate}\n`);
  stream.write(`pu bits             ${config.serial[i].bits}\n`);
  stream.write(`pu parity           ${config.serial[i].parity[0]}\n`);
  stream.write(`pu stopbits         ${config.serial[i].stopBits}\n`);
  stream.write(`pu rtscts           ${config.serial[i].RTSCTS}\n`);
  stream.write(`pu xonxoff          ${config.serial[i].XONXOFF}\n`);
  stream.end();

  exec(`minicom -D ${config.serial[i].port} -o -C seriallog${config.serial[i].name}.txt minicom${config.serial[i].name}.dfl`, (err, stdout, stderr) => {
    if (err) {
        console.error('Could not open serial port or create serial file.');
        console.error(err);
      return;
    }
  });

  (function(index){
    fs.watchFile(`seriallog${config.serial[i].name}.txt`, (curr, prev) => {
      console.log(`the current mtime is: ${curr.mtime}`);
      console.log(`the previous mtime was: ${prev.mtime}`);
      fs.readFile(`seriallog${config.serial[index].name}.txt`, 'utf8', function(err, contents) {
        latestLogEntry[index] = contents.slice(serialLogPos[index]);
        fullLog[index] = contents;
        console.log(contents.slice(serialLogPos[index]));
        serialLogPos[index] = contents.length;
        io.emit('serial entry', latestLogEntry);
      });
    });

    app.get(`/${config.serial[index].name.toLowerCase()}`, (request, response) => {
      response.send(fullLog[index]);
    })

  }(i));
}
app.get('/', (request, response) => {
  response.send(latestLogEntry)
});

app.get('/full', (request, response) => {
  response.send(fullLog)
});

app.get('/debug', function(req, res){
    res.sendFile('debug.html', { root: __dirname});
});

io.on('connection', function(socket){
  console.log('a user connected');
});