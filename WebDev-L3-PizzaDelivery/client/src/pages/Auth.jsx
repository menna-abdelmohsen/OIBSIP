import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, saveSession } from "../api.js";

export function MailNote({ r }) {
  if (!r || r.emailSent === undefined) return null;
  if (r.emailSent) return <div className="note ok">An email was sent. Please check your inbox.</div>;
  return <div className="note warn"><strong>{r.emailNote}</strong>{r.demoLink && <><p>Demo link (use it as if you clicked the email):</p><a href={r.demoLink}>{r.demoLink}</a></>}</div>;
}

export default function Auth({ onLogin, status, admin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const [mail, setMail] = useState(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setMsg(null); setMail(null); setNeedsVerify(false);
    try {
      if (mode === "register") {
        const r = await api("/auth/register", { method: "POST", body: f });
        setMsg({ ok: true, text: "Account created. Verify your email, then log in." }); setMail(r); setMode("login");
      } else {
        const r = await api(admin ? "/auth/admin-login" : "/auth/login", { method: "POST", body: { email: f.email, password: f.password } });
        saveSession(r.token, r.user); onLogin(r.user);
      }
    } catch (err) { setMsg({ ok: false, text: err.message }); setNeedsVerify(!!(err.data && err.data.needsVerification)); }
  };
  const resend = async () => { try { setMail(await api("/auth/resend-verification", { method: "POST", body: { email: f.email } })); } catch (e) { setMsg({ ok: false, text: e.message }); } };
  return (
    <div className="card narrow">
      <h1>{admin ? "Admin log in" : mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="muted">Build your own pizza and track it to your door.</p>
      {!admin && <div className="tabs"><button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Log in</button><button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Register</button></div>}
      <form onSubmit={submit} noValidate>
        {mode === "register" && <><label>Name<input value={f.name} onChange={set("name")} autoComplete="name" /></label></>}
        <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
        <label>Password<input type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        <button className="primary" type="submit">{mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      {msg && <div className={"note " + (msg.ok ? "ok" : "bad")} role="alert">{msg.text}</div>}
      {needsVerify && <button className="link" onClick={resend}>Send the verification link again</button>}
      <MailNote r={mail} />
      {admin ? <p className="muted">Admin accounts are created by the server owner (ADMIN_EMAIL in .env), not by sign-up.</p> : <><p><Link to="/forgot">Forgot password?</Link></p><p><Link to="/admin-login">Admin log in</Link></p></>}
    </div>
  );
}
