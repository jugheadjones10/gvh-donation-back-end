var express = require("express")
var cors = require('cors')
const request = require('request')
var hri = require('human-readable-ids').hri

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
    console.log(req.body)
    res.send(hri.random())
})

app.listen(port, () =>
    console.log(`Example app listening on port ${port}!`)
)
