/* Öne çıkan proje: FİMAK Kalite
   Sahnenin kaydırma ilerlemesi, imleç eğimi, yolculukta etkin adım, sayaçlar ve galeri.
   WebGL sahnesinden bağımsızdır; görünür olmayan bölümde kare çizmez. */
(function () {
  'use strict';
  const kok = document.getElementById('kalite');
  if (!kok) return;
  const html = document.documentElement;
  const $ = (s, r = kok) => r.querySelector(s);
  const $$ = (s, r = kok) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- galeri: sitenin ortak görüntüleyicisi ---------------- */
  const listem = () => {
    const srcs = (kok.dataset.galeri || '').split('|').filter(Boolean);
    const alts = (kok.dataset.alts || '').split('|');
    return srcs.map((src, i) => ({ src, alt: alts[i] || kok.dataset.baslik }));
  };
  $$('[data-gal]').forEach((b) => b.addEventListener('click', () => {
    const Site = window.Site;
    if (Site && Site.openGallery) Site.openGallery(listem(), +b.dataset.gal, kok.dataset.baslik, kok.dataset.not);
  }));
  const n = $('.kl-tumu-n');
  if (n) n.textContent = listem().length;

  /* ---------------- hareket azaltıldıysa her şey son hâlinde ---------------- */
  if (reduce) { $('#klSahne').style.setProperty('--p', '1'); kurYol(); return; }
  html.classList.add('kl-hazir');

  /* ---------------- görünür olunca giriş ---------------- */
  const gir = new IntersectionObserver((girdiler) => girdiler.forEach((g) => {
    if (!g.isIntersecting) return;
    g.target.classList.add('is-in');
    gir.unobserve(g.target);
    if (g.target.classList.contains('kl-modul')) setTimeout(() => g.target.classList.add('is-hazir'), 1300);
  }), { rootMargin: '0px 0px -10% 0px' });
  [['.kl-sayilar', '.kl-anim'], ['.kl-moduller', '.kl-anim'], ['.kl-ozellikler', '.kl-anim']].forEach(([kap, s]) => {
    $$(s, $(kap)).forEach((el, i) => { el.style.setProperty('--i', i); gir.observe(el); });
  });
  $$('.kl-adim-gorsel').forEach((el) => gir.observe(el));

  /* ---------------- sayaçlar ---------------- */
  const sayilar = $$('.kl-sayi');
  sayilar.forEach((s) => { s.textContent = '0'; });
  new IntersectionObserver((g, io) => {
    if (!g[0].isIntersecting) return;
    io.disconnect();
    sayilar.forEach((s, i) => {
      const hedef = +s.dataset.n; const t0 = performance.now() + i * 120; const sure = 1500;
      const adim = (t) => {
        const k = clamp((t - t0) / sure, 0, 1);
        s.textContent = Math.round(hedef * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(adim);
      };
      requestAnimationFrame(adim);
    });
  }, { rootMargin: '0px 0px -15% 0px' }).observe($('.kl-sayilar'));
  addEventListener('beforeprint', () => sayilar.forEach((s) => { s.textContent = s.dataset.n; }));

  /* ---------------- 3D cihaz sahnesi: kaydırdıkça doğrulur, imleçle eğilir ---------------- */
  const sahne = $('#klSahne');
  const D = { aktif: false, raf: 0, mx: 0, my: 0, tmx: 0, tmy: 0 };
  function cizSahne() {
    D.raf = 0;
    const r = sahne.getBoundingClientRect();
    const vh = innerHeight;
    // alt kenar ekrana girince 0, sahnenin üstü ekranın %18'ine gelince 1
    const p = clamp((vh - r.top) / (vh * 0.82), 0, 1);
    const e = 1 - Math.pow(1 - p, 2.2);
    D.mx += (D.tmx - D.mx) * 0.08; D.my += (D.tmy - D.my) * 0.08;
    sahne.style.setProperty('--p', e.toFixed(4));
    sahne.style.setProperty('--mx', D.mx.toFixed(4));
    sahne.style.setProperty('--my', D.my.toFixed(4));
    if (D.aktif) D.raf = requestAnimationFrame(cizSahne);
  }
  new IntersectionObserver(([g]) => {
    D.aktif = g.isIntersecting;
    if (D.aktif && !D.raf) D.raf = requestAnimationFrame(cizSahne);
  }, { rootMargin: '10% 0px' }).observe(sahne);
  if (fine) {
    sahne.addEventListener('pointermove', (e) => {
      const r = sahne.getBoundingClientRect();
      D.tmx = (e.clientX - r.left) / r.width - 0.5;
      D.tmy = (e.clientY - r.top) / r.height - 0.5;
    });
    sahne.addEventListener('pointerleave', () => { D.tmx = 0; D.tmy = 0; });
  }

  /* ---------------- modül kartları: imleçle eğilir, ışık izler ---------------- */
  if (fine) {
    $$('.kl-modul').forEach((k) => {
      k.addEventListener('pointermove', (e) => {
        const r = k.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width; const y = (e.clientY - r.top) / r.height;
        k.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
        k.style.setProperty('--rx', ((0.5 - y) * 6).toFixed(2) + 'deg');
        k.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        k.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      k.addEventListener('pointerleave', () => { k.style.setProperty('--rx', '0deg'); k.style.setProperty('--ry', '0deg'); });
    });
  }

  kurYol();

  /* ---------------- yolculuk: ekranın ortasındaki adım etkin, telefon ekranı 3D döner ---------------- */
  function kurYol() {
    const izgara = $('.kl-yol-izgara');
    const adimlar = $$('.kl-adim');
    const ekranlar = $$('.kl-yol-ekran');
    const telefon = $('.kl-yol-telefon');
    let etkin = 0;
    const sec = (i) => {
      if (i === etkin) return;
      etkin = i;
      izgara.style.setProperty('--adim', i);
      adimlar.forEach((a, k) => a.classList.toggle('is-on', k === i));
      ekranlar.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-gecti', k < i); });
    };
    const io =new IntersectionObserver((g) => g.forEach((x) => { if (x.isIntersecting) sec(+x.target.dataset.i); }), { rootMargin: '-46% 0px -46% 0px' });
    adimlar.forEach((a) => io.observe(a));
    if (fine && !reduce && telefon) {
      const yol = $('.kl-yol-sahne');
      izgara.addEventListener('pointermove', (e) => {
        const r = yol.getBoundingClientRect();
        telefon.style.setProperty('--mx', clamp((e.clientX - (r.left + r.width / 2)) / r.width, -0.6, 0.6).toFixed(3));
        telefon.style.setProperty('--my', clamp((e.clientY - (r.top + r.height / 2)) / r.height, -0.6, 0.6).toFixed(3));
      });
      izgara.addEventListener('pointerleave', () => { telefon.style.setProperty('--mx', '0'); telefon.style.setProperty('--my', '0'); });
    }
  }
})();
