const sendEmail = require("../server.js");
module.exports = function requestManualCheck(userData) {
  sendEmail(false);
};
