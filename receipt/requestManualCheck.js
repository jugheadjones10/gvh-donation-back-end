const sendEmail = require("../send-email.js");
const { updateDonationReceivedCol } = require("../google-sheet");
require("dotenv").config();

module.exports = function requestManualCheck(userData, donationID) {
  userData.subject = "Manual Donation check required";
  return Promise.all([
    sendEmail(false, userData),
    updateDonationReceivedCol("N", process.env.GOOGLE_SHEET_ID, donationID),
  ]);
  // Update google sheet to flag this donation intent as needing manual check
};
