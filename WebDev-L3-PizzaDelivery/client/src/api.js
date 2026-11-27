export const getToken = () => localStorage.getItem("token");
export const getUser = () => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } };
export function saveSession(token, user) { localStorage.setItem("token", token); localStorage.setItem("user", JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem("token"); localStorage.removeItem("user"); }
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch("/api" + path, { method, headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: "Bearer " + getToken() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the server. Is it running?"); }
  let data = {}; try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error(data.error || "Something went wrong."); e.data = data; e.status = res.status; throw e; }
  return data;
}
export const inr = (n) => "\u20B9" + Number(n).toLocaleString("en-IN");
export const STATUS = { received: "Received", in_kitchen: "In the kitchen", sent_to_delivery: "Sent to delivery" };
export const PAYMENT = { paid: "Paid (Razorpay)", unpaid_demo: "UNPAID (demo order, no payment taken)", pending: "Awaiting payment", failed: "Payment failed" };
