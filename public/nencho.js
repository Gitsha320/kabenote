(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "kn-nc-2026";

  // ---------- 令和7年分（去年）と令和8年分（今年）の所得税 ----------
  function kyuyo(inc, minDed, minUpTo) {
    if (inc <= minDed) return 0;
    if (inc < minUpTo) return inc - minDed;
    var ded;
    if (inc <= 3600000) ded = inc * 0.3 + 80000;
    else if (inc <= 6600000) ded = inc * 0.2 + 440000;
    else if (inc <= 8500000) ded = inc * 0.1 + 1100000;
    else ded = 1950000;
    return Math.max(0, Math.floor(inc - ded));
  }
  var RULES = {
    r7: { // 令和7年分：給与所得控除の最低65万円、基礎控除58万円＋特例
      kyuyo: function (inc) { return kyuyo(inc, 650000, 1900000); },
      kiso: function (t) { return t <= 1320000 ? 950000 : t <= 3360000 ? 880000 : t <= 4890000 ? 680000 : t <= 6550000 ? 630000 : t <= 23500000 ? 580000 : 0; }
    },
    r8: { // 令和8年分：給与所得控除の最低74万円、基礎控除62万円＋特例
      kyuyo: function (inc) { return kyuyo(inc, 740000, 2191000); },
      kiso: function (t) { return t <= 4890000 ? 1040000 : t <= 6550000 ? 670000 : t <= 23500000 ? 620000 : 0; }
    }
  };
  function incomeTax(k) { // 課税所得 → 所得税（速算表）＋復興特別所得税
    if (k <= 0) return 0;
    var t;
    if (k <= 1950000) t = k * 0.05;
    else if (k <= 3300000) t = k * 0.10 - 97500;
    else if (k <= 6950000) t = k * 0.20 - 427500;
    else if (k <= 9000000) t = k * 0.23 - 636000;
    else if (k <= 18000000) t = k * 0.33 - 1536000;
    else if (k <= 40000000) t = k * 0.40 - 2796000;
    else t = k * 0.45 - 4796000;
    return Math.floor(t * 1.021 / 100) * 100;
  }
  function calc(r, v) {
    var ks = r.kyuyo(v.income), kiso = r.kiso(ks);
    var spouse = v.sp === "dep" && ks <= 9000000 ? 380000 : 0;
    var ded = kiso + v.shaho + spouse + v.d16 * 380000 + v.d19 * 630000 + v.d23 * 380000;
    var k = Math.max(0, Math.floor((ks - ded) / 1000) * 1000);
    return { ks: ks, kiso: kiso, k: k, tax: incomeTax(k) };
  }

  // ---------- state ----------
  var D = { income: 3000000, shaho: null, shahoAuto: true, sp: "none", d16: 0, d19: 0, d23: 0 };
  var S = (function () { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && typeof s.income === "number") return Object.assign({}, D, s); } catch (e) {} return Object.assign({}, D); })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function yen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function num(str) { var d = String(str == null ? "" : str).replace(/[^\d]/g, ""); return d ? Math.min(parseInt(d, 10), 999999999) : 0; }
  function shahoVal() { return S.shahoAuto ? Math.round(S.income * 0.15) : (S.shaho || 0); }

  function fill() {
    $("income").value = S.income ? S.income.toLocaleString("ja-JP") : "";
    $("shahoAuto").checked = S.shahoAuto;
    $("shaho").value = shahoVal().toLocaleString("ja-JP"); $("shaho").readOnly = S.shahoAuto;
    document.querySelectorAll('input[name="sp"]').forEach(function (r) { r.checked = r.value === S.sp; });
    $("d16").value = S.d16; $("d19").value = S.d19; $("d23").value = S.d23;
  }
  function render() {
    if (S.shahoAuto) $("shaho").value = shahoVal().toLocaleString("ja-JP");
    var v = { income: S.income, shaho: shahoVal(), sp: S.sp, d16: S.d16, d19: S.d19, d23: S.d23 };
    var a = calc(RULES.r7, v), b = calc(RULES.r8, v), diff = Math.max(0, a.tax - b.tax);
    if (!S.income) { $("diff").textContent = "—"; $("basis").textContent = "年収を入れてください。"; }
    else {
      $("diff").textContent = "約 " + yen(diff);
      $("basis").textContent = a.tax === 0 ? "去年のルールでも所得税がかからない年収です。"
        : b.tax === 0 ? "今年のルールでは所得税が0円になります。11月までに引かれた所得税は、年末調整でほぼ全額戻る見込みです。"
        : "所得税（年額）が " + yen(a.tax) + " → " + yen(b.tax) + " に減る見込みです。この差の多くが12月の年末調整で精算されます。";
    }
    $("detail").innerHTML = [
      ["", "去年（令和7年分）", "今年（令和8年分）"],
      ["給与所得", yen(a.ks), yen(b.ks)],
      ["基礎控除", yen(a.kiso), yen(b.kiso)],
      ["課税所得", yen(a.k), yen(b.k)],
      ["所得税（復興税込み）", yen(a.tax), yen(b.tax)]
    ].slice(1).map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + " → " + x[2] + "</dd>"; }).join("");
    save();
  }

  // ---------- events ----------
  $("income").addEventListener("input", function (e) { S.income = num(e.target.value); render(); });
  $("income").addEventListener("blur", function (e) { e.target.value = S.income ? S.income.toLocaleString("ja-JP") : ""; });
  $("shaho").addEventListener("input", function (e) { if (!S.shahoAuto) { S.shaho = num(e.target.value); render(); } });
  $("shaho").addEventListener("blur", function (e) { e.target.value = shahoVal().toLocaleString("ja-JP"); });
  $("shahoAuto").addEventListener("change", function (e) { S.shahoAuto = e.target.checked; if (!S.shahoAuto && S.shaho == null) S.shaho = Math.round(S.income * 0.15); $("shaho").readOnly = S.shahoAuto; $("shaho").value = shahoVal().toLocaleString("ja-JP"); render(); });
  document.querySelectorAll('input[name="sp"]').forEach(function (r) { r.addEventListener("change", function () { S.sp = r.value; render(); }); });
  ["d16", "d19", "d23"].forEach(function (k) { $(k).addEventListener("input", function (e) { S[k] = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0)); render(); }); });

  fill(); render();
})();
