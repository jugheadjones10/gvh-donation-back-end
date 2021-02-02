var express = require("express")
var cors = require('cors')
var hri = require('human-readable-ids').hri
const stripe = require("stripe")("sk_test_51I9BAdFpTxZu0TTmdwfwATs4ugR7N5y8gmEaAHztXGSI4KwaGxn65hMdmCgyOcljk4HQpZDC9MnHtGpPZCkpYobo00e6KYW2XB");

const { GoogleSpreadsheet } = require('google-spreadsheet')
const nodemailer = require('nodemailer')

const getEmail = require("./strings")

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8000
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kimyoungjin1001@gmail.com',
        pass: 'pcajhomeleoeykux' // naturally, replace both with your real credentials or an application-specific password
    }
})


const app = express()

//Cors allows webpack dev server at localhost:8080 to access my myanmar map API
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post("/donation-form", async function (req, res) {
    console.log(req.body)
    const { fullname, email, mobilenumber, project, type, amount, chequenumber, country } = req.body
    const ID = hri.random()

    const doc = new GoogleSpreadsheet('1SC4fcsl9JmY056x5XJpzfrMetKyCWVSZjj2NwRl8V-s')
    doc.useServiceAccountAuth(require('./GVH Payment-e780847417f9.json'))
        .then(() => doc.loadInfo())
        .then(() => {
            const sheet = doc.sheetsByIndex[0]
            sheet.addRow([ID, fullname, email, mobilenumber, project, type, amount, chequenumber, country])
        }).then(() => {
            const mailOptions = {
                from: 'kimyoungjin1001@gmail.com',
                to: email,
                subject: 'We have received your Donation Form submission',
                text: getEmail(ID, fullname)
            }

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error)
                } else {
                    console.log('Email sent: ' + info.response)
                }
            })
        })

    res.send(ID)
})


// app.post("/create-payment-intent", async (req, res) => {
//     const { items } = req.body;
//     // Create a PaymentIntent with the order amount and currency
//     const paymentIntent = await stripe.paymentIntents.create({
//         amount: calculateOrderAmount(items),
//         currency: "usd"
//     })
//     res.send({
//         clientSecret: paymentIntent.client_secret
//     })
// })

app.listen(port, () =>
    console.log(`Example app listening on port ${port}!`)
)
