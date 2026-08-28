/**
 * apps-script.gs — paste this into the Apps Script editor bound to your
 * Google Sheet (Extensions -> Apps Script), then deploy it as a Web App.
 * See README.md, "Score logging", for the full step-by-step.
 *
 * It receives one JSON record per "Submit Score" click from the game and
 * appends it as a new row. Nothing else touches this sheet, so it's safe
 * to also read/filter/sort the sheet by hand at any time.
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Responses");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Responses");
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Player Name",
      "Score",
      "Points Allocated",
      "Fire",
      "Water",
      "Earth",
      "Wind",
      "Physical",
    ]);
  }

  var data = JSON.parse(e.postData.contents);
  var alloc = data.allocation || {};

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.name || "",
    data.score,
    data.pointsAllocated,
    alloc.Fire || 0,
    alloc.Water || 0,
    alloc.Earth || 0,
    alloc.Wind || 0,
    alloc.Physical || 0,
  ]);

  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(
    ContentService.MimeType.JSON
  );
}
