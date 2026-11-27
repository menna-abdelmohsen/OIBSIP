(function () {
  var form = document.getElementById("form");
  var input = document.getElementById("value");
  var unit = document.getElementById("unit");
  var err = document.getElementById("error");
  var out = document.getElementById("result");
  var names = { C: "Celsius", F: "Fahrenheit", K: "Kelvin" };
  var sym = { C: "\u00B0C", F: "\u00B0F", K: "K" };

  function toCelsius(v, u) {
    if (u === "C") return v;
    if (u === "F") return (v - 32) * 5 / 9;
    return v - 273.15;
  }
  function fromCelsius(c, u) {
    if (u === "C") return c;
    if (u === "F") return c * 9 / 5 + 32;
    return c + 273.15;
  }
  function fmt(n) { return (Math.round(n * 100) / 100).toString(); }
  function fail(m) {
    err.textContent = m; input.classList.add("bad"); out.classList.add("hidden");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var raw = input.value.trim();
    err.textContent = ""; input.classList.remove("bad");
    if (raw === "") return fail("Please enter a number.");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw)) return fail("Invalid input: use digits only, for example 36.6 or -10.");
    var v = parseFloat(raw), u = unit.value;
    var c = toCelsius(v, u);
    if (c < -273.15) return fail("That is below absolute zero (-273.15 \u00B0C).");
    var html = '<small>' + fmt(v) + " " + sym[u] + " (" + names[u] + ") equals</small>";
    ["C", "F", "K"].forEach(function (t) {
      if (t !== u) html += "<p>" + fmt(fromCelsius(c, t)) + " " + sym[t] + " <span style='font-weight:400;color:#64748b'>(" + names[t] + ")</span></p>";
    });
    out.innerHTML = html; out.classList.remove("hidden");
  });
})();
