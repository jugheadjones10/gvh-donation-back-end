const nunjucks = require("nunjucks");
require("dotenv").config();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// We need to standardize naming of properties across google sheet and code to avoid bugs and cumberson name changes
module.exports = async function sendEmail(sendReceipt, data) {
  if (sendReceipt) {
    console.log(`Receipt is being sent to ${data.fullname}`);

    const date = new Date();
    const datestyle = {
      day: "numeric",
      year: "numeric",
      month: "short",
    };
    const emailHtml = nunjucks.render("email/receipt-email.html", {
      date: date.toLocaleDateString("en", datestyle),
      fullname: data.fullname,
      amount: data.amount,
      project: data.project,
    });
    const msg = {
      to: data.email,
      from: "globalvillageforhope@gvh.sg",
      subject: "Contribution receipt",
      html: emailHtml,
    };
    console.log("email sent");
    return sgMail.send(msg);
  } else {
    const msg = {
      to: "gvhfinance@gmail.com",
      from: "globalvillageforhope@gvh.sg",
      subject: data.subject,
      text: JSON.stringify(data),
    };
    console.log("Manual request/donation from other source sent");
    return sgMail.send(msg);
  }
};
