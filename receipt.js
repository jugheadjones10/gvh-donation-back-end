const express = require("express");
const { randomString } = require("./random-id-generator.js");
const Redis = require("ioredis");
const redis = new Redis();

const sendReceipt = require("./sendReceipt.js");
const requestManualCheck = require("./requestManualCheck.js");
const donationFromOtherChannel = require("./donationFromOtherChannel.js");
const promiseCareTaker = require("./promiseCareTaker.js");

const timerList = {};

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();
app.use(express.json());

function tallyAmounts(amount) {
  console.log("Attempting to tally amount " + amount);
  redis.get(amount).then((result) => {
    const jsonResult = JSON.parse(result);

    console.log(jsonResult);

    const promisesArray = jsonResult.donors.map((ID) => {
      return redis.get("ID" + ID).then((userData) => {
        if (jsonResult.pending === jsonResult.confirmed) {
          sendReceipt(JSON.parse(userData));
        } else {
          requestManualCheck(JSON.parse(userData));
        }
      });
    });
    promisesArray.push(redis.del(amount));
    promiseCareTaker(Promise.all(promisesArray));
  });
}

app.post("/bank-email", async function (req, res) {
  const { amount } = req.body;

  console.log("Received money amounting to " + amount);
  const result = await redis.get(amount);

  if (!result) {
    donationFromOtherChannel();
    //flag as donation from channel other than website donation form
  } else {
    const jsonResult = JSON.parse(result);

    jsonResult.confirmed += 1;

    await redis.set(amount, JSON.stringify(jsonResult));
    console.log("Current donation amount resutlt", jsonResult);

    if (jsonResult.pending === jsonResult.confirmed) {
      clearTimeout(timerList[amount]);
      tallyAmounts(amount);
    }
  }
  res.send(200);
});

app.post("/donation-form", async function (req, res) {
  const userData = req.body;
  console.log("Received donation intent from " + userData.fullname);
  const amount = userData.amount;
  const ID = randomString(5);

  // Storing user data separately so that we can just attach an array of IDs to the 5dollarintents objects. Then when sending
  // receipts, we can loop through the attached IDs and retrieve user data using each ID.
  await redis.set("ID" + ID, JSON.stringify(userData));

  const result = await redis.get(amount);

  if (!result) {
    const timeoutId = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);
    timerList[amount] = timeoutId;
    await redis.set(
      amount,
      JSON.stringify({
        pending: 1,
        confirmed: 0,
        donors: [ID],
      })
    );
  } else {
    const jsonResult = JSON.parse(result);

    jsonResult.pending += 1;
    jsonResult.donors.push(ID);
    clearTimeout(timerList[amount]);
    timerList[amount] = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);

    await redis.set(amount, JSON.stringify(jsonResult));
  }
  res.send(200);
});

module.exports = app;

// app.listen(port, () => console.log(`Example app listening on port ${port}!`));
