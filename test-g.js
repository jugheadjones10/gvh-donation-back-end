require("dotenv").config();
const { GoogleSpreadsheet } = require("google-spreadsheet");
const ID = "abcd";

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
doc
  .useServiceAccountAuth(require("./google-credentials.json"))
  .then(() => doc.loadInfo())
  .then(() => {
    return hey();
  });

async function hey() {
  const sheet = doc.sheetsByIndex[0];

  const rows = await sheet.getRows();
  // console.log(rows);

  const foundRow = rows.find((row) => row.ID === ID);
  console.log(foundRow);

  const rowNumber = foundRow._rowNumber;
  await sheet.loadCells(rowNumber + ":" + rowNumber);

  const donationReceivedCell = sheet.getCell(rowNumber - 1, 10);
  console.log(donationReceivedCell.value);
  donationReceivedCell.value = "Y";
  await sheet.saveUpdatedCells();
}
