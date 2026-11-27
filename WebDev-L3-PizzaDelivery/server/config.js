require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bool = (v, d) => (v === undefined || v === "" ? d : String(v).toLowerCase() === "true");
const c = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  appUrl: (process.env.APP_URL || "http://localhost:" + (process.env.PORT || 5000)).replace(/\/$/, ""),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/pizza_app",
  adminEmail: (process.env.ADMIN_EMAIL || "").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "",
  lowStockCron: process.env.LOW_STOCK_CRON || "*/30 * * * *",
  alertEmail: process.env.ADMIN_ALERT_EMAIL || "",
  rzpKeyId: process.env.RAZORPAY_KEY_ID || "",
  rzpSecret: process.env.RAZORPAY_KEY_SECRET || "",
  smtp: { host: process.env.SMTP_HOST || "", port: Number(process.env.SMTP_PORT || 587), user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "", from: process.env.SMTP_FROM || "Pizza App <no-reply@example.com>" },
  demoLinks: bool(process.env.DEMO_SHOW_LINKS, true),
  unpaidDemo: bool(process.env.ALLOW_UNPAID_DEMO_ORDERS, true),
};
c.adminConfigured = !!(c.adminEmail && c.adminPassword.length >= 8);
c.razorpayConfigured = !!(c.rzpKeyId && c.rzpSecret);
c.smtpConfigured = !!(c.smtp.host && c.smtp.user && c.smtp.pass);
module.exports = c;
