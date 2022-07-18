const sendEmail = require("../send-email.js");
module.exports = async function donationFromOtherChannel(amount) {
  const data = {
    subject:
      "Payment from unknown source (no corresponding donation intent from donation form exists)",
    amount,
  };
  return sendEmail(false, data);
};
