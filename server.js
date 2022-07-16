const express = require("express");
const nunjucks = require("nunjucks");
const QRCode = require("easyqrcodejs-nodejs");
const PaynowQR = require("paynowqr");
const cors = require("cors");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");
const { randomString } = require("./random-id-generator.js");
const { addToGoogleSheet } = require("./google-sheet");
const {
  bankEmailReceived,
  donationFormReceived,
} = require("./receipt/receipt.js");
const sendEmail = require("./send-email.js");
require("dotenv").config();

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

app.post("/google-sheet", (req, res) => {
  const body = req.body;

  // Extract the data sent from google sheet into this userData object
  const userData = body;
  console.log(userData);
  // sendEmail(true, userData);
  // return "email sent";

  return sendEmail(true, userData);
});

const upload = multer();
app.post("/bank-email", upload.any(), async (req, res) => {
  //This prints the email body
  // console.log(body.text);

  // Parse the email text to get donation amount
  const amount = req.body.amount;
  console.log(`Received incoming donation amount ${amount}`);

  await bankEmailReceived(amount);

  //This sends a signal to the donation form where the user is waiting for his payment to be confirmed.
  io.emit("update", "new data");
  res.send(200);
});

app.post("/donation-form", async function (req, res) {
  console.log("Received donation form submission: ", req.body);
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

  const receiptLogicPromise = donationFormReceived(req.body, ID);
  const googleSheetPromise = addToGoogleSheet(
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
  ).then(() => {
    // This part needs to change - we don't need to generate QR code for every donation intent anymore
    const { msg, qrUrl, qrCodePromise } = processResponse(
      project,
      amount,
      ID,
      req,
      fullname,
      email
    );
    console.log("Added to google sheet");

    return qrCodePromise.then(() => {
      console.log("Inside qrCodePromise queue: ", ID, qrUrl);
      return { ID, qrUrl };
    });
  });

  await receiptLogicPromise;
  const qrRes = await googleSheetPromise;
  console.log(qrRes);

  res.json(qrRes);
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

app.use(function (error, req, res, next) {
  console.log("An error happended", error);
  res.status(500).json({ error: error.message });
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

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
