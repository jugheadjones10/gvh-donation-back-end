require("dotenv").config();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: "kimyoungjin1001@gmail.com", // Change to your recipient
  from: "globalvillageforhope@gvh.sg", // Change to your verified sender
  subject: "We have received your Donation Form submission",
  text: "EEE",
};

sgMail.send(msg).then(() => {
  console.log("Email sent");
});
