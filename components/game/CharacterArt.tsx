"use client";
/**
 * Anime-style character portraits drawn in SVG. One shared style, many looks:
 * hair style, eye shape, outfit, colours and accessories come from CharacterLook.
 * Expressions change brows, eyes and mouth; characters blink, breathe and move their
 * mouth while talking.
 */
import { useEffect, useId, useState } from "react";
import type { CharacterLook, Expression } from "@/lib/game/scenes";

/* ------------------------------- colour helpers ------------------------------- */

function mix(hex: string, target: number, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 255;
    return Math.round(v + (target - v) * amount);
  };
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
const darken = (hex: string, a: number) => mix(hex, 0, a);
const lighten = (hex: string, a: number) => mix(hex, 255, a);

const LINE = "#3a2a2a";

/** Stubble dots around the chin; rounded so server and browser render identical numbers. */
const STUBBLE: [number, number][] = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 21) * Math.PI;
  return [Math.round((200 + Math.cos(a) * 26 * (i % 2 ? 0.8 : 1)) * 10) / 10, Math.round((308 + Math.sin(a) * 14 + (i % 3)) * 10) / 10];
});
const MOUTH = "#9b3b3b";

/* ---------------------------------- hair ---------------------------------- */

function HairBack({ look }: { look: CharacterLook }) {
  return (
    <g stroke={darken(look.hair.shade, 0.35)} strokeWidth="2" strokeLinejoin="round">
      <HairBackShape look={look} />
    </g>
  );
}

function HairBackShape({ look }: { look: CharacterLook }) {
  const { color, shade } = look.hair;
  switch (look.hair.style) {
    case "bob":
      return <path d="M108 206 C100 116 150 80 200 80 C250 80 300 116 292 206 L294 312 Q282 330 262 320 L262 252 L138 252 L138 320 Q118 330 106 312 Z" fill={shade} />;
    case "twintails":
      return (
        <g fill={shade}>
          <path d="M124 150 C68 168 52 262 74 344 C86 388 64 424 82 466 C112 410 132 340 128 262 C126 212 132 182 146 162 Z" />
          <path d="M276 150 C332 168 348 262 326 344 C314 388 336 424 318 466 C288 410 268 340 272 262 C274 212 268 182 254 162 Z" />
          <path d="M112 206 C106 118 154 84 200 84 C246 84 294 118 288 206 L282 256 L118 256 Z" />
        </g>
      );
    case "messy":
      return <path d="M116 212 C110 140 150 106 200 106 C250 106 290 140 284 212 L288 262 L112 262 Z" fill={color} />;
    case "curly":
      return (
        <g fill={shade}>
          {[
            [128, 156, 36],
            [156, 112, 38],
            [200, 96, 40],
            [244, 112, 38],
            [272, 156, 36],
            [114, 206, 32],
            [286, 206, 32],
            [118, 252, 28],
            [282, 252, 28],
            [132, 290, 22],
            [268, 290, 22],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "spiky":
      return <path d="M114 212 C108 128 150 90 200 90 C250 90 292 128 286 212 L284 258 L116 258 Z" fill={shade} />;
    case "neat":
      return <path d="M122 212 C118 150 156 120 200 120 C244 120 282 150 278 212 L276 244 L124 244 Z" fill={color} />;
    case "bun":
      return (
        <g>
          <circle cx="200" cy="84" r="36" fill={shade} />
          <path d="M176 70 Q200 56 224 70" stroke={lighten(color, 0.3)} strokeWidth="4" fill="none" opacity="0.7" />
          <path d="M118 212 C112 138 156 104 200 104 C244 104 288 138 282 212 L282 246 L118 246 Z" fill={shade} />
        </g>
      );
  }
}

function HairFront({ look }: { look: CharacterLook }) {
  return (
    <g stroke={darken(look.hair.color, 0.4)} strokeWidth="2" strokeLinejoin="round">
      <HairFrontShape look={look} />
    </g>
  );
}

function HairFrontShape({ look }: { look: CharacterLook }) {
  const { color, shade } = look.hair;
  const shine = lighten(color, 0.35);
  switch (look.hair.style) {
    case "bob":
      return (
        <g>
          <path
            d="M124 204 C118 128 160 94 200 94 C246 94 284 128 278 204 L272 218 C264 188 252 166 238 154 C240 176 232 194 218 204 C222 182 216 162 206 150 C196 174 180 192 158 200 C166 184 166 170 160 158 C148 172 136 192 132 218 Z"
            fill={color}
          />
          <path d="M126 204 Q114 262 128 322 Q142 304 144 270 Q142 232 148 208 Z" fill={color} />
          <path d="M274 204 Q286 262 272 322 Q258 304 256 270 Q258 232 252 208 Z" fill={color} />
          <path d="M150 122 Q200 100 252 124" stroke={shine} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.45" />
        </g>
      );
    case "twintails":
      return (
        <g>
          <path
            d="M124 206 C120 128 162 96 200 96 C238 96 280 128 276 206 L264 196 L258 212 L246 192 L234 208 L224 188 L212 206 L200 186 L188 206 L176 188 L166 208 L154 192 L142 212 L136 196 Z"
            fill={color}
          />
          <path d="M126 200 Q118 250 132 296 Q140 270 140 240 Z" fill={color} />
          <path d="M274 200 Q282 250 268 296 Q260 270 260 240 Z" fill={color} />
          <circle cx="126" cy="156" r="11" fill="#ff7eb6" />
          <circle cx="274" cy="156" r="11" fill="#ff7eb6" />
          <path d="M152 120 Q200 102 248 120" stroke={shine} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.4" />
        </g>
      );
    case "messy":
      return (
        <g>
          <path d="M126 214 L130 186 L140 202 L146 178 L156 198 L160 184 L244 184 L250 198 L254 178 L262 202 L270 186 L274 214 L266 206 L256 214 L246 196 L154 196 L144 214 L134 206 Z" fill={color} />
          <path d="M126 214 L124 252 L134 246 L136 220 Z" fill={color} />
          <path d="M274 214 L276 252 L266 246 L264 220 Z" fill={color} />
          <path d="M128 226 L132 244 M270 226 L268 244" stroke={shade} strokeWidth="3" opacity="0.8" />
        </g>
      );
    case "curly":
      return (
        <g>
          <g fill={color}>
            {[
              [146, 160, 22],
              [170, 136, 24],
              [200, 128, 25],
              [230, 136, 24],
              [254, 160, 22],
              [134, 186, 17],
              [266, 186, 17],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          <g stroke={lighten(color, 0.25)} strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round">
            <path d="M162 132 q8 -8 14 0" />
            <path d="M194 122 q8 -8 14 0" />
            <path d="M226 130 q8 -8 14 0" />
            <path d="M140 156 q8 -8 14 0" />
            <path d="M248 156 q8 -8 14 0" />
          </g>
        </g>
      );
    case "spiky":
      return (
        <g>
          <path
            d="M122 210 L116 150 L142 170 L140 118 L166 146 L178 92 L198 138 L222 90 L232 140 L260 112 L258 162 L286 148 L278 210 L264 186 L252 202 L238 178 L224 198 L208 172 L194 198 L178 176 L166 198 L152 182 L142 206 Z"
            fill={color}
          />
          <path d="M202 96 Q214 56 240 66 Q216 70 208 100 Z" fill={color} />
          <path d="M160 128 L178 112 M220 116 L236 130" stroke={shine} strokeWidth="5" strokeLinecap="round" opacity="0.5" />
        </g>
      );
    case "neat":
      return (
        <g>
          <path d="M124 214 C122 172 152 152 200 150 C248 152 278 172 276 214 L266 192 C238 176 194 174 168 190 L150 184 L134 200 Z" fill={color} />
          <path d="M124 214 L124 246 L132 240 L134 214 Z M276 214 L276 246 L268 240 L266 214 Z" fill={color} />
        </g>
      );
    case "bun":
      return (
        <g>
          <path d="M126 210 C124 152 160 116 200 114 C240 116 276 152 274 210 C264 172 236 148 200 146 C164 148 136 172 126 210 Z" fill={color} />
          <path d="M150 140 Q170 128 190 126 M210 126 Q232 128 252 140 M140 168 Q160 150 180 146" stroke={shade} strokeWidth="2.5" fill="none" opacity="0.7" />
        </g>
      );
  }
}

/* ---------------------------------- face ---------------------------------- */

function Brows({ expression, color }: { expression: Expression; color: string }) {
  const left: Record<Expression, string> = {
    neutral: "M148 204 Q166 196 184 202",
    happy: "M148 200 Q166 190 184 198",
    surprised: "M148 192 Q166 180 184 190",
    confused: "M148 206 Q166 200 184 196",
    thinking: "M148 204 Q166 198 184 204",
    annoyed: "M148 196 Q166 200 186 210",
  };
  const right: Partial<Record<Expression, string>> = {
    confused: "M252 192 Q234 186 216 196",
    thinking: "M252 196 Q234 186 216 194",
  };
  const mirrored = (d: string) => d.replace(/(\d+) (\d+)/g, (_, x, y) => `${400 - Number(x)} ${y}`);
  return (
    <g stroke={color} strokeWidth="4.5" strokeLinecap="round" fill="none">
      <path d={left[expression]} />
      <path d={right[expression] ?? mirrored(left[expression])} />
    </g>
  );
}

function Eye({ look, expression, side, clip }: { look: CharacterLook; expression: Expression; side: "l" | "r"; clip: string }) {
  const shape = look.eyes.shape;
  const iris = look.eyes.color;
  // Drawn for the left eye; the right eye is mirrored.
  const grow = "translate(166 238) scale(1.1) translate(-166 -238)";
  const t = side === "r" ? `translate(400 0) scale(-1 1) ${grow}` : grow;

  if (expression === "happy") {
    return (
      <g transform={t}>
        <path d="M146 242 Q166 222 186 242" stroke={LINE} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  const lidDrop = shape === "sleepy" || expression === "annoyed" ? 10 : 0;
  const tall = shape === "sharp" ? 0.82 : expression === "surprised" ? 1.12 : 1;
  const irisR = expression === "surprised" ? 10 : 13;
  // Looking up and to one side while thinking.
  const look_ = expression === "thinking" ? { dx: 4, dy: -4 } : { dx: 0, dy: 0 };
  const cy = 238;
  const top = cy - 24 * tall + lidDrop;
  const bottom = cy + 18 * tall;
  const white = `M144 ${cy} Q146 ${top} 166 ${top - 2} Q186 ${top} 188 ${cy - 2} Q186 ${bottom} 166 ${bottom + 1} Q146 ${bottom} 144 ${cy} Z`;
  const gentle = shape === "gentle";
  return (
    <g transform={t}>
      <defs>
        <clipPath id={`${clip}-${side}`}>
          <path d={white} />
        </clipPath>
        <linearGradient id={`${clip}-${side}-iris`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={darken(iris, 0.45)} />
          <stop offset="0.6" stopColor={iris} />
          <stop offset="1" stopColor={lighten(iris, 0.35)} />
        </linearGradient>
      </defs>
      <path d={white} fill="#ffffff" />
      <g clipPath={`url(#${clip}-${side})`}>
        <ellipse cx={167 + look_.dx} cy={cy + 2 + look_.dy} rx={irisR} ry={irisR * 1.25 * tall} fill={`url(#${clip}-${side}-iris)`} />
        <ellipse cx={167 + look_.dx} cy={cy + 3 + look_.dy} rx={irisR * 0.45} ry={irisR * 0.6 * tall} fill={darken(iris, 0.7)} />
        <circle cx={172 + look_.dx} cy={cy - 6 + look_.dy} r={4.5} fill="#fff" />
        <circle cx={162 + look_.dx} cy={cy + 9 + look_.dy} r={2} fill="#fff" opacity="0.85" />
        {lidDrop ? <rect x="140" y={top - 14} width="52" height="14" fill={look.skin} /> : null}
      </g>
      {/* upper lashes with a small flick at the outer corner */}
      <path
        d={`M${gentle ? 143 : 140} ${cy - 4 + (gentle ? 4 : 0)} Q148 ${top - 4} 168 ${top - 4} Q184 ${top - 3} 192 ${cy - 12 + lidDrop / 2} L190 ${cy - 7 + lidDrop / 2} Q182 ${top + 4} 168 ${top + 3} Q152 ${top + 4} 145 ${cy + 2} Z`}
        fill={LINE}
      />
      {gentle ? null : <path d={`M144 ${cy - 6} L134 ${cy - 14} L146 ${cy - 10} Z`} fill={LINE} />}
      <path d={`M150 ${bottom - 1} Q166 ${bottom + 6} 182 ${bottom - 2}`} stroke={LINE} strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
    </g>
  );
}

function Mouth({ expression, open }: { expression: Expression; open: boolean }) {
  if (open) {
    const big = expression === "happy" || expression === "surprised";
    return (
      <g>
        <path d={big ? "M186 288 Q200 292 214 288 Q211 308 200 309 Q189 308 186 288 Z" : "M191 291 Q200 289 209 291 Q207 303 200 304 Q193 303 191 291 Z"} fill={MOUTH} />
        <path d={big ? "M192 302 Q200 296 208 302 Q204 308 200 308 Q196 308 192 302 Z" : "M195 300 Q200 297 205 300 Q202 303 200 303 Q198 303 195 300 Z"} fill="#e8838a" />
      </g>
    );
  }
  switch (expression) {
    case "happy":
      return (
        <g>
          <path d="M184 286 Q200 290 216 286 Q213 304 200 306 Q187 304 184 286 Z" fill={MOUTH} />
          <path d="M191 299 Q200 294 209 299 Q205 305 200 305 Q195 305 191 299 Z" fill="#e8838a" />
        </g>
      );
    case "surprised":
      return <ellipse cx="200" cy="297" rx="6" ry="8" fill={MOUTH} />;
    case "confused":
      return <path d="M187 297 Q193 290 200 296 Q207 302 213 295" stroke={LINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
    case "thinking":
      return <path d="M197 297 Q205 292 212 296" stroke={LINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
    case "annoyed":
      return <path d="M189 299 Q200 291 211 299" stroke={LINE} strokeWidth="2.8" fill="none" strokeLinecap="round" />;
    default:
      return <path d="M190 292 Q200 299 210 292" stroke={LINE} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  }
}

/* --------------------------------- outfits --------------------------------- */

const BODY = "M40 560 C46 452 110 400 180 378 Q200 386 220 378 C290 400 354 452 360 560 Z";

function Outfit({ look, clip }: { look: CharacterLook; clip: string }) {
  const { main, accent, shirt } = look.outfit;
  const fold = darken(main, 0.18);
  let inner: React.ReactNode = null;
  switch (look.outfit.style) {
    case "apron":
      inner = (
        <>
          <path d={BODY} fill={shirt} />
          <path d="M178 380 L200 410 L222 380 L232 392 L200 424 L168 392 Z" fill={darken(shirt, 0.08)} />
          <path d="M152 420 L248 420 L262 560 L138 560 Z" fill={main} />
          <path d="M152 420 L140 388 M248 420 L260 388" stroke={main} strokeWidth="9" strokeLinecap="round" />
          <rect x="178" y="470" width="44" height="34" rx="6" fill={darken(main, 0.15)} />
          <circle cx="200" cy="448" r="11" fill={accent} />
          <path d="M194 448 h12 v5 a6 6 0 0 1 -12 0 Z" fill={main} />
        </>
      );
      break;
    case "hoodie":
      inner = (
        <>
          <path d={BODY} fill={main} />
          <path d="M134 392 Q200 448 266 392 Q256 370 200 368 Q144 370 134 392 Z" fill={fold} />
          <path d="M184 420 L180 486 M216 420 L220 486" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <circle cx="180" cy="490" r="5" fill={accent} />
          <circle cx="220" cy="490" r="5" fill={accent} />
          <path d="M140 510 Q200 500 260 510 L264 560 L136 560 Z" fill={fold} opacity="0.7" />
          <path d="M120 470 l8 -8 M276 470 l-8 -8" stroke={fold} strokeWidth="3" />
        </>
      );
      break;
    case "polo":
      inner = (
        <>
          <path d={BODY} fill={main} />
          <rect x="30" y="470" width="340" height="22" fill={accent} />
          <path d="M178 380 L200 416 L222 380 L240 398 L214 420 L186 420 L160 398 Z" fill={shirt} />
          <path d="M200 416 L200 452" stroke={fold} strokeWidth="3" />
          <circle cx="200" cy="432" r="3" fill={shirt} />
          <rect x="234" y="430" width="52" height="24" rx="4" fill="#fff" stroke={fold} strokeWidth="1.5" />
          <text x="260" y="448" textAnchor="middle" fontSize="15" fill={main} fontFamily="var(--font-zh)">王</text>
        </>
      );
      break;
    case "redApron":
      inner = (
        <>
          <path d={BODY} fill={shirt} />
          {[
            [90, 470],
            [120, 520],
            [300, 470],
            [280, 525],
            [70, 530],
            [330, 530],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill={accent} opacity="0.8" />
          ))}
          <path d="M150 414 L250 414 L266 560 L134 560 Z" fill={main} />
          <path d="M150 414 L156 380 M250 414 L244 380" stroke={main} strokeWidth="8" strokeLinecap="round" />
          <path d="M150 480 L250 480" stroke={darken(main, 0.2)} strokeWidth="3" />
          <text x="200" y="458" textAnchor="middle" fontSize="22" fill={accent} fontFamily="var(--font-zh)">陈记</text>
        </>
      );
      break;
    case "waiter":
      inner = (
        <>
          <path d={BODY} fill={shirt} />
          <path d="M60 470 C80 420 130 396 176 384 L200 486 L224 384 C270 396 320 420 340 470 L352 560 L48 560 Z" fill={main} />
          <circle cx="200" cy="506" r="4" fill="#888" />
          <circle cx="200" cy="532" r="4" fill="#888" />
          <path d="M200 488 L200 560" stroke="#555" strokeWidth="1.5" />
          <rect x="250" y="440" width="30" height="5" rx="2" fill="#f0f0f0" />
        </>
      );
      break;
    case "uniform":
      inner = (
        <>
          <path d={BODY} fill={main} />
          <path d="M176 382 L200 450 L224 382 Z" fill={shirt} />
          <path d="M196 396 L204 396 L208 450 L200 462 L192 450 Z" fill={darken(main, 0.3)} />
          <path d="M176 382 L162 420 L200 470 Z M224 382 L238 420 L200 470 Z" fill={darken(main, 0.15)} />
          <path d="M80 430 L140 404 L146 416 L86 444 Z M320 430 L260 404 L254 416 L314 444 Z" fill={accent} />
          {[490, 524].map((y) => (
            <circle key={y} cx="200" cy={y} r="5" fill={accent} />
          ))}
          <rect x="240" y="452" width="40" height="8" rx="2" fill={accent} opacity="0.85" />
        </>
      );
      break;
    case "cardigan":
      inner = (
        <>
          <path d={BODY} fill={shirt} />
          {[
            [190, 420],
            [210, 450],
            [196, 488],
            [212, 520],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill="#b77cc8" opacity="0.8" />
          ))}
          <path d="M40 560 C46 452 110 400 172 380 L186 560 Z" fill={main} />
          <path d="M360 560 C354 452 290 400 228 380 L214 560 Z" fill={main} />
          <path d="M100 470 l14 0 M96 500 l14 0 M300 470 l-14 0 M304 500 l-14 0" stroke={darken(main, 0.25)} strokeWidth="3" />
          {[450, 490, 530].map((y) => (
            <circle key={y} cx="180" cy={y} r="5" fill={accent} />
          ))}
        </>
      );
      break;
  }
  return (
    <g>
      <defs>
        <clipPath id={`${clip}-body`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <defs>
        <linearGradient id={`${clip}-shade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.3" stopColor="#000" stopOpacity="0" />
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip}-body)`}>
        {inner}
        <rect x="0" y="360" width="400" height="200" fill={`url(#${clip}-shade)`} />
      </g>
      <path d={BODY} fill="none" stroke={darken(main, 0.45)} strokeWidth="2" opacity="0.6" />
      {look.accessories.includes("bowTie") ? (
        <g fill={accent}>
          <path d="M200 382 L180 372 L180 394 Z" />
          <path d="M200 382 L220 372 L220 394 Z" />
          <circle cx="200" cy="383" r="5" />
        </g>
      ) : null}
    </g>
  );
}

/* --------------------------------- headgear -------------------------------- */

function Headgear({ look }: { look: CharacterLook }) {
  const { main, accent } = look.outfit;
  if (look.accessories.includes("storeCap")) {
    return (
      <g>
        <path d="M120 176 C118 108 158 80 200 80 C242 80 282 108 280 176 Z" fill={main} />
        <path d="M158 92 Q200 80 242 92" stroke={lighten(main, 0.3)} strokeWidth="4" fill="none" opacity="0.6" />
        <path d="M116 172 Q210 152 300 182 Q304 196 288 198 Q206 178 118 190 Z" fill={darken(main, 0.25)} />
        <circle cx="200" cy="128" r="17" fill={accent} />
        <text x="200" y="135" textAnchor="middle" fontSize="18" fill="#fff" fontFamily="var(--font-zh)">便</text>
      </g>
    );
  }
  if (look.accessories.includes("officerCap")) {
    return (
      <g>
        <path d="M104 152 Q108 98 200 94 Q292 98 296 152 L282 172 L118 172 Z" fill={main} />
        <rect x="118" y="160" width="164" height="20" fill="#16161c" />
        <rect x="118" y="164" width="164" height="4" fill={accent} />
        <path d="M118 178 Q200 200 282 178 L288 190 Q200 218 112 190 Z" fill="#111" />
        <circle cx="200" cy="132" r="14" fill={accent} />
        <path d="M200 122 l3 7 h7 l-6 4 l2 7 l-6 -4 l-6 4 l2 -7 l-6 -4 h7 Z" fill={main} />
      </g>
    );
  }
  return null;
}

/* ------------------------------- the character ------------------------------ */

export function CharacterArt({
  look,
  expression = "neutral",
  talking = false,
  className = "",
  label,
  blinkDelay = 0,
}: {
  look: CharacterLook;
  expression?: Expression;
  talking?: boolean;
  className?: string;
  label?: string;
  /** Seconds, so characters don't all blink at the same time. */
  blinkDelay?: number;
}) {
  const clip = useId().replace(/:/g, "");
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (!talking) return;
    const id = setInterval(() => setMouthOpen((o) => !o), 150);
    return () => {
      clearInterval(id);
      setMouthOpen(false);
    };
  }, [talking]);

  const skinShade = darken(look.skin, 0.12);
  const outline = darken(look.skin, 0.38);
  const hasFringe = ["bob", "twintails", "spiky", "messy", "curly"].includes(look.hair.style);
  const browColor = look.hair.style === "bun" ? darken(look.hair.color, 0.35) : darken(look.hair.color, 0.1);
  const acc = (a: string) => look.accessories.includes(a as never);

  return (
    <svg viewBox="0 0 400 560" className={`character ${className}`} role="img" aria-label={label}>
      <g className="character-breathe">
        <HairBack look={look} />
        {/* neck and body */}
        <path d="M180 316 L180 372 Q200 386 220 372 L220 316 Z" fill={look.skin} stroke={outline} strokeWidth="2" />
        <path d="M180 326 Q200 350 220 326 L220 350 Q200 364 180 350 Z" fill={skinShade} opacity="0.6" />
        <Outfit look={look} clip={clip} />
        {/* ears and face */}
        <ellipse cx="127" cy="234" rx="11" ry="19" fill={look.skin} stroke={outline} strokeWidth="2" />
        <ellipse cx="273" cy="234" rx="11" ry="19" fill={look.skin} stroke={outline} strokeWidth="2" />
        <path d="M128 200 C128 138 162 104 200 104 C238 104 272 138 272 200 C272 258 252 296 222 322 Q200 340 178 322 C148 296 128 258 128 200 Z" fill={look.skin} stroke={outline} strokeWidth="2.2" />
        {/* soft shadow under the fringe */}
        {hasFringe ? <path d="M132 206 Q200 170 268 206 L268 222 Q200 186 132 222 Z" fill={skinShade} opacity="0.35" /> : null}
        {acc("earrings") ? (
          <g stroke="#e0b030" strokeWidth="3" fill="none">
            <circle cx="126" cy="258" r="7" />
            <circle cx="274" cy="258" r="7" />
          </g>
        ) : null}
        {/* cheeks */}
        <ellipse cx="150" cy="276" rx="14" ry="6" fill="#ff8a8a" opacity={expression === "happy" ? 0.45 : 0.22} />
        <ellipse cx="250" cy="276" rx="14" ry="6" fill="#ff8a8a" opacity={expression === "happy" ? 0.45 : 0.22} />
        {acc("freckles") ? (
          <g fill={darken(look.skin, 0.3)} opacity="0.6">
            {[
              [144, 266],
              [152, 270],
              [160, 265],
              [240, 265],
              [248, 270],
              [256, 266],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.6" />
            ))}
          </g>
        ) : null}
        {acc("wrinkles") ? (
          <g stroke={darken(look.skin, 0.25)} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7">
            <path d="M136 236 l-8 4 M136 244 l-8 2" />
            <path d="M264 236 l8 4 M264 244 l8 2" />
            <path d="M176 282 Q172 294 178 304 M224 282 Q228 294 222 304" />
          </g>
        ) : null}
        {acc("stubble") ? (
          <g fill={darken(look.skin, 0.4)} opacity="0.35">
            {STUBBLE.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.4" />
            ))}
          </g>
        ) : null}
        {/* nose and mouth */}
        <path d="M199 262 Q204 268 199 273" stroke={skinShade} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Mouth expression={expression} open={talking && mouthOpen} />
        {/* eyes blink together */}
        <g className="character-eyes" style={{ animationDelay: `${blinkDelay}s` }}>
          <Eye look={look} expression={expression} side="l" clip={clip} />
          <Eye look={look} expression={expression} side="r" clip={clip} />
        </g>
        {acc("glasses") ? (
          <g stroke="#2b2b2b" strokeWidth="3" fill="#bfe3ff" fillOpacity="0.12">
            <circle cx="166" cy="238" r="25" />
            <circle cx="234" cy="238" r="25" />
            <path d="M191 236 Q200 230 209 236 M141 232 L128 226 M259 232 L272 226" fill="none" />
          </g>
        ) : null}
        <HairFront look={look} />
        <Brows expression={expression} color={browColor} />
        {acc("hairClip") ? <rect x="232" y="142" width="26" height="8" rx="4" transform="rotate(-25 245 146)" fill="#f2c94c" /> : null}
        {acc("flowerPin") ? (
          <g transform="translate(254 112)">
            {[0, 72, 144, 216, 288].map((r) => (
              <ellipse key={r} cx="0" cy="-9" rx="6" ry="9" fill="#f28cb1" transform={`rotate(${r})`} />
            ))}
            <circle r="5" fill="#f7d154" />
          </g>
        ) : null}
        <Headgear look={look} />
        {/* expression marks */}
        {expression === "confused" || (acc("sweat") && expression !== "happy") ? (
          <path d="M286 176 Q296 194 290 202 Q282 206 278 198 Q278 188 286 176 Z" fill="#8fd3ff" stroke="#4aa3d8" strokeWidth="1.5" />
        ) : null}
        {expression === "annoyed" ? (
          <g stroke="#e0473a" strokeWidth="4" strokeLinecap="round" transform="translate(268 150)">
            <path d="M-10 -2 Q-4 -4 -2 -10 M2 -10 Q4 -4 10 -2 M10 2 Q4 4 2 10 M-2 10 Q-4 4 -10 2" fill="none" />
          </g>
        ) : null}
        {expression === "thinking" ? (
          <g fill={LINE} opacity="0.6">
            <circle cx="292" cy="150" r="4" />
            <circle cx="306" cy="136" r="5" />
            <circle cx="324" cy="118" r="6" />
          </g>
        ) : null}
        {expression === "surprised" ? (
          <g stroke={LINE} strokeWidth="3.5" strokeLinecap="round" opacity="0.7">
            <path d="M296 150 l14 -14 M300 168 l18 -4 M118 150 l-14 -14" />
          </g>
        ) : null}
      </g>
    </svg>
  );
}
