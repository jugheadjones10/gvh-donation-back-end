const sendEmail = require("../send-email.js");
const { updateDonationReceivedCol } = require("../google-sheet");
const { MANUALREQEMAIL } = require("../constants.js");
require("dotenv").config();

module.exports = function requestManualCheck(userData, donationID) {
  return Promise.all([
    sendEmail({
      operation: MANUALREQEMAIL,
      userData,
      donationID,
      emailSubject: "Manual Donation check required",
    }),
    updateDonationReceivedCol("N", process.env.GOOGLE_SHEET_ID, donationID),
  ]);
  // Update google sheet to flag this donation intent as needing manual check
};
