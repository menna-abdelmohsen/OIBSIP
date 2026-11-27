import React, { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { api, getUser, clearSession } from "./api.js";
import Auth from "./pages/Auth.jsx";
import { Verify, Forgot, Reset } from "./pages/Account.jsx";
import Builder from "./pages/Builder.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";

function StatusBanner({ status }) {
  if (!status) return null;
  const msgs = [];
  if (!status.database) msgs.push("Database is NOT connected. Check MONGO_URI in .env and that MongoDB is running.");
  if (!status.razorpay) msgs.push(status.unpaidDemoOrders ? "Razorpay is not configured: orders will be saved as UNPAID (demo). No payment is taken." : "Razorpay is not configured: ordering is disabled until keys are added to .env.");
  if (!status.smtp) msgs.push("Email (SMTP) is not configured: no emails are sent. Verification and reset links are shown on screen instead.");
  if (!msgs.length) return null;
  return <div className="banner" role="status"><strong>Setup notice</strong><ul>{msgs.map((m) => <li key={m}>{m}</li>)}</ul></div>;
}

export default function App() {
  const [status, setStatus] = useState(null);
  const [user, setUser] = useState(getUser());
  const nav = useNavigate();
  useEffect(() => { api("/status").then(setStatus).catch(() => setStatus({ database: false, razorpay: false, smtp: false })); }, []);
  const logout = () => { clearSession(); setUser(null); nav("/"); };
  return (
    <>
      <header className="top"><div className="bar">
        <Link to="/" className="brand">Slice<span>Studio</span></Link>
        <nav>
          {user && user.role === "user" && <><Link to="/build">Build a pizza</Link><Link to="/dashboard">My orders</Link></>}
          {user && user.role === "admin" && <Link to="/admin">Admin</Link>}
          {user ? <><span className="who">{user.name} ({user.role})</span><button className="link" onClick={logout}>Log out</button></> : <Link to="/">Log in</Link>}
        </nav></div></header>
      <StatusBanner status={status} />
      <main className="page">
        <Routes>
          <Route path="/" element={user ? <Navigate to={user.role === "admin" ? "/admin" : "/build"} /> : <Auth onLogin={setUser} status={status} />} />
          <Route path="/admin-login" element={user ? <Navigate to="/" /> : <Auth admin onLogin={setUser} status={status} />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot" element={<Forgot />} />
          <Route path="/reset" element={<Reset />} />
          <Route path="/build" element={user && user.role === "user" ? <Builder status={status} /> : <Navigate to="/" />} />
          <Route path="/dashboard" element={user && user.role === "user" ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/admin" element={user && user.role === "admin" ? <Admin /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
