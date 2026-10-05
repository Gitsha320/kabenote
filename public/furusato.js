(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "kn-fs-2026";

  // ---------- 2026年（令和8年分所得税・令和9年度住民税）の計算 ----------
  // 給与所得控除（令和8・9年分の特例を含む）。所得税・住民税で同じ扱い
  function kyuyoShotoku(inc) {
    if (inc <= 740000) return 0;
    if (inc < 2191000) return inc - 740000; // 最低保障74万円（給与収入約220万円まで）
    var ded;
    if (inc <= 3600000) ded = inc * 0.3 + 80000;
    else if (inc <= 6600000) ded = inc * 0.2 + 440000;
    else if (inc <= 8500000) ded = inc * 0.1 + 1100000;
    else ded = 1950000;
    return Math.max(0, Math.floor(inc - ded));
  }
  function kisoIncomeTax(total) { // 所得税の基礎控除（令和8・9年分）
    if (total <= 4890000) return 1040000;
    if (total <= 6550000) return 670000;
    if (total <= 23500000) return 620000;
    return 0;
  }
  function taxRate(k) { // 所得税率（課税所得）
    if (k <= 0) return 0;
    if (k <= 1950000) return 0.05; if (k <= 3300000) return 0.10; if (k <= 6950000) return 0.20;
    if (k <= 9000000) return 0.23; if (k <= 18000000) return 0.33; if (k <= 40000000) return 0.40; return 0.45;
  }
  function compute(v) {
    var ks = kyuyoShotoku(v.income);
    var total = ks + Math.max(0, v.side);
    var shaho = v.shaho, ideco = v.ideco;
    var spouseOk = v.sp === "dep" && total <= 9000000;
    // 所得税
    var dedIT = kisoIncomeTax(total) + shaho + ideco + (spouseOk ? 380000 : 0) + v.d16 * 380000 + v.d19 * 630000 + v.d23 * 380000;
    var kIT = Math.max(0, Math.floor((total - dedIT) / 1000) * 1000);
    var rate = taxRate(kIT);
    // 住民税
    var dedRT = 430000 + shaho + ideco + (spouseOk ? 330000 : 0) + v.d16 * 330000 + v.d19 * 450000 + v.d23 * 330000;
    var kRT = Math.max(0, Math.floor((total - dedRT) / 1000) * 1000);
    var diff = 50000 + (spouseOk ? 50000 : 0) + v.d16 * 50000 + v.d19 * 180000 + v.d23 * 50000; // 人的控除額の差
    var adj = 0;
    if (kRT > 0 && total <= 25000000) {
      adj = kRT <= 2000000 ? Math.min(diff, kRT) * 0.05 : Math.max((diff - (kRT - 2000000)) * 0.05, 2500);
    }
    var shotokuwari = Math.max(0, Math.floor(kRT * 0.1 - adj));
    var limit = shotokuwari > 0 ? shotokuwari * 0.2 / (0.9 - rate * 1.021) + 2000 : 0;
    limit = Math.floor(limit / 1000) * 1000;
    return { ks: ks, total: total, kIT: kIT, rate: rate, kRT: kRT, adj: adj, shotokuwari: shotokuwari, limit: limit };
  }

  // ---------- state ----------
  var D = { income: 5000000, shaho: null, shahoAuto: true, sp: "none", d16: 0, d19: 0, d23: 0, ideco: 0, side: 0 };
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
    $("ideco").value = S.ideco ? S.ideco.toLocaleString("ja-JP") : "";
    $("side").value = S.side ? S.side.toLocaleString("ja-JP") : "";
  }
  function render() {
    if (S.shahoAuto) $("shaho").value = shahoVal().toLocaleString("ja-JP");
    var r = compute({ income: S.income, shaho: shahoVal(), sp: S.sp, d16: S.d16, d19: S.d19, d23: S.d23, ideco: S.ideco, side: S.side });
    $("limit").textContent = S.income ? (r.limit > 2000 ? "約 " + yen(r.limit) : "0円（住民税の所得割がかからないため）") : "—";
    $("safe").innerHTML = r.limit > 2000 ? "年収の見込みがずれても安心な目安：<b>" + yen(Math.floor(r.limit * 0.9 / 1000) * 1000) + "</b> くらいまで" : "";
    $("detail").innerHTML = [
      ["給与所得", yen(r.ks)], ["合計所得（副業を含む）", yen(r.total)],
      ["所得税の課税所得", yen(r.kIT)], ["所得税率", Math.round(r.rate * 100) + "%"],
      ["住民税の課税所得", yen(r.kRT)], ["調整控除", yen(r.adj)], ["住民税の所得割", yen(r.shotokuwari)],
      ["上限額の式", "所得割 × 20% ÷ (90% − " + Math.round(r.rate * 100) + "% × 1.021) ＋ 2,000円"]
    ].map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("");
    save();
  }

  // ---------- events ----------
  function money(id, key) {
    $(id).addEventListener("input", function (e) { S[key] = num(e.target.value); render(); });
    $(id).addEventListener("blur", function (e) { e.target.value = S[key] ? S[key].toLocaleString("ja-JP") : ""; });
  }
  money("income", "income"); money("ideco", "ideco"); money("side", "side");
  $("shaho").addEventListener("input", function (e) { if (!S.shahoAuto) { S.shaho = num(e.target.value); render(); } });
  $("shaho").addEventListener("blur", function (e) { e.target.value = shahoVal().toLocaleString("ja-JP"); });
  $("shahoAuto").addEventListener("change", function (e) { S.shahoAuto = e.target.checked; if (!S.shahoAuto && S.shaho == null) S.shaho = Math.round(S.income * 0.15); $("shaho").readOnly = S.shahoAuto; $("shaho").value = shahoVal().toLocaleString("ja-JP"); render(); });
  document.querySelectorAll('input[name="sp"]').forEach(function (r) { r.addEventListener("change", function () { S.sp = r.value; render(); }); });
  ["d16", "d19", "d23"].forEach(function (k) { $(k).addEventListener("input", function (e) { S[k] = Math.max(0, Math.min(9, parseInt(e.target.value, 10) || 0)); render(); }); });
  $("useSide").addEventListener("click", function () {
    var v = null;
    try {
      var f = JSON.parse(localStorage.getItem("kn-fk-2026"));
      if (f && f.months) {
        var n = 0, p = 0;
        f.months.forEach(function (m) { if (m.r != null || m.e != null) { n++; p += (m.r || 0) - (m.e || 0); } });
        if (n) v = Math.max(0, Math.round(f.proj === false ? p : p / n * 12));
      }
    } catch (e) {}
    if (v == null) { $("useSide").textContent = "副業トラッカーの記録が見つかりませんでした"; return; }
    S.side = v; $("side").value = v.toLocaleString("ja-JP"); render();
    $("useSide").textContent = "副業トラッカーの見込み（" + yen(v) + "）を入れました";
  });

  fill(); render();
})();
