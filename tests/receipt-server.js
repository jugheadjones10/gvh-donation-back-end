const express = require("express");
const { randomString } = require("../random-id-generator.js");

const {
  bankEmailReceived,
  donationFormReceived,
} = require("../receipt/receipt.js");

const app = express();
app.use(express.json());

// Original endpoint logic is modified slightly from what's in server.js because I'm not testing server.js, I'm testing the logic
// in receipt.js. But then again, does it defeat the purpose of tests if I modify the production code like this for testing?
app.post("/donation-form", async function (req, res) {
  // Do we need server-side validation of request body?
  const formData = req.body;
  const ID = randomString(5);

  let receiptLogicPromise = Promise.resolve();
  if (["paynow", "qrcode", "banktransfer"].includes(formData.type)) {
    receiptLogicPromise = donationFormReceived(formData, ID);
  }

  await receiptLogicPromise;

  res.send({ ID });
});

app.post("/bank-email", async (req, res) => {
  //This prints the email body
  const emailText = req.body.text;

  const regex = /[0-9]*\.[0-9]+/i;
  let amount;
  if (regex.test(emailText)) {
    // zip code value will be the first match in the string
    amount = parseFloat(emailText.match(regex)[0]);
  } else {
    throw new Error(
      `Could not extract payment amount from bank email: ${emailText}`
    );
  }
  await bankEmailReceived(amount);

  res.send(200);
});

module.exports = app;
