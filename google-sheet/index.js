const { GoogleSpreadsheet } = require("google-spreadsheet");
const comLogger = require("../logging.js");

// Would preferably like to authenticate just once per request - wait, isn't that what's happening right now?
function authenticate(sheetID) {
  const doc = new GoogleSpreadsheet(sheetID);
  return doc
    .useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    })
    .then(() => doc.loadInfo())
    .then(() => {
      return doc.sheetsByIndex[0];
    });
}

exports.getLastRow = async function getLastRow(sheetID) {
  const sheet = await authenticate(sheetID);
  const rows = await sheet.getRows();

  return rows[rows.length - 1];
};

exports.addToGoogleSheet = function addToGoogleSheet(row, sheetID) {
  comLogger(
    "info",
    `Adding the following row to Google Sheet: ${JSON.stringify(row)}`,
    { ID: row[0] }
  );
  return authenticate(sheetID).then((sheet) => {
    return sheet.addRow(row);
  });
};

exports.updateDonationReceivedCol = async function (
  value,
  sheetID,
  donationID
) {
  const sheet = await authenticate(sheetID);
  const rows = await sheet.getRows();

  const foundRow = rows.find((row) => row.ID === donationID);

  const rowNumber = foundRow._rowNumber;
  await sheet.loadCells(rowNumber + ":" + rowNumber);

  const donationReceivedCell = sheet.getCell(rowNumber - 1, 10);
  donationReceivedCell.value = value;
  await sheet.saveUpdatedCells();
  comLogger(
    "info",
    `Updated donation confirmed column for donation ID ${donationID} to ${value}`,
    { ID: donationID }
  );
};
