import React, { useEffect, useState } from "react";
import { api, inr, STATUS, PAYMENT } from "../api.js";

export default function Admin() {
  const [inv, setInv] = useState([]); const [orders, setOrders] = useState([]); const [alerts, setAlerts] = useState([]); const [err, setErr] = useState(""); const [edit, setEdit] = useState({});
  const load = async () => { try { const [a, b, c] = await Promise.all([api("/admin/inventory"), api("/admin/orders"), api("/admin/alerts")]); setInv(a); setOrders(b); setAlerts(c); } catch (e) { setErr(e.message); } };
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const setStatus = async (id, status) => { await api(`/admin/orders/${id}/status`, { method: "PATCH", body: { status } }); load(); };
  const save = async (i) => { const e = edit[i._id] || {}; try { await api("/admin/inventory/" + i._id, { method: "PATCH", body: { stock: e.stock ?? i.stock, threshold: e.threshold ?? i.threshold } }); setEdit({ ...edit, [i._id]: undefined }); load(); } catch (x) { setErr(x.message); } };
  const field = (i, k) => <input type="number" min="0" value={(edit[i._id] || {})[k] ?? i[k]} onChange={(e) => setEdit({ ...edit, [i._id]: { ...(edit[i._id] || {}), [k]: e.target.value } })} />;
  return (
    <div><h1>Admin</h1>{err && <div className="note bad">{err}</div>}
      {alerts.length > 0 && <section className="card"><h2>Low-stock alerts</h2><ul className="alerts">{alerts.map((a) => <li key={a._id}><strong>{a.ingredient}</strong>: {a.stock} left (threshold {a.threshold}). <span className={a.emailSent ? "okText" : "warnText"}>{a.note}</span></li>)}</ul></section>}
      <section className="card"><h2>Orders</h2>
        {!orders.length && <p className="muted">No orders yet.</p>}
        <div className="scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>
          {orders.map((o) => <tr key={o._id}><td>#{o._id.slice(-6).toUpperCase()}<br /><small>{new Date(o.createdAt).toLocaleString()}</small></td><td>{o.user ? o.user.name : "?"}<br /><small>{o.address}</small></td>
            <td>{o.items.map((it, i) => <div key={i}>{it.quantity} x {it.base}, {it.sauce}, {it.cheese}{it.vegetables.length ? ", " + it.vegetables.join(", ") : ""}</div>)}</td><td>{inr(o.total)}</td><td className={"pay " + o.payment}>{PAYMENT[o.payment]}</td>
            <td><select value={o.status} onChange={(e) => setStatus(o._id, e.target.value)}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td></tr>)}
        </tbody></table></div></section>
      <section className="card"><h2>Inventory</h2><div className="scroll"><table><thead><tr><th>Ingredient</th><th>Type</th><th>Price</th><th>Stock</th><th>Low-stock level</th><th></th></tr></thead><tbody>
        {inv.map((i) => <tr key={i._id} className={i.stock <= i.threshold ? "low" : ""}><td>{i.name}</td><td>{i.category}</td><td>{inr(i.price)}</td><td>{field(i, "stock")}</td><td>{field(i, "threshold")}</td><td><button className="small" onClick={() => save(i)}>Save</button>{i.stock <= i.threshold && <span className="tag">LOW</span>}</td></tr>)}
      </tbody></table></div></section>
    </div>
  );
}
