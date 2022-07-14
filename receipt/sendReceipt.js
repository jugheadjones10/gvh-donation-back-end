const sendEmail = require("../server.js");
module.exports = async function sendReceipt(userData) {
  sendEmail(true);
};
