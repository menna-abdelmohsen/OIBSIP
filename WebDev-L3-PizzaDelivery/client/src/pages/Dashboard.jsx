import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { api, inr, STATUS, PAYMENT } from "../api.js";

export function Steps({ status }) {
  const keys = Object.keys(STATUS); const at = keys.indexOf(status);
  return <ol className="steps">{keys.map((k, i) => <li key={k} className={i <= at ? "done" : ""}>{STATUS[k]}</li>)}</ol>;
}
export default function Dashboard() {
  const [orders, setOrders] = useState(null); const [err, setErr] = useState("");
  const notice = (useLocation().state || {}).notice;
  const load = () => api("/orders/mine").then(setOrders).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
  return (
    <div><h1>My orders</h1>
      {notice && <div className="note ok">{notice}</div>}{err && <div className="note bad">{err}</div>}
      {orders && !orders.length && <div className="card"><p>No orders yet.</p><Link to="/build">Build your first pizza</Link></div>}
      {orders && orders.map((o) => (
        <div className="card order" key={o._id}>
          <div className="head"><strong>Order #{o._id.slice(-6).toUpperCase()}</strong><span>{new Date(o.createdAt).toLocaleString()}</span><strong>{inr(o.total)}</strong></div>
          <Steps status={o.status} />
          <p className={"pay " + o.payment}>{PAYMENT[o.payment]}</p>
          <ul>{o.items.map((it, i) => <li key={i}>{it.quantity} x {it.base}, {it.sauce}, {it.cheese}{it.vegetables.length ? ", " + it.vegetables.join(", ") : ""}</li>)}</ul>
          <small>Deliver to: {o.address}</small>
        </div>))}
      <p className="muted">This page refreshes by itself every few seconds.</p>
    </div>
  );
}
