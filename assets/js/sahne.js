// 3D veri yüzeyi: kahraman ve iletişim bölümlerinin arkasındaki sütun alanı.
// Tek InstancedMesh, yükseklikler her karede CPU'da hesaplanır (en fazla ~2000 sütun).
// Sayfa kaydırma durumu main.js tarafından window.SAHNE içine yazılır.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const tuval = document.getElementById('sahne');
const durum = window.SAHNE || (window.SAHNE = { hero: 0, iletisim: 0, gorunur: 1 });
const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
const inceImlec = matchMedia('(pointer: fine)').matches;

function webglVarMi() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (tuval && webglVarMi()) kur();
else document.documentElement.classList.add('webgl-yok');

function kur() {
  const ZEMIN = 0x0b0c0e;
  const dar = innerWidth < 768;
  const NX = dar ? 30 : 60;
  const NZ = dar ? 30 : 34;
  const ADET = NX * NZ;

  const renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, powerPreference: 'high-performance' });
  let pikselOrani = Math.min(devicePixelRatio || 1, dar ? 1.5 : 1.75);
  renderer.setPixelRatio(pikselOrani);
  renderer.setClearColor(ZEMIN, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const sahne = new THREE.Scene();
  sahne.fog = new THREE.Fog(ZEMIN, dar ? 13 : 26, dar ? 32 : 60);

  const pmrem = new THREE.PMREMGenerator(renderer);
  sahne.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  sahne.environmentIntensity = 0.6;
  pmrem.dispose();

  const anaIsik = new THREE.DirectionalLight(0xfff0dc, 3.0);
  anaIsik.position.set(-9, 15, 7);
  sahne.add(anaIsik);
  const kenarIsik = new THREE.DirectionalLight(0xf2a93b, 1.1);
  kenarIsik.position.set(8, 3.5, -14);
  sahne.add(kenarIsik);

  const kamera = new THREE.PerspectiveCamera(dar ? 40 : 30, 1, 0.1, 140);

  // Sütun geometrisi: tabanı y=0'da, yükseklik örnek matrisinin y ölçeğiyle verilir.
  const geo = new RoundedBoxGeometry(0.8, 1, 0.8, 2, 0.07);
  geo.translate(0, 0.5, 0);
  const parilti = new Float32Array(ADET);
  const paraltiAttr = new THREE.InstancedBufferAttribute(parilti, 1);
  paraltiAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aGlow', paraltiAttr);

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.25, roughness: 0.5 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uParilti = { value: new THREE.Color(0xf2a93b).multiplyScalar(1.15) };
    // vUst: yüzey normalinin dünyadaki y bileşeni; sütun tepeleri grafik çubuğu gibi daha açık görünür
    sh.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\nvarying float vUst;\n' +
      sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  vGlow = aGlow;\n  vUst = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal).y;');
    sh.fragmentShader = 'uniform vec3 uParilti;\nvarying float vGlow;\nvarying float vUst;\n' +
      sh.fragmentShader
        .replace('#include <color_fragment>',
          '#include <color_fragment>\n  float tepeY = smoothstep(0.6, 0.95, vUst);\n  diffuseColor.rgb *= mix(0.7, 1.35, tepeY);')
        .replace('#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uParilti * vGlow * mix(0.35, 1.0, tepeY);');
  };

  const sutunlar = new THREE.InstancedMesh(geo, mat, ADET);
  sutunlar.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sutunlar.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ADET * 3), 3);
  sutunlar.instanceColor.setUsage(THREE.DynamicDrawUsage);
  sutunlar.frustumCulled = false;
  // Telefonda alan küçültülür: dar ekranda daha çok sütun görünür
  const OLCEK = dar ? 0.6 : 1;
  sutunlar.scale.setScalar(OLCEK);
  sahne.add(sutunlar);

  const m = sutunlar.instanceMatrix.array;
  const renk = sutunlar.instanceColor.array;
  const px = new Float32Array(ADET), pz = new Float32Array(ADET);
  const rnd = new Float32Array(ADET), gecikme = new Float32Array(ADET);
  const ARALIK = 1.0;
  const ox = (NX - 1) * ARALIK / 2, oz = (NZ - 1) * ARALIK / 2;
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const i = iz * NX + ix;
      const x = ix * ARALIK - ox, z = iz * ARALIK - oz;
      px[i] = x; pz[i] = z;
      rnd[i] = Math.random();
      // açılışta sütunlar sağ ön köşeden dalga gibi yükselir
      gecikme[i] = Math.hypot(x - ox, z - oz) * 0.028 + rnd[i] * 0.12;
      const o = i * 16;
      m[o] = 1; m[o + 5] = 0.02; m[o + 10] = 1; m[o + 15] = 1;
      m[o + 12] = x; m[o + 14] = z;
    }
  }

  // Renkler doğrusal uzayda
  const celikKoyu = new THREE.Color('#262a31').convertSRGBToLinear();
  const celikAcik = new THREE.Color('#858b95').convertSRGBToLinear();
  const kehribar = new THREE.Color('#f2a93b').convertSRGBToLinear();

  // İmleç: y=0 düzlemine ışın
  const isin = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const kesisim = new THREE.Vector3();
  const imlec = { x: 0, z: 0, hx: 0, hz: 0, guc: 0, hedefGuc: 0, son: 0, nx: 0, ny: 0 };
  if (inceImlec && !azHareket) {
    addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      imlec.nx = ndc.x; imlec.ny = ndc.y;
      imlec.son = performance.now();
      imlec.hedefGuc = 1;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { imlec.son = 0; });
  } else if (!azHareket) {
    // Dokunmatik ekranda sütunlar parmağın altında yükselir
    const dokun = (e) => {
      const t = e.touches[0];
      if (!t) return;
      ndc.set((t.clientX / innerWidth) * 2 - 1, -(t.clientY / innerHeight) * 2 + 1);
      imlec.son = performance.now();
      imlec.hedefGuc = 1;
    };
    addEventListener('touchstart', dokun, { passive: true });
    addEventListener('touchmove', dokun, { passive: true });
  }

  let genislik = 0, yukseklik = 0;
  function boyutla() {
    genislik = tuval.clientWidth; yukseklik = tuval.clientHeight;
    renderer.setSize(genislik, yukseklik, false);
    kamera.aspect = genislik / yukseklik;
    // Masaüstünde alanı sağa kaydır: metin solda sakin bir zeminde kalsın.
    if (genislik >= 1024) kamera.setViewOffset(genislik, yukseklik, -genislik * 0.16, 0, genislik, yukseklik);
    else if (dar) kamera.setViewOffset(genislik, yukseklik, 0, yukseklik * 0.14, genislik, yukseklik); // alan yazının üstünde kalsın
    else kamera.clearViewOffset();
    kamera.updateProjectionMatrix();
    if (azHareket) ciz(3.2, 0);
  }
  addEventListener('resize', boyutla);

  const kahramanPoz = { p: new THREE.Vector3(0, 15, 27), h: new THREE.Vector3(0, 0, -5) };
  const planPoz = { p: new THREE.Vector3(0, 30, 9), h: new THREE.Vector3(0, 0, -1) };
  if (dar) { kahramanPoz.p.set(0, 9.5, 14); kahramanPoz.h.set(0, 0, -2); planPoz.p.set(0, 18, 6); }
  const hedef = new THREE.Vector3();

  const yumusak = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const kolay = (t) => 1 - Math.pow(1 - t, 3);

  function ciz(t, acilis) {
    const h = durum.hero || 0;
    const c = durum.iletisim || 0;

    // Kamera: kahraman pozundan, kaydırdıkça yükselir; iletişimde tepeden plan görünümüne geçer.
    const kp = kahramanPoz.p, kh = kahramanPoz.h;
    kamera.position.set(kp.x, kp.y + h * 7, kp.z - h * 6);
    hedef.set(kh.x, kh.y, kh.z - h * 2);
    if (c > 0) {
      kamera.position.lerp(planPoz.p, c);
      hedef.lerp(planPoz.h, c);
      const a = t * 0.05 * c;
      kamera.position.x += Math.sin(a) * 6 * c;
    }
    if (!azHareket) {
      kamera.position.x += imlec.nx * 0.9 + Math.sin(t * 0.13) * 0.6;
      kamera.position.y += imlec.ny * 0.5;
    }
    kamera.lookAt(hedef);

    // İmleç konumu; giriş yokken dalga kendi kendine alanın sağında dolaşır
    if (!azHareket) {
      if (performance.now() - imlec.son > 2200) {
        if (dar) ndc.set(0.45 * Math.sin(t * 0.41), 0.42 + 0.25 * Math.sin(t * 0.29 + 1.3));
        else ndc.set(0.38 + 0.32 * Math.sin(t * 0.41), -0.05 + 0.28 * Math.sin(t * 0.29 + 1.3));
        imlec.hedefGuc = 0.75;
      }
      isin.setFromCamera(ndc, kamera);
      if (isin.ray.intersectPlane(duzlem, kesisim)) { imlec.hx = kesisim.x / OLCEK; imlec.hz = kesisim.z / OLCEK; }
      imlec.x += (imlec.hx - imlec.x) * 0.09;
      imlec.z += (imlec.hz - imlec.z) * 0.09;
      imlec.guc += (imlec.hedefGuc * (1 - c) - imlec.guc) * 0.05;
    }

    // Tarama bandı: sütun alanını soldan sağa geçen rapor satırı
    const tur = NX * ARALIK + 24;
    const taramaX = azHareket ? 9 : ((t * 7) % tur) - tur / 2;
    const genlik = 1 - h * 0.45;

    for (let i = 0; i < ADET; i++) {
      const x = px[i], z = pz[i];
      const f = 0.55 * Math.sin(0.21 * x + 0.55 * t) * Math.cos(0.29 * z - 0.38 * t)
        + 0.3 * Math.sin(0.12 * (x + z) + 0.8 * t + 1.7)
        + 0.15 * Math.sin(t * 1.1 + rnd[i] * 6.283);
      let y = 0.1 + Math.pow(Math.max(0, (f + 1) * 0.5), 2.2) * 3.2 * genlik;
      // Masaüstünde sol taraf (metnin altı) daha sakin
      if (!dar) y *= 0.3 + 0.7 * yumusak(-22, -4, x - (1 - c) * 2);
      else y *= 0.55 + 0.45 * yumusak(-6, 10, z);

      const ds = (x - taramaX) / 1.3;
      const s = Math.exp(-ds * ds);
      const dx = x - imlec.x, dz = z - imlec.z;
      const r = Math.exp(-(dx * dx + dz * dz) / 7) * imlec.guc;
      y += s * 1.1 * genlik + r * 2.4;

      const b = acilis >= 1 ? 1 : kolay(Math.min(1, Math.max(0, (acilis * 1.9 - gecikme[i]) / 0.9)));
      y *= b;
      m[i * 16 + 5] = Math.max(0.015, y);

      const k = Math.min(1, y / 3.8);
      const tepe = f > 0.8 ? (f - 0.8) * 3.2 : 0;
      const g = Math.min(1, s * 0.62 + r * 0.85 + tepe);
      parilti[i] = g * 0.55;
      const o = i * 3;
      const br = celikKoyu.r + (celikAcik.r - celikKoyu.r) * k;
      const bg = celikKoyu.g + (celikAcik.g - celikKoyu.g) * k;
      const bb = celikKoyu.b + (celikAcik.b - celikKoyu.b) * k;
      renk[o] = br + (kehribar.r - br) * g;
      renk[o + 1] = bg + (kehribar.g - bg) * g;
      renk[o + 2] = bb + (kehribar.b - bb) * g;
    }
    sutunlar.instanceMatrix.needsUpdate = true;
    sutunlar.instanceColor.needsUpdate = true;
    paraltiAttr.needsUpdate = true;
    renderer.render(sahne, kamera);
  }

  boyutla();

  if (azHareket) {
    ciz(3.2, 1);
    document.documentElement.classList.add('sahne-hazir');
    // Kaydırma durumu değiştikçe statik kareyi yenile
    let sonH = -1, sonC = -1;
    setInterval(() => {
      if (durum.hero !== sonH || durum.iletisim !== sonC) {
        sonH = durum.hero; sonC = durum.iletisim;
        if ((durum.gorunur ?? 1) > 0.02) ciz(3.2, 1);
      }
    }, 250);
    return;
  }

  const saat = new THREE.Clock();
  let acilisBasi = -1;
  let kareSay = 0, sureTop = 0, ayarlandi = false, oncekiZaman = performance.now();

  renderer.setAnimationLoop(() => {
    const simdi = performance.now();
    const dt = simdi - oncekiZaman; oncekiZaman = simdi;
    if (document.hidden || (durum.gorunur ?? 1) < 0.02) { saat.getDelta(); return; }
    const t = saat.getElapsedTime();
    if (acilisBasi < 0) { acilisBasi = t; document.documentElement.classList.add('sahne-hazir'); }
    ciz(t, t - acilisBasi);

    // Uyarlanır kalite: ilk ~2 saniyede ortalama kare süresi yüksekse piksel oranını düşür
    if (!ayarlandi && kareSay < 120) {
      kareSay++; sureTop += dt;
      if (kareSay === 120) {
        ayarlandi = true;
        const ort = sureTop / kareSay;
        if (ort > 24 && pikselOrani > 1) { pikselOrani = 1; renderer.setPixelRatio(1); boyutla(); }
      }
    }
  });
}
