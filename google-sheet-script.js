/**
 * ============================================================================
 * ANGEL SADIA — GOOGLE APPS SCRIPT WEBHOOK FOR CHAT LOGGING
 * ============================================================================
 * 
 * Follow these 4 easy steps to connect your Google Sheet in under 2 minutes:
 * 
 * 1. Open Google Sheets (https://sheets.new) and name it:
 *    "Angel Sadia Chat Logs"
 * 
 * 2. In Google Sheets top menu, click:
 *    Extensions -> Apps Script
 * 
 * 3. Delete any default code in the editor, and PASTE THIS ENTIRE FILE.
 *    Click the Save icon (💾).
 * 
 * 4. Click the blue "Deploy" button (top right) -> "New deployment":
 *    - Click the gear icon (⚙️) next to "Select type" -> choose "Web app"
 *    - Description: "Angel Sadia Logger"
 *    - Execute as: "Me (your email)"
 *    - Who has access: "Anyone" (IMPORTANT: must be "Anyone" so Vercel can post)
 *    - Click "Deploy", authorize permissions when prompted, and COPY the "Web app URL".
 *      (It looks like: https://script.google.com/macros/s/AKfycbx.../exec)
 * 
 * 5. In Vercel (or your local .env file), add the environment variable:
 *    GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbx.../exec"
 * 
 * Done! Every conversation is now permanently stored in your Google Sheet,
 * even if users click "Clear Chat" on their phones!
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

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

    // Parse the incoming JSON data from Angel Sadia backend
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    var timestamp = data.timestamp || new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
    var sessionId = data.sessionId || "anonymous";
    var userMessage = data.userMessage || "";
    var reply = data.reply || "";

    // Append the chat message row
    sheet.appendRow([timestamp, sessionId, userMessage, reply]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("🌸 Angel Sadia Google Sheets Logger is running active!");
}

