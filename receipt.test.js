const request = require("supertest");

const Redis = require("ioredis");
const redis = new Redis();
const app = require("./receipt.js");

const sendReceipt = require("./sendReceipt.js");
const requestManualCheck = require("./requestManualCheck.js");
const donationFromOtherChannel = require("./donationFromOtherChannel.js");
const promiseCareTaker = require("./promiseCareTaker.js");

jest.mock("sendReceipt");
jest.mock("requestManualCheck");
jest.mock("donationFromOtherChannel");
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

//Change mock checks to check for calls AND arguments passed in

jest.useFakeTimers();
describe("Test receipt logic", () => {
  afterEach(async () => {
    await redis.flushdb();
  });

  test("One intent submitted but no donation sent - should send to manual", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          expect(requestManualCheck.mock.calls[0][0]).toEqual(
            donationFormSubmission
          );
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
      .then((response) => {
        expect(response.statusCode).toBe(200);
        jest.runAllTimers();
      });
  });

  test("One intent submitted and one donation sent - should send receipt", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          console.log(sendReceipt.mock.calls);
          expect(sendReceipt.mock.calls[0][0]).toEqual(donationFormSubmission);
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
          .send({
            amount: donationFormSubmission.amount,
          })
          .set("Content-Type", "application/json");
      })
      .then((bankResponse) => {
        expect(bankResponse.statusCode).toBe(200);
        jest.runAllTimers();
      });
  });

  test("One donation sent without intent submission - should flag as other donation source", async () => {
    const bankResponse = await request(app)
      .post("/bank-email")
      .send({
        amount: donationFormSubmission.amount,
      })
      .set("Content-Type", "application/json");

    expect(bankResponse.statusCode).toBe(200);
    expect(donationFromOtherChannel.mock.calls.length).toBe(1);
  });

  test.only("Two intents submitted with same donation amount and two donations sent - receipt should be sent to both", (done) => {
    promiseCareTaker.mockImplementation((promisesArray) => {
      promisesArray
        .then(() => {
          console.log(sendReceipt.mock.calls);
          expect(sendReceipt.mock.calls[0][0]).toEqual(donationFormSubmission);
          expect(sendReceipt.mock.calls[1][0]).toEqual(donationFormSubmissionB);
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

        // Person B sends intention 2 minutes after person A
        jest.advanceTimersByTime(2 * 60 * 1000);

        return request(app)
          .post("/donation-form")
          .send(donationFormSubmissionB)
          .set("Content-Type", "application/json");
      })
      .then((formResponse) => {
        expect(formResponse.statusCode).toBe(200);

        jest.advanceTimersByTime(1 * 60 * 1000);
        return Promise.all([
          request(app)
            .post("/bank-email")
            .send({
              amount: donationFormSubmission.amount,
            })
            .set("Content-Type", "application/json"),
          request(app)
            .post("/bank-email")
            .send({
              amount: donationFormSubmission.amount,
            })
            .set("Content-Type", "application/json"),
        ]);

        // return request(app)
        //   .post("/bank-email")
        //   .send({
        //     amount: donationFormSubmission.amount,
        //   })
        //   .set("Content-Type", "application/json");
        // })
        // .then((bankResponse) => {
        // expect(bankResponse.statusCode).toBe(200);

        // jest.advanceTimersByTime(1 * 60 * 1000);

        // return request(app)
        //   .post("/bank-email")
        //   .send({
        //     amount: donationFormSubmission.amount,
        //   })
        //   .set("Content-Type", "application/json");
        // })
        // .then((bankResponse) => {
        // expect(bankResponse.statusCode).toBe(200);
        // });
      })

      .then(([responseA, responseB]) => {
        expect(responseA.statusCode).toBe(200);
        expect(responseB.statusCode).toBe(200);
      });
  });

  afterAll(() => {
    redis.disconnect();
  });
});
