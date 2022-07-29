const sendEmail = require("../send-email.js");
const { updateDonationReceivedCol } = require("../google-sheet");
const {
  MANUALREQEMAIL,
  RECEIPTEMAIL,
  OTHERCHANNELEMAIL,
} = require("../constants.js");
require("dotenv").config();

exports.requestManualCheck = function (userData, donationID) {
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

exports.markDonationUnresolved = function (donationID) {
  return updateDonationReceivedCol(
    "N",
    process.env.GOOGLE_SHEET_ID,
    donationID
  );
};

// Add way to delete QR code picture in public folder? Also add expiry to QR code to reduce chance of random donations from saved
// QR code screenshots
exports.sendReceipt = function (userData, donationID) {
  return Promise.all([
    sendEmail({ operation: RECEIPTEMAIL, userData, donationID }),
    updateDonationReceivedCol("Y", process.env.GOOGLE_SHEET_ID, donationID),
  ]);
  // Update google sheet to reflect confirmed payment
};

exports.donationFromOtherChannel = async function (amount) {
  return sendEmail({
    operation: OTHERCHANNELEMAIL,
    emailSubject:
      "Payment from unknown source (no corresponding donation intent from donation form exists)",
    userData: { amount },
  });
};
