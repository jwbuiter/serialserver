const Client = require('ftp');
const path = require('path');
const fs = require('fs');
const dateFormat = require('dateformat');

const {
  LOG_UPLOAD,
  LOG_RESET
} = require('../../actions/types');

const constants = require('../../config.static');

function FTPModule(config, store) {
  const {
    targets,
    automatic,
    uploadExcel
  } = config;
  const {logID} = store.getState().config.logger;

  function upload(address, folder, username, password, fileName, callback) {
    if (!callback)
      callback = () => {};

    const localPath = constants.saveLogLocation;

    let c = new Client();
    c.on('ready', () => {
      c.mkdir(folder, true, () => {
        c.put(path.join(localPath, fileName), path.join(folder, fileName), (err) => {
          c.end();
          callback('Successfully uploaded ' + fileName);
        });
      });
    });
    c.on('error', (err) => {
      callback(err.message)
    })

    if (!(username && password)) {
      callback('No username and password set');
      return;
    }
    c.connect({
      host: address,
      user: username,
      password
    });
  }

  function uploadDataFile(address, folder, username, password){
    const sourceFile = path.join(__dirname, '../../data/data.xls');
    if (!fs.existsSync(sourceFile))
      return;

    const fileStats = fs.statSync(path.join(__dirname, '../../data/data.xls'));
    const modifyDate = new Date(fileStats.mtimeMs);
    const fileName = `${constants.name}_${logID}_${dateFormat(modifyDate,'yyyy-mm-dd_HH-MM-ss')}.xls`;

    const c = new Client();
    c.on('ready', ()=>{
      c.mkdir(folder,true, () => {
        c.put(sourceFile, path.join(folder, fileName), (err) => {
          c.end();
        });
      })
    })

    c.on('error', (err) => {
      console.log('FTP Error:' + err.message);
    })

    c.connect({
      host: address,
      user: username,
      password
    })
  }

  store.listen((lastAction) => {
    switch (lastAction.type) {
      case LOG_UPLOAD:
        {
          const {
            fileName,
            ftpIndex,
            callback
          } = lastAction.payload;
          const {
            address,
            folder,
            username,
            password
          } = targets[ftpIndex];
          upload(address, folder, username, password, fileName, callback);
          if (uploadExcel)
              uploadDataFile(address,folder,username, password)
          break;
        }
      case LOG_RESET:
        {
          const fileName = lastAction.payload;
          targets.forEach(element => {
            const {
              address,
              folder,
              username,
              password
            } = element;
            if (automatic)
              upload(address, folder, username, password, fileName);
            if (uploadExcel)
              uploadDataFile(address,folder,username, password)
          });
          break;
        }
    }
  });

  return {};
}

module.exports = FTPModule;