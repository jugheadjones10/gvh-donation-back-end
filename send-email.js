const nunjucks = require("nunjucks");
const comLogger = require("./logging.js");
const {
  RECEIPTEMAIL,
  OTHERCHANNELEMAIL,
  MANUALREQEMAIL,
} = require("./constants.js");
require("dotenv").config();
const notifEmail = process.env.NOTIFICATIONS_EMAIL;

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// We need to standardize naming of properties across google sheet and code to avoid bugs and cumberson name changes
module.exports = async function sendEmail({
  operation,
  userData,
  userData: { fullname, amount, project, email },
  donationID,
  emailSubject,
}) {
  if (operation === RECEIPTEMAIL) {
    comLogger(
      "info",
      `Sending receipt to the following user: \n ${JSON.stringify(userData)}`,
      { ID: donationID, human: true }
    );

    const date = new Date();
    const datestyle = {
      day: "numeric",
      year: "numeric",
      month: "short",
    };
    const emailHtml = nunjucks.render("email/receipt-email.html", {
      logo: process.env.HOSTNAME + ":" + process.env.PORT + "/logo.webp",
      date: date.toLocaleDateString("en", datestyle),
      fullname: fullname,
      amount: amount,
      project: project,
    });
    const msg = {
      to: email,
      from: "globalvillageforhope@gvh.sg",
      subject: "Contribution receipt",
      html: emailHtml,
    };
    return sgMail.send(msg);
  } else if (operation === MANUALREQEMAIL) {
    comLogger(
      "info",
      `Sending manual request email for the following user: \n ${JSON.stringify(
        userData
      )}`,
      { ID: donationID, human: true }
    );
    const msg = {
      to: notifEmail,
      from: "globalvillageforhope@gvh.sg",
      subject: emailSubject,
      text: JSON.stringify(userData),
    };
    return sgMail.send(msg);
  } else if (operation === OTHERCHANNELEMAIL) {
    comLogger(
      "info",
      `Sending unknown source payment email for the following donation amount: ${amount}`,
      { human: true }
    );
    const msg = {
      to: notifEmail,
      from: "globalvillageforhope@gvh.sg",
      subject: emailSubject,
      text: `Payment amount: ${amount}`,
    };
    return sgMail.send(msg);
  }
};
