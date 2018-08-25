const {createStore} = require('redux');
const rootReducer = require('./reducers/index.js');

const store = createStore(rootReducer);

module.exports=store;