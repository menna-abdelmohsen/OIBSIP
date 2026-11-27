import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { MailNote } from "./Auth.jsx";

export function Verify() {
  const [p] = useSearchParams(); const [r, setR] = useState(null);
  useEffect(() => { api("/auth/verify?token=" + encodeURIComponent(p.get("token") || "")).then((d) => setR({ ok: true, text: d.message })).catch((e) => setR({ ok: false, text: e.message })); }, []);
  return <div className="card narrow"><h1>Email verification</h1>{!r ? <p>Checking...</p> : <div className={"note " + (r.ok ? "ok" : "bad")}>{r.text}</div>}<p><Link to="/">Go to log in</Link></p></div>;
}
export function Forgot() {
  const [email, setEmail] = useState(""); const [r, setR] = useState(null); const [err, setErr] = useState("");
  const go = async (e) => { e.preventDefault(); setErr(""); try { setR(await api("/auth/forgot-password", { method: "POST", body: { email } })); } catch (x) { setErr(x.message); } };
  return <div className="card narrow"><h1>Forgot password</h1><form onSubmit={go}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><button className="primary">Send reset link</button></form>
    {err && <div className="note bad">{err}</div>}{r && <><div className="note ok">{r.message}</div><MailNote r={r} /></>}<p><Link to="/">Back to log in</Link></p></div>;
}
export function Reset() {
  const [p] = useSearchParams(); const [pw, setPw] = useState(""); const [r, setR] = useState(null);
  const go = async (e) => { e.preventDefault(); try { const d = await api("/auth/reset-password", { method: "POST", body: { token: p.get("token"), password: pw } }); setR({ ok: true, text: d.message }); } catch (x) { setR({ ok: false, text: x.message }); } };
  return <div className="card narrow"><h1>Choose a new password</h1><form onSubmit={go}><label>New password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label><button className="primary">Change password</button></form>
    {r && <div className={"note " + (r.ok ? "ok" : "bad")}>{r.text}</div>}<p><Link to="/">Go to log in</Link></p></div>;
}
