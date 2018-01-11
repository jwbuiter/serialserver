var http = require('http');
var config = require('./config')
var fs = require('fs')
const { exec } = require('child_process');

var pos = 0;

exec('minicom -D /dev/ttyUSB0 -b 115200 -o -C seriallog.txt', (err, stdout, stderr) => {
  if (err) {
      console.error("Could not open serial port or create serial file.")
    return;
  }
});

fs.watchFile('seriallog.txt', (curr, prev) => {
  console.log(`the current mtime is: ${curr.mtime}`);
  console.log(`the previous mtime was: ${prev.mtime}`);
  fs.readFile('seriallog.txt', 'utf8', function(err, contents) {
    console.log(contents.slice(pos));
    pos=contents.length;
});
});

http.createServer(function (req, res) {
  res.write(config.baudrate.toString()); //write a response to the client
  res.end(); //end the response
}).listen(8080); 