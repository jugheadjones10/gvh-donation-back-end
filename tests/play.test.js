const request = require("supertest");
const app = require("receipt-server.js");

// Bug bounty!!
// The below doesn't work if we use jest's fake timers
// jest.useFakeTimers();
describe("Test receipt logic", () => {
  test.only("One intent submitted and one donation sent - should send receipt", (done) => {
    request(app)
      .post("/test")
      .then((res) => {
        expect(res.statusCode).toBe(200);
        done();
      })
      .catch((e) => {
        done(e);
      });
  });
});
