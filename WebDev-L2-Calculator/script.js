(function () {
  var disp = document.getElementById("display"), expr = document.getElementById("expr");
  var cur = "0", prev = null, op = null, fresh = false, sym = { "+": "+", "-": "\u2212", "*": "\u00D7", "/": "\u00F7" };
  function show() { disp.textContent = cur; expr.textContent = prev !== null && op ? prev + " " + sym[op] : ""; }
  function fmt(n) { return String(parseFloat(n.toPrecision(12))); }
  function calc(a, b, o) {
    a = parseFloat(a); b = parseFloat(b);
    if (o === "+") return a + b; if (o === "-") return a - b; if (o === "*") return a * b;
    if (b === 0) return null; return a / b;
  }
  function err() { cur = "Cannot divide by 0"; prev = null; op = null; fresh = true; show(); }
  function equals() {
    if (op === null || prev === null) return;
    var r = calc(prev, cur, op);
    if (r === null) return err();
    expr.textContent = prev + " " + sym[op] + " " + cur + " =";
    cur = fmt(r); prev = null; op = null; fresh = true; disp.textContent = cur;
  }
  function press(el) {
    var n = el.dataset.n, o = el.dataset.op, a = el.dataset.a;
    if (cur === "Cannot divide by 0") { cur = "0"; }
    if (n !== undefined) {
      if (fresh) { cur = "0"; fresh = false; }
      if (n === ".") { if (cur.indexOf(".") < 0) cur += "."; }
      else cur = cur === "0" ? n : (cur.length < 14 ? cur + n : cur);
      show();
    } else if (o) {
      if (op && prev !== null && !fresh) { var r = calc(prev, cur, op); if (r === null) return err(); cur = fmt(r); }
      prev = cur; op = o; fresh = true; show();
    } else if (a === "eq") equals();
    else if (a === "clear") { cur = "0"; prev = null; op = null; fresh = false; show(); }
    else if (a === "back") { cur = cur.length > 1 && !fresh ? cur.slice(0, -1) : "0"; show(); }
    else if (a === "percent") { cur = fmt(parseFloat(cur) / 100); show(); }
  }
  document.querySelector(".keys").addEventListener("click", function (e) { if (e.target.tagName === "BUTTON") press(e.target); });
  document.addEventListener("keydown", function (e) {
    var k = e.key, b;
    if (/^[0-9.]$/.test(k)) b = document.querySelector('[data-n="' + k + '"]');
    else if ("+-*/".indexOf(k) >= 0) b = document.querySelector('[data-op="' + k + '"]');
    else if (k === "Enter" || k === "=") b = document.querySelector('[data-a="eq"]');
    else if (k === "Backspace") b = document.querySelector('[data-a="back"]');
    else if (k === "Escape") b = document.querySelector('[data-a="clear"]');
    if (b) { e.preventDefault(); press(b); }
  });
})();
