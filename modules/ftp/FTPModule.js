const Client = require('ftp');
const path = require('path');

const {
  LOG_UPLOAD,
  LOG_RESET,
  FTP_SUCCESS,
  FTP_FAILURE,
} = require('../../actions/types');

const constants = require('../../config.static');

function FTPModule(config, store) {
  const {targets, automatic} = config;

  function upload(address, folder, username, password, fileName){
    const localPath = constants.saveLogLocation;
  
    let c = new Client();
    c.on('ready', () => {
      c.mkdir(folder, true, () => {
        c.put(path.join(localPath, fileName), path.join(folder, fileName), (err) => {
          c.end();
          store.dispatch({type: FTP_SUCCESS});
        });
      });
    });
    c.on('error', (err) => {
      store.dispatch({type: FTP_FAILURE, payload: err});
    })
  
    if (!(username && password)){
      store.dispatch({type: FTP_FAILURE, payload: {message: 'No username and password set'}});
      return;
    }
    c.connect({address, username, password});
  }

  store.listen((lastAction)=>{
    //console.log(lastAction.type)
    switch (lastAction.type){
      case LOG_UPLOAD:{
        const {fileName, ftpIndex}= lastAction.payload;
        const {address, folder, username, password} = targets[ftpIndex];
        upload(address, folder, username, password, fileName);
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