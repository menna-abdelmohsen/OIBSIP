const nodemailer = require("nodemailer");
const cfg = require("../config");
let transport = null;
if (cfg.smtpConfigured) {
  transport = nodemailer.createTransport({ host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.port === 465, auth: { user: cfg.smtp.user, pass: cfg.smtp.pass } });
}
// Returns { sent: true } or { sent: false, reason }. Never pretends success.
async function sendMail(to, subject, text) {
  if (!transport) { console.log(`[mail NOT sent: SMTP not configured] to=${to} subject="${subject}"\n${text}\n`); return { sent: false, reason: "SMTP is not configured" }; }
  try { await transport.sendMail({ from: cfg.smtp.from, to, subject, text }); return { sent: true }; }
  catch (e) { console.error("[mail error]", e.message); return { sent: false, reason: "SMTP error: " + e.message }; }
}
module.exports = { sendMail };
