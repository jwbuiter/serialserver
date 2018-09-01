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

class siteModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);

    this.staticRoutes = {
      '/': 'client.html',
      '/settings': 'settings.html',
      '/current.js': '../configs/current.js',
      '/config.static.js': '../config.static.js'
    }
    
    this.functionRoutes = {
      '/downloadConfig': (req, res) => res.download(path.join(__dirname, '../..', 'configs', req.query.file)),
      '/downloadLog':(req, res) => {
        if (request.query.multiFile){
          fileList = req.query.multiFile.split(',').map((element) => ({path: path.join(constants.saveFileLocation, element), name: element}));
          res.zip(fileList, timeString().split('.')[0] + '.zip');
        }
        else if (req.query.file){
          res.download(path.join(constants.saveFileLocation, req.query.file));
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
        this.store.dispatch({type: SHUTDOWN});
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
    
    this.uploadRoutes = {
      '/importFile': this.importFile,
      '/uploadConfig': this.uploadConfig, 
    }

    app.use('/res', express.static('client/res'));

    for(let route in this.staticRoutes){
      app.get(route, (req, res) => {
        res.sendFile(path.join(__dirname, clientPath, this.staticRoutes[route]))
      })
    }

    for(let route in this.functionRoutes){
      app.get(route, this.functionRoutes[route]);
    }

    for(let route in this.uploadRoutes){
      app.get(route, fileUpload());
      app.post(route, this.uploadRoutes[route]);
    }

    this.server = app.listen(3000, () => console.log('Server listening on port 3000'));
    this.realtime = new Realtime(this.server, {}, this.store);
  }

  importFile(req, res){
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
  
  uploadConfig(res, req) {
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
}

module.exports = siteModule;