const { exec } = require('child_process');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');

const constants = require('../../config.static.js');

const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
  INPUT_PHYSICAL_CHANGED,
  INPUT_FORCED_CHANGED,
  INPUT_FOLLOWING_CHANGED,
  OUTPUT_RESULT_CHANGED,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EXECUTING_CHANGED,
  LOG_ENTRY,
  LOG_RESET,
  LOG_SAVE,
  FTP_SUCCESS,
  FTP_FAILURE,
  SL_RESET,
  TABLE_RESET,
  TABLE_ENTRY,
  ERROR_OCCURRED,
  EXECUTE_START,
  EXECUTE_STOP,
  HANDLE_TABLE,
  HANDLE_OUTPUT,
  SHUTDOWN,
} = require('../../actions/types');

const results = [
  ['off', 'on'],
  ['forcedOff', 'forcedOn'],
];

const configPath = path.join(__dirname, '../..', 'configs');
const logPath = constants.saveFileLocation;
const version = constants.version;

class Realtime{
  constructor(server, config, store){
    this.store = store;
    Object.assign(this, config);
    
    this.io = socketio.listen(server);

    setInterval(() =>{
      const time = new Date();
      this.io.emit('time', time.getTime());
    }, 1000);

    this.store.subscribe(()=>{
      const state = this.store.getState();
      const lastAction = state.lastAction;
      switch (lastAction.type){
        case INPUT_FOLLOWING_CHANGED:
        case INPUT_FORCED_CHANGED:
        case INPUT_PHYSICAL_CHANGED: {
          const {index} = lastAction;
          const port = state.input.ports[index];
          const result = results[isForced?1:0][state?1:0];

          this.emitInput(port, index);
          break;
        }
        case OUTPUT_RESULT_CHANGED:
        case OUTPUT_FORCED_CHANGED:
        case OUTPUT_EXECUTING_CHANGED: {
          const {index} = lastAction;
          const port = state.input.ports[index];
          //const result = executing?results[isForced?1:0][state?1:0];
          this.emitOutput(port, index);
          break;
        }
        case SERIAL_ENTRY: {
          const {index, entry} = lastAction.payload;

          this.io.emit('entry', {index, entry, entryTime: new Date().getTime()});
          break;
        }
        case SERIAL_AVERAGE: {
          const {index, average} = lastAction.payload;

          this.io.emit('average', {index, average});
        }
        case SERIAL_RESET: {
          this.io.emit('clear');
        }
        case TABLE_ENTRY: {
          const {index, entry} = lastAction.payload;
          
          this.io.emit('value', {name: 'table' + index, value: entry});
        }
        case ERROR_OCCURRED: {
          const err = lastAction.payload;

          this.io.emit('error', err.message);
        }
        case FTP_SUCCESS: {
          this.io.emit('uploadLogResponse', 'Successfully uploaded log file');
        }
        case FTP_FAILURE: {
          const err = lastAction.payload;

          this.io.emit('uploadLogResponse', err.message);
        }
      }
    });

    this.io.on('connection', socket => {
      console.log('a user connected');
      socket.emit('ip', ip.address());
      this.emitAllState();

      const commands = {
        'configExists': this.configExists,
        'saveCurrentConfig': this.saveCurrentConfig,
        'saveConfig': this.saveConfig,
        'loadConfig': this.loadConfig,
        'loadDefault': this.loadDefault,
        'deleteConfig': this.deleteConfig,
        'deleteLog': this.deleteLog,
        'uploadLog': this.uploadLog,
        'setDateTime': this.setDateTime,
        'getLogList': this.getLogList,
        'getConfigList': this.getConfigList,
        'forceInput': this.forceInput,
        'forceOutput': this.forceOutput,
      }

      for(let command in commands){
        socket.on(command, msg => commands[command](socket, msg));
      }
    });
  }

  emitInput(port, index){
    let state;
    if (port.isForced){ 
      state = port.forcedState?'forcedOn':'forcedOff';
    } else {
      state = port.state?'on':'off';
    }
    this.io.emit('state', {name: 'input'+index, state});
  }

  emitOutput(port, index){
    let state;
    if (port.isForced){
      state = port.forcedState?'forcedOn':'forcedOff';
    } else {
      if (!port.state && port.result)
        state = 'execute';
      else
        state = port.state?'on':'off';
    }

    this.io.emit('state', {name: 'output'+index, state});
  }

  emitAllState(){
    const state = this.store.getState();

    state.input.ports.forEach((port, index) => {
      emitInput(port, index)
    });

    state.output.ports.forEach((port, index) => {
      emitOutput(port, index)
    });
  }

  saveCurrentConfig(socket, config){
    const name = path.join(configPath, 'current.js');

    fs.copyFileSync(name, path.join(configPath, 'lastgood.js'));

    let conf = JSON.stringify(config, null, 2).replace(/"/g, "'")
      .replace(/\\u00[0-9]{2}/g, match => String.fromCharCode(parseInt(match.slice(-2), 16)))
      .replace(/'[\w]+':/g, match => match.slice(1,-2)+' :');
    conf = 'var config =' + conf + ';\n\nmodule.exports = config;';
    
    try {
      fs.accessSync(name);
      fs.unlinkSync(name);
    } 
    catch (err) {
    }

    fs.writeFileSync(name, conf, (err) => {  
      if (err) throw err;

      console.log('Config saved!');
    });
    this.store.dispatch({type: SHUTDOWN});
  }

  configExists(socket, name){
    socket.emit('configExistsResult', {result: fs.existsSync(path.join(configPath, name + 'V' + version + '.js')), name});
  }

  saveConfig(socket, msg){
    const name = path.join(configPath, msg.name +'V'+ version + '.js');
    let conf = JSON.stringify(msg.config, null, 2).replace(/"/g, "'")
      .replace(/\\u00[0-9]{2}/g, match => String.fromCharCode(parseInt(match.slice(-2), 16)))
      .replace(/'[\w]+':/g, match => match.slice(1,-2)+' :');
    conf = 'var config =' + conf + ';\n\nmodule.exports = config;';

    try {
      fs.accessSync(name);
      fs.unlinkSync(name);
    } 
    catch (err) {
    }

    fs.writeFileSync(name, conf, (err) => {  
      if (err) console.log(err);

      console.log('Config saved!');
    });
  }

  loadConfig(socket, name){
    socket.emit('config', fs.readFileSync(path.join(configPath, name)).toString().replace('module.exports = config;', '').replace(/^var /,''));
  }

  loadDefault(socket, msg){
    socket.emit('config', fs.readFileSync(path.join(configPath, 'config.template.js')).toString().replace('module.exports = config;', '').replace(/^var /,''));
  }

  deleteConfig(socket, name){
    try {
      fs.accessSync(path.join(configPath, name));
      fs.unlinkSync(path.join(configPath, name));
    } 
    catch (err) {
    }
  }

  deleteLog(socket, name){
    try {
      fs.accessSync(path.join(logPath, name));
      fs.unlinkSync(path.join(logPath, name));
    } 
    catch (err) {
    }
  }

  uploadLog(socket,{name, index}){
    this.store.dispatch({
      type: LOG_SAVE,
      payload: {
        fileName: name, 
        ftpIndex: index,
      }
    })
  }

  setDateTime(socket, dateTime){
    exec(`timedatectl set-time @${dateTime}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${err}`);
        return;
      }
    });
  }

  getLogList(socket, msg){
    fs.readdir(logPath, (err, files) =>{
      socket.emit('logList', files.filter((element)=>element.endsWith('.csv')).sort().reverse());
    });
  }

  getConfigList(socket, msg){
    fs.readdir(configPath, (err, files) =>{
      socket.emit('configList', files.filter((element)=>element.endsWith('.js')).sort());
    });
  }

  forceInput(socket, index){
    const port = this.store.getState().input.ports[index];

    if (port.isForced){
      if (port.previousForced){
        this.store.dispatch({
          type: INPUT_FORCED_CHANGED,
          payload: {
            isForced: false,
            previousForced: true,
            forcedState: false,
          }
        });
      } else {
        this.store.dispatch({
          type: INPUT_FORCED_CHANGED,
          payload: {
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          }
        });
      }
    } else {
      this.store.dispatch({
        type: INPUT_FORCED_CHANGED,
        payload: {
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        }
      });
    }
    this.store.dispatch({type: HANDLE_TABLE});
    this.store.dispatch({type: HANDLE_OUTPUT});
  }

  forceOutput(socket, index){
    const port = this.store.getState().output.ports[index];

    if (port.isForced){
      if (port.previousForced){
        this.store.dispatch({
          type: OUTPUT_FORCED_CHANGED,
          payload: {
            isForced: false,
            previousForced: true,
            forcedState: false,
          }
        });
      } else {
        this.store.dispatch({
          type: OUTPUT_FORCED_CHANGED,
          payload: {
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          }
        });
      }
    } else {
      this.store.dispatch({
        type: OUTPUT_FORCED_CHANGED,
        payload: {
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        }
      });
    }
    this.store.dispatch({type: HANDLE_TABLE});
    this.store.dispatch({type: HANDLE_OUTPUT});
  }
}

module.exports = Realtime;