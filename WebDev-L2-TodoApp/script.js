(function () {
  var KEY = "oibsip-todo-v1";
  var tasks = [];
  try { tasks = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { tasks = []; }
  var editing = null;
  var $ = function (id) { return document.getElementById(id); };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {} }
  function stamp(iso) { return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function btn(label, cls, fn) { var b = el("button", cls, label); b.type = "button"; b.addEventListener("click", fn); return b; }

  function item(t) {
    var li = el("li"), info = el("div", "info"), btns = el("div", "btns");
    if (editing === t.id) {
      var inp = el("input", "edit"); inp.value = t.title; inp.maxLength = 120; info.appendChild(inp);
      btns.appendChild(btn("Save", "ok", function () {
        var v = inp.value.trim(); if (!v) { $("err").textContent = "A task cannot be empty."; return; }
        t.title = v; editing = null; $("err").textContent = ""; save(); render();
      }));
      btns.appendChild(btn("Cancel", "gray", function () { editing = null; render(); }));
      setTimeout(function () { inp.focus(); }, 0);
    } else {
      info.appendChild(el("div", "t", t.title));
      info.appendChild(el("div", "meta", "Added: " + stamp(t.added) + (t.completed ? "  |  Completed: " + stamp(t.completed) : "")));
      if (!t.completed) {
        btns.appendChild(btn("Complete", "ok", function () { t.completed = new Date().toISOString(); save(); render(); }));
        btns.appendChild(btn("Edit", "ed", function () { editing = t.id; render(); }));
      } else {
        btns.appendChild(btn("Undo", "gray", function () { t.completed = null; save(); render(); }));
      }
      btns.appendChild(btn("Delete", "del", function () { tasks = tasks.filter(function (x) { return x.id !== t.id; }); save(); render(); }));
    }
    li.appendChild(info); li.appendChild(btns); return li;
  }
  function fill(ul, list, msg) {
    ul.innerHTML = "";
    if (!list.length) { ul.appendChild(el("li", "empty", msg)); return; }
    list.forEach(function (t) { ul.appendChild(item(t)); });
  }
  function render() {
    var p = tasks.filter(function (t) { return !t.completed; });
    var d = tasks.filter(function (t) { return t.completed; });
    fill($("pending"), p, "Nothing pending. Add a task above."); fill($("done"), d, "No completed tasks yet.");
    $("pc").textContent = p.length; $("dc").textContent = d.length;
  }
  $("add").addEventListener("submit", function (e) {
    e.preventDefault(); var v = $("title").value.trim();
    if (!v) { $("err").textContent = "Please type a task first."; return; }
    $("err").textContent = "";
    tasks.unshift({ id: Date.now() + Math.random().toString(16).slice(2), title: v, added: new Date().toISOString(), completed: null });
    $("title").value = ""; save(); render();
  });
  render();
})();
