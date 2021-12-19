var express = require("express");
var nunjucks = require("nunjucks");
const date = require('date-and-time');
const QRCode = require('easyqrcodejs-nodejs');
const PaynowQR = require('paynowqr');
var url = require('url');
var cors = require("cors");
var hri = require("human-readable-ids").hri;
const stripe = require("stripe")(
  "sk_test_51JYP6bJ0vgYGBOQWJSPVhYR2Ce7mwIArpnjeB6dsjg6X1BBxuRplVoFvTFluLmRbbW4SER8eDFeu3FfH64EpcysG00MbyujWX2"
);
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const { GoogleSpreadsheet } = require("google-spreadsheet");
const nodemailer = require("nodemailer");
const { getEmail } = require("./strings");
const { getAuctionEmail } = require("./auction-mail");
const {randomString} = require("./random-id-generator")

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();


//Cors allows webpack dev server at localhost:8080 to access my myanmar map API
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/mail-test", function(req, res){
  var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  res.send(fullUrl)
})

app.post("/donation-form", async function (req, res) {
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

  const doc = new GoogleSpreadsheet(
    "1SC4fcsl9JmY056x5XJpzfrMetKyCWVSZjj2NwRl8V-s"
  );
  doc
    .useServiceAccountAuth(require("./GVH Payment-e780847417f9.json"))
    .then(() => doc.loadInfo())
    .then(() => {
      const sheet = doc.sheetsByIndex[0];
      sheet.addRow([
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
      ]);
    })
    .then(() => {

      const {msg, qrUrl} = processResponse(amount, ID, req, fullname, email)

      sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent')
        })
        .catch((error) => {
          console.error(error)
        })
      res.send({msg, qrUrl});
    })
});

app.post("/auction", async function (req, res) {
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

  const doc = new GoogleSpreadsheet(
    "11APrm_hNTatJ7toGqUDYoKgzsEpV7fsVde0e8Ipm6nU"
  );
  doc
    .useServiceAccountAuth(require("./GVH Payment-e780847417f9.json"))
    .then(() => doc.loadInfo())
    .then(() => {
      const sheet = doc.sheetsByIndex[0];
      sheet.addRow([
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
      ]);
    })
    .then(() => {

      const {msg, qrUrl} = processResponse(amount, ID, req, fullname, email)

      sgMail
        .send(msg)
        .then(() => {
          console.log('Email sent')
        })
        .catch((error) => {
          console.error(error)
        })
      res.json({ID, qrUrl});
    });
})

function processResponse(amount, ID, req, fullname, email){

  let qrOptions = new PaynowQR({
    uen:'53382503B',           
    amount,               
    editable: true,          
    refNumber: ID,
  });

  let qrString = qrOptions.output();
  var options = {
    text: qrString,
    colorDark:'#7D1979',
    logo:"paynowlogo.png",
  }
  // Create new QRCode Object
  var qrcode = new QRCode(options);
  qrcode.saveImage({
    path: `public/${ID}.png` // save path
  });

  const now = new Date();
  const formattedNow = now.toLocaleString("en-US", {timeZone: "Asia/Singapore"});

  const baseUrl = req.protocol + '://' + req.get('host')
  const qrUrl = baseUrl + `/${ID}.png` 
  const uenImage = baseUrl + "/uenscreenshot.png" 

  var emailHtml = nunjucks.render('reply-mail.html', 
    { fullname, 
      ID, 
      amount,
      now: formattedNow,
      qrUrl 
    });

  const msg = {
    to: email, // Change to your recipient
    from: 'globalvillageforhope@gvh.sg', // Change to your verified sender
    subject: "We have received your Donation Form submission",
    html: emailHtml
  }

  return {msg, qrUrl}
}

app.post("/secret", async (req, res) => {
  const { amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Number(amount) * 100,
    currency: "SGD",
    metadata: { integration_check: "accept_a_payment" },
  });
  res.json({ client_secret: paymentIntent.client_secret });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
