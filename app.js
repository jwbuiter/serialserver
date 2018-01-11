var http = require('http');
var config = require('./config')
const { exec } = require('child_process');


exec('minicom -D /dev/ttyUSB0 -b 115200 -o -C mbdccom.txt', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    return;
  }
});


http.createServer(function (req, res) {
  res.write(config.baudrate.toString()); //write a response to the client
  res.end(); //end the response
}).listen(8080); 