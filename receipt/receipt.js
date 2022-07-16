const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

const sendReceipt = require("./sendReceipt.js");
const requestManualCheck = require("./requestManualCheck.js");
const donationFromOtherChannel = require("./donationFromOtherChannel.js");
const promiseCareTaker = require("./promiseCareTaker.js");

const timerList = {};

var queueIntentMutex = Promise.resolve();
exports.donationFormReceived = async function (userData, ID) {
  // Storing user data separately so that we can just attach an array of IDs to the donation intent objects. Then when sending
  // receipts, we can loop through the attached IDs and retrieve user data using each ID in order to construct the receipt email
  // using user data
  await redis.set("ID" + ID, JSON.stringify(userData));

  // Need to catch errors explicitly here because queueIntentMutex is a separate promise that isn't returned to any express routes.
  // Failed promises won't use the express error handler.
  queueIntentMutex = queueIntentMutex
    .then(() => {
      return queueIntent(userData.amount, ID);
    })
    .catch((e) => {
      console.log("Donation Intent Queue Error: ", e);
    });
};

exports.bankEmailReceived = async function (amount) {
  // The below line ensures that even if this endpoint is called immediately after donation intent is sent, the donation intent is
  // given a chance to properly register in the Redis DB before its existence is checked below. If the existence check occurs
  // before the intent is set in the Redis DB, we will mistakenly categorize this donation as coming from another channel.
  await queueIntentMutex;

  const amountExists = await redis.exists(amount);

  if (!amountExists) {
    console.log(
      `Since there are no ongoing intents, incoming donation amount ${amount} has been classified as other channel`
    );
    return donationFromOtherChannel();
    //flag as donation from channel other than website donation form (should retrun a promise)
  } else {
    const execReply = await redis
      .multi()
      .hincrby(amount, "confirmed", 1)
      .hgetall(amount)
      .exec();
    // Throw error for failed exec

    if (execReply[1][1].pending === execReply[1][1].confirmed) {
      clearTimeout(timerList[amount]);
      return tallyAmounts(amount);
    }
  }
};

async function queueIntent(amount, ID) {
  // This function checks the existence of a Redis DB entry then sets the value differently depending on the existence. If this
  // function is called two times simultaneously, a race condition occurs because executions will read that the entry doesn't exist.
  // Both functions will execute the logic meant for the non-existent case, which will give a wrong outcome. A
  // possible solution is to use Redis transactions to read and write atomically, but this is hard because
  // application logic needs to be interleaved in between the Redis read and write operations. The current solution uses a "mutex"
  // of sorts, "queueIntentMutex", which is a resolved promise. When a request comes in, the promise returned by the queueIntent
  // function is chained to queueIntentMutex, causing queueIntent to be executed asynchronously. No matter how many requests
  // come in, their corresponding executions of queueIntent are chained one after the other, ensuring that Redis reads and
  // writes are never interleaved.

  // No special reason for using the "pending" property - just want to see if the hash for this particular
  // donation amount exists
  const result = await redis.hexists(amount, "pending");

  if (result === 0) {
    console.log(
      `No donation intent for amount ${amount} exists currently - adding new intent and starting timer`
    );

    await redis
      .multi()
      .hmset(amount, {
        pending: 1,
        confirmed: 0,
      })
      .lpush("donors" + amount, [ID])
      .exec();

    const timeoutId = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);
    timerList[amount] = timeoutId;
  } else {
    console.log(
      `Donation intent for amount ${amount} exists currently - incrementing pending counter by 1 and restarting timer`
    );

    await redis
      .multi()
      .hincrby(amount, "pending", 1)
      .lpush("donors" + amount, [ID])
      .exec();

    clearTimeout(timerList[amount]);
    timerList[amount] = setTimeout(tallyAmounts, 5 * 60 * 1000, amount);
  }
}

function tallyAmounts(amount) {
  console.log("Attempting to tally amount " + amount);
  const tallyPromise = redis
    .multi()
    .hgetall(amount)
    .lrange("donors" + amount, 0, -1)
    .exec()
    .then((result) => {
      console.log(result);

      // Add variable names to make the array stuff more readable
      // Delete redis ID information as well
      const actionsPromises = result[1][1].map((ID) => {
        return redis.get("ID" + ID).then((userData) => {
          if (result[0][1].pending === result[0][1].confirmed) {
            return sendReceipt(JSON.parse(userData), ID);
          } else {
            return requestManualCheck(JSON.parse(userData), ID);
          }
        });
      });

      return Promise.all(actionsPromises).then(() => {
        // Ideally the below deletion is done as soon as possible to prevent cases where tallies are finished but deletion
        // hasn't completed, causing errors in subsequent donation intents
        return redis.del("donors" + amount, amount);
      });
    });
  // promiseCareTaker exists so that receipt.test.js can mock promiseCareTaker and receive tallyPromise so that it can queue tests
  // after sendReceipt and requestManualCheck have been called.
  promiseCareTaker(tallyPromise);
  return tallyPromise;
}

exports.getMutex = function () {
  return queueIntentMutex;
};
