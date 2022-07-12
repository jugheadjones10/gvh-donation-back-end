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
  const thePromise = redis
    .multi()
    .hgetall(amount)
    .lrange("donors" + amount, 0, 1)
    .exec()
    .then((result) => {
      console.log(result);

      console.log("THE RESULT", result[1][1]);
      const promisesArray = result[1][1].map((ID) => {
        console.log("gotten DI", ID);
        return redis.get("ID" + ID).then((userData) => {
          console.log("the user data", userData);
          if (result[0][1].pending === result[0][1].confirmed) {
            sendReceipt(JSON.parse(userData));
          } else {
            requestManualCheck(JSON.parse(userData));
          }
        });
      });
      promisesArray.push(redis.del(amount));
      return Promise.all(promisesArray);
    });
  promiseCareTaker(thePromise);
}

//Going to overlook some possible race conditions because it's so rare that someone donates immediately after submitting the
//donation intent
app.post("/bank-email", async function (req, res) {
  const { amount } = req.body;

  console.log("Received money amounting to " + amount);
  const amountExists = await redis.exists(amount);

  if (!amountExists) {
    donationFromOtherChannel();
    //flag as donation from channel other than website donation form
  } else {
    const execReply = await redis
      .multi()
      .hincrby(amount, "confirmed", 1)
      .hgetall(amount)
      .exec();
    console.log(execReply);

    if (execReply[1][1].pending === execReply[1][1].confirmed) {
      clearTimeout(timerList[amount]);
      tallyAmounts(amount);
    }
  }
  res.send(200);
});

async function queueIntent(amount, ID, res) {
  const result = await redis.hexists(amount, "pending");

  if (result === 0) {
    console.log("No result ran");

    const execReply = await redis
      .multi()
      .hmset(amount, {
        pending: 1,
        confirmed: 0,
      })
      .lpush("donors" + amount, [ID])
      .exec();

    const timeoutId = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);
    timerList[amount] = timeoutId;

    console.log(execReply);
  } else {
    console.log("yes result ran");

    await redis
      .multi()
      .hincrby(amount, "pending", 1)
      .lpush("donors" + amount, [ID])
      .exec();

    clearTimeout(timerList[amount]);
    timerList[amount] = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);
  }
  //Response is finished here because I need my test to wait until timeout has been set. Only when timeout has been set can I
  //jump to the future with Jest's fake timers.
  res.send(200);
}

var queueIntentMutex = Promise.resolve();
app.post("/donation-form", async function (req, res) {
  const userData = req.body;
  console.log("Received donation intent from " + userData.fullname);
  const amount = userData.amount;
  const ID = randomString(5);

  // Storing user data separately so that we can just attach an array of IDs to the 5dollarintents objects. Then when sending
  // receipts, we can loop through the attached IDs and retrieve user data using each ID.
  await redis.set("ID" + ID, JSON.stringify(userData));

  queueIntentMutex = queueIntentMutex.then(() => {
    return queueIntent(amount, ID, res);
  });
});

module.exports = app;

// app.listen(port, () => console.log(`Example app listening on port ${port}!`));
