/* Veri Evreni · tek kalıcı WebGL dünyası ve kaydırma şefi.
   Her parçacığın her şekil için hedefi GPU'dadır; iki yuva (A, B) arasında uMix ile geçilir.
   Şekiller: 0 derinlik · 1 isim · 2 şerit · 3 yıl çubukları · 4/5 ekran mozaiği (iki dizilim) · 6 Konsol aşamaları
             7 ses dalgası · 8 yıldız alanı · 9 deneyim çizgisi · 10 araç çubukları · 11 kapanış küresi */
import * as THREE from 'three';

window.__veBoot = true;

const html = document.documentElement;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const norm = (v, a, b) => (b === a ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a), 0, 1));
const sstep = (a, b, v) => { const t = norm(v, a, b); return t * t * (3 - 2 * t); };
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));

const Site = (window.Site = window.Site || {});
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W0 = window.innerWidth;
const H0 = window.innerHeight;
const MOBILE = W0 < 768;
const N = W0 < 768 ? 12000 : W0 < 1100 ? 22000 : 32000;
const PIN_SEQ = W0 >= 900 && H0 >= 560;

const gsap = window.gsap;
const ST = window.ScrollTrigger;
const Split = window.SplitText;
const hasGSAP = !!(gsap && ST);
if (hasGSAP) gsap.registerPlugin(ST, ...(Split ? [Split] : []));

const SH = { START: 0, NAME: 1, RIBBON: 2, BARS: 3, IMG: 4, IMG2: 5, KONSOL: 6, WAVE: 7, STARS: 8, LINE: 9, TOOLS: 10, ORB: 11 };
const REPEL = [0, 1, 0.8, 0.55, 0, 0, 0.3, 0.3, 0.6, 0.45, 0.25, 0.6];
const SWIRL = [0.9, 0.75, 0.65, 0.6, 0.55, 0.55, 0.6, 0.6, 0.75, 0.6, 0.6, 0.7];

/* Sabit sahne defteri (birim: sahne içinde kaydırma, vh) */
const PIN = 400;
const L = {
  heroOut: [18, 52], name1: 40, ribbon0: 130, ribbon1: 150, bars0: 240, bars1: 366,
  yearsIn: [198, 224], yearsOut: [350, 378], labels: [228, 248], yearsBeat: 212,
  camIn: [150, 250], camOut: [364, 398], orbit: [150, 364], gotoYears: 296,
};
const BAR_MAX = 4.0;

let lenis = null;

/* ------------------------------------------------------------------ */
/* Gölgelendiriciler                                                    */
/* ------------------------------------------------------------------ */
const VERT = /* glsl */ `
attribute vec4 aName;
attribute vec4 aBar;
attribute vec4 aImg;
attribute vec4 aStar;
attribute vec4 aRand;

uniform float uTime;
uniform float uClock;
uniform float uDpr;
uniform float uN;
uniform vec2 uRes;
uniform vec2 uHalf;
uniform float uShapeA;
uniform float uShapeB;
uniform float uMix;
uniform vec4 uRectA;
uniform vec4 uRectB;
uniform float uCellA;
uniform float uCellB;
uniform sampler2D uTexA0;
uniform sampler2D uTexA1;
uniform sampler2D uTexB0;
uniform sampler2D uTexB1;
uniform float uSwapA;
uniform float uSwapB;
uniform float uNameSize;
uniform vec3 uChartO;
uniform float uChartS;
uniform vec4 uFaz[5];
uniform vec4 uWave;
uniform float uWaveN;
uniform vec4 uLine;
uniform float uNodeY[5];
uniform vec4 uTool[10];
uniform float uToolV[10];
uniform vec4 uOrb;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColAcc;
uniform vec3 uColDust;
uniform vec4 uVis;
uniform vec3 uMouse;
uniform vec3 uTrail[16];
uniform float uRad;
uniform float uAmp;
uniform float uRepel;
uniform float uSwirl;

varying vec3 vColor;
varying float vAlpha;
varying float vSquare;

const float PI = 3.14159265;
const float TAU = 6.2831853;

vec3 pxToWorld(vec2 px) {
  vec2 n = vec2(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0);
  return vec3(n * uHalf, 0.0);
}

void dust(float vis, out vec3 p, out vec3 c, out float a, out float s) {
  vec3 q = aStar.xyz * vec3(0.62, 0.56, 0.2);
  q.z -= 1.6;
  q.x += sin(uTime * 0.07 + aRand.z * TAU) * 0.3;
  q.y += cos(uTime * 0.055 + aRand.w * TAU) * 0.22;
  p = q;
  c = uColDust;
  a = (0.14 + 0.36 * aStar.w) * step(aRand.w, vis);
  s = 1.0 + 1.4 * aStar.w;
}

void stStart(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  p = position; c = uColA; a = 0.0; s = 1.3; q = 0.0;
}

void stName(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  if (aName.w > 0.5) {
    p = pxToWorld(aName.xy);
    c = mix(uColA, uColB, step(0.86, aRand.y));
    a = 0.9 + 0.1 * aRand.w + 0.05 * sin(uTime * 1.4 + aRand.z * 40.0);
    s = uNameSize; q = 1.0;
  } else {
    dust(uVis.x, p, c, a, s); q = 0.0;
  }
}

void stRibbon(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  float A = min(uHalf.x, uHalf.y);
  float Lx = uHalf.x * 1.3;
  float u = aRand.x + 0.01 * sin(uTime * 0.35 + aRand.z * TAU);
  float x = (u * 2.0 - 1.0) * Lx;
  float t = uTime * 0.3;
  float xa = x / A;
  float y = A * (0.24 * sin(xa * 1.2 + t) + 0.08 * sin(xa * 3.1 - t * 1.3));
  float z = A * 0.34 * cos(xa * 0.9 + t * 0.7);
  float tw = xa * 1.35 + t * 0.9;
  float b = aRand.y - 0.5;
  float w = A * (0.3 + 0.09 * sin(xa * 2.0 - t));
  vec3 nrm = vec3(0.0, cos(tw), sin(tw));
  vec3 bin = vec3(0.0, -sin(tw), cos(tw));
  p = vec3(x, y, z) + nrm * b * w + bin * (aRand.w - 0.5) * A * 0.03;
  c = mix(uColA, uColB, smoothstep(0.28, 0.48, abs(b)));
  a = 0.26 + 0.5 * (1.0 - smoothstep(0.15, 0.5, abs(b)));
  s = 1.35; q = 0.0;
}

void stBars(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  float role = aBar.w;
  q = 0.0;
  if (role > 2.5 && role < 3.5) { dust(uVis.y, p, c, a, s); return; }
  vec3 l = aBar.xyz;
  p = uChartO + l * uChartS;
  if (role < 0.5) { c = uColA; a = 0.62; s = 1.5; }
  else if (role < 1.5) { c = uColAcc; a = 0.92; s = 1.7; }
  else if (role < 2.5) { c = uColDust; a = 0.34 * (1.0 - smoothstep(1.0, 3.1, length(l.xz))); s = 1.2; }
  else { c = uColA; a = 0.5; s = 1.25; }
  a *= 0.86 + 0.14 * sin(uTime * 1.8 + aRand.z * 30.0);
}

void stImage(int slot, bool shuffled, out vec3 p, out vec3 c, out float a, out float s, out float q) {
  if (aImg.x < 0.0) { dust(uVis.z, p, c, a, s); q = 0.0; return; }
  vec2 uv = shuffled ? aImg.zw : aImg.xy;
  vec4 R = slot == 0 ? uRectA : uRectB;
  float cell = slot == 0 ? uCellA : uCellB;
  float sw = slot == 0 ? uSwapA : uSwapB;
  p = pxToWorld(R.xy + uv * R.zw);
  vec2 tuv = vec2(uv.x, 1.0 - uv.y);
  vec3 ca; vec3 cb;
  if (slot == 0) { ca = texture(uTexA0, tuv).rgb; cb = texture(uTexA1, tuv).rgb; }
  else { ca = texture(uTexB0, tuv).rgb; cb = texture(uTexB1, tuv).rgb; }
  float w = smoothstep(uv.x * 0.62, uv.x * 0.62 + 0.38, sw);
  float bump = sin(PI * w);
  c = mix(ca, cb, w) + bump * 0.05;
  p.z += bump * (0.22 + 0.4 * aRand.y);
  p.y += bump * (aRand.w - 0.5) * 0.06;
  a = 1.0; s = cell * (1.0 + bump * 0.35); q = 1.0;
}

void stKonsol(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  q = 0.0;
  if (aImg.x < 0.0) { dust(uVis.z, p, c, a, s); return; }
  vec2 uv = aImg.xy;
  int row = int(clamp(floor(uv.y * 5.0), 0.0, 4.0));
  float vv = fract(uv.y * 5.0);
  vec4 R = uFaz[row];
  if (row < 3) {
    // tamamlanan aşama: dolu çubuk (rastgele dağılım; ızgara çizgisi oluşmaz)
    p = pxToWorld(R.xy + vec2(aRand.z, fract(aRand.w * 13.7 + aRand.y * 3.1)) * R.zw);
    c = mix(uColA, uColB, step(0.92, aRand.w));
    a = 0.82 + 0.1 * sin(uTime * 1.6 + aRand.y * 40.0);
    s = 1.6;
  } else {
    float per = 2.0 * (R.z + R.w);
    float d = uv.x * per;
    vec2 o;
    if (d < R.z) o = vec2(d, 0.0);
    else if (d < R.z + R.w) o = vec2(R.z, d - R.z);
    else if (d < 2.0 * R.z + R.w) o = vec2(R.z - (d - R.z - R.w), R.w);
    else o = vec2(0.0, R.w - (d - 2.0 * R.z - R.w));
    float inner = step(0.45, aRand.w);
    vec2 fill = vec2(aRand.z, fract(aRand.y * 5.17 + vv)) * R.zw;
    o += vec2(aRand.y - 0.5, aRand.z - 0.5) * 0.8;
    p = pxToWorld(R.xy + mix(o, fill, inner));
    c = uColA;
    float pulse = 0.62 + 0.38 * sin(uTime * 1.7 + float(row) * 1.4);
    a = mix(0.75 * pulse, 0.045, inner);
    s = 1.2;
  }
}

void stWave(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  q = 0.0;
  if (aImg.x < 0.0) { dust(uVis.z, p, c, a, s); return; }
  vec2 uv = aImg.xy;
  float NB = uWaveN;
  float b = floor(uv.x * NB);
  float lx = fract(uv.x * NB);
  float xb = (b + 0.5) / NB;
  float t = uTime;
  float win = pow(sin(PI * xb), 0.75);
  float sp = (0.5 + 0.5 * sin(xb * 17.0 + t * 2.2)) * (0.55 + 0.45 * sin(xb * 5.3 - t * 1.15)) * (0.75 + 0.25 * sin(t * 3.4 + xb * 29.0));
  float amp = win * (0.1 + 0.9 * sp);
  vec4 R = uWave;
  float x = R.x + (b + 0.5 + (lx - 0.5) * 0.46) / NB * R.z;
  float y = R.y + R.w * 0.5 + (uv.y - 0.5) * R.w * amp;
  p = pxToWorld(vec2(x, y));
  bool cloud = xb > 0.4 && xb < 0.6;
  c = cloud ? uColAcc : uColA;
  a = 0.86; s = 1.3;
}

void stStars(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  vec3 st = aStar.xyz;
  float ang = uTime * 0.008;
  float cs = cos(ang), sn = sin(ang);
  st.xy = mat2(cs, -sn, sn, cs) * st.xy;
  p = st;
  float vis = step(uVis.w, aStar.w);
  float k = clamp((aStar.w - uVis.w) / max(1.0 - uVis.w, 0.001), 0.0, 1.0);
  c = mix(uColA, uColB, step(0.55, aRand.y));
  if (aRand.z > 0.993) c = uColAcc;
  float tw = 0.72 + 0.28 * sin(uTime * 0.9 + aRand.z * 50.0);
  a = vis * (0.32 + 0.68 * k * k) * tw;
  s = 1.5 + 3.4 * pow(k, 5.0);
  q = 0.0;
}

void stLine(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  q = 0.0;
  if (aRand.w < 0.72) {
    float y = mix(uLine.y, uLine.z, aRand.x);
    float x = uLine.x + (aRand.y - 0.5) * 1.4;
    p = pxToWorld(vec2(x, y));
    c = uColA;
    float lit = 1.0 - smoothstep(uLine.w - 24.0, uLine.w + 24.0, y);
    a = (0.12 + 0.55 * lit) * step(aRand.z, 0.42);
    s = 1.2;
  } else {
    int k = int(clamp(floor(aRand.y * 5.0), 0.0, 4.0));
    vec2 ctr = vec2(uLine.x, uNodeY[k]);
    float ang = aRand.x * TAU * 37.0;
    bool ring = aRand.z > 0.35;
    float r = ring ? 8.5 + (aRand.z - 0.5) * 1.1 : aRand.z * 3.6;
    p = pxToWorld(ctr + vec2(cos(ang), sin(ang)) * r);
    c = (k == 0) ? uColAcc : uColA;
    float litN = 1.0 - smoothstep(uLine.w - 40.0, uLine.w + 80.0, ctr.y);
    a = 0.42 + 0.55 * litN;
    s = 1.3;
  }
}

void stTools(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  q = 0.0;
  if (aImg.x < 0.0) { dust(uVis.z, p, c, a, s); return; }
  vec2 uv = aImg.xy;
  int row = int(clamp(floor(uv.y * 10.0), 0.0, 9.0));
  float vv = fract(uv.y * 10.0);
  vec4 R = uTool[row];
  float lv = uToolV[row];
  p = pxToWorld(R.xy + vec2(aRand.z * lv * R.z, fract(aRand.w * 13.7 + aRand.y * 3.1) * R.w));
  c = (row == 0) ? uColAcc : uColA;
  a = (0.68 + 0.12 * sin(uTime * 1.5 + aRand.y * 40.0)) * step(aRand.y, 0.7);
  s = 1.25;
}

void stOrb(out vec3 p, out vec3 c, out float a, out float s, out float q) {
  float i = aRand.x * (uN - 1.0);
  float y = 1.0 - 2.0 * (i + 0.5) / uN;
  float r = sqrt(max(0.0, 1.0 - y * y));
  float ph = i * 2.39996323;
  vec3 d = normalize(vec3(cos(ph) * r, y, sin(ph) * r) + (vec3(aRand.y, aRand.z, aRand.w) - 0.5) * 0.035);
  float ang = uTime * 0.05;
  float cs = cos(ang), sn = sin(ang);
  d.xz = mat2(cs, -sn, sn, cs) * d.xz;
  float ct = cos(0.42), stt = sin(0.42);
  d.yz = mat2(ct, -stt, stt, ct) * d.yz;
  float wpp = 2.0 * uHalf.y / uRes.y;
  p = pxToWorld(uOrb.xy) + d * uOrb.z * wpp;
  float front = d.z * 0.5 + 0.5;
  c = mix(uColDust, uColA, front);
  if (aRand.z > 0.996) c = uColAcc;
  a = step(aRand.w, 0.3) * (0.1 + 0.75 * front * front);
  s = 1.1 + 1.1 * front;
  q = 0.0;
}

void getShape(int id, int slot, out vec3 p, out vec3 c, out float a, out float s, out float q) {
  if (id <= 0) stStart(p, c, a, s, q);
  else if (id == 1) stName(p, c, a, s, q);
  else if (id == 2) stRibbon(p, c, a, s, q);
  else if (id == 3) stBars(p, c, a, s, q);
  else if (id == 4) stImage(slot, false, p, c, a, s, q);
  else if (id == 5) stImage(slot, true, p, c, a, s, q);
  else if (id == 6) stKonsol(p, c, a, s, q);
  else if (id == 7) stWave(p, c, a, s, q);
  else if (id == 8) stStars(p, c, a, s, q);
  else if (id == 9) stLine(p, c, a, s, q);
  else if (id == 10) stTools(p, c, a, s, q);
  else stOrb(p, c, a, s, q);
}

vec2 repel(vec2 qp) {
  float R2 = uRad * uRad;
  vec2 best = vec2(0.0);
  float bm = 0.0;
  if (uMouse.z > 0.001) {
    vec2 d = qp - uMouse.xy;
    float dd = dot(d, d);
    float f = exp(-dd / R2) * uMouse.z;
    bm = f;
    best = d * inversesqrt(dd + 1.0) * f;
  }
  if (bm < 0.0005 && uTrail[0].z < -50.0) return vec2(0.0);
  for (int k = 0; k < 16; k++) {
    vec3 tr = uTrail[k];
    float age = uClock - tr.z;
    if (age < 0.0 || age > 2.0) continue;
    vec2 d = qp - tr.xy;
    float dd = dot(d, d);
    if (dd > R2 * 5.0) continue;
    float env = exp(-age * 3.4) * cos(age * 10.5);
    float f = exp(-dd / R2) * env;
    if (abs(f) > bm) { bm = abs(f); best = d * inversesqrt(dd + 1.0) * f; }
  }
  float ang = (aRand.z - 0.5) * 1.1;
  float cs = cos(ang), sn = sin(ang);
  best = mat2(cs, -sn, sn, cs) * best;
  return best * uAmp * (0.55 + 0.9 * aRand.y);
}

void main() {
  int ia = int(uShapeA + 0.5);
  int ib = int(uShapeB + 0.5);
  vec3 pA; vec3 cA; float aA; float sA; float qA;
  vec3 pB; vec3 cB; float aB; float sB; float qB;
  getShape(ia, 0, pA, cA, aA, sA, qA);
  if (uMix > 0.0001) getShape(ib, 1, pB, cB, aB, sB, qB);
  else { pB = pA; cB = cA; aB = aA; sB = sA; qB = qA; }

  float f = uMix;
  float d = (aRand.x * 0.8 + aRand.y * 0.2) * 0.45;
  float t = clamp((f - d) / 0.55, 0.0, 1.0);
  float e = (ia == 0) ? 1.0 - pow(1.0 - t, 3.0) : t * t * t * (t * (t * 6.0 - 15.0) + 10.0);

  vec3 p = mix(pA, pB, e);
  float sw = sin(PI * e) * uSwirl * ((ia == 0) ? 1.2 : 1.0);
  vec3 n = vec3(
    sin(p.y * 0.8 + aRand.z * TAU + e * 3.0),
    cos(p.x * 0.6 + aRand.w * TAU - e * 2.0),
    sin((p.x + p.y) * 0.4 + aRand.y * TAU)
  );
  p += n * sw * (0.45 + aRand.y);
  bool imgPair = (ia == 4 || ia == 5) && (ib == 4 || ib == 5);
  if (imgPair) {
    // proje geçişi: mozaik soldan sağa kalkar, yeni renklerle yerine iner
    float lift = sin(PI * e);
    p.z += lift * (1.4 + 1.8 * aRand.y);
    p.x += lift * (aRand.z - 0.5) * 0.5;
    p.y += lift * (aRand.w - 0.5) * 0.35;
  }

  vec3 col = mix(cA, cB, e);
  float alpha = (ia == 0) ? aB * smoothstep(0.0, 0.45, t) : mix(aA, aB, e);
  float size = mix(sA, sB, e);
  float sq = mix(qA, qB, step(0.5, e));

  vec4 mv = viewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 disp = repel(ndc * uRes * 0.5) * uRepel;
  clip.xy += disp / (uRes * 0.5) * clip.w;
  gl_Position = clip;

  float dl = clamp(length(disp) / max(uAmp, 1.0), 0.0, 1.0);
  float persp = 10.0 / max(0.5, -mv.z);
  gl_PointSize = max(1.0, size * uDpr * persp * (1.0 + 0.3 * dl));
  vColor = col;
  vAlpha = alpha * (1.0 + 0.3 * dl);
  vSquare = sq;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vSquare;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float r = length(pc);
  float m = mix(1.0 - smoothstep(0.3, 0.5, r), 1.0, vSquare);
  float a = vAlpha * m;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, min(a, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                          */
/* ------------------------------------------------------------------ */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickSubset(count, off) {
  const keys = new Float32Array(N);
  const idx = new Uint32Array(N);
  for (let i = 0; i < N; i++) { keys[i] = (i * 0.6180339887 + off) % 1; idx[i] = i; }
  idx.sort((a, b) => keys[a] - keys[b]);
  return idx.slice(0, Math.min(count, N)).sort();
}
function offsetRect(el, root) {
  let x = 0; let y = 0; let n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  if (!n) {
    const a = el.getBoundingClientRect(); const b = root.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
function createRenderer() {
  try {
    const r = new THREE.WebGLRenderer({ canvas: $('#evren'), antialias: false, alpha: false, powerPreference: 'high-performance' });
    r.setClearColor(0x05060a, 1);
    return r;
  } catch (e) { return null; }
}

/* ------------------------------------------------------------------ */
/* Dünyayı kur                                                          */
/* ------------------------------------------------------------------ */
function buildWorld(renderer) {
  const rand = mulberry32(20261021);
  const view = { w: window.innerWidth, h: window.innerHeight };
  const half = new THREE.Vector2();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(view.w, view.h);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, view.w / view.h, 0.1, 200);
  cam.position.set(0, 0, 10);
  const setHalf = () => { half.y = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 10; half.x = half.y * cam.aspect; };
  setHalf();

  const aPos = new Float32Array(N * 3);
  const aName = new Float32Array(N * 4);
  const aBar = new Float32Array(N * 4);
  const aImg = new Float32Array(N * 4).fill(-1);
  const aStar = new Float32Array(N * 4);
  const aRand = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    aRand[i * 4] = i / (N - 1); aRand[i * 4 + 1] = rand(); aRand[i * 4 + 2] = rand(); aRand[i * 4 + 3] = rand();
    aStar[i * 4] = (rand() * 2 - 1) * 15; aStar[i * 4 + 1] = (rand() * 2 - 1) * 9.5; aStar[i * 4 + 2] = -34 + rand() * 37; aStar[i * 4 + 3] = rand();
    const ang = rand() * Math.PI * 2; const rad = 1.2 + Math.pow(rand(), 0.7) * 7.5;
    aPos[i * 3] = (aRand[i * 4] * 2 - 1) * 6 + Math.cos(ang) * rad * 0.6;
    aPos[i * 3 + 1] = Math.sin(ang) * rad * 0.7;
    aPos[i * 3 + 2] = -28 - rand() * 70;
  }

  /* yıl çubukları: sayfadaki projelerden hesaplanan sayılar */
  const years = (Site.counts && Site.counts.years) || [{ y: '2026', n: 1 }];
  const nY = years.length;
  const vMax = Math.max(...years.map((d) => d.n));
  const barX = (i) => i - (nY - 1) / 2;
  const barH = (v) => (v / vMax) * BAR_MAX;
  const BW = 0.56; const BD = 0.56;
  const barPts = [];
  const nBars = Math.floor(N * 0.6); const nGrid = Math.floor(N * 0.12); const nAxis = Math.floor(N * 0.03);
  const hs = years.map((d) => barH(d.n));
  const areas = hs.map((h) => BW * BD + 2 * BW * h + 2 * BD * h + 0.25);
  const sumA = areas.reduce((a, b) => a + b, 0);
  hs.forEach((h, i) => {
    const cx = barX(i); const role = i === nY - 1 ? 1 : 0;
    const n = Math.max(MOBILE ? 150 : 320, Math.round((nBars * areas[i]) / sumA));
    const nEdge = Math.round(n * 0.42);
    const x0 = cx - BW / 2; const x1 = cx + BW / 2; const z0 = -BD / 2; const z1 = BD / 2;
    const edges = [
      [x0, 0, z0, x0, h, z0], [x1, 0, z0, x1, h, z0], [x0, 0, z1, x0, h, z1], [x1, 0, z1, x1, h, z1],
      [x0, h, z0, x1, h, z0], [x0, h, z1, x1, h, z1], [x0, h, z0, x0, h, z1], [x1, h, z0, x1, h, z1],
      [x0, 0, z0, x1, 0, z0], [x0, 0, z1, x1, 0, z1], [x0, 0, z0, x0, 0, z1], [x1, 0, z0, x1, 0, z1],
    ];
    const elen = edges.map((e) => Math.hypot(e[3] - e[0], e[4] - e[1], e[5] - e[2]));
    const etot = elen.reduce((a, b) => a + b, 0);
    for (let k = 0; k < nEdge; k++) {
      let r = rand() * etot; let j = 0;
      while (r > elen[j] && j < 11) { r -= elen[j]; j++; }
      const e = edges[j]; const t = rand();
      barPts.push(lerp(e[0], e[3], t), lerp(e[1], e[4], t), lerp(e[2], e[5], t), role);
    }
    const faces = [BW * h, BW * h, BD * h, BD * h, BW * BD * 1.4];
    const ftot = faces.reduce((a, b) => a + b, 0);
    for (let k = nEdge; k < n; k++) {
      let r = rand() * ftot; let j = 0;
      while (r > faces[j] && j < 4) { r -= faces[j]; j++; }
      const u = rand(); const v = rand();
      if (j === 0) barPts.push(lerp(x0, x1, u), v * h, z1, role);
      else if (j === 1) barPts.push(lerp(x0, x1, u), v * h, z0, role);
      else if (j === 2) barPts.push(x0, v * h, lerp(z0, z1, u), role);
      else if (j === 3) barPts.push(x1, v * h, lerp(z0, z1, u), role);
      else barPts.push(lerp(x0, x1, u), h, lerp(z0, z1, v), role);
    }
  });
  {
    const gx = Math.max(3, (nY - 1) / 2 + 1);
    const linesX = []; for (let z = -1.5; z <= 1.501; z += 0.5) linesX.push(z);
    const linesZ = []; for (let x = -gx; x <= gx + 0.001; x += 0.5) linesZ.push(x);
    const lx = gx * 2;
    const totalLen = linesX.length * lx + linesZ.length * 3;
    for (let k = 0; k < nGrid; k++) {
      let r = rand() * totalLen;
      if (r < linesX.length * lx) { const li = Math.floor(r / lx); barPts.push(-gx + (r - li * lx), 0, linesX[li], 2); }
      else { r -= linesX.length * lx; const li = Math.min(linesZ.length - 1, Math.floor(r / 3)); barPts.push(linesZ[li], 0, -1.5 + (r - li * 3), 2); }
    }
    for (let k = 0; k < nAxis; k++) barPts.push(-gx + 0.15 + rand() * (lx - 0.3), 0, 0.52, 4);
  }
  {
    const count = barPts.length / 4;
    const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => barPts[a * 4] - barPts[b * 4]);
    const sel = pickSubset(count, 0.41);
    for (let i = 0; i < N; i++) aBar[i * 4 + 3] = 3;
    for (let j = 0; j < sel.length; j++) {
      const s = sel[j] * 4; const o = order[j] * 4;
      aBar[s] = barPts[o]; aBar[s + 1] = barPts[o + 1]; aBar[s + 2] = barPts[o + 2]; aBar[s + 3] = barPts[o + 3];
    }
  }

  /* ekran ızgarası: sıralı ve karışık iki dizilim (proje geçişlerinde parçacıklar yer değiştirir) */
  const imgK = Math.floor(N * 0.94);
  const cols = Math.round(Math.sqrt(imgK * 1.6));
  const rows = Math.floor(imgK / cols);
  {
    const total = cols * rows;
    const sel = pickSubset(total, 0.77);
    const uvs = new Float32Array(total * 2);
    let j = 0;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { uvs[j * 2] = (c + 0.5) / cols; uvs[j * 2 + 1] = (r + 0.5) / rows; j++; }
    const perm = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); const t = perm[i]; perm[i] = perm[k]; perm[k] = t; }
    for (let i = 0; i < total; i++) {
      const s = sel[i] * 4;
      aImg[s] = uvs[i * 2]; aImg[s + 1] = uvs[i * 2 + 1];
      aImg[s + 2] = uvs[perm[i] * 2]; aImg[s + 3] = uvs[perm[i] * 2 + 1];
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
  const nameAttr = new THREE.BufferAttribute(aName, 4);
  geo.setAttribute('aName', nameAttr);
  geo.setAttribute('aBar', new THREE.BufferAttribute(aBar, 4));
  geo.setAttribute('aImg', new THREE.BufferAttribute(aImg, 4));
  geo.setAttribute('aStar', new THREE.BufferAttribute(aStar, 4));
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 4));

  const placeholder = new THREE.DataTexture(new Uint8Array([10, 12, 16, 255]), 1, 1);
  placeholder.colorSpace = THREE.SRGBColorSpace;
  placeholder.needsUpdate = true;

  const v4 = (n) => Array.from({ length: n }, () => new THREE.Vector4(0, 0, 1, 1));
  const U = {
    uTime: { value: 0 }, uClock: { value: 0 }, uDpr: { value: dpr }, uN: { value: N },
    uRes: { value: new THREE.Vector2(view.w, view.h) }, uHalf: { value: half },
    uShapeA: { value: 0 }, uShapeB: { value: 1 }, uMix: { value: 0 },
    uRectA: { value: new THREE.Vector4(0, 0, 100, 62) }, uRectB: { value: new THREE.Vector4(0, 0, 100, 62) },
    uCellA: { value: 3 }, uCellB: { value: 3 },
    uTexA0: { value: placeholder }, uTexA1: { value: placeholder }, uTexB0: { value: placeholder }, uTexB1: { value: placeholder },
    uSwapA: { value: 0 }, uSwapB: { value: 0 },
    uNameSize: { value: 1.4 },
    uChartO: { value: new THREE.Vector3() }, uChartS: { value: 1 },
    uFaz: { value: v4(5) }, uWave: { value: new THREE.Vector4(0, 0, 100, 40) }, uWaveN: { value: MOBILE ? 46 : 76 },
    uLine: { value: new THREE.Vector4(0, 0, 1, 0) }, uNodeY: { value: [0, 0, 0, 0, 0] },
    uTool: { value: v4(10) }, uToolV: { value: new Array(10).fill(0) },
    uOrb: { value: new THREE.Vector4(0, 0, 100, 0) },
    uColA: { value: new THREE.Color('#e4e9f2') }, uColB: { value: new THREE.Color('#f2e9d8') },
    uColAcc: { value: new THREE.Color('#e8a33c') }, uColDust: { value: new THREE.Color('#6f7789') },
    uVis: { value: new THREE.Vector4(0.2, 0.2, 0.2, 1 - (MOBILE ? 900 : 2300) / N) },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uTrail: { value: Array.from({ length: 16 }, () => new THREE.Vector3(0, 0, -100)) },
    uRad: { value: MOBILE ? 64 : 92 }, uAmp: { value: MOBILE ? 24 : 34 },
    uRepel: { value: 1 }, uSwirl: { value: 0.75 },
  };
  const barDust = N - barPts.length / 4;
  U.uVis.value.y = clamp((MOBILE ? 700 : 1900) / Math.max(barDust, 1), 0, 1);
  U.uVis.value.z = clamp((MOBILE ? 500 : 1300) / Math.max(N - cols * rows, 1), 0, 1);

  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  return { renderer, scene, cam, view, half, U, geo, nameAttr, aName, cols, rows, dpr, setHalf, placeholder, years, barX, barH, vMax };
}

/* isim: h1 düzeninden aygıt pikseline oturan ızgara */
function sampleName(world, root) {
  const lines = $$('.hn-line');
  const cs = getComputedStyle(lines[0]);
  const fs = parseFloat(cs.fontSize);
  const font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  const k = fs < 90 ? 3 : 2;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const ls = cs.letterSpacing && cs.letterSpacing !== 'normal' ? cs.letterSpacing : '0px';
  if ('letterSpacing' in meas) meas.letterSpacing = ls;
  const items = lines.map((l) => {
    const r = offsetRect(l, root);
    const text = l.textContent.trim().toLocaleUpperCase('tr-TR');
    const m = meas.measureText(text);
    const asc = m.fontBoundingBoxAscent || fs * 0.96;
    const desc = m.fontBoundingBoxDescent || fs * 0.24;
    const base = r.y + (r.h - (asc + desc)) / 2 + asc;
    return { text, x: r.x, base, w: m.width, top: base - (m.actualBoundingBoxAscent || fs * 0.8), bottom: base + (m.actualBoundingBoxDescent || fs * 0.2) };
  });
  const pad = 6;
  const bx = Math.floor(Math.min(...items.map((i) => i.x)) - pad);
  const by = Math.floor(Math.min(...items.map((i) => i.top)) - pad);
  const bw = Math.ceil(Math.max(...items.map((i) => i.x + i.w)) + pad - bx);
  const bh = Math.ceil(Math.max(...items.map((i) => i.bottom)) + pad - by);
  const dprNow = world.renderer.getPixelRatio();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, bw * k); cv.height = Math.max(1, bh * k);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.font = font;
  if ('letterSpacing' in ctx) ctx.letterSpacing = ls;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  items.forEach((i) => ctx.fillText(i.text, i.x - bx, i.base - by));
  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let cover = 0;
  for (let j = 3; j < data.length; j += 4) if (data[j] > 127) cover++;
  const area = cover / (k * k);
  const budget = Math.floor(N * 0.86);
  const S = Math.max(2, Math.ceil(Math.sqrt((area * dprNow * dprNow) / budget)));
  const step = S / dprNow;
  const rand = mulberry32(7);
  let pts = [];
  const gx0 = Math.ceil((bx * dprNow) / S) * S; const gy0 = Math.ceil((by * dprNow) / S) * S;
  for (let gy = gy0 + S / 2; gy < (by + bh) * dprNow; gy += S) {
    for (let gx = gx0 + S / 2; gx < (bx + bw) * dprNow; gx += S) {
      const x = gx / dprNow; const y = gy / dprNow;
      const px = Math.floor((x - bx) * k); const py = Math.floor((y - by) * k);
      if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
      if (data[(py * cv.width + px) * 4 + 3] > 120) pts.push([x, y, rand()]);
    }
  }
  if (pts.length > budget) {
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    pts = pts.slice(0, budget);
  }
  pts.sort((a, b) => (a[0] + a[2] * 0.6) - (b[0] + b[2] * 0.6));
  const A = world.aName;
  A.fill(0);
  const sel = pickSubset(pts.length, 0.13);
  for (let j = 0; j < sel.length; j++) { const s = sel[j] * 4; A[s] = pts[j][0]; A[s + 1] = pts[j][1]; A[s + 3] = 1; }
  world.nameAttr.needsUpdate = true;
  world.U.uNameSize.value = step;
  world.U.uVis.value.x = clamp((MOBILE ? 800 : 2200) / Math.max(N - pts.length, 1), 0, 1);
}

/* ------------------------------------------------------------------ */
/* Dokular: ekran görüntüsü kareye kırpılıp küçük tuvale çizilir        */
/* ------------------------------------------------------------------ */
const TEX = new Map();
function getTex(src, aspect) {
  if (!src) return null;
  const key = src + '@' + aspect.toFixed(3);
  let t = TEX.get(key);
  if (!t) {
    t = { tex: null, loading: true };
    TEX.set(key, t);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const TW = 288; const TH = Math.max(8, Math.round(TW / aspect));
      const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
      const ctx = cv.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      const sa = img.naturalWidth / img.naturalHeight;
      let sx = 0; const sy = 0; let sw = img.naturalWidth; let sh = img.naturalHeight;
      if (sa > aspect) { sw = img.naturalHeight * aspect; sx = (img.naturalWidth - sw) / 2; } else { sh = img.naturalWidth / aspect; }
      ctx.fillStyle = '#0a0c12'; ctx.fillRect(0, 0, TW, TH);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TW, TH);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      t.tex = tex; t.loading = false;
      Site.__needs = 2;
    };
    img.onerror = () => { t.loading = false; };
    img.src = src;
  }
  return t.tex;
}

/* ------------------------------------------------------------------ */
/* Yedek                                                                */
/* ------------------------------------------------------------------ */
let fallbackDone = false;
function toFallback(err) {
  if (err) console.error('[veri-evreni]', err);
  if (fallbackDone) return;
  fallbackDone = true;
  html.classList.remove('ve-stage', 'seq-pin');
  html.classList.add('ve-fallback', 've-ready');
  try { if (ST) ST.getAll().forEach((t) => t.kill()); } catch (e) { /* yok */ }
  try { if (lenis) { lenis.destroy(); lenis = null; Site.lenis = null; } } catch (e) { /* yok */ }
  if (gsap) { try { gsap.killTweensOf('*'); } catch (e) { /* yok */ } }
  const sel = '.scene, .hero-copy, [data-intro], [data-intro] *, .stat, .year-chart, .yc-count, .yc-year, .proj, .proj *, .proj-img, [data-reveal], [data-split], [data-split] *, .canvas-wrap, .topbar, .app, .kart, .tool, .skill, .mail, .contact-links';
  $$(sel).forEach((el) => { el.style.opacity = ''; el.style.visibility = ''; el.style.transform = ''; el.style.pointerEvents = ''; el.style.translate = ''; el.style.rotate = ''; el.style.scale = ''; });
  $$('.num').forEach((n) => { n.textContent = (n.dataset.prefix || '') + n.dataset.count + (n.dataset.suffix || ''); });
  Site.onShot = null;
}

/* ------------------------------------------------------------------ */
/* Açılış ve modlar                                                     */
/* ------------------------------------------------------------------ */
async function fontsReady(ms) {
  if (!document.fonts) return;
  try {
    document.fonts.load('600 120px "Unbounded"', 'ALİ BÜYÜKUYAR');
    document.fonts.load('400 20px "Geist"', 'Üretim');
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, ms))]);
  } catch (e) { /* sistem yazı tipi */ }
}

async function boot() {
  history.scrollRestoration = 'manual';
  if (html.classList.contains('ve-fallback')) { toFallback(); return; }
  if (reduce) { await initReduced(); return; }
  if (!hasGSAP || !window.Lenis) { toFallback(new Error('GSAP/Lenis yüklenemedi')); return; }
  const renderer = createRenderer();
  if (!renderer) { toFallback(new Error('WebGL yok')); return; }
  await fontsReady(900);
  await initStage(renderer);
}

async function initReduced() {
  html.classList.add('ve-ready');
  const renderer = createRenderer();
  if (!renderer) return;
  try {
    const w = buildWorld(renderer);
    w.U.uShapeA.value = SH.STARS; w.U.uShapeB.value = SH.STARS; w.U.uMix.value = 0;
    w.U.uTime.value = 12; w.U.uRepel.value = 0;
    html.classList.add('ve-gl');
    const draw = () => {
      w.view.w = innerWidth; w.view.h = innerHeight;
      renderer.setSize(w.view.w, w.view.h);
      w.cam.aspect = w.view.w / w.view.h; w.cam.updateProjectionMatrix(); w.setHalf();
      w.U.uRes.value.set(w.view.w, w.view.h);
      renderer.render(w.scene, w.cam);
    };
    draw();
    let to; window.addEventListener('resize', () => { clearTimeout(to); to = setTimeout(draw, 150); });
  } catch (e) { console.error(e); }
}

/* ------------------------------------------------------------------ */
/* Sahne modu                                                           */
/* ------------------------------------------------------------------ */
async function initStage(renderer) {
  const world = buildWorld(renderer);
  const { U, cam, view, half } = world;
  const stageInner = $('.stage-inner');
  const heroScene = $('.scene-hero');
  const heroCopy = $('.hero-copy');
  const yearsScene = $('.scene-years');
  const chartList = $('#yilGrafik');
  const slot = $('.chart-slot');
  const canvasWrap = $('.canvas-wrap');
  const toggle = $('.motion-toggle');
  const topbarEl = $('.topbar');
  const projArts = $$('#projeListe .proj');
  const gorevArt = $('.gorev');
  const seqEl = $('#sekans');
  const nYears = world.years.length;

  html.classList.add('ve-stage');
  if (PIN_SEQ) html.classList.add('seq-pin');

  /* --- yerleşim: yıl grafiği --- */
  const chart = { s: 1, O: new THREE.Vector3(), C: new THREE.Vector3(), shift: new THREE.Vector2() };
  const toWorld = (px, py, out) => out.set((px / view.w * 2 - 1) * half.x, (1 - py / view.h * 2) * half.y, 0);
  const chartW = Math.max(6.3, nYears + 1.3);
  let lastW = view.w;
  function layout(resample) {
    if (resample) sampleName(world, stageInner);
    const r = offsetRect(slot, stageInner);
    toWorld(r.x + r.w / 2, r.y + r.h / 2, chart.C);
    const ww = (r.w / view.w) * 2 * half.x; const wh = (r.h / view.h) * 2 * half.y;
    chart.s = Math.max(0.2, Math.min(ww / chartW, wh / 5.9));
    chart.O.copy(chart.C); chart.O.y -= 1.95 * chart.s;
    chart.shift.set(chart.C.x / half.x, chart.C.y / half.y);
    U.uChartO.value.copy(chart.O); U.uChartS.value = chart.s;
    projArts.forEach((art) => {
      const t = $('.proj-text', art); const sc = $('.proj-scroll', art);
      art._over = PIN_SEQ ? Math.max(0, sc.scrollHeight - t.clientHeight) : 0;
      t.classList.toggle('is-over', art._over > 2);
    });
  }
  layout(true);

  /* --- Lenis + ScrollTrigger --- */
  lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  Site.lenis = lenis;
  lenis.on('scroll', ST.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  const stagePin = ST.create({ trigger: '.stage', start: 'top top', end: () => '+=' + (PIN / 100) * window.innerHeight, pin: true, anticipatePin: 1, invalidateOnRefresh: true });
  const STEP = () => window.innerHeight * 0.9;
  const seqPin = PIN_SEQ ? ST.create({ trigger: seqEl, start: 'top top', end: () => '+=' + STEP() * projArts.length, pin: true, anticipatePin: 1, invalidateOnRefresh: true }) : null;
  const Pv = () => ((window.scrollY - stagePin.start) / Math.max(1, window.innerHeight)) * 100;

  /* --- metin bölmeleri ve girişler --- */
  const split = (el, type) => {
    if (!Split || !el) return null;
    try { return Split.create(el, { type, mask: type, linesClass: 'sl', wordsClass: 'sw' }); } catch (e) { return null; }
  };
  const leadSplit = split($('.hero-lead'), 'lines');
  const yearsSplit = split($('.years-head'), 'words');
  $$('[data-split]').forEach((el) => {
    const sp = split(el, 'words');
    const tg = sp ? sp.words : [el];
    gsap.fromTo(tg, sp ? { yPercent: 110 } : { autoAlpha: 0, y: 24 }, { yPercent: 0, autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
  $$('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 1.05, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  ['.apps', '.arsiv', '.skills'].forEach((s) => {
    const box = $(s); if (!box) return;
    gsap.fromTo(box.children, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: box, start: 'top 90%', once: true } });
  });
  gsap.fromTo(['.mail', '.contact-links'], { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.iletisim', start: 'top 72%', once: true } });
  if (!PIN_SEQ) {
    projArts.forEach((art) => {
      const items = [$('.proj-meta', art), $('.proj-title', art), $('.proj-desc', art), ...$$('.points li', art), $('.tags', art)];
      gsap.fromTo(items, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.95, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: art, start: 'top 75%', once: true } });
    });
  }

  /* yıllar vuruşu */
  const nums = $$('.num');
  nums.forEach((n) => { n.textContent = (n.dataset.prefix || '') + '0' + (n.dataset.suffix || ''); });
  const yearsTl = gsap.timeline({ paused: true });
  if (yearsSplit) yearsTl.fromTo(yearsSplit.words, { yPercent: 110 }, { yPercent: 0, duration: 1.05, stagger: 0.06, ease: 'expo.out' }, 0);
  yearsTl.fromTo('.stat, .years-note', { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.12);
  nums.forEach((n, i) => {
    const o = { v: 0 }; const tgt = +n.dataset.count;
    yearsTl.to(o, { v: tgt, duration: 1.5, ease: 'power2.out', onUpdate: () => { n.textContent = (n.dataset.prefix || '') + Math.round(o.v) + (n.dataset.suffix || ''); } }, 0.22 + i * 0.08);
  });
  const yearsBeat = { on: false };

  /* --- öne çıkan projeler: dizin --- */
  const seqIndex = $('.seq-index');
  const seqCur = $('.seq-cur');
  const seqFill = $('.seq-progress i');
  if (PIN_SEQ) seqIndex.innerHTML = projArts.map((a, i) => `<button type="button" aria-label="${a.dataset.baslik}">${String(i + 1).padStart(2, '0')}</button>`).join('');
  const idxBtns = $$('button', seqIndex);

  /* --- yol noktaları --- */
  const artState = (art) => {
    if (!art._ve) {
      const srcs = (art.dataset.kucuk || art.dataset.galeri || '').split('|').filter(Boolean);
      art._ve = { srcs, cur: 0, next: 0, swapT: 0, imgK: 1, busy: false };
    }
    return art._ve;
  };
  let W = [];
  let pinStageEnd = 0;
  const navSecs = ['profil', 'deneyim', 'projeler', 'yetkinlikler', 'iletisim'].map((id) => ({ id, el: document.getElementById(id), top: 0, a: $(`#menu a[href="#${id}"]`) }));
  function buildWaypoints() {
    const vh = window.innerHeight; const sy = window.scrollY;
    const r = (el) => el.getBoundingClientRect();
    const top = (el) => r(el).top + sy;
    const at = (el, f) => top(el) - f * vh;
    const atB = (el, f) => r(el).bottom + sy - f * vh;
    const atC = (el, f) => { const b = r(el); return b.top + b.height / 2 + sy - f * vh; };
    const P = (p) => stagePin.start + (p / 100) * vh;
    pinStageEnd = stagePin.end;
    navSecs.forEach((s) => { s.top = top(s.el); });
    const roles = $('.roles');
    const list = [];
    list.push({ shape: SH.NAME, y0: 0, y1: P(L.name1) });
    list.push({ shape: SH.RIBBON, y0: P(L.ribbon0), y1: P(L.ribbon1) });
    list.push({ shape: SH.BARS, y0: P(L.bars0), y1: P(L.bars1) });
    list.push({ shape: SH.STARS, y0: at($('#profil'), 0.45), y1: at($('#deneyim'), 0.8) });
    list.push({ shape: SH.LINE, y0: at(roles, 0.66), y1: atB(roles, 0.5), nodes: $$('.role-node') });
    const firstFrame = $('.proj-frame', projArts[0]);
    list.push({ shape: SH.STARS, y0: at($('#projeler'), 0.5), y1: PIN_SEQ ? seqPin.start - 0.42 * vh : atC(firstFrame, 1.05) });
    const step = STEP();
    projArts.forEach((art, k) => {
      const frame = $('.proj-frame', art);
      const kind = art.dataset.shape;
      const shape = kind === 'konsol' ? SH.KONSOL : kind === 'asistan' ? SH.WAVE : SH.IMG;
      let y0; let y1;
      if (PIN_SEQ) {
        const s0 = seqPin.start + k * step;
        y0 = s0 + (k === 0 ? 0.08 : 0.2) * step;
        y1 = k === projArts.length - 1 ? seqPin.end - 0.02 * vh : s0 + 0.74 * step;
      } else { y0 = atC(frame, 0.62); y1 = atC(frame, 0.14); }
      const fr = r(frame);
      list.push({ shape, art, el: frame, step: k, y0, y1, aspect: fr.width / Math.max(1, fr.height), img: $('.proj-img', art), st: artState(art), bars: $$('.faz-bar', art), wave: $('.dalga-alan', art), pinned: PIN_SEQ });
    });
    const gFrame = $('.proj-frame', gorevArt);
    const gr = r(gFrame);
    list.push({ shape: SH.IMG, art: gorevArt, el: gFrame, y0: atC(gFrame, 0.62), y1: atC(gFrame, 0.2), aspect: gr.width / Math.max(1, gr.height), img: $('.proj-img', gorevArt), st: artState(gorevArt), pinned: false });
    list.push({ shape: SH.STARS, y0: at($('#diger'), 0.55), y1: atB($('#onceki'), 0.6) });
    const tl = $('#araclar');
    list.push({ shape: SH.TOOLS, el: tl, y0: atC(tl, 0.66), y1: atC(tl, 0.26), tracks: $$('.tool-track', tl) });
    list.push({ shape: SH.ORB, el: $('.close-orb'), y0: at($('#iletisim'), 0.4), y1: 1e9 });
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      if (w.y1 < w.y0) w.y1 = w.y0;
      const nx = list[i + 1];
      if (nx && nx.y0 < w.y1 + 0.18 * vh) {
        const m = (w.y1 + nx.y0) / 2;
        w.y1 = Math.max(w.y0, m - 0.09 * vh);
        nx.y0 = Math.max(w.y1 + 0.18 * vh, nx.y0);
      }
    }
    W = list;
  }

  /* --- ekran değiştirme: parçacık dalgası soldan sağa yeni renkleri taşır --- */
  const slotA = { w: null, mix: 0 };
  const slotB = { w: null, mix: 0 };
  Site.onShot = (art, i) => {
    const w = W.find((x) => x.art === art);
    if (!w || !w.st.srcs.length) return false;
    const st = w.st;
    if (st.busy) return 'busy';
    const gal = Site.galleryOf ? Site.galleryOf(art) : [];
    const it = gal[i];
    const visible = (w === slotA.w && slotA.mix < 0.02) || (w === slotB.w && slotB.mix > 0.98);
    getTex(st.srcs[i], w.aspect);
    if (!visible || !it) {
      st.cur = i; st.next = i; st.swapT = 0;
      if (w.img && it) { w.img.src = it.src; w.img.alt = it.alt; }
      Site.__needs = 2;
      return true;
    }
    st.busy = true; st.next = i;
    const tl = gsap.timeline({ onComplete: () => { st.busy = false; } });
    tl.to(st, { imgK: 0, duration: 0.3, ease: 'power2.in' })
      .to(st, { swapT: 1, duration: 1.05, ease: 'power2.inOut' })
      .add(() => { st.cur = i; st.swapT = 0; if (w.img) { w.img.src = it.src; w.img.alt = it.alt; } })
      .add(() => (w.img && w.img.decode ? w.img.decode().catch(() => {}) : null))
      .to(st, { imgK: 1, duration: 0.5, ease: 'power2.out' }, '+=0.04');
    return true;
  };

  /* --- imleç / dokunma --- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, seen: false };
  let trailIdx = 0; let lastRec = { x: 1e9, y: 1e9, t: -1 };
  let clock = 0; let mtime = 0; let lastInput = -10;
  const record = (x, y, force) => {
    if (!force && Math.hypot(x - lastRec.x, y - lastRec.y) < 30 && clock - lastRec.t < 0.25) return;
    U.uTrail.value[trailIdx].set(x, y, clock);
    trailIdx = (trailIdx + 1) % 16;
    lastRec = { x, y, t: clock };
  };
  const feed = (cx, cy) => {
    const x = cx - view.w / 2; const y = view.h / 2 - cy;
    if (!mouse.seen || mouse.ts === 0) { mouse.x = x; mouse.y = y; mouse.seen = true; }
    mouse.tx = x; mouse.ty = y; mouse.ts = 1; record(x, y, false); lastInput = clock;
  };
  const release = () => { if (mouse.ts) record(mouse.tx, mouse.ty, true); mouse.ts = 0; lastInput = clock; };
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch') return; feed(e.clientX, e.clientY); }, { passive: true });
  document.addEventListener('mouseleave', release);
  window.addEventListener('blur', release);
  window.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) feed(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) feed(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchend', release, { passive: true });
  window.addEventListener('touchcancel', release, { passive: true });

  /* --- hareket düğmesi --- */
  let paused = false;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.querySelector('.mt-label').textContent = paused ? 'Hareketi sürdür' : 'Hareketi durdur';
    Site.__needs = 2;
  });

  /* --- sayfa içi bağlantılar --- */
  const targetY = (id) => {
    if (id === 'giris' || id === 'sahne' || id === 'icerik') return 0;
    if (id === 'yillar') return stagePin.start + (L.gotoYears / 100) * window.innerHeight;
    const el = document.getElementById(id);
    if (!el) return null;
    return el.getBoundingClientRect().top + window.scrollY - (id === 'iletisim' ? 0 : 8);
  };
  const scrollToY = (y, onComplete) => {
    const dist = Math.abs(y - window.scrollY);
    lenis.scrollTo(y, { duration: clamp(dist / 2200, 1.0, 3.2), easing: inOut, onComplete });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented) return;
    const id = a.getAttribute('href').slice(1);
    const y = targetY(id);
    if (y == null) return;
    e.preventDefault();
    scrollToY(y, () => {
      const h = document.getElementById(id);
      const f = h && (h.querySelector('h2, h1') || h);
      if (f) { if (!f.hasAttribute('tabindex')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    });
  });
  idxBtns.forEach((b, i) => b.addEventListener('click', () => {
    const w = W.find((x) => x.step === i);
    if (w) scrollToY((w.y0 + w.y1) / 2);
  }));
  heroScene.addEventListener('focusin', () => { if (window.scrollY > stagePin.start + 0.6 * window.innerHeight) lenis.scrollTo(0, { duration: 1.2 }); });
  if (PIN_SEQ) {
    projArts.forEach((art, i) => art.addEventListener('focusin', () => {
      const w = W.find((x) => x.step === i);
      if (w && (window.scrollY < w.y0 - 10 || window.scrollY > w.y1 + 10)) lenis.scrollTo((w.y0 + w.y1) / 2, { duration: 1.0 });
    }));
  }

  /* --- yeniden boyut --- */
  function resize() {
    view.w = innerWidth; view.h = innerHeight;
    renderer.setSize(view.w, view.h);
    cam.aspect = view.w / view.h;
    world.setHalf();
    U.uRes.value.set(view.w, view.h);
    const resample = Math.abs(view.w - lastW) > 1;
    lastW = view.w;
    layout(resample);
    Site.__needs = 2;
  }
  let rto;
  window.addEventListener('resize', () => { clearTimeout(rto); rto = setTimeout(resize, 140); });
  ST.addEventListener('refresh', () => { layout(false); buildWaypoints(); });
  if (document.fonts) document.fonts.addEventListener('loadingdone', () => { layout(true); ST.refresh(); Site.__needs = 2; });
  window.addEventListener('load', () => ST.refresh());
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); toFallback(new Error('WebGL bağlamı kayboldu')); });
  let canvasVisible = true;
  new IntersectionObserver((en) => { canvasVisible = en[0].isIntersecting; }).observe(canvasWrap);

  /* --- yuva doldurma --- */
  const v3 = new THREE.Vector3();
  const tT = new THREE.Vector3();
  const rectOf = (el, out) => { const b = el.getBoundingClientRect(); out.set(b.left, b.top, b.width, b.height); return b; };
  function fillSlot(slotIdx, w) {
    const rect = slotIdx === 0 ? U.uRectA.value : U.uRectB.value;
    if (w.shape === SH.IMG || w.shape === SH.IMG2) {
      const b = rectOf(w.el, rect);
      const cell = Math.max(b.width / world.cols, b.height / world.rows) * 1.08;
      const st = w.st;
      const t0 = getTex(st.srcs[st.cur], w.aspect) || world.placeholder;
      const t1 = getTex(st.srcs[st.next], w.aspect) || t0;
      if (slotIdx === 0) { U.uCellA.value = cell; U.uTexA0.value = t0; U.uTexA1.value = t1; U.uSwapA.value = st.swapT; }
      else { U.uCellB.value = cell; U.uTexB0.value = t0; U.uTexB1.value = t1; U.uSwapB.value = st.swapT; }
    } else if (w.shape === SH.KONSOL) {
      w.bars.forEach((b, i) => rectOf(b, U.uFaz.value[i]));
    } else if (w.shape === SH.WAVE) {
      rectOf(w.wave, U.uWave.value);
    } else if (w.shape === SH.LINE) {
      const ys = w.nodes.map((n) => { const b = n.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
      ys.forEach((pt, i) => { U.uNodeY.value[i] = pt.y; });
      U.uLine.value.set(ys[0].x, ys[0].y - 6, ys[ys.length - 1].y + 6, view.h * 0.55);
    } else if (w.shape === SH.TOOLS) {
      const tools = (Site.counts && Site.counts.tools) || [];
      const mx = tools.length ? tools[0].n : 1;
      w.tracks.forEach((t, i) => { rectOf(t, U.uTool.value[i]); U.uToolV.value[i] = tools[i] ? tools[i].n / mx : 0; });
    } else if (w.shape === SH.ORB) {
      const b = w.el.getBoundingClientRect();
      U.uOrb.value.set(b.left + b.width / 2, b.top + b.height / 2, b.width / 2, 0);
    }
  }

  /* --- adım etkinleştirme (masaüstü sırası) --- */
  let activeStep = -1;
  const stepItems = (art) => [$('.proj-meta', art), $('.proj-title', art), $('.proj-desc', art), ...$$('.points li', art), $('.tags', art)];
  function activate(k) {
    if (k === activeStep) return;
    const prev = activeStep >= 0 ? projArts[activeStep] : null;
    activeStep = k;
    if (prev) {
      prev.classList.remove('is-active');
      gsap.to(prev, { opacity: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto', onComplete: () => { if (projArts.indexOf(prev) !== activeStep) prev.classList.remove('is-on'); } });
    }
    if (k >= 0) {
      const art = projArts[k];
      art.classList.add('is-on', 'is-active');
      gsap.to(art, { opacity: 1, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
      gsap.fromTo(stepItems(art), { autoAlpha: 0, x: 52 }, { autoAlpha: 1, x: 0, duration: 1.05, stagger: 0.06, ease: 'expo.out', overwrite: 'auto' });
      const media = [$('.note', art), $('.proj-tabs', art), ...$$('.faz-list li, .dalga-adim li, .shape-head', art)].filter(Boolean);
      gsap.fromTo(media, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out', delay: 0.15, overwrite: 'auto' });
      seqCur.textContent = String(k + 1).padStart(2, '0');
    }
    idxBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === k)));
  }

  /* --- kamera --- */
  let paused2 = false;
  function updateCamera(p) {
    const b = sstep(...L.camIn, p) * (1 - sstep(...L.camOut, p));
    const k = norm(p, ...L.orbit);
    const sway = paused ? 0 : Math.sin(mtime * 0.22) * 0.035;
    const az = lerp(0.46, -0.36, inOut(k)) + sway;
    const el = lerp(0.08, 0.22, k);
    const rad = lerp(10, MOBILE ? 9.4 : 8.9, b);
    tT.copy(chart.C).multiplyScalar(b);
    const a = az * b; const e = el * b;
    cam.position.set(tT.x + rad * Math.sin(a) * Math.cos(e), tT.y + rad * Math.sin(e), tT.z + rad * Math.cos(a) * Math.cos(e));
    if (b > 0.0001) cam.lookAt(tT); else cam.rotation.set(0, 0, 0);
    cam.updateProjectionMatrix();
    cam.projectionMatrix.elements[8] = -chart.shift.x * b;
    cam.projectionMatrix.elements[9] = -chart.shift.y * b;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();
    return b;
  }

  /* --- DOM güncellemeleri --- */
  const setOp = (el, a) => { if (el._a !== a) { el._a = a; el.style.opacity = a.toFixed(3); } };
  let cEls = $$('.yc-count', chartList);
  let yEls = $$('.yc-year', chartList);
  let topHidden = false;
  let navCur = '';
  function updateDOM(S) {
    const p = Pv();
    const hk = sstep(...L.heroOut, p);
    heroCopy.style.opacity = (1 - hk).toFixed(3);
    heroCopy.style.transform = `translate3d(0, ${(-44 * hk).toFixed(1)}px, 0)`;
    heroScene.style.pointerEvents = hk > 0.5 ? 'none' : '';
    const ya = sstep(...L.yearsIn, p) * (1 - sstep(...L.yearsOut, p));
    setOp(yearsScene, ya);
    yearsScene.style.pointerEvents = ya > 0.6 ? 'auto' : 'none';
    const la = sstep(...L.labels, p) * (1 - sstep(L.yearsOut[0] - 8, L.yearsOut[1] - 12, p));
    setOp(chartList, la);
    if (la > 0.001) {
      for (let i = 0; i < nYears; i++) {
        const x = world.barX(i); const h = world.barH(world.years[i].n);
        v3.set(x, h + 0.16, 0.28).multiplyScalar(chart.s).add(chart.O).project(cam);
        cEls[i].style.transform = `translate3d(${(((v3.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - v3.y) / 2) * view.h).toFixed(1)}px, 0) translate(-50%, -100%)`;
        v3.set(x, -0.2, 0.5).multiplyScalar(chart.s).add(chart.O).project(cam);
        yEls[i].style.transform = `translate3d(${(((v3.x + 1) / 2) * view.w).toFixed(1)}px, ${(((1 - v3.y) / 2) * view.h).toFixed(1)}px, 0) translate(-50%, 0)`;
      }
    }
    const vh = view.h;
    for (const w of W) {
      if (!w.img) continue;
      let a = sstep(w.y0 - 0.03 * vh, w.y0 + 0.08 * vh, S);
      if (w.pinned) a *= 1 - sstep(w.y1 - 0.01 * vh, w.y1 + 0.07 * vh, S);
      a *= w.st.imgK;
      setOp(w.img, a);
    }
    if (PIN_SEQ) {
      let k = -1;
      for (const w of W) { if (w.step == null) continue; if (S >= w.y0 - 0.16 * vh && S <= w.y1 + 0.12 * vh) { k = w.step; break; } }
      activate(k);
      seqFill.style.transform = `scaleX(${norm(S, seqPin.start, seqPin.end).toFixed(4)})`;
      if (k >= 0) {
        const art = projArts[k];
        const w = W.find((x) => x.step === k);
        if (art._over > 2) $('.proj-scroll', art).style.transform = `translate3d(0, ${(-art._over * inOut(norm(S, w.y0 + 0.02 * vh, w.y1 - 0.04 * vh))).toFixed(1)}px, 0)`;
      }
    }
    topbarEl.classList.toggle('is-solid', window.scrollY > 40 && !html.classList.contains('menu-open'));
    const past = window.scrollY > pinStageEnd + 60;
    const dir = lenis.direction;
    const hide = past && dir === 1 && !html.classList.contains('menu-open');
    if (hide !== topHidden && (hide || dir === -1 || !past)) {
      topHidden = hide;
      gsap.to(topbarEl, { yPercent: hide ? -110 : 0, duration: hide ? 0.45 : 0.6, ease: hide ? 'power2.in' : 'expo.out', overwrite: 'auto', onComplete: () => { if (!hide) gsap.set(topbarEl, { clearProps: 'transform' }); } });
    }
    let cur = '';
    const probe = window.scrollY + vh * 0.4;
    for (const s of navSecs) if (s.top <= probe) cur = s.id;
    if (cur !== navCur) { navCur = cur; navSecs.forEach((s) => { if (s.a) { if (s.id === cur) s.a.setAttribute('aria-current', 'true'); else s.a.removeAttribute('aria-current'); } }); }
  }

  /* --- kare döngüsü --- */
  const open = { v: 0 };
  let S = window.scrollY;
  let lastS = -1;
  let frames = 0; let acc = 0; let dpr = world.dpr;
  Site.__needs = 2;
  let lastIdx = -1;
  function preload(i) {
    for (let j = Math.max(0, i - 1); j <= Math.min(W.length - 1, i + 3); j++) {
      const w = W[j];
      if (w.st) w.st.srcs.forEach((s) => getTex(s, w.aspect));
    }
  }
  function tick(time, deltaMs) {
    const dt = Math.min((deltaMs || 16) / 1000, 1 / 20);
    clock += dt;
    if (!paused) mtime += dt;
    const target = window.scrollY;
    S = Math.abs(target - S) < 0.5 ? target : damp(S, target, 9, dt);

    const p = Pv();
    if (!yearsBeat.on && p >= L.yearsBeat && p < PIN + 60) { yearsBeat.on = true; yearsTl.timeScale(1).play(); }
    else if (yearsBeat.on && p < L.yearsBeat - 10) { yearsBeat.on = false; yearsTl.timeScale(2).reverse(); }

    mouse.x = damp(mouse.x, mouse.tx, 16, dt); mouse.y = damp(mouse.y, mouse.ty, 16, dt);
    mouse.s = damp(mouse.s, mouse.ts, mouse.ts > mouse.s ? 9 : 4, dt);
    const interacting = clock - lastInput < 2.4;
    const moving = !paused || Math.abs(S - lastS) > 0.05 || interacting || Site.__needs > 0 || gsap.isTweening(open) || W.some((w) => w.st && w.st.busy);
    if (!moving || !canvasVisible || document.hidden || !W.length) return;
    if (Site.__needs > 0) Site.__needs--;
    lastS = S;

    let i = 0;
    while (i < W.length - 1 && W[i + 1].y0 <= S) i++;
    const A = W[i]; const B = W[Math.min(i + 1, W.length - 1)];
    let mix = S <= A.y1 ? 0 : norm(S, A.y1, B.y0);
    if (i !== lastIdx) { lastIdx = i; preload(i); }
    let shA = A.shape; let shB = B.shape;
    if (i === 0 && mix === 0 && open.v < 1) { shA = SH.START; shB = SH.NAME; mix = open.v; }
    slotA.w = shA === SH.START ? null : A; slotA.mix = mix;
    slotB.w = shA === SH.START ? A : B; slotB.mix = mix;
    if (slotA.w) fillSlot(0, A);
    if (mix > 0.0001 && slotB.w && slotB.w !== slotA.w) fillSlot(1, slotB.w);
    U.uShapeA.value = shA; U.uShapeB.value = shB; U.uMix.value = mix;

    const b = updateCamera(p);
    updateDOM(S);

    U.uTime.value = mtime; U.uClock.value = clock;
    U.uRepel.value = lerp(REPEL[shA], REPEL[shB], mix) * (b > 0.5 ? 0.8 : 1);
    U.uSwirl.value = lerp(SWIRL[shA], SWIRL[shB], mix);
    U.uMouse.value.set(mouse.x, mouse.y, mouse.s);
    U.uDpr.value = renderer.getPixelRatio();
    renderer.render(world.scene, cam);

    frames++; acc += deltaMs || 16;
    if (frames >= 90) {
      const avg = acc / frames;
      if (avg > 26 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); renderer.setSize(view.w, view.h); }
      frames = 0; acc = 0;
    }
  }

  /* --- açılış --- */
  ST.refresh();
  buildWaypoints();
  cEls = $$('.yc-count', chartList); yEls = $$('.yc-year', chartList);
  gsap.ticker.add(tick);
  html.classList.add('ve-ready');
  const intro = { topbar: topbarEl, title: $('.hero-title'), lead: $('.hero-lead'), cta: $('.hero-cta'), btns: $$('.hero-cta .btn') };
  const hash = location.hash ? location.hash.slice(1) : '';
  const skip = !!hash && hash !== 'giris' && !!document.getElementById(hash);
  if (skip) {
    open.v = 1;
    gsap.set([intro.topbar, intro.title, intro.lead, intro.cta], { autoAlpha: 1 });
    gsap.set(canvasWrap, { autoAlpha: 1 });
    requestAnimationFrame(() => { const y = targetY(hash); if (y != null) lenis.scrollTo(y, { immediate: true }); });
  } else {
    window.scrollTo(0, 0);
    lenis.stop();
    const tl = gsap.timeline();
    tl.fromTo(canvasWrap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out' }, 0);
    tl.fromTo(open, { v: 0 }, { v: 1, duration: 1.95, ease: 'none' }, 0);
    tl.fromTo(intro.topbar, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', onComplete: () => gsap.set(intro.topbar, { clearProps: 'transform' }) }, 1.05);
    tl.fromTo(intro.title, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.85, ease: 'power3.out' }, 1.15);
    tl.set([intro.lead, intro.cta], { autoAlpha: 1 }, 0);
    if (leadSplit) tl.fromTo(leadSplit.lines, { yPercent: 108 }, { yPercent: 0, duration: 1, stagger: 0.075, ease: 'expo.out' }, 1.25);
    else tl.fromTo(intro.lead, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 1.25);
    tl.fromTo(intro.btns, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.08, ease: 'power3.out' }, 1.45);
    tl.add(() => lenis.start(), 1.5);
    tl.add(() => { if (leadSplit) leadSplit.revert(); });
  }
  setTimeout(() => {
    [intro.topbar, intro.title, intro.lead, intro.cta, ...intro.btns].forEach((el) => {
      if (parseFloat(getComputedStyle(el).opacity) < 0.05) gsap.set(el, { autoAlpha: 1, y: 0 });
    });
  }, 3000);

  // test betikleri için tutamak: yalnız yerel önizlemede açılır, yayındaki sitede yok
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
    window.__ve = { world, get S() { return S; }, W: () => W, stagePin, seqPin, lenis, Pv, paused: () => paused || paused2 };
  }
}

boot().catch((err) => toFallback(err));
