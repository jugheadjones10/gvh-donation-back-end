const express = require("express");
const nunjucks = require("nunjucks");
const QRCode = require("easyqrcodejs-nodejs");
const PaynowQR = require("paynowqr");
const cors = require("cors");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");
const { randomString } = require("./random-id-generator.js");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require("dotenv").config();

// const Redis = require("ioredis");
// const redis = new Redis();

const Queue = require("bee-queue");
const intentsQueue = new Queue("intentsQueue");

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();
const server = http.createServer(app);

//CORS origin needs to be explicitly defined since client is on a different port
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer();
app.post("/bank-email", upload.any(), (req, res) => {
  const body = req.body;

  // const donationAmt = body.text.
  const donationAmt = 5;
  //Need to implement logic for getting donation amount from email text.

  intentsQueue.getJobs("waiting", { start: 0, end: 25 }).then((jobs) => {
    const matchingJobs = jobs.filter((job) => job.amount === donationAmt);
    //...
  });

  //This prints the email body
  console.log(body.text);

  //TODO Get the donation amount from the email body, then get the last entry from our donation Google sheet using the Google
  //spreadsheet API. Check if the donation amount in the google spreadsheet is equal to the amount in the email. If equal, execute
  //the below line (io.emit) in order to notify the client that the donation has been processed.

  //This sends a signal to the donation form where the user is waiting for his payment to be confirmed.
  io.emit("update", "new data");

  //TODO Once the client has been notified, send a receipt to the user using Sendgrid (the email service we are using).

  res.sendStatus(200);
});

app.post("/donation-form", function (req, res) {
  console.log(req.body);
  const {
    fullname,
    email,
    mobilenumber,
    project,
    type,
    amount,
    chequenumber,
    country,
  } = req.body;
  const ID = randomString(5);

  const job = intentsQueue.createJob({
    email,
    amount,
  });

  job
    .timeout(5 * 60 * 60)
    .setId(ID)
    .save()
    .then((job) => {
      // job enqueued, job.id populated
    });

  addToGoogleSheet(
    [
      ID,
      fullname,
      email,
      mobilenumber,
      project,
      type,
      amount,
      chequenumber,
      country,
      new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
    ],
    process.env.GOOGLE_SHEET_ID
  )
    .then(() => {
      const { msg, qrUrl, qrCodePromise } = processResponse(
        project,
        amount,
        ID,
        req,
        fullname,
        email
      );

      return Promise.all([
        sgMail.send(msg).then(() => {
          console.log("Email sent");
        }),
        qrCodePromise.then(() => {
          res.json({ ID, qrUrl });
        }),
      ]);
    })
    .catch((error) => {
      console.error(JSON.stringify(error));
    });
});

app.post("/auction", function (req, res) {
  console.log(req.body);
  const {
    painter,
    fullname,
    email,
    mobilenumber,
    project,
    type,
    amount,
    chequenumber,
    country,
  } = req.body;
  const ID = randomString(5);

  addToGoogleSheet(
    [
      painter,
      ID,
      fullname,
      email,
      mobilenumber,
      project,
      type,
      amount,
      chequenumber,
      country,
      new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
    ],
    "11APrm_hNTatJ7toGqUDYoKgzsEpV7fsVde0e8Ipm6nU"
  )
    .then(() => {
      const { msg, qrUrl, qrCodePromise } = processResponse(
        project,
        amount,
        ID,
        req,
        fullname,
        email
      );

      return Promise.all([
        sgMail.send(msg).then(() => {
          console.log("Email sent");
        }),
        qrCodePromise.then(() => {
          res.json({ ID, qrUrl });
        }),
      ]);
    })
    .catch((error) => {
      console.error(error);
    });
});

function processResponse(project, amount, ID, req, fullname, email) {
  let qrOptions = new PaynowQR({
    uen: "53382503B",
    amount,
    editable: true,
    refNumber: ID,
  });

  let qrString = qrOptions.output();
  var options = {
    text: qrString,
    colorDark: "#7D1979",
    logo: "images/paynowlogo.png",
  };
  // Create new QRCode Object
  var qrcode = new QRCode(options);
  var qrCodePromise = qrcode.saveImage({
    path: `public/${ID}.png`, // save path
  });

  const formattedNow = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Singapore",
  });

  const baseUrl = req.protocol + "://" + req.get("host");
  const qrUrl = baseUrl + `/${ID}.png`;
  // const uenImage = baseUrl + "/uenscreenshot.png";

  var emailHtml = nunjucks.render("email/reply-mail.html", {
    project,
    fullname,
    ID,
    amount,
    now: formattedNow,
    qrUrl,
  });

  const msg = {
    to: email, // Change to your recipient
    from: "globalvillageforhope@gvh.sg", // Change to your verified sender
    subject: "We have received your Donation Form submission",
    html: emailHtml,
  };

  return { msg, qrUrl, qrCodePromise };
}

function addToGoogleSheet(row, sheetID) {
  const doc = new GoogleSpreadsheet(sheetID);
  return doc
    .useServiceAccountAuth(require("./google-credentials.json"))
    .then(() => doc.loadInfo())
    .then(() => {
      const sheet = doc.sheetsByIndex[0];
      return sheet.addRow(row);
    });
}

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
