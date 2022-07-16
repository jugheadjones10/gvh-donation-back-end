const sendEmail = require("../send-email.js");
const { updateDonationReceivedCol } = require("../google-sheet");
require("dotenv").config();

module.exports = function sendReceipt(userData, donationID) {
  return Promise.all([
    sendEmail(true, userData),
    updateDonationReceivedCol("Y", process.env.GOOGLE_SHEET_ID, donationID),
  ]);
  // Update google sheet to reflect confirmed payment
};
