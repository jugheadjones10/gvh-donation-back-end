const express = require("express");
const QRCode = require("easyqrcodejs-nodejs");
const PaynowQR = require("paynowqr");
const cors = require("cors");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");
const { randomString } = require("./random-id-generator.js");
const { addToGoogleSheet } = require("./google-sheet");
const comLogger = require("./logging.js");
const { RECEIPTEMAIL } = require("./constants.js");
const {
  bankEmailReceived,
  donationFormReceived,
} = require("./receipt/receipt.js");
const sendEmail = require("./send-email.js");
require("dotenv").config();

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

let port = process.env.PORT;

const app = express();
const server = http.createServer(app);

//CORS origin needs to be explicitly defined since client is on a different port
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
  },
});
module.exports = io;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.post("/google-sheet", async (req, res) => {
  const body = req.body;

  // Extract the data sent from google sheet into this userData object
  const userData = body;
  const donationID = body.donationID;
  res.locals.ID = donationID;

  comLogger(
    "info",
    `Processing request from google sheet to send receipt for following user: ${JSON.stringify(
      userData
    )}`,
    { ID: donationID }
  );

  await sendEmail({ operation: RECEIPTEMAIL, userData, donationID });

  res.send(200);
});

const upload = multer();
app.post("/bank-email", upload.any(), async (req, res) => {
  //This prints the email body
  const emailText = req.body.text;

  const regex = /[0-9]*\.[0-9]+/i;
  let amount;
  if (regex.test(emailText)) {
    // zip code value will be the first match in the string
    amount = parseFloat(emailText.match(regex)[0]);
  } else {
    throw new Error(
      `Could not extract payment amount from bank email: ${emailText}`
    );
  }

  comLogger(
    "info",
    `Received payment notification from bank for amount ${amount} \n Email Contents: ${emailText}`
  );

  await bankEmailReceived(amount);

  res.send(200);
});

// User sees loading icon
// When 5 minutes exceeded without donation, io emit close modal notifcation
// When donation comes in, display success
// When manual request required, display a modal explaining the situation

app.post("/donation-form", async function (req, res) {
  // Do we need server-side validation of request body?
  const formData = orderDataForGoogleSheet(req.body);
  const ID = randomString(5);
  res.locals.ID = ID;

  comLogger(
    "info",
    `Received donation form submission with reference ID ${ID} \n Request body: ${JSON.stringify(
      formData
    )}`,
    { ID, human: true }
  );

  let receiptLogicPromise = Promise.resolve();
  if (["paynow", "qrcode", "banktransfer"].includes(formData.type)) {
    receiptLogicPromise = donationFormReceived(formData, ID);
  }
  const googleSheetPromise = addToGoogleSheet(
    [
      ID,
      ...Object.values(formData),
      new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
    ],
    process.env.GOOGLE_SHEET_ID
  );

  let qrUrl;
  if (formData.type === "qrcode") {
    qrUrl = await getQRUrl(formData.amount, ID, req);
  }

  await receiptLogicPromise;
  await googleSheetPromise;

  res.json({ qrUrl, ID });
});

// app.post("/auction", function (req, res) {
//   console.log(req.body);
//   const {
//     painter,
//     fullname,
//     email,
//     mobilenumber,
//     project,
//     type,
//     amount,
//     chequenumber,
//     country,
//   } = req.body;
//   const ID = randomString(5);

//   addToGoogleSheet(
//     [
//       painter,
//       ID,
//       fullname,
//       email,
//       mobilenumber,
//       project,
//       type,
//       amount,
//       chequenumber,
//       country,
//       new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" }),
//     ],
//     "11APrm_hNTatJ7toGqUDYoKgzsEpV7fsVde0e8Ipm6nU"
//   )
//     .then(() => {
//       const { msg, qrUrl, qrCodePromise } = processResponse(
//         project,
//         amount,
//         ID,
//         req,
//         fullname,
//         email
//       );

//       return Promise.all([
//         sgMail.send(msg).then(() => {
//           console.log("Email sent");
//         }),
//         qrCodePromise.then(() => {
//           res.json({ ID, qrUrl });
//         }),
//       ]);
//     })
//     .catch((error) => {
//       console.error(error);
//     });
// });

app.use(function (error, req, res, next) {
  if (req.path === "/donation-form") {
    const ID = res.locals.ID;
    comLogger(
      "error",
      `Error during processing of donation form, with donation ID: ${ID} \n Error content: ${JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      )}`,
      { ID, human: true }
    );
  } else if (req.path === "/bank-email") {
    comLogger(
      "error",
      `Error during processing of bank email \n Error content: ${JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      )}`,
      { human: true }
    );
  } else if (req.path === "/google-sheet") {
    comLogger(
      "error",
      `Error during processing of webhook from google sheet \n Error content: ${JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      )}`,
      { human: true }
    );
  }
  res.status(500).json({ error: error.message });
});

function orderDataForGoogleSheet(obj) {
  return {
    fullname: obj.fullname,
    email: obj.email,
    mobilenumber: obj.mobilenumber,
    project: obj.project,
    type: obj.type,
    amount: obj.amount,
    chequenumber: obj.chequenumber,
    country: obj.country,
  };
}

async function getQRUrl(amount, ID, req) {
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
  await qrcode.saveImage({
    path: `public/${ID}.png`, // save path
  });

  const baseUrl = req.protocol + "://" + req.get("host");
  const qrUrl = baseUrl + `/${ID}.png`;

  return qrUrl;
}

server.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
