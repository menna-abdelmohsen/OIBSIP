const router = require("express").Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const cfg = require("../config");
const { User } = require("../models");
const { sign, requireAuth } = require("../utils/auth");
const { sendMail } = require("../utils/mail");

const token = () => crypto.randomBytes(24).toString("hex");
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
// Result sent back to the browser so it can say honestly whether an email went out.
function mailInfo(r, link) {
  const out = { emailSent: r.sent };
  if (!r.sent) { out.emailNote = "Email was NOT sent: " + r.reason + "."; if (cfg.demoLinks) out.demoLink = link; }
  return out;
}
async function sendVerify(u) {
  const link = `${cfg.appUrl}/verify?token=${u.verifyToken}`;
  const r = await sendMail(u.email, "Verify your email", `Hi ${u.name},\n\nPlease verify your email: ${link}\n`);
  return mailInfo(r, link);
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required." });
  if (!emailOk(String(email || ""))) return res.status(400).json({ error: "Enter a valid email address." });
  if (String(password || "").length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (await User.findOne({ email: String(email).toLowerCase() })) return res.status(409).json({ error: "That email is already registered." });
  const u = await User.create({ name: String(name).trim(), email, passwordHash: await bcrypt.hash(password, 10), role: "user", verifyToken: token() });
  res.status(201).json({ ok: true, ...(await sendVerify(u)) });
});

router.get("/verify", async (req, res) => {
  const u = req.query.token && (await User.findOne({ verifyToken: String(req.query.token) }));
  if (!u) return res.status(400).json({ error: "This verification link is invalid or was already used." });
  u.verified = true; u.verifyToken = undefined; await u.save();
  res.json({ ok: true, message: "Email verified. You can log in now." });
});

router.post("/resend-verification", async (req, res) => {
  const u = await User.findOne({ email: String((req.body || {}).email || "").toLowerCase() });
  if (!u || u.verified) return res.json({ ok: true, message: "If that account exists and is unverified, a new link was prepared." });
  u.verifyToken = token(); await u.save();
  res.json({ ok: true, ...(await sendVerify(u)) });
});

function loginHandler(wantRole) {
  return async (req, res) => {
  const { email, password } = req.body || {};
  const u = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!u || u.role !== wantRole || !(await bcrypt.compare(String(password || ""), u.passwordHash))) return res.status(401).json({ error: "Wrong email or password." });
  if (!u.verified) return res.status(403).json({ error: "Please verify your email first.", needsVerification: true });
  res.json({ token: sign(u), user: { id: u._id, name: u.name, email: u.email, role: u.role } });
  };
}
router.post("/login", loginHandler("user"));
router.post("/admin-login", loginHandler("admin"));

router.post("/forgot-password", async (req, res) => {
  const u = await User.findOne({ email: String((req.body || {}).email || "").toLowerCase() });
  const generic = { ok: true, message: "If that email is registered, a reset link was prepared." };
  if (!u) return res.json(generic);
  u.resetToken = token(); u.resetExpires = new Date(Date.now() + 3600e3); await u.save();
  const link = `${cfg.appUrl}/reset?token=${u.resetToken}`;
  const r = await sendMail(u.email, "Reset your password", `Reset your password (valid 1 hour): ${link}\n`);
  res.json({ ...generic, ...mailInfo(r, link) });
});

router.post("/reset-password", async (req, res) => {
  const { token: t, password } = req.body || {};
  if (String(password || "").length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  const u = t && (await User.findOne({ resetToken: String(t), resetExpires: { $gt: new Date() } }));
  if (!u) return res.status(400).json({ error: "This reset link is invalid or has expired." });
  u.passwordHash = await bcrypt.hash(password, 10); u.resetToken = undefined; u.resetExpires = undefined; await u.save();
  res.json({ ok: true, message: "Password changed. You can log in now." });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role } }));
module.exports = router;
