const nunjucks = require("nunjucks");
require("dotenv").config();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// We need to standardize naming of properties across google sheet and code to avoid bugs and cumberson name changes
module.exports = async function sendEmail(sendReceipt, userData) {
  if (sendReceipt) {
    console.log(`Receipt is being sent to ${userData.name}`);
    const date = new Date();
    const datestyle = {
      day: "numeric",
      year: "numeric",
      month: "short",
    };
    const emailHtml = nunjucks.render("email/receipt-email.html", {
      date: date.toLocaleDateString("en", datestyle),
      name: userData.name,
      amount: userData.amount,
      project: userData.project,
    });
    const msg = {
      to: userData.email,
      from: "globalvillageforhope@gvh.sg",
      subject: "Contribution receipt",
      html: emailHtml,
    };
    console.log("email sent");
    return sgMail.send(msg);
  } else {
    const msg = {
      to: "kimyoungjin1001@gmail.com",
      from: "globalvillageforhope@gvh.sg",
      subject: "Manual Donation check required",
      text: JSON.stringify(userData),
    };
    console.log("Manual request sent");
    return sgMail.send(msg);
  }
};
