var express = require("express")
var cors = require('cors')
var hri = require('human-readable-ids').hri
const { GoogleSpreadsheet } = require('google-spreadsheet');

let port = process.env.PORT;
if (port == null || port == "") {
    port = 8000
}

const app = express()

//Cors allows webpack dev server at localhost:8080 to access my myanmar map API
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))



app.post("/donation-form", function (req, res) {
    const { name, mail, phone } = req.body
    const ID = hri.random()

    const doc = new GoogleSpreadsheet('1SC4fcsl9JmY056x5XJpzfrMetKyCWVSZjj2NwRl8V-s')
    await doc.useServiceAccountAuth(require('./credentials.json'))
    await doc.loadInfo()
    const sheet = doc.sheetsByIndex[0]
    sheet.addRow({ ID, Name: name, Email: mail, Phone: phone })

    res.send(hri.random())
})

app.listen(port, () =>
    console.log(`Example app listening on port ${port}!`)
)
