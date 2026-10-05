(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "kn-fk-2026", LIMIT = 200000, NEAR = 30000;

  function blank() { var a = []; for (var i = 0; i < 12; i++) a.push({ r: null, e: null, s: null }); return a; }
  function sample() {
    var r = [20000, 0, 30000, 15000, 0, 25000, 20000, 0, 30000], e = [2000, 1000, 3000, 1500, 1000, 2500, 2000, 1000, 3000];
    var m = blank(); r.forEach(function (v, i) { m[i] = { r: v, e: e[i], s: null }; });
    return { v: 1, hasSalary: false, filing: false, proj: true, months: m, sample: true };
  }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.months && s.months.length === 12) return s; } catch (e) {} return sample(); }
  function save() { if (S.sample) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var S = load();

  function yen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function num(str) { var d = String(str == null ? "" : str).replace(/[^\d]/g, ""); return d ? Math.min(parseInt(d, 10), 99999999) : null; }
  function filled(m) { return m.r != null || m.e != null || (S.hasSalary && m.s != null); }

  function calc() {
    var n = 0, sumP = 0, sumS = 0;
    S.months.forEach(function (m) { if (filled(m)) { n++; sumP += (m.r || 0) - (m.e || 0); sumS += S.hasSalary ? (m.s || 0) : 0; } });
    var u = 12 - n, avgP = n ? sumP / n : 0, avgS = n ? sumS / n : 0, proj = S.proj && n > 0;
    var actual = Math.max(0, sumP) + sumS;
    var totP = sumP + (proj ? avgP * u : 0), totS = sumS + (proj ? avgS * u : 0);
    return { n: n, u: u, avgP: avgP, avgS: avgS, proj: proj, sumP: sumP, sumS: sumS, actual: actual, total: Math.max(0, totP) + totS };
  }

  function render() {
    var c = calc();
    $("hasSalary").checked = !!S.hasSalary; $("filing").checked = !!S.filing; $("proj").checked = !!S.proj;
    $("sampleBadge").hidden = !S.sample;
    $("tbl").classList.toggle("nosal", !S.hasSalary);
    summary(c); rows(c);
  }

  function summary(c) {
    $("judged").textContent = yen(c.total);
    $("basis").textContent = c.n === 0 ? "下の表に副業の報酬と経費を入れると計算します。"
      : "入力済み" + c.n + "か月の合計 " + yen(c.actual) + (c.proj && c.u ? "＋ 残り" + c.u + "か月を月平均で予測" : c.u ? "（残り" + c.u + "か月は未入力のため0円で計算）" : "（12か月分すべて入力済み）");
    scale(c);
    var over = c.total > LIMIT, room = LIMIT - c.total;
    var cls = over ? "over" : room < NEAR ? "near" : "ok";
    var head = over ? "確定申告が必要になる見込みです" : "確定申告は不要の見込みです";
    var sub = over ? "副業の所得が20万円を " + yen(c.total - LIMIT) + " 超える見込みです。2027年2月16日〜3月15日に確定申告をします。"
      : "20万円まで、あと " + yen(room) + " です。";
    var notes = [];
    if (!over && c.total > 0) notes.push("確定申告が不要でも、<b>住民税の申告</b>はお住まいの市区町村に必要です。");
    if (S.filing && !over) notes.push("医療費控除などで<b>確定申告をする場合は</b>、20万円以下でも副業の所得をすべて含めて申告します。");
    $("verdict").className = "verdict " + cls;
    $("verdict").innerHTML = '<p class="vh">' + head + '</p><p class="vs">' + sub + '</p>' + (notes.length ? '<ul>' + notes.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" : "");
    $("answer").innerHTML = answer(c);
  }

  function answer(c) {
    if (c.n === 0) return "下の表に、今年の副業の報酬と経費を入れてください。";
    if (c.u === 0) return "12か月分の合計は " + yen(c.actual) + " です。" + (c.actual > LIMIT ? "20万円を超えているので、確定申告が必要です。" : "20万円以下です。");
    var left = LIMIT - c.actual;
    if (left < 0) return "入力済みの分だけで、すでに " + yen(-left) + " 超えています。確定申告の準備を始めましょう。";
    var per = Math.floor(left / c.u);
    var ms = S.months.map(function (m, i) { return filled(m) ? null : (i + 1) + "月"; }).filter(Boolean);
    var span = ms.length > 3 ? ms[0] + "〜" + ms[ms.length - 1] + "などの" : ms.join("・") + "の";
    return "まだ入力していない" + span + c.u + "か月で、<br>" + (S.hasSalary ? "利益（報酬−経費）と副業の給料の合計" : "利益（報酬−経費）") + "を月 <span class=\"num\">" + yen(per) + "</span> 以内にすれば、20万円を超えません。";
  }

  function scale(c) {
    var hi = 300000, pos = function (v) { return Math.max(0, Math.min(100, v / hi * 100)); };
    var html = '<div class="axis"></div><div class="fill proj" style="width:' + pos(c.total) + '%"></div><div class="fill" style="width:' + pos(c.actual) + '%"></div>';
    [[100000, "10万"], [200000, "20万"]].forEach(function (w, i) {
      var main = w[0] === LIMIT;
      html += '<div class="wall' + (main && c.total > LIMIT ? " over" : "") + '" style="left:' + pos(w[0]) + '%;' + (main ? "" : "opacity:.35;") + '"></div><div class="wl t" style="left:' + pos(w[0]) + '%">' + w[1] + '</div>';
    });
    html += '<div class="wl b" style="left:0%;transform:none">0</div><div class="wl b" style="left:100%;transform:translateX(-100%)">30万</div>';
    html += '<div class="me" style="left:' + pos(c.total) + '%"></div>';
    $("scale").innerHTML = html;
  }

  function rows(c) {
    var est = function (v) { return c.proj ? "予測 " + Math.round(v).toLocaleString("ja-JP") : "0"; };
    $("rows").innerHTML = S.months.map(function (m, i) {
      var empty = !filled(m);
      var cell = function (k, ph) {
        return '<td' + (k === "s" ? ' class="sal"' : "") + '><label class="yen"><input type="text" inputmode="numeric" id="' + k + i + '" data-i="' + i + '" data-k="' + k + '" value="' + (m[k] != null ? m[k].toLocaleString("ja-JP") : "") + '" placeholder="' + (empty ? ph : "0") + '" class="' + (empty && c.proj ? "est" : "") + '" aria-label="' + (i + 1) + "月の" + ({ r: "報酬・売上", e: "経費", s: "副業の給料" })[k] + '（円）">円</label></td>';
      };
      return '<tr><td class="m">' + (i + 1) + '月</td>' + cell("r", est(Math.max(0, c.avgP))) + cell("e", "0") + cell("s", est(c.avgS)) + '</tr>';
    }).join("");
  }

  function leaveSample() {
    if (!S.sample) return;
    S = { v: 1, hasSalary: S.hasSalary, filing: S.filing, proj: S.proj, months: blank(), sample: false };
  }
  $("rows").addEventListener("focusin", function (e) {
    var el = e.target; if (el.dataset.i == null || !S.sample) return;
    leaveSample(); save(); render(); var x = $(el.id); if (x) x.focus();
  });
  $("rows").addEventListener("input", function (e) {
    var el = e.target; if (el.dataset.i == null) return;
    S.months[+el.dataset.i][el.dataset.k] = num(el.value); save(); summary(calc());
  });
  $("rows").addEventListener("focusout", function (e) {
    var el = e.target; if (el.dataset.i == null) return;
    var v = S.months[+el.dataset.i][el.dataset.k]; el.value = v != null ? v.toLocaleString("ja-JP") : "";
    var c = calc();
    S.months.forEach(function (m, i) {
      var empty = !filled(m);
      ["r", "e", "s"].forEach(function (k) {
        var x = $(k + i); if (!x) return;
        x.placeholder = !empty ? "0" : k === "r" ? (c.proj ? "予測 " + Math.round(Math.max(0, c.avgP)).toLocaleString("ja-JP") : "0") : k === "s" ? (c.proj ? "予測 " + Math.round(c.avgS).toLocaleString("ja-JP") : "0") : "0";
        x.classList.toggle("est", empty && c.proj);
      });
    });
  });
  ["hasSalary", "filing", "proj"].forEach(function (k) { $(k).addEventListener("change", function (e) { S[k] = e.target.checked; save(); render(); }); });

  function flash(m) { var el = $("msg"); el.textContent = m; el.hidden = false; clearTimeout(flash.t); flash.t = setTimeout(function () { el.hidden = true; }, 4000); }
  $("clearAll").addEventListener("click", function () {
    S = { v: 1, hasSalary: S.hasSalary, filing: S.filing, proj: S.proj, months: blank(), sample: false };
    save(); render(); flash("表を空にしました。1月から順に入力してください。"); $("r0").focus();
  });
  $("exportBtn").addEventListener("click", function () {
    if (S.sample) { flash("自分の数字を入れてから保存してください。"); return; }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
    a.download = "kabenote-fukugyo-2026.json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); flash("バックアップファイルを保存しました。");
  });
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var d = JSON.parse(rd.result); if (!d || !d.months || d.months.length !== 12 || !("r" in d.months[0])) throw 0;
        d.months = d.months.map(function (m) { return { r: num(m.r), e: num(m.e), s: num(m.s) }; });
        d.sample = false; S = d; save(); render(); flash("バックアップを読み込みました。");
      } catch (err) { flash("このファイルは読み込めませんでした。副業20万円トラッカーで保存したファイルを選んでください。"); }
    };
    rd.readAsText(f); e.target.value = "";
  });

  render();
})();
