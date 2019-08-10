const { RESET_LAST_ACTION } = require("../actions/types");

module.exports = function(state = null, action) {
  if (action.type === RESET_LAST_ACTION) return action.payload;
  return action;
};
