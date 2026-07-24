// ============================================================
// Paste this into Extensions -> Apps Script on your Google Sheet.
// Deploy as a Web App (Execute as: Me, Access: Anyone) and
// paste the resulting /exec URL into FORM_ENDPOINT in index.html.
// ============================================================

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const p = e.parameter;

  sheet.appendRow([
    new Date(),
    p.name || "",
    p.email || "",
    p.website || "",
    p.problem || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
