const fs = require('fs');
const path = require('path');

const {
  CONFIG_UPDATE,
  CONFIG_SAVE,
  ERROR_OCCURRED,
} = require('../../actions/types');

const configPath = path.join(__dirname, '../..', 'configs');

function ConfigModule(store) {
  let config = require(path.join(configPath, 'current.js'));

  function saveConfig(config, name) {
    console.log('Saving config: ' + name);
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
  }

  store.listen((lastAction) => {
    switch (lastAction.type){
      case CONFIG_UPDATE: {
        config = Object.assign(config, lastAction.payload);

        const name = path.join(configPath, 'current.js');

        fs.copyFileSync(name, path.join(configPath, 'lastgood.js'));
        saveConfig(config, name);
        break;
      }
      case CONFIG_SAVE: {
        const {config, name} = lastAction.payload;
        saveConfig(config, name);
        break;
      }
    }
  })

  return config;
}

module.exports = ConfigModule;