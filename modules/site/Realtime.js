const { exec } = require('child_process');
const socketio = require('socket.io');
const fs = require('fs');
const path = require('path');
const ip = require('ip');

const constants = require('../../config.static.js');

const {
  SERIAL_ENTRY,
  SERIAL_AVERAGE,
  SERIAL_RESET,
  INPUT_FORCED_CHANGED,
  INPUT_EMIT,
  OUTPUT_FORCED_CHANGED,
  OUTPUT_EMIT,
  LOG_ENTRY,
  LOG_RESET,
  LOG_UPLOAD,
  FTP_SUCCESS,
  FTP_FAILURE,
  SL_RESET_INDIVIDUAL,
  SL_RESET_GLOBAL,
  SL_SUCCESS,
  TABLE_RESET_CELL,
  TABLE_ENTRY,
  TABLE_EMIT,
  EXCEL_FOUND_ROW,
  ERROR_OCCURRED,
  EXECUTE_START,
  EXECUTE_STOP,
  HANDLE_TABLE,
  HANDLE_OUTPUT,
  CONFIG_UPDATE,
  CONFIG_SAVE,
  RESTART,
} = require('../../actions/types');

const results = [
  ['off', 'on'],
  ['forcedOff', 'forcedOn'],
];

const configPath = path.join(__dirname, '../..', 'configs');
const logPath = constants.saveLogLocation;
const version = constants.version;

function Realtime(server, config, store){
  const io = socketio.listen(server);

  function emitInput(port, index){
    let state;
    if (port.isForced){ 
      state = port.forcedState?'forcedOn':'forcedOff';
    } else {
      state = port.state?'on':'off';
    }
    io.emit('state', {name: 'input'+index, state});
    io.emit('input', {index, ...port});
  }
  
  function emitOutput(port, index){
    let state;
    if (port.isForced){
      state = port.forcedState?'forcedOn':'forcedOff';
    } else {
      if (!port.state && port.result)
        state = 'execute';
      else
        state = port.state?'on':'off';
    }
    io.emit('state', {name: 'output'+index, state});
    io.emit('output', {index, ...port});
  }

  function emitSelfLearning(){
    const state = store.getState();

    switch (state.selfLearning.type){
      case 'individual':{
        const {calibration, tolerance, success, comIndex} = state.selfLearning;
        const {generalEntries, individualEntries} = state.selfLearning.individual;
        io.emit('selfLearning', {individual: true, calibration, tolerance, success, comIndex, generalEntries, individualEntries});
        break;
      }
      case 'global':{
        const {calibration, tolerance, success, comIndex} = state.selfLearning;
        const {matchedTolerance} = state.selfLearning.global;
        io.emit('selfLearning', {individual: false, calibration, tolerance, success, comIndex, matchedTolerance});
        break;
      }
    }
  }
  
  function emitAllState(socket){
    const state = store.getState();
  
    state.input.ports.forEach((port, index) => {
      emitInput(port, index)
    });
  
    state.output.ports.forEach((port, index) => {
      emitOutput(port, index)
    });

    state.table.cells.forEach((cell, index) => {
      socket.emit('table', {index, value: cell.entry, manual: cell.manual});
    })

    // state.serial.histories.forEach((history, index) => {
    //   history.forEach(({entry, time}) => {
    //     io.emit('entry', {index, entryTime: time, entry});
    //   });
    // });

    state.serial.coms.forEach(({entry, time, average}, index) => {
      socket.emit('entry', {index, entryTime: time, entry});
      socket.emit('average', {index, average});
    });

    if (constants.enabledModules.selfLearning){
      emitSelfLearning();
    }
    
  }
  
  function saveCurrentConfig(socket, config){
    store.dispatch({
      type: CONFIG_UPDATE,
      payload: config,
    });
    store.dispatch({type: RESTART});
  }
  
  function configExists(socket, name){
    socket.emit('configExistsResult', {result: fs.existsSync(path.join(configPath, name + 'V' + version + '.json')), name});
  }
  
  function saveConfig(socket, msg){
    const name = path.join(configPath, msg.name +'V'+ version + '.json');

    store.dispatch({
      type: CONFIG_SAVE,
      payload: {
        name,
        config: msg.config,
      },
    });
  }
  
  function loadConfig(socket, name, callback){
    const config = fs.readFileSync(path.join(configPath, name)).toString();
    callback(config.match(/{.*}/s)[0]);
  }
  
  function deleteConfig(socket, name){
    try {
      fs.accessSync(path.join(configPath, name));
      fs.unlinkSync(path.join(configPath, name));
    } 
    catch (err) {
    }
  }
  
  function deleteLog(socket, name){
    try {
      fs.accessSync(path.join(logPath, name));
      fs.unlinkSync(path.join(logPath, name));
    } 
    catch (err) {
    }
  }
  
  function uploadLog(socket,{name, index}){
    store.dispatch({
      type: LOG_UPLOAD,
      payload: {
        fileName: name, 
        ftpIndex: index,
      }
    })
  }
  
  function setDateTime(socket, dateTimeString){
    console.log(`hwclock --set --date="${dateTimeString}"`);
    exec(`hwclock --set --date="${dateTimeString}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${err}`);
        return;
      }
    });
  }
  
  function getLogList(socket, msg){
    fs.readdir(logPath, (err, files) =>{
      socket.emit('logList', files.filter((element)=>element.endsWith('.csv')).sort().reverse());
    });
  }
  
  function getConfigList(socket, msg){
    const mayorVersion = version.split('.')[0];
    fs.readdir(configPath, (err, files) =>{
      socket.emit('configList', files
        .filter((element)=>element.match(/V[0-9]+.[0-9]+.json$/))
        .filter((element)=>{
          const elementVersion = element.match(/V[0-9]+./)[0];
          const elementMayorVersion = elementVersion.slice(1,-1);
          return (elementMayorVersion === mayorVersion)
        })
        .sort());
    });
  }
  
  function forceInput(socket, index){
    const port = store.getState().input.ports[index];
  
    if (port.isForced){
      if (port.previousForced){
        store.dispatch({
          type: INPUT_FORCED_CHANGED,
          payload: {
            index,
            isForced: false,
            previousForced: true,
            forcedState: false,
          }
        });
      } else {
        store.dispatch({
          type: INPUT_FORCED_CHANGED,
          payload: {
            index,
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          }
        });
      }
    } else {
      store.dispatch({
        type: INPUT_FORCED_CHANGED,
        payload: {
          index,
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        }
      });
    }
    store.dispatch({type: HANDLE_TABLE});
    store.dispatch({type: HANDLE_OUTPUT});
  }
  
  function forceOutput(socket, index){
    const port = store.getState().output.ports[index];
  
    if (port.isForced){
      if (port.previousForced){
        store.dispatch({
          type: OUTPUT_FORCED_CHANGED,
          payload: {
            index,
            isForced: false,
            previousForced: true,
            forcedState: false,
          }
        });
      } else {
        store.dispatch({
          type: OUTPUT_FORCED_CHANGED,
          payload: {
            index,
            isForced: true,
            previousForced: true,
            forcedState: !port.forcedState,
          }
        });
      }
    } else {
      store.dispatch({
        type: OUTPUT_FORCED_CHANGED,
        payload: {
          index,
          isForced: true,
          previousForced: false,
          forcedState: !port.state,
        }
      });
    }
    store.dispatch({type: HANDLE_TABLE});
    store.dispatch({type: HANDLE_OUTPUT});
  }

  function handleManual(socket, msg){
    store.dispatch({
      type: TABLE_ENTRY,
      payload: {
        index: msg.index,
        entry: msg.value,
        manual: true
      }
    });
    store.dispatch({type: TABLE_EMIT, payload: {
      index: msg.index,
      entry: msg.value,
      manual: true
    }});
    store.dispatch({type: HANDLE_TABLE});
    store.dispatch({type: HANDLE_OUTPUT});
  }

  setInterval(() =>{
    io.emit('time', new Date().getTime());
  }, 1000);

  store.listen((lastAction)=>{
    const state = store.getState();
    switch (lastAction.type){
      case INPUT_EMIT: {
        const index = lastAction.payload;
        const port = state.input.ports[index];

        emitInput(port, index);
        break;
      }
      case OUTPUT_EMIT: {
        const index = lastAction.payload;
        const port = state.output.ports[index];

        emitOutput(port, index);
        break;
      }
      case SERIAL_ENTRY: {
        const {index, entry} = lastAction.payload;

        io.emit('entry', {index, entry, entryTime: new Date().getTime()});
        break;
      }
      case SERIAL_AVERAGE: {
        const {index, average} = lastAction.payload;

        io.emit('average', {index, average, entryTime: new Date().getTime()});
        break;
      }
      case SERIAL_RESET: {
        if (typeof(lastAction.payload) !== 'undefined'){
          const index = lastAction.payload;

          io.emit('entry', {index, entry: '', entryTime: new Date().getTime()})
        } else {
          io.emit('clearserial');
        }
        break;
      }
      case TABLE_EMIT: {
        const {index, entry, manual} = lastAction.payload;
        
        io.emit('table', {index, value: entry, manual: manual?true:false});
        break;
      }
      case EXCEL_FOUND_ROW: {
        io.emit('notfound', !lastAction.payload.found);
        break;
      }
      case ERROR_OCCURRED: {
        const err = lastAction.payload;
        
        io.emit('error', err.message);
        break;
      }
      case FTP_SUCCESS: {
        io.emit('uploadLogResponse', 'Successfully uploaded log file');
        break;
      }
      case FTP_FAILURE: {
        const err = lastAction.payload;

        io.emit('uploadLogResponse', err.message);
        break;
      }
      case SL_RESET_INDIVIDUAL:
      case SL_RESET_GLOBAL:
      case SL_SUCCESS: {
        emitSelfLearning();
        break;
      }
      case EXECUTE_START: {
        io.emit('executeStart'); 
        break;
      }
    }
  });

  io.on('connection', socket => {
    console.log('a user connected');
    socket.emit('ip', ip.address());
    emitAllState(socket);

    const commands = {
      'configExists': configExists,
      'settings': saveCurrentConfig,
      'saveConfig': saveConfig,
      'loadConfig': loadConfig,
      'deleteConfig': deleteConfig,
      'deleteLog': deleteLog,
      'uploadLog': uploadLog,
      'setDateTime': setDateTime,
      'getLogList': getLogList,
      'getConfigList': getConfigList,
      'forceInput': forceInput,
      'forceOutput': forceOutput,
      'manual': handleManual,
    }

      
    for(let command in commands){
      socket.on(command, (msg, callback) => commands[command](socket, msg, callback));
    }
  });
}

module.exports = Realtime;