"use strict";
// Small self-contained auth app. No npm packages needed. Start with: node server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data", "users.json");
const PUB = path.join(__dirname, "public");
const sessions = new Map(); // token -> username (in memory, cleared on restart)

function readUsers() { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch (e) { return []; } }
function writeUsers(u) { fs.mkdirSync(path.dirname(DB), { recursive: true }); fs.writeFileSync(DB, JSON.stringify(u, null, 2)); }
function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString("hex"); }
function send(res, code, body, type, extra) {
  res.writeHead(code, Object.assign({ "Content-Type": type || "application/json; charset=utf-8" }, extra || {}));
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
function json(res, code, obj, extra) { send(res, code, obj, "application/json; charset=utf-8", extra); }
function body(req) {
  return new Promise((ok) => {
    let d = ""; req.on("data", (c) => { d += c; if (d.length > 1e5) req.destroy(); });
    req.on("end", () => { try { ok(JSON.parse(d || "{}")); } catch (e) { ok({}); } });
  });
}
function sessionUser(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || "");
  return m ? sessions.get(m[1]) : null;
}
function file(res, name) {
  fs.readFile(path.join(PUB, name), (err, data) => {
    if (err) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, name.endsWith(".css") ? "text/css" : name.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8");
  });
}

http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  if (req.method === "POST" && url === "/api/register") {
    const { username, password } = await body(req);
    const u = String(username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return json(res, 400, { error: "Username must be 3-20 letters, numbers or underscores." });
    if (String(password || "").length < 8 || !/[0-9]/.test(password)) return json(res, 400, { error: "Password must be at least 8 characters and include at least 1 number." });
    const users = readUsers();
    if (users.some((x) => x.username === u)) return json(res, 409, { error: "That username is already taken." });
    const salt = crypto.randomBytes(16).toString("hex");
    users.push({ username: u, salt, hash: hash(password, salt), created: new Date().toISOString() });
    writeUsers(users);
    return json(res, 201, { ok: true });
  }
  if (req.method === "POST" && url === "/api/login") {
    const { username, password } = await body(req);
    const u = String(username || "").trim().toLowerCase();
    const user = readUsers().find((x) => x.username === u);
    const good = user && crypto.timingSafeEqual(Buffer.from(hash(String(password || ""), user.salt), "hex"), Buffer.from(user.hash, "hex"));
    if (!good) return json(res, 401, { error: "Wrong username or password." });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, u);
    return json(res, 200, { ok: true }, { "Set-Cookie": "sid=" + token + "; HttpOnly; SameSite=Strict; Path=/" });
  }
  if (req.method === "POST" && url === "/api/logout") {
    const m = /sid=([a-f0-9]+)/.exec(req.headers.cookie || ""); if (m) sessions.delete(m[1]);
    return json(res, 200, { ok: true }, { "Set-Cookie": "sid=; Max-Age=0; Path=/" });
  }
  if (req.method === "GET" && url === "/api/me") {
    const u = sessionUser(req);
    return u ? json(res, 200, { username: u }) : json(res, 401, { error: "Not logged in." });
  }
  if (req.method === "GET" && url === "/dashboard") {
    if (!sessionUser(req)) { res.writeHead(302, { Location: "/" }); return res.end(); }
    return file(res, "dashboard.html");
  }
  if (req.method === "GET" && (url === "/" || url === "/index.html")) return file(res, "index.html");
  if (req.method === "GET" && url === "/style.css") return file(res, "style.css");
  if (req.method === "GET" && url === "/app.js") return file(res, "app.js");
  if (url === "/favicon.ico") { res.writeHead(204); return res.end(); }
  send(res, 404, "Not found", "text/plain");
}).listen(PORT, () => console.log("Login demo running at http://localhost:" + PORT));
