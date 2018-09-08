const express = require('express');
const fileUpload = require('express-fileupload');
const zip = require('express-zip');
const path = require('path');
const { exec } = require('child_process');


const {
  SHUTDOWN,
} = require('../../actions/types');
const Realtime = require('./Realtime');
const constants = require('../../config.static');

const app = express();
const clientPath = '../../client';
const logPath = constants.saveLogLocation;

function SiteModule(config, store) {
  function importFile(req, res){
    if (!req.files.importFile){
      return res.send('<meta http-equiv="refresh" content="1; url=/" /><title>MBDCcomUnit</title> No files were uploaded.')
    }
    
    let uploadedFile = req.files.importFile;
    
    uploadedFile.mv(path.join(__dirname, '../..', 'data', 'data.xls'), (err) => {
      if (err){
        return res.status(500).send(err);
      }
  
      console.log(__dirname + '/data/data.xls');
      res.send('<meta http-equiv="refresh" content="5; url=/" /><title>MBDCcomUnit</title> File uploaded.');
      onlineGPIO.writeSync(0);
      process.exit();
    });
  }
  
  function uploadConfig(res, req) {
    if (!req.files.importConfig){
      return res.send('<meta http-equiv="refresh" content="1; url=/filesettings" /><title>MBDCcomUnit</title> No files were uploaded.')
    }
  
    let uploadedFile = req.files.importConfig;
    
    uploadedFile.mv(path.join(__dirname, '../..', 'configs', uploadedFile.name), (err) => {
      if (err){
        return res.status(500).send(err);
      }
  
      res.send('<meta http-equiv="refresh" content="1; url=/filesettings" /><title>MBDCcomUnit</title> Config uploaded.');
    });
  }

  const staticRoutes = {
    '/': 'client.html',
    '/settings': 'settings.html',
    '/current.js': '../configs/current.js',
    '/config.static.js': '../config.static.js'
  }
  
  const functionRoutes = {
    '/downloadConfig': (req, res) => res.download(path.join(__dirname, '../..', 'configs', req.query.file)),
    '/downloadLog':(req, res) => {
      
      if (req.query.multiFile){
        const fileList = req.query.multiFile.split(',').map((element) => ({path: path.join(logPath, element), name: element}));
        res.zip(fileList, timeString().split('.')[0] + '.zip');
      }
      else if (req.query.file){
        res.download(path.join(logPath, req.query.file));
      }
      else{
        res.sendFile(path.join(__dirname, clientPath, 'download.html'));
      }
    },
    '/shutdown': (req, res) => {
      res.send('<title>MBDCcomUnit</title>Shutting down now.');
      exec('shutdown now', (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          return;
        }
      });
    },
    '/restart': (req, res) => {
      res.send('<meta http-equiv="refresh" content="5; url=/" /><title>MBDCcomUnit</title>Restarting now.')
      store.dispatch({type: SHUTDOWN});
      process.exit();
    },
    '/fileupload': (req, res) => {
      if (constants.exposeUpload){
        res.sendFile(path.join(__dirname, clientPath, 'fileUpload.html'));
      } else {
        res.send('This module is not enabled.')
      }
    },
    '/filesettings': (req, res) => {
      if (constants.exposeUpload){
        res.sendFile(path.join(__dirname, clientPath, 'fileSettings.html'));
      } else {
        res.send('This module is not enabled.')
      }
    },
  }
  
  const uploadRoutes = {
    '/importFile': importFile,
    '/uploadConfig': uploadConfig, 
  }

  app.use('/res', express.static('client/res'));

  for(let route in staticRoutes){
    app.get(route, (req, res) => {
      res.sendFile(path.join(__dirname, clientPath, staticRoutes[route]))
    })
  }

  for(let route in functionRoutes){
    app.get(route, functionRoutes[route]);
  }

  for(let route in uploadRoutes){
    app.get(route, fileUpload());
    app.post(route, uploadRoutes[route]);
  }

  for(let i = 0; i < store.getState().serial.coms.length; i++){
    app.get('/com'+i, (req, res) =>{
      const com = store.getState().serial.coms[i];
      let sendString='<title>MBDCcomUnit</title>';
      console.log(store.getState().serial);

      if (com.average === ''){
        sendString += com.entry;
      } else {
        sendString += com.average;
      }
      res.send(sendString);
    });
  }

  const server = app.listen(3000, () => console.log('Server listening on port 3000'));
  const realtime = new Realtime(server, {}, store);

  return {};
}

module.exports = SiteModule;