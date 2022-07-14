const { GoogleSpreadsheet } = require("google-spreadsheet");

function authenticate(sheetID) {
  const doc = new GoogleSpreadsheet(sheetID);
  return doc
    .useServiceAccountAuth(require("./google-credentials.json"))
    .then(() => doc.loadInfo())
    .then(() => {
      return doc.sheetsByIndex[0];
    });
}

exports.addToGoogleSheet = function addToGoogleSheet(row, sheetID) {
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
};
