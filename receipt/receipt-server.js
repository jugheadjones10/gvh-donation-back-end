const express = require("express");
const { randomString } = require("../random-id-generator.js");

const { bankEmailReceived, donationFormReceived } = require("./receipt.js");

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();
app.use(express.json());

// Going to overlook some possible race conditions because it's so rare that someone donates immediately after submitting the
// donation intent
app.post("/bank-email", async function (req, res) {
  const { amount } = req.body;
  await bankEmailReceived(amount);
  res.send(200);
});

app.post("/donation-form", async function (req, res) {
  const userData = req.body;
  const ID = randomString(5);

  await donationFormReceived(userData, ID);

  res.send(200);
});

module.exports = app;
