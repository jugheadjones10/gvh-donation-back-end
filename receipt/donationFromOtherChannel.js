const sendEmail = require("../send-email.js");
const { OTHERCHANNELEMAIL } = require("../constants.js");

module.exports = async function donationFromOtherChannel(amount) {
  return sendEmail({
    operation: OTHERCHANNELEMAIL,
    emailSubject:
      "Payment from unknown source (no corresponding donation intent from donation form exists)",
    userData: { amount },
  });
};
