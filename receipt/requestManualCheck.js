const sendEmail = require("../server.js");
module.exports = function requestManualCheck(userData) {
  sendEmail(false);
  // Update google sheet to flag this donation intent as needing manual check
};
