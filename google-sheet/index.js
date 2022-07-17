const { GoogleSpreadsheet } = require("google-spreadsheet");

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

exports.addToGoogleSheet = function addToGoogleSheet(row, sheetID) {
  console.log(`adding to google sheet: ${row}`);
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
  console.log(
    `Updated donation confirmed column for donation ID ${donationID}`
  );
};
