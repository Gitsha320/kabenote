(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = "kn-2026";
  var YEAR = 2026;
  var NEAR = 100000; // 残り10万円未満で「もうすぐ」

  // ---------- 2026年（令和8年）の壁 ----------
  // basis: "tax" = 給料（交通費除く）、"shaho" = 給料＋交通費
  // rule: "le" = その金額以下ならOK（税）、"lt" = その金額未満ならOK（社会保険）
  var W = {
    jumin:   { amt: 1190000, basis: "tax", rule: "le", name: "住民税がかかり始める", sub: "本人の住民税。地域によっては約112万円から均等割がかかります" },
    shaho130:{ amt: 1300000, basis: "shaho", rule: "lt", name: "社会保険の扶養から外れる", sub: "自分で健康保険・年金に入ることに（交通費を含めて判定）" },
    shaho180:{ amt: 1800000, basis: "shaho", rule: "lt", name: "社会保険の扶養から外れる", sub: "60歳以上の基準（交通費を含めて判定）" },
    shaho150:{ amt: 1500000, basis: "shaho", rule: "lt", name: "親の社会保険の扶養から外れる", sub: "19〜22歳の基準（交通費を含めて判定）" },
    haigu:   { amt: 1360000, basis: "tax", rule: "le", name: "配偶者控除の対象外に", sub: "配偶者特別控除に切り替わり、169万円までは控除額は同じ" },
    haigutoku:{ amt: 1690000, basis: "tax", rule: "le", name: "配偶者特別控除が減り始める", sub: "配偶者の税金が増え始める。約207万円で控除が0に" },
    fuyo:    { amt: 1360000, basis: "tax", rule: "le", name: "親の扶養控除の対象外に", sub: "特定親族特別控除に切り替わり、159万円までは控除額は同じ" },
    tokutei: { amt: 1590000, basis: "tax", rule: "le", name: "親の控除が減り始める", sub: "親の税金が増え始める。197万円で控除が0に" },
    shotoku: { amt: 1780000, basis: "tax", rule: "le", name: "所得税がかかり始める", sub: "本人の所得税" }
  };
  function wallsFor(s) {
    if (s.role === "student") return ["jumin", "fuyo", "shaho150", "tokutei", "shotoku"];
    if (s.role === "spouse") return ["jumin", s.age60 ? null : "shaho130", "haigu", "haigutoku", "shotoku", s.age60 ? "shaho180" : null].filter(Boolean);
    return ["jumin", "shotoku"];
  }
  var DEFAULT_GOAL = { spouse: "shaho130", student: "fuyo", self: "jumin" };

  // ---------- state ----------
  function blankMonths() { var a = []; for (var i = 0; i < 12; i++) a.push({ p: null, c: null }); return a; }
  function sampleState() {
    var pay = [98000, 102000, 105000, 99000, 110000, 104000, 101000, 112000, 108000];
    var m = blankMonths();
    pay.forEach(function (v, i) { m[i] = { p: v, c: 6000 }; });
    return { v: 1, role: "spouse", age60: false, big: false, h20: false, proj: true, goal: null, months: m, sample: true };
  }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.months && s.months.length === 12) return s; } catch (e) {}
    return sampleState();
  }
  function save() { if (S.sample) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var S = load();

  // ---------- helpers ----------
  function yen(n) { return Math.round(n).toLocaleString("ja-JP") + "円"; }
  function man(n) { var v = n / 10000; return (Math.round(v * 10) / 10).toLocaleString("ja-JP") + "万円"; }
  function num(str) { var d = String(str || "").replace(/[^\d]/g, ""); return d ? Math.min(parseInt(d, 10), 99999999) : null; }

  // ---------- calculation ----------
  function calc() {
    var filled = 0, sumP = 0, sumC = 0;
    S.months.forEach(function (m) { if (m.p != null) { filled++; sumP += m.p; sumC += (m.c || 0); } });
    var u = 12 - filled;
    var avgP = filled ? sumP / filled : 0, avgC = filled ? sumC / filled : 0;
    var proj = S.proj && filled > 0;
    return {
      filled: filled, u: u, avgP: avgP, avgC: avgC, proj: proj,
      actual: { tax: sumP, shaho: sumP + sumC },
      total: { tax: sumP + (proj ? avgP * u : 0), shaho: sumP + sumC + (proj ? (avgP + avgC) * u : 0) }
    };
  }
  function status(w, total) {
    var over = w.rule === "le" ? total > w.amt : total >= w.amt;
    var room = w.rule === "le" ? w.amt - total : w.amt - 1 - total;
    return { over: over, room: room, cls: over ? "over" : room < NEAR ? "near" : "ok" };
  }
  function shahoSelf() { return S.big && S.h20 && S.role !== "student"; }

  // ---------- render ----------
  function render() {
    var c = calc();
    document.querySelectorAll('input[name="role"]').forEach(function (r) { r.checked = r.value === S.role; });
    $("age60").checked = !!S.age60; $("big").checked = !!S.big; $("h20").checked = !!S.h20; $("proj").checked = !!S.proj;
    $("age60wrap").hidden = S.role !== "spouse";
    $("sampleBadge").hidden = !S.sample;

    // notice about social insurance from Oct 2026
    var n = $("shahoNotice");
    if (S.big && S.h20) {
      n.hidden = false;
      n.innerHTML = S.role === "student"
        ? "<b>学生は対象外です。</b>2026年10月からの「週20時間以上なら社会保険に加入」のルールは、昼間の学生には原則として適用されません。"
        : "<b>2026年10月から、勤務先の社会保険に加入する対象です。</b>従業員51人以上の勤務先で週20時間以上働く人は、収入にかかわらず加入します（いわゆる106万円の壁の撤廃）。加入すると、130万円の壁は関係なくなります。";
    } else n.hidden = true;
    renderSummary(c);
    renderRows(c);
  }

  function renderSummary(c) {
    $("taxTotal").textContent = yen(c.total.tax);
    $("shahoTotal").textContent = yen(c.total.shaho);
    $("basis").textContent = c.filled === 0 ? "下の表に給料を入れると計算します。"
      : "入力済み" + c.filled + "か月の合計 " + yen(c.actual.tax) + (c.proj && c.u ? "＋ 残り" + c.u + "か月を月平均 " + yen(c.avgP) + " で予測" : c.u ? "（残り" + c.u + "か月は未入力のため0円で計算）" : "（12か月分すべて入力済み）");

    var ids = wallsFor(S);
    renderScale(c, ids);
    $("walls").innerHTML = ids.map(function (id) {
      var w = W[id], t = c.total[w.basis], st = status(w, t);
      var self = w.basis === "shaho" && shahoSelf();
      var pill = self ? '<span class="pill near">10月から自分で加入</span>'
        : st.over ? '<span class="pill over">' + yen(w.rule === "le" ? t - w.amt : t - w.amt + 1) + ' オーバー</span>'
        : '<span class="pill ' + st.cls + '">あと ' + yen(st.room) + '</span>';
      return '<li class="wallrow ' + (self ? "near" : st.cls) + '"><span class="amt">' + man(w.amt) + '</span><span class="what">' + w.name + '<small>' + w.sub + '</small></span>' + pill + '</li>';
    }).join("");

    // goal
    if (!S.goal || ids.indexOf(S.goal) < 0) S.goal = DEFAULT_GOAL[S.role];
    $("goal").innerHTML = ids.map(function (id) { var w = W[id]; return '<option value="' + id + '"' + (id === S.goal ? " selected" : "") + '>' + man(w.amt) + '：' + w.name + '</option>'; }).join("");
    $("answer").innerHTML = answer(c, W[S.goal]);
  }
  function updatePlaceholders(c) {
    S.months.forEach(function (m, i) {
      var p = $("p" + i), q = $("c" + i); if (!p || !q) return;
      var est = c.proj && m.p == null;
      p.placeholder = est ? "予測 " + Math.round(c.avgP).toLocaleString("ja-JP") : "0";
      q.placeholder = est ? "予測 " + Math.round(c.avgC).toLocaleString("ja-JP") : "0";
      p.classList.toggle("est", est);
    });
  }

  function answer(c, w) {
    var limit = w.rule === "le" ? w.amt : w.amt - 1;
    var used = c.actual[w.basis];
    var note = w.basis === "shaho" ? '<br><small>社会保険の扶養は、2026年4月から雇用契約書などに書かれた賃金で年収を見込んで判定します。この計算は実際の給料からの目安です。</small>' : "";
    if (c.filled === 0) return "下の表に、今年もらった給料を入れてください。";
    if (c.u === 0) {
      return used > limit || (w.rule === "lt" && used >= w.amt)
        ? "12か月分の合計は " + yen(used) + " で、この壁を超えています。" + note
        : "12か月分の合計は " + yen(used) + " で、この壁は超えていません。" + note;
    }
    var left = limit - used;
    if (left < 0) return "入力済みの分だけで、すでに " + yen(-left) + " 超えています。" + note;
    var per = Math.floor(left / c.u);
    var months = S.months.map(function (m, i) { return m.p == null ? (i + 1) + "月" : null; }).filter(Boolean);
    var span = months.length > 3 ? months[0] + "〜" + months[months.length - 1] + "などの" : months.join("・") + "の";
    if (w.basis === "shaho") {
      var payOnly = Math.max(0, Math.floor(per - c.avgC));
      return "まだ入力していない" + span + c.u + "か月で、給料を<br>月 <span class=\"num\">" + yen(payOnly) + "</span> 以内にすれば超えません。<br><small>交通費（月平均 " + yen(c.avgC) + "）を含めると月 " + yen(per) + " 以内です。</small>" + note;
    }
    return "まだ入力していない" + span + c.u + "か月で、給料を<br>月 <span class=\"num\">" + yen(per) + "</span> 以内にすれば超えません。";
  }

  function renderScale(c, ids) {
    var lo = 500000, hi = 2100000;
    var pos = function (v) { return Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)); };
    var t = c.total.tax, a = c.actual.tax;
    var html = '<div class="axis"></div><div class="fill proj" style="width:' + pos(t) + '%"></div><div class="fill" style="width:' + pos(a) + '%"></div>';
    var sorted = ids.slice().sort(function (x, y) { return W[x].amt - W[y].amt; });
    sorted.forEach(function (id, i) {
      var w = W[id], st = status(w, c.total[w.basis]);
      html += '<div class="wall' + (st.over ? " over" : "") + '" style="left:' + pos(w.amt) + '%"></div>';
      html += '<div class="wl ' + (i % 2 ? "b" : "t") + '" style="left:' + pos(w.amt) + '%">' + Math.round(w.amt / 10000) + '</div>';
    });
    html += '<div class="me" style="left:' + pos(t) + '%" title="年収見込み"></div>';
    $("scale").innerHTML = html;
  }

  function renderRows(c) {
    var now = new Date(), curM = now.getFullYear() === YEAR ? now.getMonth() : (now.getFullYear() > YEAR ? 12 : -1);
    $("rows").innerHTML = S.months.map(function (m, i) {
      var future = i > curM;
      var estP = c.proj && m.p == null ? "予測 " + Math.round(c.avgP).toLocaleString("ja-JP") : "0";
      var estC = c.proj && m.p == null ? "予測 " + Math.round(c.avgC).toLocaleString("ja-JP") : "0";
      return '<tr class="' + (future ? "future" : "") + '"><td class="m">' + (i + 1) + '月<small>' + (future ? "これから" : "支給") + '</small></td>' +
        '<td><label class="yen"><input type="text" inputmode="numeric" id="p' + i + '" data-i="' + i + '" data-k="p" value="' + (m.p != null ? m.p.toLocaleString("ja-JP") : "") + '" placeholder="' + estP + '" class="' + (m.p == null && c.proj ? "est" : "") + '" aria-label="' + (i + 1) + '月の給料（円）">円</label></td>' +
        '<td><label class="yen"><input type="text" inputmode="numeric" id="c' + i + '" data-i="' + i + '" data-k="c" value="' + (m.c != null ? m.c.toLocaleString("ja-JP") : "") + '" placeholder="' + estC + '" aria-label="' + (i + 1) + '月の交通費（円）">円</label></td></tr>';
    }).join("");
  }

  // ---------- events ----------
  function leaveSample() {
    if (!S.sample) return;
    var keep = { role: S.role, age60: S.age60, big: S.big, h20: S.h20, proj: S.proj, goal: S.goal };
    S = { v: 1, months: blankMonths(), sample: false };
    Object.keys(keep).forEach(function (k) { S[k] = keep[k]; });
  }
  $("rows").addEventListener("focusin", function (e) {
    var el = e.target; if (!el.dataset || el.dataset.i == null || !S.sample) return;
    leaveSample(); save(); render();
    var again = $(el.id); if (again) again.focus();
  });
  $("rows").addEventListener("input", function (e) {
    var el = e.target; if (el.dataset.i == null) return;
    var i = +el.dataset.i, k = el.dataset.k, v = num(el.value);
    S.months[i][k] = v;
    if (k === "c" && v != null && S.months[i].p == null) { /* 交通費だけでは月として数えない */ }
    save();
    var c = calc(); renderSummary(c); updatePlaceholders(c);
  });
  $("rows").addEventListener("focusout", function (e) {
    var el = e.target; if (el.dataset.i == null) return;
    var v = S.months[+el.dataset.i][el.dataset.k];
    el.value = v != null ? v.toLocaleString("ja-JP") : "";
  });
  document.querySelectorAll('input[name="role"]').forEach(function (r) {
    r.addEventListener("change", function () { S.role = r.value; S.goal = null; save(); render(); });
  });
  ["age60", "big", "h20", "proj"].forEach(function (k) { $(k).addEventListener("change", function (e) { S[k] = e.target.checked; save(); render(); }); });
  $("goal").addEventListener("change", function (e) { S.goal = e.target.value; save(); render(); });

  function flash(m) { var el = $("msg"); el.textContent = m; el.hidden = false; clearTimeout(flash.t); flash.t = setTimeout(function () { el.hidden = true; }, 4000); }
  $("clearAll").addEventListener("click", function () {
    var keep = { role: S.role, age60: S.age60, big: S.big, h20: S.h20, proj: S.proj };
    S = { v: 1, months: blankMonths(), sample: false, goal: null };
    Object.keys(keep).forEach(function (k) { S[k] = keep[k]; });
    save(); render(); flash("表を空にしました。1月から順に入力してください。");
    $("p0").focus();
  });
  $("exportBtn").addEventListener("click", function () {
    if (S.sample) { flash("自分の数字を入れてから保存してください。"); return; }
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "kabenote-" + YEAR + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    flash("バックアップファイルを保存しました。");
  });
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !d.months || d.months.length !== 12) throw new Error("bad");
        d.months = d.months.map(function (m) { return { p: m && m.p != null ? num(m.p) : null, c: m && m.c != null ? num(m.c) : null }; });
        d.sample = false; S = d; save(); render(); flash("バックアップを読み込みました。");
      } catch (err) { flash("このファイルは読み込めませんでした。かべノートで保存したファイルを選んでください。"); }
    };
    r.readAsText(f); e.target.value = "";
  });

  render();
})();
