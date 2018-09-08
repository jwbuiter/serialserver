const {createStore} = require('redux');
const rootReducer = require('./reducers/index.js');

const store = createStore(rootReducer);

store.listeners = [];

store.listen = callback => {
  if (typeof callback !== 'function') {
    throw new Error('Expected the listener to be a function.')
  }
  store.listeners.push(callback);
}

store.subscribe(()=>{
  const lastAction = store.getState().lastAction;
  store.listeners.forEach(listener => {
    listener(lastAction);
  });
})

module.exports=store;