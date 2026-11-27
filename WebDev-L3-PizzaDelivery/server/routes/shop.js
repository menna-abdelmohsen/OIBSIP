const router = require("express").Router();
const crypto = require("crypto");
const cfg = require("../config");
const { Ingredient, Order, Alert } = require("../models");
const { requireAuth, requireAdmin } = require("../utils/auth");
const { sendMail } = require("../utils/mail");

let razorpay = null;
if (cfg.razorpayConfigured) { const Razorpay = require("razorpay"); razorpay = new Razorpay({ key_id: cfg.rzpKeyId, key_secret: cfg.rzpSecret }); }

router.get("/ingredients", async (req, res) => {
  const list = await Ingredient.find().sort({ category: 1, name: 1 });
  res.json(list.map((i) => ({ id: i._id, name: i.name, category: i.category, price: i.price, available: i.stock > 0 })));
});

// Price is always calculated here from the database, never trusted from the browser.
async function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw new Error("Add at least one pizza.");
  const all = await Ingredient.find(); const byId = new Map(all.map((i) => [String(i._id), i]));
  const items = []; const need = new Map(); let total = 0;
  for (const it of rawItems) {
    const qty = Math.floor(Number(it.quantity));
    if (!(qty >= 1 && qty <= 20)) throw new Error("Quantity must be 1 to 20.");
    const pick = (id, cat) => { const x = byId.get(String(id)); if (!x || x.category !== cat) throw new Error("Pick a valid " + cat + "."); return x; };
    const base = pick(it.base, "base"), sauce = pick(it.sauce, "sauce"), cheese = pick(it.cheese, "cheese");
    const vegIds = [...new Set(it.vegetables || [])]; const vegs = vegIds.map((v) => pick(v, "vegetable"));
    const parts = [base, sauce, cheese, ...vegs];
    for (const p of parts) need.set(String(p._id), (need.get(String(p._id)) || 0) + qty);
    const unit = parts.reduce((s, p) => s + p.price, 0);
    total += unit * qty;
    items.push({ base: base.name, sauce: sauce.name, cheese: cheese.name, vegetables: vegs.map((v) => v.name), quantity: qty, unitPrice: unit });
  }
  for (const [id, n] of need) { const ing = byId.get(id); if (ing.stock < n) throw new Error(`Not enough ${ing.name} in stock.`); }
  return { items, total, need };
}

router.post("/price", async (req, res) => {
  try { const { total } = await priceItems(req.body.items); res.json({ total }); } catch (e) { res.status(400).json({ error: e.message }); }
});

// Raise one low-stock alert (and email) per ingredient until it is restocked.
async function checkLowStock(ing) {
  if (!(ing.stock <= ing.threshold) || ing.alerted) return false;
  ing.alerted = true; await ing.save();
  const text = `Low stock: ${ing.name} has ${ing.stock} left (threshold ${ing.threshold}).`;
  const r = cfg.alertEmail ? await sendMail(cfg.alertEmail, "Low stock: " + ing.name, text) : { sent: false, reason: "ADMIN_ALERT_EMAIL is not set" };
  await Alert.create({ ingredient: ing.name, stock: ing.stock, threshold: ing.threshold, emailSent: r.sent, note: r.sent ? "Email sent to " + cfg.alertEmail : "Email NOT sent: " + r.reason });
  return true;
}
async function scanLowStock() { let n = 0; for (const ing of await Ingredient.find()) if (await checkLowStock(ing)) n++; return n; }

// Take stock, raise low-stock alerts. Runs once per order (stockApplied guard).
async function applyStock(order) {
  if (order.stockApplied) return;
  const names = new Map();
  for (const it of order.items) for (const n of [it.base, it.sauce, it.cheese, ...it.vegetables]) names.set(n, (names.get(n) || 0) + it.quantity);
  order.stockApplied = true; await order.save();
  for (const [name, n] of names) {
    const ing = await Ingredient.findOneAndUpdate({ name }, { $inc: { stock: -n } }, { new: true });
    if (ing) await checkLowStock(ing);
  }
}

router.post("/orders", requireAuth, async (req, res) => {
  try {
    const address = String(req.body.address || "").trim();
    if (address.length < 5) return res.status(400).json({ error: "Enter a delivery address." });
    const { items, total } = await priceItems(req.body.items);
    if (!cfg.razorpayConfigured) {
      if (!cfg.unpaidDemo) return res.status(503).json({ error: "Payment is not configured: add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env." });
      const order = await Order.create({ user: req.user._id, items, total, address, payment: "unpaid_demo" });
      await applyStock(order);
      return res.status(201).json({ order, paymentConfigured: false, message: "Razorpay is not configured, so NO payment was taken. The order is saved as UNPAID (demo)." });
    }
    const order = await Order.create({ user: req.user._id, items, total, address, payment: "pending" });
    let rz;
    try { rz = await razorpay.orders.create({ amount: Math.round(total * 100), currency: "INR", receipt: String(order._id) }); }
    catch (e) { order.payment = "failed"; await order.save(); return res.status(502).json({ error: "Razorpay rejected the request: " + ((e.error && e.error.description) || e.message) }); }
    order.razorpayOrderId = rz.id; await order.save();
    res.status(201).json({ order, paymentConfigured: true, razorpay: { keyId: cfg.rzpKeyId, orderId: rz.id, amount: rz.amount, currency: rz.currency } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post("/orders/:id/verify-payment", requireAuth, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order || !cfg.razorpayConfigured) return res.status(400).json({ error: "Cannot verify this payment." });
  if (order.payment === "paid") return res.json({ ok: true, order });
  const { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = req.body || {};
  const expected = crypto.createHmac("sha256", cfg.rzpSecret).update(`${order.razorpayOrderId}|${pid}`).digest("hex");
  const ok = oid === order.razorpayOrderId && sig && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) { order.payment = "failed"; await order.save(); return res.status(400).json({ error: "Payment signature did not match. The order is NOT marked as paid." }); }
  order.payment = "paid"; order.razorpayPaymentId = pid; await order.save();
  await applyStock(order);
  res.json({ ok: true, order });
});

router.get("/orders/mine", requireAuth, async (req, res) => res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 })));

// ---- admin ----
router.get("/admin/orders", requireAuth, requireAdmin, async (req, res) => res.json(await Order.find().populate("user", "name email").sort({ createdAt: -1 })));
router.patch("/admin/orders/:id/status", requireAuth, requireAdmin, async (req, res) => {
  if (!["received", "in_kitchen", "sent_to_delivery"].includes(req.body.status)) return res.status(400).json({ error: "Bad status." });
  const o = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  o ? res.json(o) : res.status(404).json({ error: "Order not found." });
});
router.get("/admin/inventory", requireAuth, requireAdmin, async (req, res) => res.json(await Ingredient.find().sort({ category: 1, name: 1 })));
router.patch("/admin/inventory/:id", requireAuth, requireAdmin, async (req, res) => {
  const ing = await Ingredient.findById(req.params.id); if (!ing) return res.status(404).json({ error: "Not found." });
  for (const k of ["stock", "threshold", "price"]) if (req.body[k] !== undefined) { const n = Number(req.body[k]); if (!(n >= 0)) return res.status(400).json({ error: k + " must be 0 or more." }); ing[k] = n; }
  if (ing.stock > ing.threshold) ing.alerted = false;   // restocked: allow a future alert
  await ing.save(); await checkLowStock(ing); res.json(ing);
});
router.get("/admin/alerts", requireAuth, requireAdmin, async (req, res) => res.json(await Alert.find().sort({ createdAt: -1 }).limit(30)));

module.exports = router;
module.exports.scanLowStock = scanLowStock;
