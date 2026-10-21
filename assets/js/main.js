/* Ali Büyükuyar · arayüz katmanı (WebGL'den bağımsız çalışır)
   Sayılar sayfadaki projelerden hesaplanır; galeri (kaydırma, dokunarak yakınlaştırma), menü, yazdırma, önizleme. */
(function () {
  'use strict';
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const Site = (window.Site = window.Site || {});

  /* ---------------- sayılar: sayfadaki projelerden ---------------- */
  const projeler = $('#projeler');
  const items2026 = $$('[data-tur]', projeler);
  const arsiv = $$('.kart', projeler);
  const total = items2026.length + arsiv.length;
  const years = {};
  arsiv.forEach((k) => {
    const m = (($('.kart-ust', k) || {}).textContent || '').match(/\d{4}/);
    if (m) years[m[0]] = (years[m[0]] || 0) + 1;
  });
  years['2026'] = items2026.length;
  const yearList = Object.keys(years).sort().map((y) => ({ y, n: years[y] }));
  const yMax = Math.max(...yearList.map((d) => d.n));

  const setNum = (el, n) => { if (!el) return; el.dataset.count = n; el.textContent = (el.dataset.prefix || '') + n + (el.dataset.suffix || ''); };
  setNum($('#sayiToplam'), total);
  setNum($('#sayi2026'), items2026.length);

  const yc = $('#yilGrafik');
  yc.innerHTML = yearList.map((d, i) => {
    const last = i === yearList.length - 1;
    return `<li class="yc${last ? ' is-accent' : ''}" style="--v:${d.n};--m:${yMax}"><span class="sr-only">${d.y} yılında ${d.n} proje</span><span class="yc-count" aria-hidden="true">${d.n}</span><span class="yc-bar" aria-hidden="true"></span><span class="yc-year" aria-hidden="true">${d.y}</span></li>`;
  }).join('');

  // araçlar: her proje kullandığı her araca bir kez sayılır
  const counter = new Map();
  [...items2026, ...arsiv].forEach((o) => {
    new Set((o.dataset.arac || '').split(',').map((s) => s.trim()).filter(Boolean)).forEach((a) => counter.set(a, (counter.get(a) || 0) + 1));
  });
  const tools = [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr')).slice(0, 10).map(([name, n]) => ({ name, n }));
  const tMax = tools.length ? tools[0].n : 1;
  $('#araclar').innerHTML = tools.map((t, i) => `<li class="tool${i === 0 ? ' is-top' : ''}" style="--v:${t.n};--m:${tMax}"><span class="tool-name">${t.name}</span><span class="tool-track" aria-hidden="true"><i></i></span><span class="tool-n">${t.n}<span class="sr-only"> proje</span></span></li>`).join('');
  $('#aracNot').textContent = `Bu sayfadaki ${total} projenin etiketlerinden sayıldı; her proje kullandığı her araca bir kez sayılır.`;

  // öne çıkan proje sıra numaraları
  const featured = $$('.proj', projeler);
  featured.forEach((p, i) => { p.dataset.no = String(i + 1).padStart(2, '0') + ' / ' + String(featured.length).padStart(2, '0'); });
  const seqTotal = $('.seq-total');
  if (seqTotal) seqTotal.textContent = String(featured.length).padStart(2, '0');

  Site.counts = { total, y2026: items2026.length, years: yearList, tools };

  /* ---------------- yazdırma ---------------- */
  $$('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));
  addEventListener('beforeprint', () => {
    $$('.num').forEach((n) => { n.textContent = (n.dataset.prefix || '') + n.dataset.count + (n.dataset.suffix || ''); });
  });

  /* ---------------- menü (dar ekran) ---------------- */
  const menuBtn = $('.menu-btn');
  const topbar = $('.topbar');
  const setMenu = (open) => {
    if (open) { if (window.gsap) window.gsap.killTweensOf(topbar); topbar.style.transform = 'none'; }
    html.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.mb-label').textContent = open ? 'Kapat' : 'Menü';
    if (Site.lenis) open ? Site.lenis.stop() : Site.lenis.start();
  };
  menuBtn.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
  $$('#menu a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  $('.menu-cv').addEventListener('click', () => setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && html.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  /* ---------------- galeri: kaydırarak geç, dokunarak yakınlaştır ---------------- */
  const dlg = $('#galeri');
  const lbImg = $('#lbImg');
  const lbTrack = $('#lbTrack');
  const lbStage = $('#lbStage');
  const lbTitle = $('#lbTitle');
  const lbCount = $('#lbCount');
  const lbNote = $('#lbNote');
  const lbHint = $('#lbHint');
  const prevBtn = $('.lb-prev');
  const nextBtn = $('.lb-next');
  const touchy = matchMedia('(pointer: coarse)').matches;
  const G = { list: [], i: 0, title: '' };
  const Z = { s: 1, x: 0, y: 0 };
  const ZOOM = 2.4;

  const applyZoom = (anim) => {
    lbImg.classList.toggle('is-anim', !!anim);
    lbImg.style.transform = `translate3d(${Z.x.toFixed(1)}px, ${Z.y.toFixed(1)}px, 0) scale(${Z.s})`;
    lbStage.classList.toggle('is-zoomed', Z.s > 1);
  };
  const limits = () => {
    const w = lbImg.offsetWidth; const h = lbImg.offsetHeight;
    const W = lbStage.clientWidth; const H = lbStage.clientHeight;
    return { mx: Math.max(0, (w * Z.s - Math.min(W, w)) / 2), my: Math.max(0, (h * Z.s - Math.min(H, h)) / 2) };
  };
  const resetZoom = (anim) => { Z.s = 1; Z.x = 0; Z.y = 0; applyZoom(anim); };
  const toggleZoom = (cx, cy) => {
    if (Z.s > 1) { resetZoom(true); return; }
    const r = lbImg.getBoundingClientRect();
    const ox = cx - (r.left + r.width / 2); const oy = cy - (r.top + r.height / 2);
    Z.s = ZOOM;
    const L = limits();
    Z.x = clamp(-ox * (ZOOM - 1), -L.mx, L.mx);
    Z.y = clamp(-oy * (ZOOM - 1), -L.my, L.my);
    applyZoom(true);
  };

  const render = (dir) => {
    const it = G.list[G.i];
    resetZoom(false);
    const swap = () => {
      lbImg.src = it.src;
      lbImg.alt = it.alt || G.title;
      lbCount.textContent = G.list.length > 1 ? `${G.i + 1} / ${G.list.length}` : '';
      prevBtn.disabled = G.i === 0;
      nextBtn.disabled = G.i === G.list.length - 1;
      [G.i - 1, G.i + 1].forEach((k) => { if (G.list[k]) { const im = new Image(); im.src = G.list[k].src; } });
    };
    if (!dir || reduce || !lbTrack.animate) { swap(); lbTrack.style.transform = ''; return; }
    const out = lbTrack.animate([{ transform: lbTrack.style.transform || 'translate3d(0,0,0)', opacity: 1 }, { transform: `translate3d(${-dir * 18}%,0,0)`, opacity: 0 }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    out.onfinish = () => {
      swap();
      lbTrack.style.transform = '';
      const go = () => {
        out.cancel();
        lbTrack.animate([{ transform: `translate3d(${dir * 18}%,0,0)`, opacity: 0 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      };
      if (lbImg.decode) lbImg.decode().then(go, go); else go();
    };
  };
  const go = (d) => { const k = G.i + d; if (k < 0 || k >= G.list.length) { snapBack(); return; } G.i = k; render(d); };
  const snapBack = () => {
    if (!lbTrack.animate) { lbTrack.style.transform = ''; return; }
    const from = lbTrack.style.transform || 'translate3d(0,0,0)';
    lbTrack.style.transform = '';
    lbTrack.animate([{ transform: from }, { transform: 'translate3d(0,0,0)' }], { duration: 380, easing: 'cubic-bezier(.16,1,.3,1)' });
  };

  function openGallery(list, i, title, note) {
    G.list = list; G.i = clamp(i || 0, 0, list.length - 1); G.title = title;
    lbTitle.textContent = title;
    lbNote.textContent = note || 'Görseldeki veriler gerçek dışı örnek veridir; gerçek değerleri yansıtmaz.';
    const many = list.length > 1;
    lbHint.textContent = touchy ? (many ? 'Kaydırarak geçin, dokunarak yakınlaştırın.' : 'Dokunarak yakınlaştırın.') : (many ? 'Ok tuşlarıyla geçin, tıklayarak yakınlaştırın.' : 'Tıklayarak yakınlaştırın.');
    dlg.classList.toggle('is-single', !many);
    render(0);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    html.classList.add('lb-open');
    if (Site.lenis) Site.lenis.stop();
    if (!reduce && dlg.animate) dlg.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  Site.openGallery = openGallery;

  dlg.addEventListener('close', () => { html.classList.remove('lb-open'); resetZoom(false); if (Site.lenis) Site.lenis.start(); });
  $('.lb-close').addEventListener('click', () => dlg.close());
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  // işaretçi: kaydırma, dokunma, sürükleyerek gezinme
  let P = null;
  lbStage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.lb-nav') || e.button > 0) return;
    P = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), zx: Z.x, zy: Z.y, moved: false, dx: 0 };
    try { lbStage.setPointerCapture(e.pointerId); } catch (err) { /* yok */ }
  });
  lbStage.addEventListener('pointermove', (e) => {
    if (!P || e.pointerId !== P.id) return;
    const dx = e.clientX - P.x0; const dy = e.clientY - P.y0;
    if (Math.hypot(dx, dy) > 7) P.moved = true;
    if (!P.moved) return;
    if (Z.s > 1) {
      const L = limits();
      Z.x = clamp(P.zx + dx, -L.mx, L.mx); Z.y = clamp(P.zy + dy, -L.my, L.my);
      applyZoom(false);
    } else if (G.list.length > 1) {
      const edge = (dx > 0 && G.i === 0) || (dx < 0 && G.i === G.list.length - 1);
      P.dx = dx;
      lbTrack.style.transform = `translate3d(${(edge ? dx * 0.3 : dx).toFixed(1)}px,0,0)`;
    }
  });
  const end = (e) => {
    if (!P || e.pointerId !== P.id) return;
    const dt = performance.now() - P.t0;
    if (!P.moved && dt < 450) toggleZoom(e.clientX, e.clientY);
    else if (Z.s === 1 && G.list.length > 1) {
      if (P.dx < -56) go(1); else if (P.dx > 56) go(-1); else snapBack();
    }
    P = null;
  };
  lbStage.addEventListener('pointerup', end);
  lbStage.addEventListener('pointercancel', (e) => { if (P && Z.s === 1) snapBack(); P = null; });

  const galleryOf = (el) => {
    const srcs = (el.dataset.galeri || '').split('|').filter(Boolean);
    const alts = (el.dataset.alts || '').split('|');
    return srcs.map((src, i) => ({ src, alt: alts[i] || el.dataset.baslik }));
  };

  /* ---------------- proje ekranları (sekmeler) ---------------- */
  // sahne katmanı varsa geçişi parçacıklarla yapar; yoksa görsel doğrudan değişir
  function plainShot(art, i) {
    const img = $('.proj-img', art);
    const list = galleryOf(art);
    if (!img || !list[i]) return;
    if (reduce) { img.src = list[i].src; img.alt = list[i].alt; return; }
    img.style.opacity = '0';
    setTimeout(() => {
      img.src = list[i].src; img.alt = list[i].alt;
      const show = () => { img.style.opacity = ''; };
      if (img.decode) img.decode().then(show, show); else img.onload = show;
    }, 260);
  }
  $$('.proj, .gorev').forEach((art) => {
    art._shot = 0;
    const tabs = $$('.tab', art);
    tabs.forEach((t) => t.addEventListener('click', () => {
      const i = +t.dataset.shot;
      if (i === art._shot) return;
      const handled = Site.onShot ? Site.onShot(art, i) : false;
      if (handled === 'busy') return;
      if (!handled) plainShot(art, i);
      art._shot = i;
      tabs.forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
      const s = galleryOf(art)[i];
      const fr = $('.proj-frame', art);
      if (fr && s) fr.setAttribute('aria-label', `Görseli büyüt: ${art.dataset.baslik}, ${t.textContent}`);
    }));
    const frame = $('button.proj-frame', art);
    if (frame) frame.addEventListener('click', () => openGallery(galleryOf(art), art._shot || 0, art.dataset.baslik, art.dataset.not));
  });

  /* ---------------- önceki projeler: satır ve önizleme ---------------- */
  $$('.kart').forEach((k) => {
    $('.row', k).addEventListener('click', () => openGallery(galleryOf(k), 0, k.dataset.baslik, k.dataset.not));
  });

  if (fine && !reduce) {
    html.classList.add('ve-hover');
    const pv = $('.preview');
    const pvImg = $('.pv-img');
    const st = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, lastX: 0, on: false, raf: 0 };
    const loop = () => {
      st.x += (st.tx - st.x) * 0.16; st.y += (st.ty - st.y) * 0.16;
      st.tr *= 0.9; st.r += (st.tr - st.r) * 0.12;
      pv.style.transform = `translate3d(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px, 0) translateY(-50%) rotate(${st.r.toFixed(2)}deg)`;
      if (st.on || Math.abs(st.tx - st.x) > 0.5) st.raf = requestAnimationFrame(loop); else st.raf = 0;
    };
    const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(loop); };
    const place = (cx, cy) => {
      const w = pv.offsetWidth || 340;
      let x = cx + 36;
      if (x + w > innerWidth - 16) x = cx - 36 - w;
      st.tx = x; st.ty = clamp(cy, 150, innerHeight - 150);
    };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || !st.on) return;
      place(e.clientX, e.clientY);
      st.tr = clamp((e.clientX - st.lastX) * 0.4, -7, 7);
      st.lastX = e.clientX;
      kick();
    }, { passive: true });
    const show = (k, cx, cy) => {
      const src = k.dataset.kapak;
      if (pvImg.getAttribute('src') !== src) {
        pvImg.src = src;
        if (pvImg.animate) pvImg.animate([{ opacity: 0.2, transform: 'scale(1.06)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
      if (!st.on) { place(cx, cy); st.x = st.tx; st.y = st.ty; }
      st.on = true; pv.classList.add('is-on'); kick();
    };
    const hide = () => { st.on = false; pv.classList.remove('is-on'); };
    $$('.kart .row').forEach((row) => {
      const k = row.closest('.kart');
      row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(k, e.clientX, e.clientY); });
      row.addEventListener('focus', () => { const rc = row.getBoundingClientRect(); show(k, rc.left + rc.width * 0.62, rc.top + rc.height / 2); });
      row.addEventListener('blur', hide);
    });
    $('#arsiv').addEventListener('pointerleave', hide);
    addEventListener('scroll', () => { if (st.on && !$('#arsiv').matches(':hover')) hide(); }, { passive: true });
  }

  Site.galleryOf = galleryOf;
  Site.ready = true;
})();
