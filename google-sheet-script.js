/**
 * ============================================================================
 * ANGEL SADIA — GOOGLE APPS SCRIPT WEBHOOK FOR CHAT LOGGING
 * Connected to Spreadsheet: 1PSP398aFaDzF6Wp-_XaOh5cPSjYKMfnixH3yYokWLJY
 * ============================================================================
 */

// Your Google Sheet ID from https://docs.google.com/spreadsheets/d/1PSP398aFaDzF6Wp-_XaOh5cPSjYKMfnixH3yYokWLJY/edit
var SPREADSHEET_ID = "1PSP398aFaDzF6Wp-_XaOh5cPSjYKMfnixH3yYokWLJY";

function doPost(e) {
  try {
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (_) {}
    if (!ss) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    var sheet = ss.getActiveSheet() || ss.getSheets()[0];

    // If sheet is fresh/empty, automatically add styled headers
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Session ID", "User Message", "Angel Sadia Reply"]);
      var headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#ffe4ec");
      headerRange.setFontColor("#b5179e");
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 170); // Timestamp
      sheet.setColumnWidth(2, 140); // Session ID
      sheet.setColumnWidth(3, 300); // User Message
      sheet.setColumnWidth(4, 380); // Angel Sadia Reply
    }

    // Parse incoming JSON data
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    var timestamp = data.timestamp || new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    var sessionId = data.sessionId || "anonymous";
    var userMessage = data.userMessage || "";
    var reply = data.reply || "";

    // Append the chat message row
    sheet.appendRow([timestamp, sessionId, userMessage, reply]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      recorded: { sessionId: sessionId, timestamp: timestamp }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Angel Sadia Chat Logger Webhook is active and connected to your Google Sheet!"
  })).setMimeType(ContentService.MimeType.JSON);
}
