const request = require("supertest");

// const Redis = require("ioredis");
// const redis = new Redis();
const app = require("receipt-server.js");
const io = require("server.js");
const { getMutex, redis } = require("receipt.js");

const promiseCareTaker = require("promiseCareTaker.js");
const actions = require("actions.js");
const {
  NOCONFIRMED,
  MOREPENDINGTHANCONFIRMED,
  TALLYSUCCESS,
} = require("constants.js");

jest.mock("actions");
const {
  sendReceipt,
  requestManualCheck,
  donationFromOtherChannel,
  markDonationUnresolved,
} = actions;

// Super important point: providing an implementation like this prevents jest from "introspecting" server.js by requiring it and
// thereby executing the code within it (and starting a whole express server).

// Important realization: the string passed as the first arugment to jest.mock is the name of the module being imported - in other
// words, the filename. It is NOT the variable name that the import is being assigned to. In this case, I'm assigning the server.js
// import to the variable "io". jest.mock should receive the name of the module it is mocking, which is "server", not "io" in this
// case. Later, in my tests, the actual mock object I can use will be "io".
jest.mock("server", () => {
  return {
    emit: jest.fn(),
  };
});
jest.mock("promiseCareTaker");

const donationFormSubmission = {
  fullname: "Kim",
  email: "test@gmail.com",
  mobilenumber: "234",
  project: "Rice for Hope",
  amount: 3,
  chequenumber: "",
  country: "",
  type: "paynow",
};

const donationFormSubmissionB = {
  fullname: "Josh",
  email: "test2@gmail.com",
  mobilenumber: "234",
  project: "Rice for Hope",
  amount: 3,
  chequenumber: "",
  country: "",
  type: "paynow",
};

function bankEmail(amount) {
  return {
    text: `Please be advised that the below transaction has been Processed. You may login UOB Infinity to review the details. \n Transaction : Inward Remittance BIB Reference: IR22060164074051 Bank Reference: 586L222 20220629 Currency and Amount: SGD ${amount}.00 This is a system-generated mail. Please do not reply to this message.`,
  };
}

//Change mock checks to check for calls AND arguments passed in

jest.useFakeTimers();
describe("Test receipt logic", () => {
  afterEach(async () => {
    await redis.flushdb();
    sendReceipt.mockClear();
    requestManualCheck.mockClear();
    donationFromOtherChannel.mockClear();
    markDonationUnresolved.mockClear();
    io.emit.mockClear();
  });

  test("One intent submitted but no donation sent - should flag as manual", (done) => {
    request(app)
      .post("/donation-form")
      .send(donationFormSubmission)
      .set("Content-Type", "application/json")
      .then((response) => {
        expect(response.statusCode).toBe(200);
        const ID = response.body.ID;

        promiseCareTaker.mockImplementation((promisesArray) => {
          promisesArray
            .then(() => {
              expect(markDonationUnresolved.mock.calls[0][0]).toBe(ID);
              expect(io.emit.mock.calls[0][1]).toBe(NOCONFIRMED);
              done();
            })
            .catch((e) => {
              done(e);
            });
        });

        getMutex().then(() => {
          jest.runAllTimers();
        });
      });
  });

  test("One intent submitted and one donation sent - should send receipt", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          expect(sendReceipt.mock.calls[0][0]).toEqual(donationFormSubmission);
          expect(io.emit.mock.calls[0][1]).toBe(TALLYSUCCESS);
          done();
        })
        .catch((e) => {
          done(e);
        });
    });

    request(app)
      .post("/donation-form")
      .send(donationFormSubmission)
      .set("Content-Type", "application/json")
      .then((formResponse) => {
        expect(formResponse.statusCode).toBe(200);

        return request(app)
          .post("/bank-email")
          .send(bankEmail(donationFormSubmission.amount))
          .set("Content-Type", "application/json");
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
      })
      .catch((e) => {
        done(e);
      });
  });

  test("No intent submitted and one donation sent - should flag as other donation source", async () => {
    const bankResponse = await request(app)
      .post("/bank-email")
      .send(bankEmail(donationFormSubmission.amount))
      .set("Content-Type", "application/json");

    expect(bankResponse.statusCode).toBe(200);
    expect(donationFromOtherChannel.mock.calls[0][0]).toBe(
      donationFormSubmission.amount
    );
  });

  test("Two intents submitted simultaneously with same donation amount and two donations sent simultaneously - should send receipt to both", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          const mappedMocks = sendReceipt.mock.calls.map((call) => call[0]);
          expect(mappedMocks).toContainEqual(donationFormSubmission);
          expect(mappedMocks).toContainEqual(donationFormSubmissionB);
          expect(io.emit.mock.calls[0][1]).toBe(TALLYSUCCESS);
          done();
        })
        .catch((e) => {
          done(e);
        });
    });

    Promise.all([
      request(app)
        .post("/donation-form")
        .send(donationFormSubmission)
        .set("Content-Type", "application/json"),
      request(app)
        .post("/donation-form")
        .send(donationFormSubmissionB)
        .set("Content-Type", "application/json"),
    ])
      .then(([resA, resB]) => {
        expect(resA.statusCode).toBe(200);
        expect(resB.statusCode).toBe(200);

        return getMutex().then(() => {
          // Queueing this after getMutex so that setTimeouts have been given a chance to run. If not, the advanceTimersByTime
          // might not have any timers to operate on.
          jest.advanceTimersByTime(2 * 60 * 1000);
          return Promise.all([
            request(app)
              .post("/bank-email")
              .send(bankEmail(donationFormSubmission.amount))
              .set("Content-Type", "application/json"),
            request(app)
              .post("/bank-email")
              .send(bankEmail(donationFormSubmissionB.amount))
              .set("Content-Type", "application/json"),
          ]);
        });
      })
      .then(([responseA, responseB]) => {
        expect(responseA.statusCode).toBe(200);
        expect(responseB.statusCode).toBe(200);
      });
  });

  test("Two intents submitted non-simultaneously with same donation amount and two donations sent non-simultaneously - should send receipt to both", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          const mappedMocks = sendReceipt.mock.calls.map((call) => call[0]);
          expect(mappedMocks).toContainEqual(donationFormSubmission);
          expect(mappedMocks).toContainEqual(donationFormSubmissionB);
          expect(io.emit.mock.calls[0][1]).toBe(TALLYSUCCESS);
          done();
        })
        .catch((e) => {
          done(e);
        });
    });

    request(app)
      .post("/donation-form")
      .send(donationFormSubmission)
      .set("Content-Type", "application/json")
      .then((resA) => {
        expect(resA.statusCode).toBe(200);
        return getMutex().then(() => {
          jest.advanceTimersByTime(2 * 60 * 1000);
          return request(app)
            .post("/donation-form")
            .send(donationFormSubmissionB)
            .set("Content-Type", "application/json");
        });
      })
      .then((resB) => {
        expect(resB.statusCode).toBe(200);
        return getMutex().then(() => {
          jest.advanceTimersByTime(1 * 60 * 1000);

          return request(app)
            .post("/bank-email")
            .send(bankEmail(donationFormSubmission.amount))
            .set("Content-Type", "application/json");
        });
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
        jest.advanceTimersByTime(1 * 60 * 1000);

        return request(app)
          .post("/bank-email")
          .send(bankEmail(donationFormSubmissionB.amount))
          .set("Content-Type", "application/json");
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
      });
  });

  test("Two intents submitted non-simultaneously with same donation amount and one donation sent - should flag both as manual", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          const mappedMocks = requestManualCheck.mock.calls.map(
            (call) => call[0]
          );
          expect(mappedMocks).toContainEqual(donationFormSubmission);
          expect(mappedMocks).toContainEqual(donationFormSubmissionB);
          expect(io.emit.mock.calls[0][1]).toBe(MOREPENDINGTHANCONFIRMED);
          done();
        })
        .catch((e) => {
          done(e);
        });
    });

    request(app)
      .post("/donation-form")
      .send(donationFormSubmission)
      .set("Content-Type", "application/json")
      .then((resA) => {
        expect(resA.statusCode).toBe(200);
        return getMutex().then(() => {
          jest.advanceTimersByTime(2 * 60 * 1000);

          return request(app)
            .post("/donation-form")
            .send(donationFormSubmissionB)
            .set("Content-Type", "application/json");
        });
      })
      .then((resB) => {
        expect(resB.statusCode).toBe(200);
        return getMutex().then(() => {
          jest.advanceTimersByTime(1 * 60 * 1000);

          return request(app)
            .post("/bank-email")
            .send(bankEmail(donationFormSubmission.amount))
            .set("Content-Type", "application/json");
        });
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
        jest.runAllTimers();
      });
  });

  test("One intent submitted and one corresponding donation sent, then another intent submitted and one corresponding donation sent - should send receipt to both", (done) => {
    var confirmedCount = 0;
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          confirmedCount++;
          if (confirmedCount == 2) {
            const mappedMocks = sendReceipt.mock.calls.map((call) => call[0]);
            expect(mappedMocks).toContainEqual(donationFormSubmission);
            expect(mappedMocks).toContainEqual(donationFormSubmissionB);
            expect(io.emit.mock.calls[0][1]).toBe(TALLYSUCCESS);
            done();
          }
        })
        .catch((e) => {
          done(e);
        });
    });

    request(app)
      .post("/donation-form")
      .send(donationFormSubmission)
      .set("Content-Type", "application/json")
      .then((resA) => {
        expect(resA.statusCode).toBe(200);
        return getMutex().then(() => {
          jest.advanceTimersByTime(2 * 60 * 1000);

          return request(app)
            .post("/bank-email")
            .send(bankEmail(donationFormSubmission.amount))
            .set("Content-Type", "application/json");
        });
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);

        return request(app)
          .post("/donation-form")
          .send(donationFormSubmissionB)
          .set("Content-Type", "application/json");
      })
      .then((resB) => {
        expect(resB.statusCode).toBe(200);

        return getMutex().then(() => {
          jest.advanceTimersByTime(2 * 60 * 1000);

          return request(app)
            .post("/bank-email")
            .send(bankEmail(donationFormSubmissionB.amount))
            .set("Content-Type", "application/json");
        });
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
      });
  });

  afterAll(() => {
    redis.disconnect();
  });
});
