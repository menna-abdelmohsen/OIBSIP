(function () {
  var $ = function (id) { return document.getElementById(id); };
  function post(url, data) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); });
  }
  if ($("form")) {
    var mode = "login", msg = $("msg");
    function setMode(m) {
      mode = m; msg.textContent = "";
      $("tl").className = m === "login" ? "on" : ""; $("tr").className = m === "register" ? "on" : "";
      $("go").textContent = m === "login" ? "Log in" : "Create account";
      $("p").autocomplete = m === "login" ? "current-password" : "new-password";
    }
    $("tl").onclick = function () { setMode("login"); }; $("tr").onclick = function () { setMode("register"); };
    $("form").addEventListener("submit", function (e) {
      e.preventDefault(); msg.className = "msg";
      var d = { username: $("u").value, password: $("p").value };
      post("/api/" + mode, d).then(function (r) {
        if (!r.ok) { msg.className = "msg err"; msg.textContent = r.data.error; return; }
        if (mode === "register") { setMode("login"); msg.className = "msg ok"; msg.textContent = "Account created. You can log in now."; $("p").value = ""; }
        else location.href = "/dashboard";
      });
    });
  }
  if ($("out")) {
    fetch("/api/me").then(function (r) { return r.json(); }).then(function (j) { $("name").textContent = j.username || ""; });
    $("out").onclick = function () { post("/api/logout").then(function () { location.href = "/"; }); };
  }
})();
