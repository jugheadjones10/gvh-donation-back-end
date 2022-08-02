// @ts-check
const { test, expect } = require("@playwright/test");
const proxyquire = require("proxyquire");
require("dotenv").config({ path: "../.e2e.env" });
const { getLastRow } = proxyquire("spreadsheet-utils", {
  "../logging.js": {},
});

test.beforeEach(async ({ page }) => {
  page.on("request", (request) =>
    console.log(">>", request.method(), request.url())
  );
  page.on("response", (response) =>
    console.log("<<", response.status(), response.url())
  );
  await page.goto("http://127.0.0.1:3000");
});

const fullname = "Kim Young Jin e2e test";
const email = "kimyoungjin1001@gmail.com";
const mobilenumber = "81189254";
const project = "Education";
const amount = "1";

test("should allow me to add todo items", async ({ page, request }) => {
  test.slow();
  // Submit donation form
  await page.locator("text='PayNow with UEN'").click();
  await page.locator("#paynow #fullname").fill(fullname);
  await page.locator("#paynow #email").fill(email);
  await page.locator("#paynow #mobilenumber").fill(mobilenumber);

  await page.locator("#paynow #project").click();
  await page.locator("data-test-id=projectEducation").click();

  await page.locator("#paynow #amount").fill(amount);

  const [response] = await Promise.all([
    page.waitForResponse("**/donation-form"),
    page.locator("data-test-id=paynowbutton").click(),
  ]);
  const body = await response.json();

  // Check that google sheet has been updated correctly with submitted info
  const row = await getLastRow(process.env.GOOGLE_SHEET_ID);
  const { ID, Name, Email, Phone, Project, "Donation Amount": Amount } = row;
  expect(body.ID).toBe(ID);
  expect(Name).toBe(fullname);
  expect(Email).toBe(email);
  expect(Phone).toBe(mobilenumber);
  expect(Project).toBe(project);
  expect(Amount).toBe(amount);

  // Check that ui is showing returned ID
  await expect(page.locator("data-test-id=refid")).toContainText(ID);

  // Simulate bank notification that donation has been received
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const emailResponse = await request.post("http://127.0.0.1:8000/bank-email", {
    data: bankEmail(amount),
  });
  expect(emailResponse.status()).toBe(200);

  // Check that ui shows successful donation
  await expect(page.locator("data-test-id=payment-confirmation")).toContainText(
    "Payment successful! We have emailed you your receipt. Please check the spam folder if you do not see the email."
  );

  // Check that google sheet has been successfully updated
  const confirmedRow = await getLastRow(process.env.GOOGLE_SHEET_ID);
  const { "Donation received": confirmed } = confirmedRow;
  expect(confirmed).toBe("Y");

  //Check that email was sent (Not going to implement right now becasue I don't know how to pass a stable url to the Sendgrid
  //webook). The problem is that I can only register one webhook with Sendgrid, but because my local e2e testing environment is
  //different from my CI/CD github actions environment, that webhook needs to somehow forward hooks to different places based on
  //the current environment. That seems way too complicated to do.
});

function bankEmail(amount) {
  return {
    text: `Please be advised that the below transaction has been Processed. You may login UOB Infinity to review the details. \n Transaction : Inward Remittance BIB Reference: IR22060164074051 Bank Reference: 586L222 20220629 Currency and Amount: SGD ${amount}.00 This is a system-generated mail. Please do not reply to this message.`,
  };
}
