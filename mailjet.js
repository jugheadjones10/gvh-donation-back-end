const mailjet = require ('node-mailjet')
.connect('950a2e6178bbbebb372f1450435a8c5b', '1f33484fba39513eaa6aeaaabe4b7b21')
const request = mailjet
.post("send", {'version': 'v3.1'})
.request({
  "Messages":[
    {
      "From": {
        "Email": "kimyoungjin1001@gmail.com",
        "Name": "Young Jin"
      },
      "To": [
        {
          "Email": "kimyoungjin1001@gmail.com",
          "Name": "Young Jin"
        }
      ],
      "Subject": "Greetings from Mailjet.",
      "TextPart": "My first Mailjet email",
      "HTMLPart": "<h3>Dear passenger 1, welcome to <a href='https://www.mailjet.com/'>Mailjet</a>!</h3><br />May the delivery force be with you!",
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


