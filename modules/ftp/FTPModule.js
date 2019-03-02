const Client = require('ftp');
const path = require('path');

const {
  LOG_UPLOAD,
  LOG_RESET
} = require('../../actions/types');

const constants = require('../../config.static');

function FTPModule(config, store) {
  const {targets, automatic} = config;

  function upload(address, folder, username, password, fileName, callback){
    if (!callback)
      callback=()=>{};

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
      callback(err)
    })
  
    if (!(username && password)){
      callback('No username and password set');
      return;
    }
    c.connect({host: address, user: username, password});
  }

  store.listen((lastAction)=>{
    switch (lastAction.type){
      case LOG_UPLOAD:{
        const {fileName, ftpIndex, callback }= lastAction.payload;
        const {address, folder, username, password} = targets[ftpIndex];
        upload(address, folder, username, password, fileName, callback);
        break;
      }
      case LOG_RESET:{
        if (automatic){
          const fileName = lastAction.payload;
          targets.forEach(element => {
            const {address, folder, username, password} = element;
            upload(address, folder, username, password, fileName);
          });
        }
        break;
      }
    }
  });

  return {};
}

module.exports = FTPModule;