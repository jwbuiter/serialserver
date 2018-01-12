var express = require('express');
var app = express();
var fs = require('fs');
var { exec } = require('child_process');
var config = require('./config');

var serialLogPos = 0;
var latestLogEntry = 'No entries received yet';
var fullLog = 'No serial data received yet';

exec(`minicom -D ${config.serialPort} -b ${config.serialBaudrate} -o -C seriallog.txt`, (err, stdout, stderr) => {
  if (err) {
      console.error('Could not open serial port or create serial file.')
    return;
  }
});

fs.watchFile('seriallog.txt', (curr, prev) => {
  console.log(`the current mtime is: ${curr.mtime}`);
  console.log(`the previous mtime was: ${prev.mtime}`);
  fs.readFile('seriallog.txt', 'utf8', function(err, contents) {
    latestLogEntry = contents.slice(pos);
    fullLog = contents;
    console.log(contents.slice(pos));
    pos = contents.length;

});
});

app.get('/', (request, response) => {
  response.send(latestLogEntry)
})

app.get('/full', (request, response) => {
  response.send(fullLog)
})

app.listen(config.port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${config.port}`)
})