/**
 * Scene backgrounds for City Adventures, drawn in SVG (1600×1000, cropped to fit).
 * Each scene has a back layer (behind the characters) and a front layer (counters, crates,
 * tables in front of them). Important details stay in the middle 800px so phones keep them.
 */

const VB = "0 0 1600 1000";

function Svg({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <svg viewBox={VB} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {children}
    </svg>
  );
}

/** Deterministic pseudo-random numbers (same on server and client). */
function seq(seed: number, n: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(s / 233280);
  }
  return out;
}

const ZH = "var(--font-zh)";

/* ----------------------------------- café ----------------------------------- */

function CafeBack() {
  return (
    <Svg label="A cosy café">
      <defs>
        <linearGradient id="cafe-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e6d0" />
          <stop offset="1" stopColor="#e8cfae" />
        </linearGradient>
        <linearGradient id="cafe-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fd3f0" />
          <stop offset="1" stopColor="#dff1fb" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#cafe-wall)" />
      <rect y="640" width="1600" height="360" fill="#b98457" />
      <rect y="630" width="1600" height="16" fill="#8f5f3a" />
      {Array.from({ length: 17 }, (_, i) => (
        <rect key={i} x={i * 100} y="646" width="4" height="354" fill="#a5714a" />
      ))}
      {/* window */}
      <rect x="140" y="150" width="380" height="400" rx="12" fill="#7a5235" />
      <rect x="160" y="170" width="340" height="360" fill="url(#cafe-sky)" />
      {[[180, 420, 70, 110], [262, 380, 60, 150], [334, 430, 80, 100], [424, 400, 60, 130]].map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="#b8cfdc" />
      ))}
      <circle cx="430" cy="230" r="34" fill="#fff6c9" />
      <rect x="326" y="170" width="8" height="360" fill="#7a5235" />
      <rect x="160" y="346" width="340" height="8" fill="#7a5235" />
      {/* plant */}
      <path d="M560 560 l50 0 l-8 70 l-34 0 Z" fill="#c96f45" />
      {[[585, 470, -30], [585, 470, 10], [585, 470, 45], [585, 480, -60], [585, 480, 70]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y + 40} rx="16" ry="48" fill={i % 2 ? "#5f9a5b" : "#4d8a4f"} transform={`rotate(${r} ${x} ${y + 80})`} />
      ))}
      {/* pendant lamps */}
      {[640, 800, 960].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y="0" width="3" height="150" fill="#5a4030" />
          <path d={`M${x - 44} 196 Q${x} 130 ${x + 44} 196 Z`} fill="#2f6f6a" />
          <ellipse cx={x} cy="198" rx="20" ry="8" fill="#ffe9a8" />
          <ellipse cx={x} cy="240" rx="80" ry="40" fill="#fff3c4" opacity="0.25" />
        </g>
      ))}
      {/* chalkboard menu */}
      <rect x="1030" y="120" width="420" height="400" rx="10" fill="#7a5235" />
      <rect x="1046" y="136" width="388" height="368" fill="#2e3a34" />
      <text x="1240" y="196" textAnchor="middle" fontSize="44" fill="#f7f3e8" fontFamily={ZH}>菜单</text>
      {[
        ["美式咖啡", "18"],
        ["拿铁", "22"],
        ["卡布奇诺", "22"],
        ["奶茶", "15"],
        ["蛋糕", "20"],
      ].map(([name, price], i) => (
        <g key={name} fontFamily={ZH} fontSize="30" fill="#f2efe6">
          <text x="1080" y={258 + i * 52}>{name}</text>
          <text x="1400" y={258 + i * 52} textAnchor="end" fill="#f6d77a">
            {price}
          </text>
        </g>
      ))}
      {/* back counter with espresso machine and cups */}
      <rect x="640" y="560" width="760" height="20" fill="#7a5235" />
      <rect x="1140" y="450" width="190" height="110" rx="10" fill="#c9ccd1" />
      <rect x="1160" y="470" width="150" height="40" rx="6" fill="#9aa0a8" />
      <circle cx="1195" cy="530" r="10" fill="#555" />
      <circle cx="1275" cy="530" r="10" fill="#555" />
      {[700, 760, 820, 880].map((x, i) => (
        <g key={x}>
          <rect x={x} y="510" width="40" height="50" rx="6" fill={["#f4f1ea", "#2f6f6a", "#e0a35a", "#f4f1ea"][i]} />
          <path d={`M${x + 40} 522 q16 0 16 14 q0 14 -16 14`} stroke="#c8c2b6" strokeWidth="5" fill="none" />
        </g>
      ))}
    </Svg>
  );
}

function CafeFront() {
  return (
    <Svg>
      <rect x="0" y="846" width="1600" height="30" fill="#c08a5d" />
      <rect x="0" y="874" width="1600" height="126" fill="#7d5134" />
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} x={i * 200 + 40} y="900" width="120" height="90" rx="8" fill="#6e462d" />
      ))}
      {/* cake dome and a cup on the counter */}
      <g transform="translate(0 76)">
        <rect x="1180" y="750" width="200" height="22" rx="6" fill="#e9e3d8" />
        <path d="M1190 752 Q1280 610 1370 752 Z" fill="#dff2f7" opacity="0.6" stroke="#ffffff" strokeWidth="3" />
        <path d="M1240 750 l80 0 l-10 -46 l-60 0 Z" fill="#f3c9d6" />
        <rect x="1230" y="700" width="100" height="10" fill="#7b3f2a" />
        <rect x="250" y="720" width="58" height="52" rx="8" fill="#fbfaf6" />
        <path d="M308 734 q22 0 22 18 q0 18 -22 18" stroke="#fbfaf6" strokeWidth="8" fill="none" />
        <path d="M268 712 q6 -14 0 -26 M288 712 q6 -14 0 -26" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.7" />
      </g>
    </Svg>
  );
}

/* ----------------------------- convenience store ----------------------------- */

function StoreBack() {
  const r = seq(7, 200);
  const colours = ["#e8505b", "#f9a826", "#14b1ab", "#3d7ee8", "#f6d743", "#7e57c2", "#ff7f50", "#43aa8b"];
  const shelf = (x0: number, y0: number, w: number, rows: number, off: number) =>
    Array.from({ length: rows }, (_, row) => {
      const y = y0 + row * 110;
      let x = x0 + 10;
      const items: React.ReactNode[] = [];
      let k = off + row * 13;
      while (x < x0 + w - 40) {
        const iw = 26 + Math.floor(r[k % 200] * 30);
        const ih = 50 + Math.floor(r[(k + 7) % 200] * 40);
        items.push(<rect key={`${row}-${x}`} x={x} y={y + 90 - ih} width={iw} height={ih} rx="4" fill={colours[Math.floor(r[(k + 3) % 200] * colours.length)]} />);
        x += iw + 6;
        k++;
      }
      return (
        <g key={row}>
          {items}
          <rect x={x0} y={y + 90} width={w} height="12" fill="#b9c4cf" />
        </g>
      );
    });
  return (
    <Svg label="A convenience store at night">
      <rect width="1600" height="1000" fill="#eef3f8" />
      <rect width="1600" height="70" fill="#dfe7ef" />
      {[200, 600, 1000, 1400].map((x) => (
        <rect key={x} x={x - 120} y="22" width="240" height="18" rx="9" fill="#ffffff" stroke="#cfd9e3" />
      ))}
      {/* night window with sign */}
      <rect x="560" y="110" width="480" height="230" rx="8" fill="#1d2b4f" />
      {seq(3, 30).map((v, i) => (
        <circle key={i} cx={580 + ((v * 997) % 440)} cy={130 + ((v * 613) % 190)} r={i % 3 ? 1.5 : 2.5} fill="#fff" opacity="0.8" />
      ))}
      <rect x="640" y="150" width="320" height="90" rx="14" fill="#2e64b0" />
      <text x="800" y="212" textAnchor="middle" fontSize="54" fill="#fff" fontFamily={ZH}>便利店</text>
      <rect x="900" y="250" width="110" height="46" rx="10" fill="#f08a24" />
      <text x="955" y="283" textAnchor="middle" fontSize="28" fill="#fff" fontWeight="700">24h</text>
      {/* shelves */}
      <rect x="40" y="120" width="460" height="560" fill="#dce5ee" />
      {shelf(40, 130, 460, 5, 0)}
      {/* fridge */}
      <rect x="1100" y="110" width="460" height="580" rx="10" fill="#c7d3df" />
      {[0, 1, 2].map((d) => (
        <g key={d}>
          <rect x={1116 + d * 148} y="126" width="138" height="548" rx="6" fill="#dff3ff" stroke="#9fb3c6" strokeWidth="3" />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3].map((col) => (
              <rect key={`${row}-${col}`} x={1128 + d * 148 + col * 30} y={160 + row * 128} width="20" height="70" rx="8" fill={colours[(d * 5 + row * 3 + col) % colours.length]} opacity="0.85" />
            )),
          )}
          <rect x={1240 + d * 148} y="360" width="6" height="80" rx="3" fill="#8193a6" />
        </g>
      ))}
      <rect y="690" width="1600" height="310" fill="#d9e0e8" />
      <rect y="686" width="1600" height="8" fill="#c3ccd6" />
    </Svg>
  );
}

function StoreFront() {
  return (
    <Svg>
      <rect x="0" y="850" width="1600" height="150" fill="#f7f9fb" />
      <rect x="0" y="840" width="1600" height="22" fill="#2e64b0" />
      <rect x="0" y="930" width="1600" height="22" fill="#f08a24" />
      {/* cash register */}
      <g transform="translate(60 70)">
        <rect x="1030" y="640" width="210" height="140" rx="12" fill="#4b5563" />
        <rect x="1050" y="656" width="170" height="64" rx="6" fill="#9fe6c4" />
        <text x="1135" y="700" textAnchor="middle" fontSize="34" fill="#1f5134" fontFamily="monospace">¥ 8.00</text>
        <rect x="1060" y="732" width="150" height="34" rx="6" fill="#6b7280" />
      </g>
      {/* snack display */}
      <g transform="translate(-60 70)">
        {[330, 380, 430].map((x, i) => (
          <rect key={x} x={x} y={700 - i * 6} width="40" height={70 + i * 6} rx="6" fill={["#e8505b", "#f6d743", "#14b1ab"][i]} />
        ))}
        <rect x="310" y="770" width="190" height="8" fill="#cfd9e3" />
      </g>
    </Svg>
  );
}

/* -------------------------------- restaurant -------------------------------- */

function RestaurantBack() {
  return (
    <Svg label="A family restaurant">
      <defs>
        <linearGradient id="rest-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b6463a" />
          <stop offset="1" stopColor="#8e3029" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#rest-wall)" />
      <rect y="660" width="1600" height="340" fill="#5a3a26" />
      {/* lattice window */}
      <rect x="560" y="150" width="480" height="300" rx="8" fill="#3d2618" />
      <rect x="576" y="166" width="448" height="268" fill="#ffd98a" opacity="0.85" />
      <g stroke="#3d2618" strokeWidth="8">
        {[656, 736, 816, 896, 976].map((x) => (
          <line key={x} x1={x} y1="166" x2={x} y2="434" />
        ))}
        {[236, 300, 364].map((y) => (
          <line key={y} x1="576" y1={y} x2="1024" y2={y} />
        ))}
      </g>
      {/* menu plaques */}
      {[
        ["宫保鸡丁", "38", 120],
        ["麻婆豆腐", "26", 120 + 0],
        ["西红柿炒鸡蛋", "22", 0],
        ["青菜", "18", 0],
        ["米饭", "2", 0],
      ].map(([name, price], i) => {
        const x = i < 2 ? 120 + i * 200 : 1100 + (i - 2) * 160;
        return (
          <g key={String(name)}>
            <rect x={x} y="160" width={i < 2 ? 170 : 140} height="300" rx="8" fill="#f2d7a7" stroke="#3d2618" strokeWidth="6" />
            {Array.from(String(name)).map((ch, k, all) => (
              <text key={k} x={x + (i < 2 ? 85 : 70)} y={210 + k * (all.length > 4 ? 34 : 42)} textAnchor="middle" fontSize={all.length > 4 ? 30 : 36} fill="#7a1f17" fontFamily={ZH}>
                {ch}
              </text>
            ))}
            <text x={x + (i < 2 ? 85 : 70)} y="440" textAnchor="middle" fontSize="32" fill="#3d2618" fontWeight="700">
              {price}
            </text>
          </g>
        );
      })}
      {/* lanterns */}
      {[340, 1260].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="0" width="4" height="70" fill="#3d2618" />
          <rect x={x - 26} y="66" width="52" height="14" rx="4" fill="#e9b949" />
          <ellipse cx={x} cy="140" rx="70" ry="64" fill="#e2392d" />
          <path d={`M${x - 30} 80 Q${x - 44} 140 ${x - 30} 200 M${x + 30} 80 Q${x + 44} 140 ${x + 30} 200 M${x} 78 L${x} 204`} stroke="#b7261c" strokeWidth="4" fill="none" />
          <rect x={x - 26} y="200" width="52" height="14" rx="4" fill="#e9b949" />
          <path d={`M${x - 10} 214 l0 50 M${x} 214 l0 60 M${x + 10} 214 l0 50`} stroke="#e9b949" strokeWidth="5" />
        </g>
      ))}
      {/* background tables */}
      {[180, 1420].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="640" rx="150" ry="34" fill="#7a4b2e" />
          <rect x={x - 12} y="640" width="24" height="90" fill="#5a3520" />
          <rect x={x - 90} y="660" width="40" height="70" rx="6" fill="#8a5a3a" />
          <rect x={x + 50} y="660" width="40" height="70" rx="6" fill="#8a5a3a" />
        </g>
      ))}
    </Svg>
  );
}

function RestaurantFront() {
  return (
    <Svg>
      <ellipse cx="800" cy="1010" rx="760" ry="170" fill="#8b5a36" />
      <ellipse cx="800" cy="996" rx="740" ry="156" fill="#a06a40" />
      {/* teapot, cups and chopsticks */}
      <g>
        <ellipse cx="420" cy="880" rx="70" ry="54" fill="#f3efe6" />
        <path d="M486 862 q40 -20 52 -50" stroke="#f3efe6" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M352 872 q-34 0 -34 30 q0 24 30 22" stroke="#f3efe6" strokeWidth="12" fill="none" />
        <ellipse cx="420" cy="826" rx="22" ry="10" fill="#2f6f6a" />
        <path d="M376 880 Q420 900 464 880" stroke="#2f6f6a" strokeWidth="6" fill="none" />
      </g>
      {[560, 640].map((x) => (
        <g key={x}>
          <path d={`M${x - 26} 890 l52 0 l-8 40 l-36 0 Z`} fill="#f3efe6" />
          <path d={`M${x - 18} 902 l36 0`} stroke="#2f6f6a" strokeWidth="4" />
        </g>
      ))}
      <path d="M1080 920 l200 -40 M1086 940 l200 -40" stroke="#c78c4f" strokeWidth="8" strokeLinecap="round" />
      <ellipse cx="1180" cy="900" rx="90" ry="34" fill="#f3efe6" />
      <ellipse cx="1180" cy="894" rx="70" ry="22" fill="#e86b4a" />
      <circle cx="1160" cy="890" r="10" fill="#f6d743" />
      <circle cx="1200" cy="896" r="9" fill="#f6d743" />
    </Svg>
  );
}

/* ------------------------------- train station ------------------------------- */

function StationBack() {
  const rows = [
    ["G101", "上海", "08:00", "6"],
    ["G105", "上海", "09:30", "8"],
    ["G23", "北京", "14:20", "3"],
    ["D311", "南京", "15:05", "2"],
  ];
  return (
    <Svg label="A railway ticket hall">
      <defs>
        <linearGradient id="st-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe8f1" />
          <stop offset="1" stopColor="#c9d6e3" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#st-wall)" />
      {/* skylight beams */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={i} x={i * 220 - 40} y="0" width="16" height="120" fill="#aab8c6" transform={`skewX(-12)`} />
      ))}
      <rect y="110" width="1600" height="14" fill="#9fb0c1" />
      {/* departure board */}
      <g transform="translate(-230 -20) scale(0.8)">
        <rect x="380" y="150" width="840" height="320" rx="14" fill="#14181f" />
        <g fontFamily={ZH} fontSize="34">
          {["车次", "终点", "开车", "站台"].map((h, i) => (
            <text key={h} x={430 + i * 200} y="205" fill="#9fb3c8">
              {h}
            </text>
          ))}
          {rows.map((r, row) =>
            r.map((cell, i) => (
              <text key={`${row}-${i}`} x={430 + i * 200} y={262 + row * 54} fill={i === 2 ? "#ffcf4a" : "#7cf0a8"} fontFamily={i === 1 ? ZH : "monospace"}>
                {cell}
              </text>
            )),
          )}
        </g>
      </g>
      {/* clock */}
      <circle cx="1380" cy="260" r="80" fill="#fff" stroke="#3b4a5a" strokeWidth="10" />
      <path d="M1380 260 L1380 206 M1380 260 L1414 276" stroke="#1f2937" strokeWidth="8" strokeLinecap="round" />
      <circle cx="1380" cy="260" r="7" fill="#1f2937" />
      {/* signs */}
      <rect x="1240" y="380" width="200" height="80" rx="10" fill="#1f2f57" />
      <text x="1340" y="433" textAnchor="middle" fontSize="38" fill="#fff" fontFamily={ZH}>售票处</text>
      <rect x="1240" y="480" width="200" height="60" rx="10" fill="#2e7d4f" />
      <text x="1340" y="521" textAnchor="middle" fontSize="28" fill="#fff" fontFamily={ZH}>出口 →</text>
      {/* back wall of the ticket window */}
      <rect x="470" y="260" width="660" height="600" fill="#e9eef4" />
      <rect y="860" width="1600" height="140" fill="#b5c2cf" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={i * 200} y1="800" x2={i * 200 - 120} y2="1000" stroke="#a3b1bf" strokeWidth="3" />
      ))}
    </Svg>
  );
}

function StationFront() {
  return (
    <Svg>
      {/* ticket window: glass with frame, counter below */}
      <rect x="440" y="214" width="720" height="40" fill="#1f2f57" />
      <text x="800" y="245" textAnchor="middle" fontSize="28" fill="#fff" fontFamily={ZH}>3号窗口 售票</text>
      <rect x="440" y="254" width="22" height="600" fill="#1f2f57" />
      <rect x="1138" y="254" width="22" height="600" fill="#1f2f57" />
      <rect x="462" y="254" width="676" height="600" fill="#cfe8ff" opacity="0.12" />
      <path d="M500 300 l120 0 M530 322 l60 0 M1040 700 l60 0" stroke="#ffffff" strokeWidth="6" opacity="0.5" strokeLinecap="round" />
      <ellipse cx="800" cy="790" rx="60" ry="20" fill="none" stroke="#9fb3c8" strokeWidth="4" opacity="0.7" />
      <rect x="400" y="850" width="800" height="36" fill="#8b9bb0" />
      <rect x="400" y="884" width="800" height="116" fill="#d5dde6" />
      <rect x="720" y="856" width="160" height="14" rx="7" fill="#5b6b80" />
    </Svg>
  );
}

/* -------------------------------- street market ------------------------------- */

function MarketBack() {
  return (
    <Svg label="A street market">
      <defs>
        <linearGradient id="mk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0f5" />
          <stop offset="1" stopColor="#e6f6ff" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#mk-sky)" />
      <circle cx="1350" cy="140" r="60" fill="#fff4b8" />
      {[[60, 300, 220, 400], [300, 240, 180, 460], [1200, 260, 200, 440], [1420, 320, 200, 380]].map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill={["#e3c9a8", "#d7b896", "#e8d3b6", "#d1b08c"][i]} />
          {Array.from({ length: 6 }, (_, k) => (
            <rect key={k} x={x + 24 + (k % 3) * 56} y={y + 30 + Math.floor(k / 3) * 90} width="34" height="50" fill="#9fc6dd" />
          ))}
        </g>
      ))}
      {/* string lights */}
      <path d="M0 120 Q400 200 800 130 Q1200 60 1600 140" stroke="#5a4636" strokeWidth="3" fill="none" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = i * 100 + 50;
        const y = 130 + Math.round(Math.sin((i / 15) * Math.PI * 2) * -30);
        return <circle key={i} cx={x} cy={y + 14} r="10" fill={["#ffd65a", "#ff8a65", "#9ce37d", "#7fd0ff"][i % 4]} />;
      })}
      {/* awning over the stall */}
      <rect x="380" y="200" width="840" height="20" fill="#7a5235" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${380 + i * 70} 220 l70 0 l0 110 q-35 30 -70 0 Z`} fill={i % 2 ? "#ffffff" : "#e2392d"} />
      ))}
      <rect x="400" y="330" width="16" height="420" fill="#7a5235" />
      <rect x="1184" y="330" width="16" height="420" fill="#7a5235" />
      {/* hanging price sign */}
      <rect x="1000" y="360" width="170" height="110" rx="8" fill="#fff8e1" stroke="#7a5235" strokeWidth="5" />
      <text x="1085" y="405" textAnchor="middle" fontSize="30" fill="#b3261e" fontFamily={ZH}>新鲜水果</text>
      <text x="1085" y="448" textAnchor="middle" fontSize="26" fill="#3d2618" fontFamily={ZH}>今天很甜！</text>
      <rect y="760" width="1600" height="240" fill="#c9b49a" />
    </Svg>
  );
}

function Crate({ x, fruit, label }: { x: number; fruit: "apple" | "banana" | "orange"; label: string }) {
  const r = seq(x, 40);
  return (
    <g>
      {fruit === "banana"
        ? Array.from({ length: 7 }, (_, i) => (
            <path key={i} d={`M${x + 20 + i * 34} ${760 - (i % 2) * 14} q30 30 70 -6 q-36 16 -70 6 Z`} fill="#f6d743" stroke="#c9a52b" strokeWidth="3" />
          ))
        : Array.from({ length: 14 }, (_, i) => (
            <circle
              key={i}
              cx={x + 30 + (i % 7) * 40 + Math.round(r[i] * 6)}
              cy={770 - Math.floor(i / 7) * 34 - Math.round(r[i + 14] * 6)}
              r="24"
              fill={fruit === "apple" ? (i % 3 ? "#d93a2e" : "#e85b3a") : "#f59a23"}
              stroke={fruit === "apple" ? "#a92a20" : "#c97412"}
              strokeWidth="2"
            />
          ))}
      <rect x={x} y="780" width="320" height="170" rx="8" fill="#b07a45" />
      <rect x={x} y="820" width="320" height="10" fill="#8f5f33" />
      <rect x={x} y="880" width="320" height="10" fill="#8f5f33" />
      <rect x={x + 70} y="900" width="180" height="58" rx="8" fill="#fff8e1" stroke="#7a5235" strokeWidth="4" />
      <text x={x + 160} y="940" textAnchor="middle" fontSize="30" fill="#3d2618" fontFamily={ZH}>
        {label}
      </text>
    </g>
  );
}

function MarketFront() {
  return (
    <Svg>
      <g transform="translate(0 50)">
      <Crate x={300} fruit="apple" label="苹果 8元/斤" />
      <Crate x={640} fruit="orange" label="橙子 6元/斤" />
      <Crate x={980} fruit="banana" label="香蕉 5元/斤" />
      </g>
    </Svg>
  );
}

/* ---------------------------------- exports ---------------------------------- */

export const SCENE_ART: Record<string, { back: () => React.ReactNode; front: () => React.ReactNode; tint: string }> = {
  cafe: { back: CafeBack, front: CafeFront, tint: "#e8cfae" },
  store: { back: StoreBack, front: StoreFront, tint: "#d9e0e8" },
  restaurant: { back: RestaurantBack, front: RestaurantFront, tint: "#8e3029" },
  station: { back: StationBack, front: StationFront, tint: "#c9d6e3" },
  market: { back: MarketBack, front: MarketFront, tint: "#c9b49a" },
};
