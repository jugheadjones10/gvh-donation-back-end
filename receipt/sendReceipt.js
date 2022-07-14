const sendEmail = require("../server.js");
module.exports = async function sendReceipt(userData) {
  sendEmail(true);
  // Update google sheet to reflect confirmed payment
};
