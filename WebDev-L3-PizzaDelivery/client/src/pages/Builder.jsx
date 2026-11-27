import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, inr } from "../api.js";

function loadRazorpay() {
  return new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = res; s.onerror = () => rej(new Error("Could not load the Razorpay checkout script (no internet?)."));
    document.body.appendChild(s);
  });
}

export default function Builder({ status }) {
  const [ings, setIngs] = useState([]);
  const [sel, setSel] = useState({ base: "", sauce: "", cheese: "", vegetables: [] });
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState([]);
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const presets = [
    { title: "Margherita", base: "Classic", sauce: "Tomato", cheese: "Mozzarella", veg: ["Basil", "Tomato"] },
    { title: "Garden Veggie", base: "Whole Wheat", sauce: "Pesto", cheese: "Mozzarella", veg: ["Mushroom", "Onion", "Capsicum"] },
    { title: "Spicy Barbecue", base: "Thin Crust", sauce: "Barbecue", cheese: "Cheddar", veg: ["Onion", "Capsicum"] },
  ];
  const usePreset = (p) => {
    const f = (c, n) => (ings.find((i) => i.category === c && i.name.toLowerCase().includes(n.toLowerCase())) || {}).id || "";
    setSel({ base: f("base", p.base), sauce: f("sauce", p.sauce), cheese: f("cheese", p.cheese), vegetables: p.veg.map((v) => f("vegetable", v)).filter(Boolean) });
    setMsg({ ok: true, text: p.title + " loaded. Change anything you like, then add it to your order." });
  };
  const nav = useNavigate();
  useEffect(() => { api("/ingredients").then(setIngs).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  const by = (c) => ings.filter((i) => i.category === c);
  const price = (id) => (ings.find((i) => i.id === id) || {}).price || 0;
  const unit = useMemo(() => price(sel.base) + price(sel.sauce) + price(sel.cheese) + sel.vegetables.reduce((s, v) => s + price(v), 0), [sel, ings]);
  const cartTotal = cart.reduce((s, c) => s + c.unit * c.quantity, 0);
  const name = (id) => (ings.find((i) => i.id === id) || {}).name;
  const toggleVeg = (id) => setSel({ ...sel, vegetables: sel.vegetables.includes(id) ? sel.vegetables.filter((v) => v !== id) : [...sel.vegetables, id] });

  const add = () => {
    if (!sel.base || !sel.sauce || !sel.cheese) return setMsg({ ok: false, text: "Choose a base, a sauce and a cheese first." });
    setCart([...cart, { ...sel, quantity: Number(qty), unit }]); setSel({ base: "", sauce: "", cheese: "", vegetables: [] }); setQty(1); setMsg(null);
  };
  const toSummary = () => {
    if (!cart.length) return setMsg({ ok: false, text: "Your order is empty." });
    if (!address.trim()) return setMsg({ ok: false, text: "Enter a delivery address first." });
    setMsg(null); setReview(true);
  };
  const checkout = async () => {
    if (!cart.length) return setMsg({ ok: false, text: "Your order is empty." });
    setBusy(true); setMsg(null);
    try {
      const r = await api("/orders", { method: "POST", body: { address, items: cart.map(({ base, sauce, cheese, vegetables, quantity }) => ({ base, sauce, cheese, vegetables, quantity })) } });
      if (!r.paymentConfigured) { nav("/dashboard", { state: { notice: r.message } }); return; }
      await loadRazorpay();
      const rz = new window.Razorpay({
        key: r.razorpay.keyId, amount: r.razorpay.amount, currency: r.razorpay.currency, order_id: r.razorpay.orderId, name: "Slice Studio", description: "Custom pizza order",
        handler: async (resp) => {
          try { await api(`/orders/${r.order._id}/verify-payment`, { method: "POST", body: resp }); nav("/dashboard", { state: { notice: "Payment verified. Your order is received." } }); }
          catch (e) { setMsg({ ok: false, text: e.message }); setBusy(false); }
        },
        modal: { ondismiss: () => { setBusy(false); setMsg({ ok: false, text: "Payment was not completed, so the order is NOT paid." }); } },
      });
      rz.on("payment.failed", (e) => setMsg({ ok: false, text: "Payment failed: " + e.error.description }));
      rz.open();
    } catch (e) { setMsg({ ok: false, text: e.message }); setBusy(false); }
  };

  const Group = ({ title, cat, hint }) => (
    <fieldset><legend>{title} <small>{hint}</small></legend><div className="opts">
      {by(cat).map((i) => <label key={i.id} className={"opt" + (sel[cat] === i.id ? " on" : "") + (!i.available ? " off" : "")}>
        <input type="radio" name={cat} disabled={!i.available} checked={sel[cat] === i.id} onChange={() => setSel({ ...sel, [cat]: i.id })} />{i.name}<b>{inr(i.price)}</b>{!i.available && <em>Out of stock</em>}</label>)}
    </div></fieldset>);
  return (
    <div className="builder">
      <section className="card">
        <h1>Build your pizza</h1>
        <h2 className="sub">Ready-made varieties</h2>
        <div className="presets">{presets.map((p) => <button type="button" key={p.title} className="preset" onClick={() => usePreset(p)}><strong>{p.title}</strong><small>{p.base}, {p.sauce}, {p.cheese}, {p.veg.join(", ")}</small></button>)}</div>
        <Group title="1. Base" cat="base" hint="pick one" /><Group title="2. Sauce" cat="sauce" hint="pick one" /><Group title="3. Cheese" cat="cheese" hint="pick one" />
        <fieldset><legend>4. Vegetables <small>pick any</small></legend><div className="opts">
          {by("vegetable").map((i) => <label key={i.id} className={"opt" + (sel.vegetables.includes(i.id) ? " on" : "") + (!i.available ? " off" : "")}>
            <input type="checkbox" disabled={!i.available} checked={sel.vegetables.includes(i.id)} onChange={() => toggleVeg(i.id)} />{i.name}<b>{inr(i.price)}</b>{!i.available && <em>Out of stock</em>}</label>)}</div></fieldset>
        <div className="row"><label>Quantity<input type="number" min="1" max="20" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <div className="live">Live price: <strong data-testid="live-price">{inr(unit * (Number(qty) || 1))}</strong><small>{inr(unit)} each</small></div>
          <button className="primary" onClick={add}>Add to order</button></div>
      </section>
      <aside className="card">
        <h2>Your order</h2>
        {!cart.length && <p className="muted">Nothing here yet.</p>}
        <ul className="cart">{cart.map((c, i) => <li key={i}><div><strong>{c.quantity} x {name(c.base)}</strong><small>{name(c.sauce)}, {name(c.cheese)}{c.vegetables.length ? ", " + c.vegetables.map(name).join(", ") : ""}</small></div><div>{inr(c.unit * c.quantity)}<button className="link" onClick={() => setCart(cart.filter((_, k) => k !== i))}>Remove</button></div></li>)}</ul>
        <div className="total">Total <strong>{inr(cartTotal)}</strong></div>
        <label>Delivery address<textarea rows="2" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, area" /></label>
        {status && !status.razorpay && <div className="note warn">Razorpay is not configured. {status.unpaidDemoOrders ? "Your order will be saved as UNPAID (demo)." : "Ordering is disabled."}</div>}
        {!review && <button className="primary" disabled={!cart.length} onClick={toSummary}>Review order</button>}
        {review && <div className="summary" data-testid="summary"><h3>Order summary</h3>
          <ul>{cart.map((c, i) => <li key={i}>{c.quantity} x {name(c.base)}, {name(c.sauce)}, {name(c.cheese)}{c.vegetables.length ? ", " + c.vegetables.map(name).join(", ") : ""} <b>{inr(c.unit * c.quantity)}</b></li>)}</ul>
          <p>Deliver to: {address}</p><p className="total">Total to pay <strong>{inr(cartTotal)}</strong></p>
          <button className="link" onClick={() => setReview(false)}>Back to edit</button>
          <button className="primary" disabled={busy} onClick={checkout}>{status && status.razorpay ? "Confirm and pay with Razorpay" : "Confirm and place order (no payment)"}</button></div>}
        {msg && <div className={"note " + (msg.ok ? "ok" : "bad")} role="alert">{msg.text}</div>}
      </aside>
    </div>
  );
}
