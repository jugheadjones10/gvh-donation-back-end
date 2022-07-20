const sendEmail = require("../send-email.js");
const { updateDonationReceivedCol } = require("../google-sheet");
const { RECEIPTEMAIL } = require("../constants.js");
require("dotenv").config();

// Add way to delete QR code picture in public folder? Also add expiry to QR code to reduce chance of random donations from saved
// QR code screenshots
module.exports = function sendReceipt(userData, donationID) {
  return Promise.all([
    sendEmail({ operation: RECEIPTEMAIL, userData, donationID }),
    updateDonationReceivedCol("Y", process.env.GOOGLE_SHEET_ID, donationID),
  ]);
  // Update google sheet to reflect confirmed payment
};
