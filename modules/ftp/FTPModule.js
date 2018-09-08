const Client = require('ftp');
const path = require('path');

const {
  LOG_SAVE,
  LOG_RESET,
  FTP_SUCCESS,
  FTP_FAILURE,
} = require('../../actions/types')
const constants = require('../../config.static');

function upload(addressFolder, userPassword, fileName){
  const host = addressFolder.split('/')[0];
  const folder = addressFolder.split('/')[1] || '';
  const user = userPassword.split(':')[0];
  const password = userPassword.split(':')[1];
  const localPath = constants.saveFileLocation;

  let c = new Client();
  c.on('ready', () => {
    c.mkdir(folder, true, () => {
      c.put(path.join(localPath, fileName), path.join(folder, fileName), (err) => {
        c.end();
        this.store.dispatch({type: FTP_SUCCESS});
      });
    });
  });
  c.on('error', (err) => {
    this.store.dispatch({type: FTP_FAILURE, payload: err});
  })

  if (!(user && password)){
    this.store.dispatch({type: FTP_FAILURE, payload: {message: 'No username and password set'}});
    return;
  }
  c.connect({host, user, password});
}

function FTPModule(config, store) {
  console.log('FTP')
  const {targets, automatic} = config;

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
        const fileName = lastAction.payload;
        if (automatic){
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