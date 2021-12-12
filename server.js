var express = require("express");
var cors = require("cors");
var hri = require("human-readable-ids").hri;
const stripe = require("stripe")(
  "sk_test_51JYP6bJ0vgYGBOQWJSPVhYR2Ce7mwIArpnjeB6dsjg6X1BBxuRplVoFvTFluLmRbbW4SER8eDFeu3FfH64EpcysG00MbyujWX2"
);

const { GoogleSpreadsheet } = require("google-spreadsheet");
const nodemailer = require("nodemailer");
const { getEmail } = require("./strings");
const { getAuctionEmail } = require("./auction-mail");
const {randomString} = require("./random-id-generator")

const mailjet = require('node-mailjet')
.connect('950a2e6178bbbebb372f1450435a8c5b', '1f33484fba39513eaa6aeaaabe4b7b21')

const mailgun = require("mailgun-js");
const DOMAIN = "https://api.eu.mailgun.net/v3/gvh.sg/messages";
const mg = mailgun({apiKey: "07e3c936d837ed96e094a089a4e0ec3b-7005f37e-9966460c", domain: DOMAIN});
const data = {
	from: "mailgun@gvh.sg",
	to: "mrtimer99@gmail.com",
	subject: "Hello",
	text: "Testing some Mailgun awesomness!"
};


let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

const app = express();

//Cors allows webpack dev server at localhost:8080 to access my myanmar map API
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/mail-test", function(req, res){
  mg.messages().send(data, function (error, body) {
    console.log(body);
    console.log(error)
  });
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
      const request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
          "Messages":[
            {
              "From": {
                "Email": "gvhfinance@gmail.com",
                "Name": "GVH Finance"
              },
              "To": [
                {
                  "Email": email,
                  "Name":fullname
                }
              ],
              "Subject": "We have received your Donation Form submission",
              "HTMLPart": getEmail(ID, fullname),
              "CustomID": "AppGettingStartedTest"
            }
          ]
        })

      request
        .then((result) => {
          console.log(result.body)
        })
        .catch((err) => {
          console.log(err.statusCode)
        })

    })
      res.send(ID);
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
  const ID = "SM-" + randomString(5);

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

      const request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
          "Messages":[
            {
              "From": {
                "Email": "gvhfinance@gmail.com",
                "Name": "GVH Finance"
              },
              "To": [
                {
                  "Email": email,
                  "Name":fullname
                }
              ],
              "Subject": "We have received your Donation Form submission",
              "TextPart": "My first Mailjet email",
              "HTMLPart": getAuctionEmail("W"),
              "CustomID": "AppGettingStartedTest"
            }
          ]
        })

      request
        .then((result) => {
          console.log(result.body)
        })
        .catch((err) => {
          console.log(err.statusCode)
        })
    });

  res.send(ID);
});

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
