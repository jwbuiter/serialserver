const Client = require('ftp');
const path = require('path');

const {
  LOG_SAVE,
  LOG_RESET,
  FTP_SUCCESS,
  FTP_FAILURE,
} = require('../../actions/types')
const constants = require('../../config.static');


class FTPModule {
  constructor(config, store){
    this.store = store;
    Object.assign(this, config);

    this.store.subscribe(()=>{
      let state =  this.store.getState();
      const lastAction = state.lastAction;
      switch (lastAction.type){
        case LOG_SAVE:{
          const {fileName, ftpIndex}= lastAction.payload;
          const {addressFolder, userPassword} = this.targets[ftpIndex];
          upload(addressFolder, userPassword, fileName);
          break;
        }
        case LOG_RESET:{
          const fileName = lastAction.payload;
          if (this.automatic){
            this.targets.forEach(element => {
              upload(element.addressFolder, element.userPassword, fileName);
            });
          }
          break;
          }
      }
    });
  }

  upload(addressFolder, userPassword, fileName){
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
}

module.exports = FTPModule;