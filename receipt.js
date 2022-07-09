const express = require("express");
const { randomString } = require("./random-id-generator.js");
const Redis = require("ioredis");
const redis = new Redis();

const timerList = {};

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();
app.use(express.json());

function sendReceipt(email, ID) {
  console.log(`Sending receipt to ${email} at ${ID}`);
}

function requestManualCheck(email, ID) {
  console.log(`Requesting manual check for ${email} at ${ID}`);
}

async function tallyAmounts(amount) {
  const result = await redis.get(amount);
  const jsonResult = JSON.parse(result);

  if (jsonResult.pending === jsonResult.confirmed) {
    jsonResult.donors.forEach(({ email, ID }) => {
      sendReceipt(email, ID);
    });
    redis.del(amount);
  } else {
    jsonResult.donors.forEach(({ email, ID }) => {
      requestManualCheck(email, ID);
    });
  }
}

app.post("/bank-email", async function (req, res) {
  const { amount } = req.body;

  const result = await redis.get(amount);

  if (!result) {
    //flag as donation from channel other than website donation form
  } else {
    const jsonResult = JSON.parse(result);

    jsonResult.confirmed += 1;

    if (jsonResult.pending === 1 && jsonResult.confirmed === 1) {
      clearTimeout(timerList[amount]);
      tallyAmounts(amount);
    }
  }
  res.send(200);
});

app.post("/donation-form", async function (req, res) {
  const { email, amount } = req.body;
  const ID = randomString(5);

  const result = await redis.get(amount);

  if (!result) {
    const timeoutId = setTimeout(tallyAmounts, 10 * 1000, amount);
    timerList[amount] = timeoutId;
    await redis.set(
      amount,
      JSON.stringify({
        pending: 1,
        confirmed: 0,
        donors: [
          {
            email,
            ID,
          },
        ],
      })
    );
  } else {
    const jsonResult = JSON.parse(result);

    jsonResult.pending += 1;
    jsonResult.donors.push({ email, ID });
    clearTimeout(timerList[amount]);
    timerList[amount] = setTimeout(tallyAmounts, 5 * 1000, amount);

    await redis.set(amount, JSON.stringify(jsonResult));
  }
  res.send(200);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
