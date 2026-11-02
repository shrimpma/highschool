/* 人教版高一物理必修第一册 · 互动图解
   平面矢量、运动图像用 SVG 即可，不加载 Three.js。 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var INK = "#1c2430";
  var MUTED = "#5c6b7a";
  var ACCENT = "#15468a";
  var TEAL = "#0b7a66";
  var AMBER = "#9a5b00";
  var ROSE = "#8f1d3a";
  var GRID = "#e6edf4";
  var FONT = "PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var loops = [];
  var uid = 0;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] != null) n.setAttribute(k, String(attrs[k]));
      });
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function text(parent, x, y, str, o) {
    o = o || {};
    var t = el("text", {
      x: x, y: y,
      fill: o.fill || INK,
      "font-size": o.size || 14,
      "font-family": FONT,
      "text-anchor": o.anchor || "start",
      "font-weight": o.bold ? 700 : 400
    }, parent);
    t.textContent = str;
    return t;
  }

  function num(v, digits) {
    var d = digits == null ? 2 : digits;
    var n = Math.round(Number(v) * Math.pow(10, d)) / Math.pow(10, d);
    if (!isFinite(n) || n === 0) return "0";
    return String(n);
  }

  function prepare(svg) {
    uid += 1;
    var id = "vz" + uid;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var defs = el("defs", null, svg);
    [["A", ACCENT], ["T", TEAL], ["R", ROSE], ["M", AMBER]].forEach(function (pair) {
      var m = el("marker", {
        id: id + pair[0],
        viewBox: "0 0 10 10",
        refX: "9", refY: "5",
        markerWidth: "7", markerHeight: "7",
        orient: "auto"
      }, defs);
      el("path", { d: "M0 1.2 L10 5 L0 8.8 Z", fill: pair[1] }, m);
    });
    svg._mid = id;
    return svg;
  }

  function marker(svg, key) {
    return "url(#" + svg._mid + key + ")";
  }

  function line(svg, x1, y1, x2, y2, color, width, dash, mk) {
    var attrs = {
      x1: x1, y1: y1, x2: x2, y2: y2,
      stroke: color || INK,
      "stroke-width": width || 2,
      "stroke-linecap": "round"
    };
    if (dash) attrs["stroke-dasharray"] = dash;
    if (mk) attrs["marker-end"] = marker(svg, mk);
    return el("line", attrs, svg);
  }

  function arrow(svg, x1, y1, x2, y2, color, mk) {
    if (Math.hypot(x2 - x1, y2 - y1) < 3) return null;
    return line(svg, x1, y1, x2, y2, color, 2.4, null, mk || "A");
  }

  function rect(svg, x, y, w, h, o) {
    o = o || {};
    return el("rect", {
      x: x, y: y, width: w, height: h, rx: o.rx == null ? 4 : o.rx,
      fill: o.fill || "#fff",
      stroke: o.stroke || ACCENT,
      "stroke-width": o.sw || 1.6
    }, svg);
  }

  function button(parent, label, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    parent.appendChild(b);
    return b;
  }

  function seg(parent, options, value, onChange) {
    var wrap = document.createElement("div");
    wrap.className = "viz-seg";
    var buttons = options.map(function (opt) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "seg";
      b.textContent = opt.label;
      b.setAttribute("aria-pressed", String(opt.value === value));
      b.addEventListener("click", function () {
        buttons.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        onChange(opt.value, b);
      });
      wrap.appendChild(b);
      return b;
    });
    parent.appendChild(wrap);
    return wrap;
  }

  function slider(parent, label, min, max, step, value, format, onInput) {
    var lab = document.createElement("label");
    var span = document.createElement("span");
    span.textContent = label;
    var input = document.createElement("input");
    input.type = "range";
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    input.setAttribute("aria-label", label);
    var output = document.createElement("output");
    function sync(fromUser) {
      var v = parseFloat(input.value);
      output.textContent = format(v);
      if (fromUser) onInput(v);
    }
    input.addEventListener("input", function () { sync(true); });
    lab.appendChild(span);
    lab.appendChild(input);
    lab.appendChild(output);
    parent.appendChild(lab);
    sync(false);
    output.textContent = format(parseFloat(input.value));
    return {
      input: input,
      set: function (v) {
        input.value = v;
        output.textContent = format(parseFloat(input.value));
      }
    };
  }

  function watch(step) {
    loops.push(step);
  }

  function mapRange(v, a0, a1, b0, b1) {
    return b0 + (v - a0) / (a1 - a0) * (b1 - b0);
  }

  function axes(svg, box, x0, x1, y0, y1, xName, yName) {
    function X(v) { return box.x + (v - x0) / (x1 - x0) * box.w; }
    function Y(v) { return box.y + box.h - (v - y0) / (y1 - y0) * box.h; }
    var gx;
    for (gx = Math.ceil(x0); gx <= x1; gx += 1) {
      line(svg, X(gx), box.y, X(gx), box.y + box.h, GRID, 1);
    }
    var gy;
    var yStep = (y1 - y0) > 16 ? 5 : 1;
    for (gy = Math.ceil(y0 / yStep) * yStep; gy <= y1; gy += yStep) {
      line(svg, box.x, Y(gy), box.x + box.w, Y(gy), GRID, 1);
    }
    var yAxis = (0 >= x0 && 0 <= x1) ? X(0) : box.x;
    var xAxis = (0 >= y0 && 0 <= y1) ? Y(0) : box.y + box.h;
    line(svg, box.x, xAxis, box.x + box.w, xAxis, "#8aa0b5", 1.4);
    line(svg, yAxis, box.y, yAxis, box.y + box.h, "#8aa0b5", 1.4);
    text(svg, box.x + box.w - 2, xAxis - 6, xName, { size: 12, fill: MUTED, anchor: "end" });
    text(svg, yAxis + 6, box.y + 12, yName, { size: 12, fill: MUTED });
    return { X: X, Y: Y, xAxis: xAxis };
  }

  /* ---------- 1 参考系 ---------- */
  function vizFrame(ctx) {
    var s = { t: 0, vB: 8, frame: "ground", playing: false };
    var vA = 8;
    var btn = button(ctx.ui, "播放", function () {
      s.playing = !s.playing;
      btn.textContent = s.playing ? "暂停" : "播放";
    });
    seg(ctx.ui, [
      { label: "同速，乙车看起来不动", value: 8 },
      { label: "乙车更快", value: 12 },
      { label: "乙车更慢", value: 4 }
    ], 8, function (v) {
      s.vB = v;
      speed.set(v);
      draw();
    });
    var speed = slider(ctx.ui, "乙车对地速度", 0, 16, 0.5, 8, function (v) {
      return num(v, 1) + " m/s";
    }, function (v) {
      s.vB = v;
      var presets = ctx.ui.querySelectorAll(".viz-seg")[0].querySelectorAll("button");
      Array.prototype.forEach.call(presets, function (b) {
        var hit = (b.textContent.indexOf("同速") === 0 && v === 8) ||
          (b.textContent.indexOf("乙车更快") === 0 && v === 12) ||
          (b.textContent.indexOf("乙车更慢") === 0 && v === 4);
        b.setAttribute("aria-pressed", hit ? "true" : "false");
      });
      draw();
    });
    seg(ctx.ui, [
      { label: "以地面为参考系", value: "ground" },
      { label: "以甲车为参考系", value: "train" }
    ], "ground", function (v) {
      s.frame = v;
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var period = 4;
      var t = s.t % period;
      var xA = vA * t;
      var xB = s.vB * t;
      var px = 12;
      function SX(world) {
        if (s.frame === "ground") return 48 + world * px;
        return 210 + (world - xA) * px;
      }

      rect(svg, 0, 118, 640, 36, { fill: "#e7eef6", stroke: "none", rx: 0 });
      var origin = s.frame === "ground" ? 0 : xA;
      var mark;
      for (mark = Math.floor(origin / 2) * 2 - 16; mark <= origin + 36; mark += 2) {
        var mx = SX(mark);
        if (mx < 10 || mx > 630) continue;
        line(svg, mx, 118, mx, 132, ACCENT, 2);
        text(svg, mx, 148, String(mark), { size: 11, fill: MUTED, anchor: "middle" });
      }
      text(svg, 16, 28, s.frame === "ground" ? "参考系：地面" : "参考系：甲车", { bold: true, fill: ACCENT, size: 16 });

      function train(x, color, name, vy) {
        var sx = SX(x);
        if (sx < -80 || sx > 700) return;
        rect(svg, sx, 62, 92, 40, { fill: color, stroke: "none", rx: 6 });
        rect(svg, sx + 10, 70, 16, 12, { fill: "#d9e8f8", stroke: "none", rx: 2 });
        rect(svg, sx + 32, 70, 16, 12, { fill: "#d9e8f8", stroke: "none", rx: 2 });
        el("circle", { cx: sx + 22, cy: 106, r: 6, fill: "#243140" }, svg);
        el("circle", { cx: sx + 70, cy: 106, r: 6, fill: "#243140" }, svg);
        text(svg, sx + 46, 86, name, { fill: "#fff", anchor: "middle", bold: true, size: 14 });
        text(svg, sx + 46, 54, num(vy, 1) + " m/s", { anchor: "middle", size: 12, fill: INK });
      }
      train(xA, ACCENT, "甲", s.frame === "ground" ? vA : 0);
      train(xB + 9, TEAL, "乙", s.frame === "ground" ? s.vB : s.vB - vA);

      var rel = s.vB - vA;
      ctx.read.innerHTML = "甲车对地 <b>" + vA + " m/s</b>，乙车对地 <b>" + num(s.vB, 1) +
        " m/s</b>。以甲车为参考系，乙车的速度是 <b>" + num(rel, 1) +
        " m/s</b>（v乙 − v甲）。同速时相对速度为 0，所以乘客觉得旁边那列车没动；换到地面看，两车都在走。";
    }

    watch(function (dt) {
      if (!s.playing) return;
      s.t += dt;
      draw();
    });
    draw();
  }

  /* ---------- 2 位移与路程 ---------- */
  function vizDisp(ctx) {
    var s = { t: 3.2, playing: false };
    var btn = button(ctx.ui, "重播", function () {
      if (s.t >= 3.2) s.t = 0;
      s.playing = !s.playing;
      btn.textContent = s.playing ? "暂停" : "重播";
      draw();
    });

    function position(t) {
      if (t < 1.6) return mapRange(t, 0, 1.6, 0, 6);
      if (t < 2) return 6;
      if (t < 3.2) return mapRange(t, 2, 3.2, 6, 2);
      return 2;
    }

    function draw() {
      var svg = prepare(ctx.svg);
      var x = position(s.t);
      var path = x <= 6 && s.t < 2 ? x : 6 + (6 - x);
      if (s.t < 1.6) path = x;
      function X(m) { return 48 + m * 68; }

      line(svg, 36, 78, 600, 78, "#8aa0b5", 1.6);
      [0, 2, 4, 6, 8].forEach(function (m) {
        line(svg, X(m), 72, X(m), 84, "#8aa0b5", 1.5);
        text(svg, X(m), 100, m + " m", { anchor: "middle", size: 12, fill: MUTED });
      });
      text(svg, X(0), 58, "O", { anchor: "middle", bold: true });
      text(svg, X(6), 58, "A", { anchor: "middle", bold: true, fill: AMBER });
      text(svg, X(2), 116, "B", { anchor: "middle", bold: true, fill: TEAL });

      if (path > 0.05) {
        line(svg, X(0), 78, X(Math.min(path, 6)), 78, AMBER, 6);
        if (path > 6) line(svg, X(6), 86, X(x), 86, AMBER, 6);
      }
      if (Math.abs(x) > 0.05) arrow(svg, X(0), 132, X(x), 132, ACCENT, "A");
      text(svg, 48, 154, "琥珀色是轨迹（路程），蓝色箭头是位移", { size: 12, fill: MUTED });

      el("circle", { cx: X(x), cy: 78, r: 7, fill: ROSE, stroke: "#fff", "stroke-width": 2 }, svg);

      line(svg, 48, 196, 560, 196, "#8aa0b5", 1.4);
      for (var sec = 0; sec <= 5; sec++) {
        var tx = 48 + sec * 90;
        line(svg, tx, 190, tx, 202, "#8aa0b5", 1.4);
        text(svg, tx, 218, sec + "s", { anchor: "middle", size: 12, fill: MUTED });
      }
      line(svg, 48 + 2 * 90, 186, 48 + 3 * 90, 186, TEAL, 6);
      text(svg, 48 + 2.5 * 90, 178, "第3s内（时间间隔）", { anchor: "middle", size: 12, fill: TEAL });
      el("circle", { cx: 48 + 3 * 90, cy: 196, r: 5, fill: ROSE }, svg);
      text(svg, 48 + 3 * 90, 236, "第3s末（时刻）", { anchor: "middle", size: 12, fill: ROSE });

      ctx.read.innerHTML = "现在位置 <b>" + num(x, 2) + " m</b>。路程 <b>" + num(path, 2) +
        " m</b>（轨迹长度，恒为正）。位移 <b>" + num(x, 2) +
        " m</b>（末位置减初位置，方向沿正方向）。走到终点时路程 10 m，位移 +2 m。";
    }

    watch(function (dt) {
      if (!s.playing) return;
      s.t += dt;
      if (s.t >= 3.2) {
        s.t = 3.2;
        s.playing = false;
        btn.textContent = "重播";
      }
      draw();
    });
    draw();
  }

  /* ---------- 3 x-t ---------- */
  function vizXt(ctx) {
    var s = { t: 2 };
    slider(ctx.ui, "时刻 t", 0, 4, 0.1, 2, function (v) { return num(v, 1) + " s"; }, function (v) {
      s.t = v;
      draw();
    });

    function xOf(t) { return t <= 2 ? 2 * t : 4; }
    function vOf(t) { return t < 2 ? 2 : 0; }

    function draw() {
      var svg = prepare(ctx.svg);
      var box = { x: 54, y: 18, w: 520, h: 168 };
      var ax = axes(svg, box, 0, 4.6, 0, 5.2, "t/s", "x/m");
      var pts = [[0, 0], [2, 4], [4, 4]];
      var d = pts.map(function (p, i) {
        return (i ? "L" : "M") + ax.X(p[0]) + " " + ax.Y(p[1]);
      }).join(" ");
      el("path", { d: d, fill: "none", stroke: ACCENT, "stroke-width": 2.6 }, svg);
      var x = xOf(s.t);
      var v = vOf(s.t);
      if (s.t > 0.05) {
        line(svg, ax.X(0), ax.Y(0), ax.X(s.t), ax.Y(x), AMBER, 1.6, "5 4");
      }
      el("circle", { cx: ax.X(s.t), cy: ax.Y(x), r: 5.5, fill: ROSE, stroke: "#fff", "stroke-width": 2 }, svg);
      text(svg, 54, 206, "蓝线斜率 = 瞬时速度；琥珀虚线是从起点到该时刻的割线，斜率 = 平均速度", { size: 12, fill: MUTED });
      var avg = s.t < 0.05 ? "" : "0 到该时刻的平均速度 = 位移/时间 = <b>" + num(x / s.t, 2) + " m/s</b>。";
      ctx.read.innerHTML = "t = <b>" + num(s.t, 1) + " s</b> 时，x = <b>" + num(x, 2) +
        " m</b>，瞬时速度 <b>" + num(v, 1) + " m/s</b>（0～2 s 为 2 m/s，之后为 0）。" +
        avg + " t = 4 s 时平均速度是 1 m/s。";
    }
    draw();
  }

  /* ---------- 4 加速度 ---------- */
  function vizAcc(ctx) {
    var s = { v0: 2, a: 2 };
    slider(ctx.ui, "初速度 v₀（向右为正）", -8, 12, 0.5, 2, function (v) { return num(v, 1) + " m/s"; }, function (v) {
      s.v0 = v; draw();
    });
    slider(ctx.ui, "加速度 a", -4, 4, 0.5, 2, function (v) { return num(v, 1) + " m/s²"; }, function (v) {
      s.a = v; draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var v1 = s.v0 + 4 * s.a;
      var y0 = Math.min(-2, s.v0, v1) - 2;
      var y1 = Math.max(2, s.v0, v1) + 2;
      var box = { x: 54, y: 16, w: 400, h: 150 };
      var ax = axes(svg, box, 0, 4.4, y0, y1, "t/s", "v/(m/s)");
      line(svg, ax.X(0), ax.Y(s.v0), ax.X(4), ax.Y(v1), ACCENT, 2.6);
      el("circle", { cx: ax.X(0), cy: ax.Y(s.v0), r: 4, fill: TEAL }, svg);
      el("circle", { cx: ax.X(4), cy: ax.Y(v1), r: 4, fill: ROSE }, svg);

      var bx = 500;
      rect(svg, bx, 88, 78, 36, { fill: "#e6edf7" });
      el("circle", { cx: bx + 18, cy: 128, r: 7, fill: "#243140" }, svg);
      el("circle", { cx: bx + 58, cy: 128, r: 7, fill: "#243140" }, svg);
      if (Math.abs(s.v0) > 0.05) {
        var dir = s.v0 > 0 ? 1 : -1;
        arrow(svg, bx + 39, 70, bx + 39 + dir * 36, 70, TEAL, "T");
        text(svg, bx + 39, 60, "v", { anchor: "middle", fill: TEAL, size: 13, bold: true });
      }
      if (Math.abs(s.a) > 0.05) {
        var da = s.a > 0 ? 1 : -1;
        arrow(svg, bx + 39, 148, bx + 39 + da * 36, 148, ROSE, "R");
        text(svg, bx + 39, 166, "a", { anchor: "middle", fill: ROSE, size: 13, bold: true });
      }

      var word;
      if (s.a === 0) word = "加速度为 0，速度不变，做匀速直线运动。速度可以很大。";
      else if (s.v0 === 0) word = "此刻速度为 0，但加速度不为 0，下一步会沿加速度方向运动。";
      else if (s.v0 * s.a > 0) word = "a 与 v 同向，物体在加速。速度大不大，不决定加速度大不大。";
      else {
        var tz = -s.v0 / s.a;
        word = "a 与 v 反向，先减速。速度减到 0 约在 t = " + num(tz, 2) + " s";
        if (tz > 0 && tz < 4) word += "，之后图线穿过横轴，改为反向加速";
        word += "。加速度方向一直没变。";
      }
      ctx.read.innerHTML = "图中斜率就是 a。4 s 末速度 v = v₀ + at = <b>" + num(v1, 2) +
        " m/s</b>。默认 v₀=2、a=2，对应本节题 2（4 s 末为 10 m/s）。" + word;
    }
    draw();
  }

  /* ---------- 5 纸带 ---------- */
  function vizTape(ctx) {
    var segs = [2, 3, 4, 5, 6, 7];
    var cum = [0];
    segs.forEach(function (dx) { cum.push(cum[cum.length - 1] + dx); });
    var s = { n: cum.length, playing: false };
    var btn = button(ctx.ui, "按相等时间逐点打出", function () {
      if (s.n >= cum.length) s.n = 1;
      s.playing = !s.playing;
      btn.textContent = s.playing ? "暂停" : "按相等时间逐点打出";
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var x0 = 36;
      var px = 20;
      rect(svg, 24, 58, 592, 46, { fill: "#fffaf2", stroke: "#e4d3b0", rx: 6 });
      var i;
      for (i = 0; i < s.n - 1; i++) {
        var x1 = x0 + cum[i] * px;
        var x2 = x0 + cum[i + 1] * px;
        var group = i < 3 ? "#f3e2c4" : "#d9eee8";
        el("rect", { x: x1, y: 64, width: x2 - x1, height: 34, fill: group }, svg);
        text(svg, (x1 + x2) / 2, 124, segs[i] + " cm", { anchor: "middle", size: 12, fill: i < 3 ? AMBER : TEAL });
      }
      for (i = 0; i < s.n; i++) {
        el("circle", { cx: x0 + cum[i] * px, cy: 81, r: 4.5, fill: INK }, svg);
      }
      text(svg, 36, 36, "前 3 段之和 9 cm", { fill: AMBER, size: 13, bold: true });
      text(svg, 360, 36, "后 3 段之和 18 cm", { fill: TEAL, size: 13, bold: true });
      text(svg, 36, 156, "相邻计数点时间间隔 T = 0.1 s。点距越来越大，说明在加速。", { size: 13, fill: MUTED });
      ctx.read.innerHTML = "逐差法：a = [(5+6+7) − (2+3+4)] cm / (9×0.1² s²) = 9 cm / 0.09 s² = <b>1.00 m/s²</b>。" +
        " 第 3 个计数点的瞬时速度用它前后两段：v = (x₂+x₃)/(2T) = (3+4) cm / 0.2 s = <b>0.35 m/s</b>。这个点正好落在两段时间的正中间。";
    }

    watch(function (dt) {
      if (!s.playing) return;
      s._acc = (s._acc || 0) + dt;
      if (s._acc > 0.45) {
        s._acc = 0;
        s.n += 1;
        if (s.n > cum.length) {
          s.n = cum.length;
          s.playing = false;
          btn.textContent = "重播";
        }
        draw();
      }
    });
    draw();
  }

  /* ---------- 6 v-t ---------- */
  function vizVt(ctx) {
    var s = { v0: 10, a: 2, t: 3 };
    slider(ctx.ui, "初速度 v₀", -10, 20, 1, 10, function (v) { return num(v, 0) + " m/s"; }, function (v) { s.v0 = v; draw(); });
    slider(ctx.ui, "加速度 a", -5, 5, 0.5, 2, function (v) { return num(v, 1) + " m/s²"; }, function (v) { s.a = v; draw(); });
    slider(ctx.ui, "时间 t", 0, 5, 0.1, 3, function (v) { return num(v, 1) + " s"; }, function (v) { s.t = v; draw(); });

    function draw() {
      var svg = prepare(ctx.svg);
      var vEnd = s.v0 + 5 * s.a;
      var vt = s.v0 + s.t * s.a;
      var yLo = Math.min(0, s.v0, vEnd) - 3;
      var yHi = Math.max(0, s.v0, vEnd) + 3;
      var box = { x: 56, y: 16, w: 540, h: 176 };
      var ax = axes(svg, box, 0, 5.4, yLo, yHi, "t/s", "v/(m/s)");
      var xDisp = s.v0 * s.t + 0.5 * s.a * s.t * s.t;
      var area = "M " + ax.X(0) + " " + ax.Y(0) +
        " L " + ax.X(0) + " " + ax.Y(s.v0) +
        " L " + ax.X(s.t) + " " + ax.Y(vt) +
        " L " + ax.X(s.t) + " " + ax.Y(0) + " Z";
      el("path", { d: area, fill: "rgba(11,122,102,.18)", stroke: "none" }, svg);
      line(svg, ax.X(0), ax.Y(s.v0), ax.X(5), ax.Y(vEnd), ACCENT, 2.6);
      el("circle", { cx: ax.X(s.t), cy: ax.Y(vt), r: 5, fill: ROSE, stroke: "#fff", "stroke-width": 2 }, svg);
      ctx.read.innerHTML = "v = v₀ + at = <b>" + num(vt, 2) + " m/s</b>。图线斜率 = a = <b>" + num(s.a, 1) +
        " m/s²</b>。涂色面积 = 这段位移 x = v₀t + ½at² = <b>" + num(xDisp, 2) +
        " m</b>（横轴下方的面积按负位移计）。默认数值对应：初速度 10 m/s、加速度 2 m/s²，3 s 末速度 16 m/s。";
    }
    draw();
  }

  /* ---------- 7 位移推论与刹车 ---------- */
  function vizMove(ctx) {
    var s = { t: 10 };
    slider(ctx.ui, "刹车后经过的时间", 0, 10, 0.1, 10, function (v) { return num(v, 1) + " s"; }, function (v) {
      s.t = v; draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      text(svg, 28, 22, "初速度为 0 时，连续相等时间内的位移之比", { size: 13, fill: MUTED });
      var ratios = [1, 3, 5];
      var labels = ["第1个 T", "第2个 T", "第3个 T"];
      var x = 28;
      ratios.forEach(function (r, i) {
        var w = 46 + r * 42;
        rect(svg, x, 32, w, 32, { fill: i === 1 ? "#e4f3ee" : "#e6edf7", stroke: i === 1 ? TEAL : ACCENT });
        text(svg, x + w / 2, 54, String(r), { anchor: "middle", size: 16, bold: true });
        text(svg, x + w / 2, 80, labels[i], { anchor: "middle", size: 12, fill: MUTED });
        x += w + 14;
      });

      var box = { x: 56, y: 108, w: 540, h: 138 };
      var ax = axes(svg, box, 0, 10.6, -32, 26, "t/s", "v/(m/s)");
      line(svg, ax.X(0), ax.Y(20), ax.X(10), ax.Y(-30), ROSE, 1.5, "5 4");
      var tri = "M " + ax.X(0) + " " + ax.Y(0) + " L " + ax.X(0) + " " + ax.Y(20) +
        " L " + ax.X(4) + " " + ax.Y(0) + " Z";
      el("path", { d: tri, fill: "rgba(11,122,102,.2)" }, svg);
      line(svg, ax.X(0), ax.Y(20), ax.X(4), ax.Y(0), TEAL, 2.6);
      line(svg, ax.X(4), ax.Y(0), ax.X(10), ax.Y(0), TEAL, 2.6);
      var te = Math.min(s.t, 4);
      var vv = s.t <= 4 ? 20 - 5 * s.t : 0;
      el("circle", { cx: ax.X(s.t <= 4 ? s.t : s.t), cy: ax.Y(vv), r: 5, fill: ROSE, stroke: "#fff", "stroke-width": 2 }, svg);
      text(svg, ax.X(4), ax.Y(0) - 8, "4 s 停下", { anchor: "middle", size: 12, fill: TEAL });

      var wrong = 20 * s.t - 0.5 * 5 * s.t * s.t;
      var right = 20 * te - 0.5 * 5 * te * te;
      ctx.read.innerHTML = "上面三格是 1∶3∶5，不是累计位移 1∶4∶9。下面是刹车：v₀=20 m/s，a=−5 m/s²，停止时间 t₀=v₀/a=<b>4 s</b>。" +
        " 拖到 " + num(s.t, 1) + " s 时，正确位移 <b>" + num(right, 2) + " m</b>，速度 <b>" + num(vv, 2) +
        " m/s</b>。若不管是否已经停下、直接把 t 代入，会得到 <b>" + num(wrong, 2) + " m</b>。t=10 s 时错误结果是 −50 m，正确是 40 m。红虚线就是不该再延长的那一段。";
    }
    draw();
  }

  /* ---------- 8 竖直上抛 ---------- */
  function vizThrow(ctx) {
    var s = { v0: 20, t: 3, playing: false };
    var g = 10;
    var btn = button(ctx.ui, "从头播放", function () {
      if (s.playing) {
        s.playing = false;
        btn.textContent = "从头播放";
      } else {
        s.t = 0;
        s.playing = true;
        btn.textContent = "暂停";
      }
      draw();
    });
    slider(ctx.ui, "初速度 v₀（向上为正）", 10, 30, 1, 20, function (v) { return num(v, 0) + " m/s"; }, function (v) {
      s.v0 = v;
      s.playing = false;
      btn.textContent = "从头播放";
      if (s.t > 2 * v / g) s.t = 0;
      time.set(s.t);
      draw();
    });
    var time = slider(ctx.ui, "时间 t", 0, 6, 0.05, 3, function (v) { return num(v, 2) + " s"; }, function (v) {
      s.t = Math.min(v, 2 * s.v0 / g);
      s.playing = false;
      btn.textContent = "从头播放";
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var total = 2 * s.v0 / g;
      var t = Math.min(s.t, total);
      var h = s.v0 * t - 0.5 * g * t * t;
      var v = s.v0 - g * t;
      var H = s.v0 * s.v0 / (2 * g);
      time.input.max = total;
      time.set(t);

      var ground = 214;
      var px = 150 / Math.max(H, 5);
      var by = ground - h * px;
      line(svg, 70, 24, 70, ground, "#c5d0dc", 1.5);
      line(svg, 40, ground, 220, ground, "#8aa0b5", 2);
      for (var mark = 0; mark <= H + 0.1; mark += H > 30 ? 10 : 5) {
        var yy = ground - mark * px;
        if (yy < 16) continue;
        line(svg, 64, yy, 76, yy, "#8aa0b5", 1.4);
        text(svg, 58, yy + 4, String(mark), { anchor: "end", size: 11, fill: MUTED });
      }
      line(svg, 78, ground - H * px, 150, ground - H * px, TEAL, 1.2, "4 3");
      text(svg, 154, ground - H * px + 4, "最高 " + num(H, 1) + " m", { size: 12, fill: TEAL });
      el("circle", { cx: 120, cy: by, r: 10, fill: ROSE }, svg);
      if (Math.abs(v) > 0.4) {
        var len = Math.max(16, Math.min(54, Math.abs(v) * 1.6));
        var y2 = by + (v > 0 ? -len : len);
        arrow(svg, 120, by + (v > 0 ? -12 : 12), 120, y2, ACCENT, "A");
      }
      text(svg, 250, 48, "取向上为正", { size: 13, fill: MUTED });
      text(svg, 250, 74, "h = " + num(h, 2) + " m", { size: 16, bold: true });
      text(svg, 250, 100, "v = " + num(v, 2) + " m/s", { size: 16, bold: true, fill: v < -0.05 ? ROSE : ACCENT });
      text(svg, 250, 126, v > 0.05 ? "上升，减速" : (Math.abs(v) <= 0.05 ? "最高点，速度为 0" : "下降，加速"), { size: 14, fill: TEAL });

      ctx.read.innerHTML = "g = 10 m/s²，方向始终向下。最大高度 H = v₀²/(2g) = <b>" + num(H, 2) +
        " m</b>，上升时间与落回抛出点的时间都是 v₀/g = <b>" + num(s.v0 / g, 2) +
        " s</b>，全程 <b>" + num(total, 2) + " s</b>。v₀=20 m/s 时，t=3 s：h=15 m，v=−10 m/s（向下）。同一高度上升和下降的速率相等、方向相反。";
    }

    watch(function (dt) {
      if (!s.playing || reduce) return;
      s.t += dt;
      var total = 2 * s.v0 / g;
      if (s.t >= total) {
        s.t = total;
        s.playing = false;
        btn.textContent = "从头播放";
      }
      draw();
    });
    draw();
  }

  /* ---------- 9 胡克定律 ---------- */
  function vizSpring(ctx) {
    var s = { m: 0.2, k: 100 };
    var g = 10;
    slider(ctx.ui, "挂上的质量 m", 0.1, 0.8, 0.05, 0.2, function (v) { return num(v, 2) + " kg"; }, function (v) { s.m = v; draw(); });
    slider(ctx.ui, "劲度系数 k", 40, 200, 10, 100, function (v) { return num(v, 0) + " N/m"; }, function (v) { s.k = v; draw(); });

    function draw() {
      var svg = prepare(ctx.svg);
      var F = s.m * g;
      var x = F / s.k;
      var base = 52;
      var len = base + Math.min(150, x * 1100);
      line(svg, 80, 18, 250, 18, "#8aa0b5", 4);
      var y1 = 18;
      var y2 = y1 + len;
      var d = ["M 160 " + y1, "L 160 " + (y1 + 10)];
      var coils = 8;
      var usable = len - 20;
      var i;
      for (i = 0; i <= coils; i++) {
        var yy = y1 + 10 + usable * i / coils;
        var xx = 160 + (i % 2 === 0 ? -16 : 16);
        d.push("L " + xx + " " + yy);
      }
      d.push("L 160 " + y2);
      el("path", { d: d.join(" "), fill: "none", stroke: ACCENT, "stroke-width": 2.2, "stroke-linejoin": "round" }, svg);
      var nat = y1 + base;
      line(svg, 188, nat, 230, nat, MUTED, 1.2, "4 3");
      text(svg, 236, nat + 4, "原长位置", { size: 12, fill: MUTED });
      rect(svg, 128, y2, 64, 36, { fill: "#e6edf7" });
      text(svg, 160, y2 + 23, num(s.m, 2) + " kg", { anchor: "middle", size: 13, bold: true });
      var my = y2 + 18;
      arrow(svg, 340, my, 340, my + 42, ROSE, "R");
      text(svg, 350, my + 26, "G", { fill: ROSE, size: 13 });
      arrow(svg, 340, my, 340, my - 42, TEAL, "T");
      text(svg, 350, my - 22, "F弹", { fill: TEAL, size: 13 });

      ctx.read.innerHTML = "静止时弹力等于重力。F = mg = <b>" + num(F, 2) + " N</b>，x = F/k = <b>" +
        num(x * 100, 2) + " cm</b>（图中伸长放大了，方便看）。k=100 N/m、m=0.2 kg 时伸长 2 cm；改挂 0.5 kg，伸长 5 cm，弹簧长 15 cm。绳只能拉、支持力垂直于接触面，和弹簧弹力是同一类力：接触并且发生形变才有。";
    }
    draw();
  }

  /* ---------- 10 摩擦力 ---------- */
  function vizFriction(ctx) {
    var s = { F: 4, x: 0 };
    var m = 2;
    var fmax = 6;
    slider(ctx.ui, "水平拉力 F", 0, 12, 0.5, 4, function (v) { return num(v, 1) + " N"; }, function (v) {
      s.F = v;
      if (v <= fmax) s.x = 0;
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var sliding = s.F > fmax;
      var f = sliding ? fmax : s.F;
      var a = sliding ? (s.F - fmax) / m : 0;
      line(svg, 30, 132, 610, 132, "#8aa0b5", 2);
      var bx = 180 + (s.x % 3) * 90;
      rect(svg, bx, 88, 92, 44, { fill: sliding ? "#fde8ee" : "#e6edf7", stroke: sliding ? ROSE : ACCENT });
      text(svg, bx + 46, 115, "2 kg", { anchor: "middle", bold: true });
      if (s.F > 0) arrow(svg, bx + 92, 108, bx + 92 + s.F * 8, 108, ACCENT, "A");
      if (f > 0) arrow(svg, bx, 108, bx - f * 8, 108, AMBER, "M");
      text(svg, bx + 46, 76, sliding ? "滑动" : "静止", { anchor: "middle", fill: sliding ? ROSE : TEAL, bold: true });
      text(svg, 36, 164, "最大静摩擦 6 N。未滑动时摩擦力随 F 变化；滑动后按 f = 6 N 近似不变。", { size: 13, fill: MUTED });
      ctx.read.innerHTML = (sliding
        ? "F = <b>" + num(s.F, 1) + " N</b> 已超过最大静摩擦 6 N，木块滑动。滑动摩擦力 <b>6 N</b>，方向与相对运动相反。合力 " +
          num(s.F - 6, 1) + " N，a = <b>" + num(a, 2) + " m/s²</b>。"
        : "木块静止，静摩擦力是被动力：f = F = <b>" + num(f, 1) + " N</b>，方向与拉力相反。不能直接用 μN 当成这个实际值；6 N 只是它的上限。");
    }

    watch(function (dt) {
      if (reduce || s.F <= fmax) return;
      s.x += ((s.F - fmax) / m) * dt;
      draw();
    });
    draw();
  }

  /* ---------- 11 牛顿第三定律 ---------- */
  function vizN3(ctx) {
    ctx.read.textContent = "左图两个拉力分别画在马和车上，是作用力与反作用力。右图重力和支持力都画在车上，是一对平衡力，性质不同。车被拉动，是因为车受到的合力不为零，不是因为马拉车的力大于车拉马的力。";
    var svg = prepare(ctx.svg);
    function body(x, y, w, label, fill) {
      rect(svg, x, y, w, 48, { fill: fill, rx: 8 });
      text(svg, x + w / 2, y + 30, label, { anchor: "middle", bold: true, size: 16 });
    }
    text(svg, 36, 28, "作用力与反作用力", { bold: true, fill: ACCENT, size: 15 });
    body(70, 58, 84, "马", "#e6edf7");
    body(250, 58, 84, "车", "#e4f3ee");
    arrow(svg, 154, 74, 246, 74, ACCENT, "A");
    text(svg, 200, 66, "马拉车", { anchor: "middle", size: 12, fill: ACCENT });
    arrow(svg, 250, 96, 158, 96, TEAL, "T");
    text(svg, 200, 118, "车拉马", { anchor: "middle", size: 12, fill: TEAL });
    text(svg, 36, 140, "作用在两个物体上，同时产生", { size: 12, fill: MUTED });

    text(svg, 390, 28, "一对平衡力", { bold: true, fill: AMBER, size: 15 });
    body(430, 70, 84, "车", "#fff4e5");
    arrow(svg, 472, 70, 472, 36, TEAL, "T");
    text(svg, 480, 48, "支持力", { size: 12, fill: TEAL });
    arrow(svg, 472, 118, 472, 156, ROSE, "R");
    text(svg, 480, 146, "重力", { size: 12, fill: ROSE });
    text(svg, 390, 176, "都作用在车上，一弹一重", { size: 12, fill: MUTED });
  }

  /* ---------- 12 平行四边形 ---------- */
  function vizPara(ctx) {
    var s = { deg: 90 };
    slider(ctx.ui, "两力夹角", 0, 180, 1, 90, function (v) { return num(v, 0) + "°"; }, function (v) { s.deg = v; draw(); });

    function draw() {
      var svg = prepare(ctx.svg);
      var rad = s.deg * Math.PI / 180;
      var scale = 16;
      var ox = 168;
      var oy = 168;
      var x1 = 6 * scale;
      var y1 = 0;
      var x2 = 8 * scale * Math.cos(rad);
      var y2 = -8 * scale * Math.sin(rad);
      line(svg, ox, oy, ox + x1, oy + y1, "#c5d4e4", 1.4, "5 4");
      line(svg, ox + x2, oy + y2, ox + x1 + x2, oy + y1 + y2, "#c5d4e4", 1.4, "5 4");
      line(svg, ox, oy, ox + x2, oy + y2, "#c5d4e4", 1.4, "5 4");
      line(svg, ox + x1, oy + y1, ox + x1 + x2, oy + y1 + y2, "#c5d4e4", 1.4, "5 4");
      arrow(svg, ox, oy, ox + x1, oy + y1, ACCENT, "A");
      arrow(svg, ox, oy, ox + x2, oy + y2, TEAL, "T");
      arrow(svg, ox, oy, ox + x1 + x2, oy + y1 + y2, ROSE, "R");
      text(svg, ox + x1 + 8, oy + 16, "F₁=6 N", { fill: ACCENT, size: 13 });
      text(svg, ox + x2 + 8, oy + y2 - 6, "F₂=8 N", { fill: TEAL, size: 13 });
      var F = Math.sqrt(6 * 6 + 8 * 8 + 2 * 6 * 8 * Math.cos(rad));
      text(svg, ox + (x1 + x2) / 2 + 10, oy + (y1 + y2) / 2 - 8, "合力 " + num(F, 2) + " N", { fill: ROSE, size: 14, bold: true });
      ctx.read.innerHTML = "合力范围 <b>2 N ≤ F ≤ 14 N</b>。当前夹角 " + num(s.deg, 0) + "°，合力 <b>" + num(F, 2) +
        " N</b>。夹角 90° 时 √(6²+8²)=10 N；同向 14 N，反向 2 N。合力与分力是等效替代，按平行四边形定则，不是简单相加。";
    }
    draw();
  }

  /* ---------- 13 斜面平衡 ---------- */
  function vizIncline(ctx) {
    var s = { deg: 30 };
    var m = 1;
    var g = 10;
    slider(ctx.ui, "斜面倾角 θ", 15, 40, 1, 30, function (v) { return num(v, 0) + "°"; }, function (v) { s.deg = v; draw(); });

    function draw() {
      var svg = prepare(ctx.svg);
      var th = s.deg * Math.PI / 180;
      var heel = { x: 56, y: 200 };
      var height = 118;
      var L = height / Math.tan(th);
      if (L > 300) {
        L = 300;
        height = L * Math.tan(th);
      }
      var toe = { x: heel.x + L, y: heel.y };
      var top = { x: heel.x, y: heel.y - height };
      el("path", {
        d: "M " + top.x + " " + top.y + " L " + toe.x + " " + toe.y + " L " + heel.x + " " + heel.y + " Z",
        fill: "#e6edf7", stroke: ACCENT, "stroke-width": 1.6
      }, svg);
      text(svg, toe.x - 10, toe.y - 14, "θ=" + s.deg + "°", { anchor: "end", size: 13, fill: ACCENT });

      var smx = (top.x + toe.x) / 2;
      var smy = (top.y + toe.y) / 2;
      var nx = Math.sin(th);
      var ny = -Math.cos(th);
      var dx = Math.cos(th);
      var dy = Math.sin(th);
      var cx = smx + nx * 20;
      var cy = smy + ny * 20;
      var hw = 26;
      var hh = 16;
      var corners = [[hw, hh], [hw, -hh], [-hw, -hh], [-hw, hh]].map(function (p) {
        return [
          cx + p[0] * dx + p[1] * nx,
          cy + p[0] * dy + p[1] * ny
        ];
      });
      el("polygon", {
        points: corners.map(function (p) { return p[0] + "," + p[1]; }).join(" "),
        fill: "#fff", stroke: TEAL, "stroke-width": 1.8
      }, svg);

      var mg = m * g;
      var scale = 6.2;
      arrow(svg, cx, cy, cx, cy + mg * scale, ROSE, "R");
      text(svg, cx + 10, cy + mg * scale, "mg", { fill: ROSE, size: 13 });
      var f = mg * Math.sin(th);
      var N = mg * Math.cos(th);
      var fx = cx - dx * f * scale;
      var fy = cy - dy * f * scale;
      arrow(svg, cx, cy, fx, fy, AMBER, "M");
      text(svg, fx - 4, fy - 2, "f", { fill: AMBER, size: 13, anchor: "end" });
      var nx2 = cx + nx * N * scale;
      var ny2 = cy + ny * N * scale;
      arrow(svg, cx, cy, nx2, ny2, TEAL, "T");
      text(svg, nx2 + 8, ny2 + 4, "N", { fill: TEAL, size: 13 });
      text(svg, 430, 64, "沿斜面", { size: 13, fill: AMBER });
      text(svg, 430, 86, num(f, 2) + " N", { size: 16, bold: true, fill: AMBER });
      text(svg, 430, 118, "垂直斜面", { size: 13, fill: TEAL });
      text(svg, 430, 140, num(N, 2) + " N", { size: 16, bold: true, fill: TEAL });
      ctx.read.innerHTML = "物体静止。支持力 N = mg cosθ = <b>" + num(N, 2) +
        " N</b>，静摩擦力 f = mg sinθ = <b>" + num(f, 2) +
        " N</b>，方向沿斜面向上。f 由平衡条件求出。只有题目说明恰好要滑动时，才用 f = μN 当上限。图中取 m=1 kg、g=10 m/s²，所以 mg=10 N。";
    }
    draw();
  }

  /* ---------- 14 惯性 ---------- */
  function vizInertia(ctx) {
    var s = { mode: "drive", lean: 0, speed: 10, playing: false };
    var btn = button(ctx.ui, "急刹车", function () {
      s.playing = true;
      s.mode = "brake";
      btn.textContent = "刹车中";
      btn.disabled = true;
    });
    button(ctx.ui, "恢复行驶", function () {
      s.mode = "drive";
      s.playing = false;
      s.lean = 0;
      s.speed = 10;
      btn.disabled = false;
      btn.textContent = "急刹车";
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      rect(svg, 70, 70, 280, 86, { fill: "#e6edf7", rx: 10 });
      rect(svg, 78, 78, 70, 36, { fill: "#d5e3f4", stroke: "none" });
      line(svg, 70, 156, 390, 156, "#8aa0b5", 3);
      el("circle", { cx: 120, cy: 164, r: 12, fill: "#243140" }, svg);
      el("circle", { cx: 300, cy: 164, r: 12, fill: "#243140" }, svg);
      var px = 230;
      var py = 146;
      var ang = s.lean * Math.PI / 180;
      var hx = px + Math.sin(ang) * 48;
      var hy = py - Math.cos(ang) * 48;
      line(svg, px, py, hx, hy, INK, 3);
      el("circle", { cx: hx, cy: hy - 8, r: 9, fill: "#f3c1a0", stroke: INK, "stroke-width": 1.4 }, svg);
      text(svg, 420, 78, num(s.speed, 1) + " m/s", { size: 20, bold: true, fill: ACCENT });
      text(svg, 420, 104, s.mode === "drive" ? "匀速行驶" : "正在刹车", { size: 14, fill: s.mode === "drive" ? TEAL : ROSE });
      ctx.read.textContent = "急刹车时，脚和下半身随车厢减速，上半身没有直接受力去减速，仍要保持原来的速度，所以向前倾。惯性不是向前的力，只跟质量有关，跟现在速度多大无关。";
    }

    watch(function (dt) {
      if (!s.playing) return;
      s.speed = Math.max(0, s.speed - dt * 8);
      s.lean = Math.min(32, s.lean + dt * 28);
      if (s.speed <= 0 && s.lean >= 32) s.playing = false;
      draw();
    });
    draw();
  }

  /* ---------- 15 牛顿第二定律 ---------- */
  function vizNewton(ctx) {
    var s = { F: 6, m: 2 };
    slider(ctx.ui, "合外力 F", 0, 20, 0.5, 6, function (v) { return num(v, 1) + " N"; }, function (v) { s.F = v; draw(); });
    slider(ctx.ui, "质量 m", 0.5, 8, 0.5, 2, function (v) { return num(v, 1) + " kg"; }, function (v) { s.m = v; draw(); });

    function draw() {
      var svg = prepare(ctx.svg);
      var a = s.m === 0 ? 0 : s.F / s.m;
      rect(svg, 70, 78, 70 + s.m * 16, 48, { fill: "#e6edf7" });
      text(svg, 70 + (70 + s.m * 16) / 2, 108, num(s.m, 1) + " kg", { anchor: "middle", bold: true });
      if (s.F > 0) arrow(svg, 70 + 70 + s.m * 16, 102, 70 + 70 + s.m * 16 + Math.min(160, s.F * 8), 102, ACCENT, "A");
      text(svg, 400, 70, "a = F/m", { size: 16, bold: true, fill: ACCENT });
      text(svg, 400, 102, "= " + num(a, 2) + " m/s²", { size: 22, bold: true });
      text(svg, 400, 136, "a 与 F 同向", { size: 13, fill: MUTED });
      var box = { x: 48, y: 150, w: 250, h: 8 };
      rect(svg, box.x, 168, 260, 10, { fill: "#eef2f6", stroke: "none", rx: 5 });
      rect(svg, box.x, 168, Math.min(260, a * 22), 10, { fill: TEAL, stroke: "none", rx: 5 });
      text(svg, 48, 198, "色条长度表示加速度。质量不变时，力加倍，加速度加倍。", { size: 13, fill: MUTED });
      ctx.read.innerHTML = "1 N = 1 kg·m/s²。当前 a = <b>" + num(a, 2) +
        " m/s²</b>。已知力求运动：先 a=F/m，再代入运动学公式。已知运动求力：先由位移、时间求出 a，再 F=ma。默认 6 N、2 kg，对应拉力 10 N、阻力 4 N 时的合力。";
    }
    draw();
  }

  /* ---------- 16 适用范围 ---------- */
  function vizLimit(ctx) {
    ctx.read.textContent = "卫星速度大约 7.9 km/s，仍远小于光速，还用牛顿定律。接近光速的粒子和原子、电子尺度的问题，要换相对论或量子力学。";
    var svg = prepare(ctx.svg);
    var cards = [
      { t: "可以用牛顿定律", d: "刹车、篮球、雨滴、人造卫星", fill: "#e4f3ee", c: TEAL },
      { t: "要用相对论", d: "速度接近光速的粒子", fill: "#fff4e5", c: AMBER },
      { t: "要用量子力学", d: "电子等微观粒子", fill: "#fde8ee", c: ROSE }
    ];
    cards.forEach(function (card, i) {
      var x = 28 + i * 202;
      rect(svg, x, 28, 188, 110, { fill: card.fill, stroke: card.c, rx: 8 });
      text(svg, x + 94, 68, card.t, { anchor: "middle", bold: true, fill: card.c, size: 15 });
      text(svg, x + 94, 98, card.d, { anchor: "middle", size: 12, fill: INK });
    });
  }

  /* ---------- 17 超重失重 ---------- */
  function vizLift(ctx) {
    var modes = [
      { id: "const", label: "匀速", a: 0, v: 1 },
      { id: "up", label: "加速上升", a: 2, v: 1 },
      { id: "down", label: "加速下降", a: -2, v: -1 },
      { id: "dec", label: "减速上升", a: -2, v: 1 },
      { id: "free", label: "自由落体", a: -10, v: -1 }
    ];
    var s = { a: 2, v: 1, y: 0 };
    seg(ctx.ui, modes.map(function (m) { return { label: m.label, value: m.id }; }), "up", function (id) {
      var found = modes.filter(function (x) { return x.id === id; })[0];
      s.a = found.a;
      s.v = found.v;
      s.y = 0;
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      var m = 50;
      var g = 10;
      var N = m * (g + s.a);
      if (N < 0) N = 0;
      var bob = s.y;
      var cabinY = 36 + bob;
      rect(svg, 78, cabinY, 150, 168, { fill: "#f7f9fc", rx: 8 });
      rect(svg, 108, cabinY + 132, 90, 12, { fill: "#d7e0ea", stroke: "none", rx: 2 });
      var personY = s.a <= -10 ? cabinY + 78 : cabinY + 96;
      el("circle", { cx: 153, cy: personY, r: 12, fill: "#f3c1a0", stroke: INK, "stroke-width": 1.2 }, svg);
      line(svg, 153, personY + 12, 153, personY + 48, INK, 2.4);
      text(svg, 153, cabinY + 158, N === 0 ? "示数 0" : "示数 " + num(N, 0) + " N", { anchor: "middle", size: 13, bold: true, fill: ACCENT });

      text(svg, 280, 58, "实际重力 mg = 500 N", { size: 14 });
      text(svg, 280, 86, "视重 N = " + num(N, 0) + " N", { size: 18, bold: true, fill: N > 500 ? ROSE : (N < 500 ? TEAL : ACCENT) });
      var state = N > 500 ? "超重" : (N === 0 ? "完全失重" : (N < 500 ? "失重" : "既不超重也不失重"));
      text(svg, 280, 116, state, { size: 16, bold: true, fill: TEAL });
      text(svg, 280, 146, "加速度 " + (s.a > 0 ? "向上 " : (s.a < 0 ? "向下 " : "")) + num(Math.abs(s.a), 0) + " m/s²", { size: 14 });
      if (s.v !== 0) {
        arrow(svg, 40, 120, 40, 120 - s.v * 36, ACCENT, "A");
        text(svg, 18, 112, "v", { fill: ACCENT, size: 13 });
      }
      if (s.a !== 0) {
        var dir = s.a > 0 ? -1 : 1;
        arrow(svg, 58, 120, 58, 120 + dir * 28, ROSE, "R");
        text(svg, 64, 116, "a", { fill: ROSE, size: 13 });
      }
      ctx.read.innerHTML = "人的重力始终是 500 N。体重计示数是支持力 N = m(g+a)，a 向上为正。加速上升：N=<b>600 N</b>。加速下降或减速上升：加速度都向下，N=<b>400 N</b>。自由落体时 a=g 向下，N=<b>0</b>，人悬在秤上方，但重力并没有消失。";
    }

    watch(function (dt) {
      if (reduce || !s.v) return;
      var next = s.y - s.v * dt * 18;
      if (next > 20 || next < -20) return;
      s.y = next;
      draw();
    });
    draw();
  }

  /* ---------- 18 传送带与连接体 ---------- */
  function vizBelt(ctx) {
    var s = { t: 0, playing: false };
    var btn = button(ctx.ui, "放上木块", function () {
      if (s.t >= 3) s.t = 0;
      s.playing = !s.playing;
      btn.textContent = s.playing ? "暂停" : "放上木块";
      draw();
    });
    button(ctx.ui, "复位", function () {
      s.t = 0;
      s.playing = false;
      btn.textContent = "放上木块";
      draw();
    });

    function draw() {
      var svg = prepare(ctx.svg);
      text(svg, 28, 24, "连接体：先整体再隔离", { size: 13, fill: MUTED });
      rect(svg, 150, 36, 70, 40, { fill: "#e6edf7" });
      rect(svg, 280, 36, 70, 40, { fill: "#e4f3ee" });
      text(svg, 185, 61, "2 kg", { anchor: "middle", bold: true, size: 13 });
      text(svg, 315, 61, "3 kg", { anchor: "middle", bold: true, size: 13 });
      line(svg, 220, 56, 280, 56, AMBER, 2);
      text(svg, 250, 46, "T=6 N", { anchor: "middle", size: 12, fill: AMBER });
      arrow(svg, 78, 56, 146, 56, ACCENT, "A");
      text(svg, 100, 42, "F=10 N", { anchor: "middle", size: 12, fill: ACCENT });
      text(svg, 380, 61, "a=2 m/s²", { size: 13, fill: TEAL, bold: true });

      var a = 2;
      var vBelt = 2;
      var tMatch = 1;
      var t = s.t;
      var v = Math.min(vBelt, a * t);
      var x = t <= tMatch ? 0.5 * a * t * t : 1 + vBelt * (t - tMatch);
      var matched = t >= tMatch - 1e-6;

      var beltY = 150;
      rect(svg, 40, beltY, 430, 28, { fill: "#243140", stroke: "none", rx: 4 });
      var offset = (vBelt * t * 70) % 28;
      var k;
      for (k = -1; k < 18; k++) {
        var tx = 48 + k * 28 - offset;
        if (tx > 36 && tx < 460) line(svg, tx, beltY + 4, tx, beltY + 24, "#f0c14a", 3);
      }
      var bx = 56 + Math.min(x, 4) * 88;
      rect(svg, bx, beltY - 36, 54, 32, { fill: matched ? "#e4f3ee" : "#fde8ee", stroke: matched ? TEAL : ROSE });
      if (!matched) arrow(svg, bx + 8, beltY - 48, bx + 48, beltY - 48, AMBER, "M");
      text(svg, 490, 146, "带速 2 m/s", { size: 13, fill: MUTED });
      text(svg, 490, 170, "木块 " + num(v, 2) + " m/s", { size: 13, bold: true, fill: ACCENT });

      ctx.read.innerHTML = "连接体：整体 a = 10/(2+3) = <b>2 m/s²</b>，隔离 3 kg 的物体得 T = 3×2 = <b>6 N</b>。" +
        " 传送带：木块初速度 0，相对带向后滑，摩擦力向前，a = μg = 2 m/s²。t = <b>" + num(Math.min(t, 3), 2) +
        " s</b>，速度 <b>" + num(v, 2) + " m/s</b>，位移 <b>" + num(x, 2) +
        " m</b>。" + (matched ? "已经共速，此后摩擦力为 0，一起匀速。" : "尚未共速，摩擦力向前，是动力。共速发生在 t=1 s，这段位移 1 m。");
    }

    watch(function (dt) {
      if (!s.playing) return;
      s.t += dt;
      if (s.t >= 3) {
        s.t = 3;
        s.playing = false;
        btn.textContent = "重播";
      }
      draw();
    });
    draw();
  }

  var builders = {
    frame: vizFrame,
    disp: vizDisp,
    xt: vizXt,
    acc: vizAcc,
    tape: vizTape,
    vt: vizVt,
    move: vizMove,
    toss: vizThrow,
    spring: vizSpring,
    friction: vizFriction,
    n3: vizN3,
    para: vizPara,
    incline: vizIncline,
    inertia: vizInertia,
    newton: vizNewton,
    limit: vizLimit,
    lift: vizLift,
    belt: vizBelt
  };

  function boot() {
    var figs = document.querySelectorAll("figure.viz");
    Array.prototype.forEach.call(figs, function (fig) {
      var kind = fig.getAttribute("data-viz");
      var build = builders[kind];
      if (!build) return;
      build({
        svg: fig.querySelector("svg"),
        ui: fig.querySelector(".viz-ui"),
        read: fig.querySelector(".viz-read")
      });
    });
  }

  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (!document.hidden) {
      loops.forEach(function (fn) { fn(dt); });
    }
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.requestAnimationFrame(frame);
})();
