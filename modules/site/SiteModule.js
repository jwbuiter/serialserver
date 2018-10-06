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
const titleString = '<title>' + constants.name + '</title>';

function SiteModule(config, store) {
  function importFile(req, res){
    console.log(req.files)
    if (!req.files.importFile){
      return res.send(titleString + '<meta http-equiv="refresh" content="1; url=/" />No files were uploaded.')
    }
    
    let uploadedFile = req.files.importFile;
    
    uploadedFile.mv(path.join(__dirname, '../..', 'data', 'data.xls'), (err) => {
      if (err){
        return res.status(500).send(err);
      }
  
      console.log(__dirname + '/data/data.xls');
      res.send(titleString + '<meta http-equiv="refresh" content="5; url=/" /> File uploaded.');
      onlineGPIO.writeSync(0);
      process.exit();
    });
  }
  
  function uploadConfig(req, res) {
    console.log(req.files)
  
    if (!req.files.importConfig){
      return res.send(titleString + '<meta http-equiv="refresh" content="1; url=/filesettings" /> No files were uploaded.')

    }
  
    let uploadedFile = req.files.importConfig;
    
    uploadedFile.mv(path.join(__dirname, '../..', 'configs', uploadedFile.name), (err) => {
      if (err){
        return res.status(500).send(err);
      }
  
      res.send(titleString + '<meta http-equiv="refresh" content="1; url=/filesettings" /> Config uploaded.');
    });
  }

  const staticRoutes = {
    '/': 'client.html',
    '/settings': 'settings.html',
    '/current.js': '../configs/current.js',
    '/config.static.js': '../config.static.js'
  }

  const functionRoutes = {
    '/com': (req, res) => res.send(titleString + (store.getState().input.executing?'1':'0')),
    '/coml': (req, res) => {
      const loggerState = store.getState().logger;
      const entries = loggerState.entries.slice(-1);
      const legend = loggerState.legend;

      res.send(JSON.stringify({entries, legend}, null, 2));
    },
    '/comlog': (req, res) => {
      const loggerState = store.getState().logger;
      const entries = loggerState.entries.slice().reverse();
      const legend = loggerState.legend;

      res.send(JSON.stringify({entries, legend}, null, 2));
    },
    '/comlogu': (req, res) => {
      const loggerState = store.getState().logger;
      const entries = loggerState.entries.filter(entry => entry[entry.length-1] !== 0).reverse();
      const legend = loggerState.legend;
      
      res.send(JSON.stringify({entries, legend}, null, 2));
    },
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
      res.send(titleString + 'Shutting down now.');
      exec('shutdown now', (err, stdout, stderr) => {
        if (err) {
          console.error(`exec error: ${err}`);
          return;
        }
      });
    },
    '/restart': (req, res) => {
      res.send(titleString + '<meta http-equiv="refresh" content="5; url=/" />Restarting now.')
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

  for(let i = 0; i < store.getState().serial.coms.length; i++){
    app.get('/com'+i, (req, res) =>{
      const com = store.getState().serial.coms[i];
      let sendString = titleString;
      console.log(store.getState().serial);

      if (com.average === ''){
        sendString += com.entry;
      } else {
        sendString += com.average;
      }
      res.send(sendString);
    });

    for(let route in uploadRoutes){
      app.use(route, fileUpload());
      app.post(route, uploadRoutes[route]);
    }
  
  }

  const server = app.listen(constants.port, () => console.log('Server listening on port ' + constants.port));
  const realtime = new Realtime(server, {}, store);

  return {};
}

module.exports = SiteModule;