// "Sahadan karara giden yol" bölümünün 3D sahnesi.
// Altı çelik sütun (veri → karar) boyları artarak dizilir, tepelerinden geçen boruda veri paketleri akar.
// Kaydırma ilerlemesi (window.SAHNE.akis, main.js yazar) sütunları sırayla yakar.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const kap = document.getElementById('akisSahne');
const tuval = document.getElementById('akisTuval');
const hat = document.getElementById('akisHat');
const durum = window.SAHNE || (window.SAHNE = { hero: 0, iletisim: 0, gorunur: 1 });
const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglVarMi() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (kap && tuval && hat && webglVarMi()) kur();

function kur() {
  hat.classList.add('akis-3d');
  const ZEMIN = 0x0b0c0e;
  const N = 6;
  const BOY = [1.2, 1.8, 2.5, 3.3, 4.2, 5.2];

  const renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(ZEMIN, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const sahne = new THREE.Scene();
  sahne.fog = new THREE.Fog(ZEMIN, 20, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  sahne.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  sahne.environmentIntensity = 0.55;
  pmrem.dispose();
  const anaIsik = new THREE.DirectionalLight(0xfff0dc, 2.6);
  anaIsik.position.set(-7, 11, 9);
  sahne.add(anaIsik);
  const kenarIsik = new THREE.DirectionalLight(0xf2a93b, 1.3);
  kenarIsik.position.set(7, 4, -9);
  sahne.add(kenarIsik);

  const kamera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const kehribar = new THREE.Color(0xf2a93b);
  const kapakGri = new THREE.Color(0x3c414a);

  // Zemin ızgarası
  const izgara = new THREE.GridHelper(80, 80, 0x2a2e35, 0x181b1f);
  izgara.material.transparent = true;
  izgara.material.opacity = 0.6;
  sahne.add(izgara);

  // Sütunlar
  const govdeGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.06);
  govdeGeo.translate(0, 0.5, 0);
  const kapakGeo = new RoundedBoxGeometry(1.02, 0.14, 1.02, 2, 0.05);
  const halkaGeo = new THREE.RingGeometry(0.78, 0.86, 64);
  const govdeMat = new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.55, roughness: 0.36 });
  const sutunlar = [];
  for (let i = 0; i < N; i++) {
    const grup = new THREE.Group();
    const govde = new THREE.Mesh(govdeGeo, govdeMat);
    const kapakMat = new THREE.MeshStandardMaterial({ color: kapakGri.clone(), metalness: 0.3, roughness: 0.35, emissive: kehribar, emissiveIntensity: 0 });
    const kapak = new THREE.Mesh(kapakGeo, kapakMat);
    const halkaMat = new THREE.MeshBasicMaterial({ color: kehribar, transparent: true, opacity: 0, depthWrite: false });
    const halka = new THREE.Mesh(halkaGeo, halkaMat);
    halka.rotation.x = -Math.PI / 2;
    halka.position.y = 0.02;
    grup.add(govde, kapak, halka);
    sahne.add(grup);
    sutunlar.push({ grup, govde, kapak, kapakMat, halka, halkaMat, yan: 0 });
  }

  // Boru ve paketler (yerleşime göre yeniden kurulur)
  const boruMat = new THREE.MeshStandardMaterial({ color: 0x33373e, metalness: 0.5, roughness: 0.45 });
  const aktifMat = new THREE.MeshStandardMaterial({ color: 0xf2a93b, emissive: kehribar, emissiveIntensity: 1.3, metalness: 0.2, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const paketMat = new THREE.MeshBasicMaterial({ color: 0xffd28f });
  const paketler = [];
  for (let k = 0; k < 7; k++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), paketMat);
    p.visible = false;
    sahne.add(p);
    paketler.push(p);
  }
  let egri = null, boru = null, boruAktif = null, dugumU = [], olcek = 1;

  const isin = new THREE.Raycaster();
  const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const nokta = new THREE.Vector3();
  const ndc = new THREE.Vector2();

  function yerlestir() {
    const w = kap.clientWidth, h = kap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.position.set(0, 7, 20);
    kamera.lookAt(0, 2.1, 0);
    kamera.updateProjectionMatrix();
    kamera.updateMatrixWorld();

    // Sütunlar alttaki adım yazılarının ortasına hizalanır (masaüstü); dar ekranda eşit aralık
    const kr = kap.getBoundingClientRect();
    const adimlar = Array.from(document.querySelectorAll('#akisHat .adim'));
    const genis = innerWidth > 860 && adimlar.length === N;
    const xs = adimlar.map((a, i) => {
      if (genis) { const r = a.getBoundingClientRect(); return r.left + r.width / 2 - kr.left; }
      return w * (0.08 + 0.84 * i / (N - 1));
    });
    const konumlar = xs.map((x) => {
      ndc.set((x / w) * 2 - 1, -(0.8 * 2 - 1));
      isin.setFromCamera(ndc, kamera);
      isin.ray.intersectPlane(duzlem, nokta);
      return nokta.clone();
    });
    const aralik = konumlar[1].distanceTo(konumlar[0]);
    olcek = Math.min(1.5, aralik * (genis ? 0.3 : 0.42));
    sutunlar.forEach((s, i) => {
      s.grup.position.copy(konumlar[i]);
      s.govde.scale.set(olcek, BOY[i], olcek);
      s.kapak.scale.set(olcek, 1, olcek);
      s.halka.scale.setScalar(olcek);
    });

    // Tepelerden geçen kavisli boru
    const pts = [];
    for (let i = 0; i < N; i++) {
      const p = konumlar[i];
      pts.push(new THREE.Vector3(p.x, BOY[i] + 0.45, p.z));
      if (i < N - 1) {
        const q = konumlar[i + 1];
        pts.push(new THREE.Vector3((p.x + q.x) / 2, Math.max(BOY[i], BOY[i + 1]) + 1.05, (p.z + q.z) / 2));
      }
    }
    egri = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const yaricap = 0.035 * olcek + 0.02;
    if (boru) { boru.geometry.dispose(); sahne.remove(boru, boruAktif); }
    const geo = new THREE.TubeGeometry(egri, 320, yaricap, 10, false);
    boru = new THREE.Mesh(geo, boruMat);
    boruAktif = new THREE.Mesh(geo, aktifMat);
    sahne.add(boru, boruAktif);
    paketler.forEach((p) => p.scale.setScalar(yaricap * 2.4));

    // Her düğümün boru üzerindeki yay uzunluğu oranı
    const uzunluklar = egri.getLengths(2000);
    const toplam = uzunluklar[uzunluklar.length - 1];
    dugumU = Array.from({ length: N }, (_, i) => uzunluklar[Math.round((2 * i) / (2 * N - 2) * 2000)] / toplam);
    if (azHareket) ciz(4, 1);
  }

  let gorunur = false, hazir = false;
  new IntersectionObserver(([g]) => { gorunur = g.isIntersecting; }, { rootMargin: '120px' }).observe(kap);
  const ro = new ResizeObserver(() => yerlestir());
  ro.observe(kap);
  addEventListener('load', yerlestir);

  let ilerleme = 0;
  function ciz(t, hedef) {
    if (!egri) return;
    ilerleme += (hedef - ilerleme) * (azHareket ? 1 : 0.08);
    const k = ilerleme * (N - 1);
    const a = Math.min(N - 2, Math.floor(k));
    const u = dugumU[a] + (dugumU[a + 1] - dugumU[a]) * Math.min(1, k - a);
    const toplam = boruAktif.geometry.index.count;
    boruAktif.geometry.setDrawRange(0, Math.floor((toplam * u) / 6) * 6);

    sutunlar.forEach((s, i) => {
      const yan = ilerleme >= i / (N - 1) - 0.002 ? 1 : 0;
      s.yan += (yan - s.yan) * (azHareket ? 1 : 0.07);
      s.kapakMat.emissiveIntensity = s.yan * 1.5;
      s.kapakMat.color.copy(kapakGri).lerp(kehribar, s.yan);
      const nefes = azHareket ? 1 : 0.75 + 0.25 * Math.sin(t * 2 + i);
      s.halkaMat.opacity = s.yan * 0.55 * nefes;
      s.halka.scale.setScalar(olcek * (1 + 0.08 * s.yan * nefes));
      const boy = BOY[i] * (0.93 + 0.07 * s.yan);
      s.govde.scale.y = boy;
      s.kapak.position.y = boy + 0.07;
    });

    paketler.forEach((p, j) => {
      const pu = azHareket ? -1 : (t * 0.075 + j / paketler.length) % 1;
      p.visible = pu >= 0 && pu < u - 0.01;
      if (p.visible) p.position.copy(egri.getPointAt(pu));
    });

    if (!azHareket) {
      kamera.position.x = Math.sin(t * 0.18) * 0.7 + (ilerleme - 0.5) * 1.6;
      kamera.position.y = 7 + Math.sin(t * 0.13) * 0.25;
      kamera.lookAt(0, 2.1, 0);
    }
    renderer.render(sahne, kamera);
  }

  yerlestir();
  if (azHareket) { ciz(4, 1); return; }

  const saat = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!gorunur || document.hidden) { saat.getDelta(); return; }
    if (!hazir) { hazir = true; yerlestir(); }
    ciz(saat.getElapsedTime(), durum.akis || 0);
  });
}
