const Client = require('ftp');
const path = require('path');

const {
  LOG_SAVE,
  LOG_RESET,
  FTP_SUCCESS,
  FTP_FAILURE,
} = require('../../actions/types')
const constants = require('../../config.static');



function FTPModule(config, store) {
  const {targets, automatic} = config;

  function upload(addressFolder, userPassword, fileName){
    const host = addressFolder.split('/')[0];
    const folder = addressFolder.split('/')[1] || '';
    const user = userPassword.split(':')[0];
    const password = userPassword.split(':')[1];
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
  
    if (!(user && password)){
      store.dispatch({type: FTP_FAILURE, payload: {message: 'No username and password set'}});
      return;
    }
    c.connect({host, user, password});
  }

  store.listen((lastAction)=>{
    //console.log(lastAction.type)
    switch (lastAction.type){
      case LOG_SAVE:{
        const {fileName, ftpIndex}= lastAction.payload;
        const {addressFolder, userPassword} = targets[ftpIndex];
        upload(addressFolder, userPassword, fileName);
        break;
      }
      case LOG_RESET:{
        if (automatic){
          const fileName = lastAction.payload;
          targets.forEach(element => {
            upload(element.addressFolder, element.userPassword, fileName);
          });
        }
        break;
      }
    }
  });

  return {};
}

module.exports = FTPModule;