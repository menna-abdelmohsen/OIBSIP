const jwt = require("jsonwebtoken");
const cfg = require("../config");
const { User } = require("../models");
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, cfg.jwtSecret, { expiresIn: "7d" });
async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  try {
    const p = jwt.verify(h.replace(/^Bearer /, ""), cfg.jwtSecret);
    const u = await User.findById(p.id);
    if (!u) throw new Error("no user");
    req.user = u; next();
  } catch (e) { res.status(401).json({ error: "Please log in." }); }
}
const requireAdmin = (req, res, next) => (req.user.role === "admin" ? next() : res.status(403).json({ error: "Admins only." }));
module.exports = { sign, requireAuth, requireAdmin };
