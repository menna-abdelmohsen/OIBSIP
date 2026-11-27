const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cfg = require("./config");
const { seed } = require("./utils/seed");

const app = express();
app.use(cors()); app.use(express.json());

// Tells the browser what is and is not configured, so the screen can say so.
app.get("/api/status", (req, res) => res.json({
  database: mongoose.connection.readyState === 1,
  razorpay: cfg.razorpayConfigured, smtp: cfg.smtpConfigured,
  adminConfigured: cfg.adminConfigured, lowStockEmail: cfg.smtpConfigured && !!cfg.alertEmail,
  unpaidDemoOrders: cfg.unpaidDemo,
}));
// Block data routes while the database is down, with a clear message.
app.use("/api", (req, res, next) => (req.path === "/status" || mongoose.connection.readyState === 1 ? next() : res.status(503).json({ error: "Database is not connected. Check MONGO_URI in .env and that MongoDB is running." })));
app.use("/api/auth", require("./routes/auth"));
const shop = require("./routes/shop");
app.use("/api", shop);
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html"))); }
else app.get("*", (req, res) => res.status(200).send("Front end not built yet. Run: npm run build"));

let scheduled = false;
function schedule() {
  if (scheduled) return; scheduled = true;
  const cron = require("node-cron");
  if (!cron.validate(cfg.lowStockCron)) { console.log("LOW_STOCK_CRON is not a valid cron expression; scheduled stock check disabled."); return; }
  cron.schedule(cfg.lowStockCron, async () => { try { const n = await shop.scanLowStock(); if (n) console.log(`Scheduled stock check: ${n} new low-stock alert(s).`); } catch (e) { console.error("Stock check failed:", e.message); } });
  console.log("Scheduled low-stock check: " + cfg.lowStockCron);
}
async function connect() {
  try { await mongoose.connect(cfg.mongoUri, { serverSelectionTimeoutMS: 5000 }); console.log("MongoDB connected."); await seed(); schedule(); }
  catch (e) { console.error("MongoDB NOT connected: " + e.message + "\nRetrying in 10 s..."); setTimeout(connect, 10000); }
}
const start = async () => {
  app.listen(cfg.port, () => {
    console.log(`Pizza app running at http://localhost:${cfg.port}`);
    console.log(`  Razorpay: ${cfg.razorpayConfigured ? "configured" : "NOT configured"} | SMTP: ${cfg.smtpConfigured ? "configured" : "NOT configured"}`);
  });
  connect();
};
if (require.main === module) start();
module.exports = { app, connect };
