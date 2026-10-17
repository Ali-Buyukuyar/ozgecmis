// Sayfa etkileşimleri: menü, galeri, kaydırma animasyonları ve 3D sahnenin kaydırma durumu.
// GSAP yüklenemezse içerik görünür kalır; yalnızca animasyonlar devre dışı kalır.
(function () {
  'use strict';

  const kok = document.documentElement;
  const azHareket = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsapVar = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const SAHNE = window.SAHNE = window.SAHNE || { hero: 0, iletisim: 0, gorunur: 1 };
  const $ = (s, k = document) => k.querySelector(s);
  const $$ = (s, k = document) => Array.from(k.querySelectorAll(s));

  if (!gsapVar) kok.classList.remove('anim');

  /* ---------- Başlık arka planı ---------- */
  const ust = $('#ust');
  const isaretci = document.createElement('div');
  isaretci.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:60px;pointer-events:none';
  document.body.prepend(isaretci);
  new IntersectionObserver(([g]) => ust.classList.toggle('dolu', !g.isIntersecting)).observe(isaretci);

  /* ---------- Mobil menü ---------- */
  const menu = $('#menu');
  const menuDugme = $('#menuDugme');
  function menuKapat() {
    menu.classList.remove('acik');
    menuDugme.setAttribute('aria-expanded', 'false');
    menuDugme.setAttribute('aria-label', 'Menüyü aç');
    menuDugme.innerHTML = '<i class="ph-light ph-list" aria-hidden="true"></i>';
  }
  menuDugme.addEventListener('click', () => {
    const acik = menu.classList.toggle('acik');
    menuDugme.setAttribute('aria-expanded', String(acik));
    menuDugme.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
    menuDugme.innerHTML = `<i class="ph-light ${acik ? 'ph-x' : 'ph-list'}" aria-hidden="true"></i>`;
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', menuKapat));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('acik')) menuKapat(); });

  /* ---------- CV yazdırma ---------- */
  $$('[data-yazdir]').forEach((b) => b.addEventListener('click', () => window.print()));

  /* ---------- Galeri ---------- */
  // Masaüstünde ok tuşları, telefonda parmakla kaydırma; resme dokununca/tıklayınca yakınlaşır.
  const galeri = $('#galeri');
  const gOrta = $('.galeri-orta', galeri);
  const gResim = $('#galeriResim');
  const gBaslik = $('#galeriBaslik');
  const gSayac = $('#galeriSayac');
  const dokunmatik = matchMedia('(pointer: coarse)').matches;
  $('#galeriIpucu').textContent = dokunmatik
    ? 'Kaydırarak gezinin, yakınlaştırmak için resme dokunun.'
    : 'Ok tuşlarıyla gezinin, yakınlaştırmak için resme tıklayın.';
  let gListe = [], gSira = 0, gAd = '';

  function yakinKapat() { gOrta.classList.remove('yakin'); }
  function galeriGoster() {
    yakinKapat();
    gResim.src = gListe[gSira];
    gResim.alt = `${gAd}, görsel ${gSira + 1}`;
    gSayac.textContent = gListe.length > 1 ? `${gSira + 1} / ${gListe.length}` : '';
    const coklu = gListe.length > 1;
    $('#galeriOnceki').hidden = !coklu;
    $('#galeriSonraki').hidden = !coklu;
    if (coklu) { const on = new Image(); on.src = gListe[(gSira + 1) % gListe.length]; }
  }
  function galeriAc(liste, sira, ad, not) {
    if (!liste.length) return;
    gListe = liste; gSira = sira || 0; gAd = ad || '';
    gBaslik.textContent = gAd;
    $('#galeriNot').textContent = not || '';
    galeriGoster();
    if (typeof galeri.showModal === 'function') galeri.showModal(); else galeri.setAttribute('open', '');
    kok.style.overflow = 'hidden';
  }
  function galeriKapat() { if (galeri.open) galeri.close(); }
  function adim(y) { gSira = (gSira + y + gListe.length) % gListe.length; galeriGoster(); }
  galeri.addEventListener('close', () => { kok.style.overflow = ''; yakinKapat(); });
  $('#galeriKapat').addEventListener('click', galeriKapat);
  $('#galeriOnceki').addEventListener('click', () => adim(-1));
  $('#galeriSonraki').addEventListener('click', () => adim(1));
  galeri.addEventListener('click', (e) => { if (e.target === galeri || (e.target === gOrta && !gOrta.classList.contains('yakin'))) galeriKapat(); });
  galeri.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') adim(1);
    if (e.key === 'ArrowLeft') adim(-1);
  });
  // Yakınlaştırma: dokunulan noktayı ortalayarak büyütür, tekrar dokununca küçültür
  gResim.addEventListener('click', (e) => {
    e.stopPropagation();
    if (gOrta.classList.contains('yakin')) { yakinKapat(); return; }
    const r = gResim.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    gOrta.classList.add('yakin');
    requestAnimationFrame(() => {
      gOrta.scrollLeft = gResim.offsetWidth * fx - gOrta.clientWidth / 2;
      gOrta.scrollTop = gResim.offsetHeight * fy - gOrta.clientHeight / 2;
    });
  });
  // Parmakla kaydırma: yakın değilken sola/sağa kaydırmak sonraki/önceki görsele geçer
  let dx0 = 0, dy0 = 0, dokunuyor = false;
  gOrta.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { dokunuyor = false; return; }
    dokunuyor = true; dx0 = e.touches[0].clientX; dy0 = e.touches[0].clientY;
  }, { passive: true });
  gOrta.addEventListener('touchend', (e) => {
    if (!dokunuyor || gOrta.classList.contains('yakin') || gListe.length < 2) return;
    dokunuyor = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - dx0, dy = t.clientY - dy0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) adim(dx < 0 ? 1 : -1);
  }, { passive: true });
  const listeOku = (el) => (el.dataset.galeri || '').split('|').filter(Boolean);

  // Önceki projeler ve FİMAK projeleri
  $$('.kart').forEach((k) => $('.kart-gorsel', k).addEventListener('click', () => galeriAc(listeOku(k), 0, k.dataset.baslik, k.dataset.not)));
  $$('.proje').forEach((p) => {
    const ac = () => galeriAc(listeOku(p), 0, p.dataset.baslik, p.dataset.not);
    $('.metin-btn', p).addEventListener('click', ac);
    $('.proje-gorsel-mobil', p).addEventListener('click', ac);
  });

  /* ---------- FİMAK anlatımı: etkin proje ve 3D ekran destesi ---------- */
  // Etkin projenin ekranı önde durur; sıradakiler arkada derinlemesine dizilir,
  // geçilenler izleyiciye doğru uçup kaybolur.
  const projeler = $$('.proje');
  const deste = $('#deste');
  const ekranlar = $$('#deste .ekran3d');
  const inceImlec = matchMedia('(pointer: fine)').matches && !azHareket;
  let etkin = -1;
  function desteDiz() {
    ekranlar.forEach((e) => {
      const d = Number(e.dataset.i) - etkin;
      let t, o, f;
      if (d === 0) { t = 'translate3d(0, 0, 0)'; o = 1; f = 'none'; }
      else if (d > 0) {
        t = `translate3d(${d * 3.5}%, ${-d * 6.5}%, ${-d * 130}px)`;
        o = d > 3 ? 0 : 1 - d * 0.2;
        f = `brightness(${(1 - d * 0.17).toFixed(2)})`;
      } else { t = 'translate3d(-6%, 16%, 240px) rotateX(-16deg)'; o = 0; f = 'none'; }
      e.style.transform = t;
      e.style.opacity = o;
      e.style.filter = f;
    });
  }
  function projeEtkin(i) {
    if (i === etkin) return;
    etkin = i;
    projeler.forEach((p, k) => p.classList.toggle('aktif', k === i));
    desteDiz();
  }
  projeEtkin(0);
  deste.addEventListener('click', () => { const p = projeler[etkin]; if (p) galeriAc(listeOku(p), 0, p.dataset.baslik, p.dataset.not); });
  if (inceImlec) {
    deste.addEventListener('pointermove', (e) => {
      const r = deste.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      deste.style.setProperty('--ry', `${(-9 + dx * 12).toFixed(2)}deg`);
      deste.style.setProperty('--rx', `${(4 - dy * 9).toFixed(2)}deg`);
    });
    deste.addEventListener('pointerleave', () => { deste.style.removeProperty('--ry'); deste.style.removeProperty('--rx'); });

    // Yetkinlik kartları imleçle eğilir, kenarlarında ışık gezer
    $$('.yet').forEach((k) => {
      k.addEventListener('pointermove', (e) => {
        const r = k.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        k.style.setProperty('--ry', `${(dx * 8).toFixed(2)}deg`);
        k.style.setProperty('--rx', `${(-dy * 8).toFixed(2)}deg`);
        k.style.setProperty('--mx', `${((dx + 0.5) * 100).toFixed(1)}%`);
        k.style.setProperty('--my', `${((dy + 0.5) * 100).toFixed(1)}%`);
      });
      k.addEventListener('pointerleave', () => { k.style.removeProperty('--ry'); k.style.removeProperty('--rx'); });
    });

    // Kahraman yazısı imlece derinlikle tepki verir
    const heroIc = $('.hero-ic');
    addEventListener('pointermove', (e) => {
      if (SAHNE.hero > 0.9) return;
      const dx = e.clientX / innerWidth - 0.5;
      const dy = e.clientY / innerHeight - 0.5;
      heroIc.style.setProperty('--hy', `${(dx * 7).toFixed(2)}deg`);
      heroIc.style.setProperty('--hx', `${(-dy * 5).toFixed(2)}deg`);
    }, { passive: true });
  }

  /* ---------- İş-Görev Takip: küçük resimler ---------- */
  const gorevResimler = $$('#gorevIc img');
  const kucukler = $$('#kucukler button');
  let gorevSira = 0;
  kucukler.forEach((b, i) => b.addEventListener('click', () => {
    gorevSira = i;
    gorevResimler.forEach((r, k) => r.classList.toggle('aktif', k === i));
    kucukler.forEach((d, k) => { d.classList.toggle('aktif', k === i); d.setAttribute('aria-selected', String(k === i)); });
  }));
  const gorevAc = () => galeriAc(gorevResimler.map((r) => r.currentSrc || r.src), gorevSira, 'İş-Görev Takip Sistemi', $('#gorevIc').dataset.not);
  $('#gorevIc').addEventListener('click', gorevAc);
  $('#gorevIc').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gorevAc(); } });

  /* ---------- Telefonda proje arşivi: kaydırırken kartlar 3D döner (kapak akışı) ---------- */
  const arsivDis = $('#arsivDis');
  const arsivKartlar = $$('.kart', arsivDis);
  const darEkran = matchMedia('(max-width: 1023px)');
  let akisIstek = 0;
  function kapakAkisi() {
    akisIstek = 0;
    if (!darEkran.matches) return;
    const r = arsivDis.getBoundingClientRect();
    const orta = r.left + r.width / 2;
    arsivKartlar.forEach((k) => {
      const kr = k.getBoundingClientRect();
      const d = Math.max(-1.5, Math.min(1.5, (kr.left + kr.width / 2 - orta) / r.width));
      k.style.transform = `perspective(900px) rotateY(${(-d * 34).toFixed(1)}deg) translateZ(${(-Math.abs(d) * 90).toFixed(0)}px)`;
      k.style.opacity = (1 - Math.min(Math.abs(d) * 0.35, 0.45)).toFixed(2);
    });
  }
  if (!azHareket) {
    arsivDis.addEventListener('scroll', () => { if (!akisIstek) akisIstek = requestAnimationFrame(kapakAkisi); }, { passive: true });
    addEventListener('resize', () => { if (!akisIstek) akisIstek = requestAnimationFrame(kapakAkisi); });
    darEkran.addEventListener('change', () => {
      if (!darEkran.matches) arsivKartlar.forEach((k) => { k.style.transform = ''; k.style.opacity = ''; });
      kapakAkisi();
    });
    kapakAkisi();
  }

  /* ---------- Menüde etkin bölüm ---------- */
  const menuLinkleri = $$('.menu a');
  let sonMenu = null;
  function menuEtkin(id) {
    if (id === sonMenu) return;
    sonMenu = id;
    menuLinkleri.forEach((a) => a.classList.toggle('aktif', a.dataset.hedef === id));
  }

  /* ---------- 3D sahne opaklığı ---------- */
  function sahneOpak() {
    const o = Math.max(0, Math.min(1, Math.max(1 - SAHNE.hero * 1.15, SAHNE.iletisim * 0.45)));
    SAHNE.gorunur = o;
    kok.style.setProperty('--sahne-op', o.toFixed(3));
  }

  if (!gsapVar) {
    // Animasyonsuz yedek: sahne yalnız kahraman ve iletişim görünürken çizilir
    const durumlar = { hero: 1, iletisim: 0 };
    const io = new IntersectionObserver((girdiler) => {
      girdiler.forEach((g) => { durumlar[g.target.id] = g.isIntersecting ? 1 : 0; });
      SAHNE.hero = durumlar.hero ? 0 : 1;
      SAHNE.iletisim = durumlar.iletisim;
      sahneOpak();
    }, { threshold: 0.15 });
    io.observe($('#hero')); io.observe($('#iletisim'));
    const io2 = new IntersectionObserver((g) => g.forEach((x) => x.isIntersecting && menuEtkin(x.target.id)), { rootMargin: '-50% 0px -50% 0px' });
    ['profil', 'deneyim', 'fimak', 'projeler', 'yetkinlikler', 'iletisim'].forEach((id) => io2.observe(document.getElementById(id)));
    const io3 = new IntersectionObserver((g) => g.forEach((x) => {
      if (x.isIntersecting) projeEtkin(Number(x.target.dataset.i));
    }), { rootMargin: '-50% 0px -50% 0px' });
    projeler.forEach((p) => io3.observe(p));
    return;
  }

  /* ================= GSAP ================= */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const kolay = 'power3.out';

  // 3D sahne: kahraman kaydırıldıkça kamera yükselir ve sahne söner; iletişimde geri gelir.
  ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onUpdate: (s) => { SAHNE.hero = s.progress; sahneOpak(); } });
  ScrollTrigger.create({ trigger: '#iletisim', start: 'top bottom', end: 'top 25%', onUpdate: (s) => { SAHNE.iletisim = s.progress; sahneOpak(); } });
  sahneOpak();

  // Menü: üst kenarı ekranın ortasını geçmiş son bölüm etkin sayılır (sabitlenen bölümlerden etkilenmez)
  const menuBolumleri = ['profil', 'deneyim', 'fimak', 'projeler', 'yetkinlikler', 'iletisim'].map((id) => document.getElementById(id));
  function menuGuncelle() {
    const orta = innerHeight * 0.5;
    let id = '';
    menuBolumleri.forEach((b) => { if (b.getBoundingClientRect().top <= orta) id = b.id; });
    menuEtkin(id);
  }
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: menuGuncelle, onRefresh: menuGuncelle });

  // FİMAK: ekranın ortasından geçen proje etkin olur (masaüstünde çerçeve onu gösterir)
  projeler.forEach((p, i) => {
    ScrollTrigger.create({ trigger: p, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && projeEtkin(i) });
  });

  if (azHareket) {
    // Hareket azaltıldığında yalnız durum göstergeleri çalışır
    $$('.ci-satir').forEach((r) => r.classList.add('aktif'));
    $$('.adim').forEach((a) => a.classList.add('aktif'));
    gsap.set(['#cizelgeDolu'], { scaleY: 1 });
    gsap.set('#akisDolu', { scaleX: 1, scaleY: 1 });
    SAHNE.akis = 1;
    return;
  }

  // Kahraman girişi
  gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 })
    .fromTo('.hero-ad .satir > span', { y: 0, yPercent: 105 }, { yPercent: 0, duration: 1.15, stagger: 0.1 })
    .to('.hero .ust-etiket', { opacity: 1, y: 0, duration: 0.8 }, 0.25)
    .to('.hero-alt', { opacity: 1, y: 0, duration: 0.8 }, 0.55)
    .to('.hero-cta', { opacity: 1, y: 0, duration: 0.8 }, 0.7);

  // Görünür olma: 3D işaretli öğeler yatık gelip doğrulur
  gsap.set('[data-goster="3d"]', { rotationX: -28, y: 44, transformPerspective: 900, transformOrigin: '50% 0%' });
  ScrollTrigger.batch('[data-goster="3d"]', {
    start: 'top 90%',
    once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, rotationX: 0, duration: 1.1, ease: kolay, stagger: 0.09, overwrite: true, clearProps: 'transform' }),
  });
  ScrollTrigger.batch('[data-goster]:not([data-goster="3d"])', {
    start: 'top 88%',
    once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: kolay, stagger: 0.08, overwrite: true }),
  });

  // Sayaçlar
  // Sayaçlar: HTML'deki gerçek değer yerinde kalır, yalnız göründüğünde sıfırdan sayılır
  const sayacTweenleri = [];
  $$('[data-say]').forEach((el) => {
    const hedef = Number(el.dataset.say);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => {
        el.textContent = '0';
        sayacTweenleri.push(gsap.to(o, { v: hedef, duration: 1.6, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }));
      },
    });
  });
  // Yazdırmada (CV'yi indir) sayaçlar her zaman son değeriyle basılır
  addEventListener('beforeprint', () => {
    sayacTweenleri.forEach((t) => t.progress(1));
    $$('[data-say]').forEach((el) => { el.textContent = el.dataset.say; });
  });

  // Profil cümlesi: kelime kelime aydınlanır
  const ifade = $('#ifade');
  (function kelimele(dugum) {
    Array.from(dugum.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const parca = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((k) => {
          if (!k) return;
          if (/^\s+$/.test(k)) { parca.appendChild(document.createTextNode(k)); return; }
          const s = document.createElement('span'); s.className = 'kelime'; s.textContent = k; parca.appendChild(s);
        });
        n.replaceWith(parca);
      } else if (n.nodeType === 1) kelimele(n);
    });
  })(ifade);
  gsap.fromTo($$('.kelime', ifade), { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.08,
    scrollTrigger: { trigger: ifade, start: 'top 82%', end: 'bottom 42%', scrub: true },
  });

  // Zaman çizelgesi
  gsap.to('#cizelgeDolu', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#cizelge', start: 'top 62%', end: 'bottom 62%', scrub: true } });
  $$('.ci-satir').forEach((r) => {
    ScrollTrigger.create({ trigger: r, start: 'top 62%', onEnter: () => r.classList.add('aktif'), onLeaveBack: () => r.classList.remove('aktif') });
  });

  // İş-Görev Takip: ekran yatık gelir, kaydırdıkça doğrulur
  gsap.fromTo('#gorevEkran', { rotateX: 26, scale: 0.88, y: 70 }, {
    rotateX: 0, scale: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.gorev-sahne', start: 'top 95%', end: 'top 22%', scrub: true },
  });

  // Telefonda FİMAK ekranları: kaydırdıkça yatık hâlden doğrulur
  gsap.matchMedia().add('(max-width: 1023px)', () => {
    $$('.proje-gorsel-mobil').forEach((el) => {
      gsap.fromTo(el, { rotationX: 32, rotationY: -10, scale: 0.86, transformPerspective: 900, transformOrigin: '50% 100%' }, {
        rotationX: 0, rotationY: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 42%', scrub: true },
      });
    });
  });

  // Çalışma akışı ve önceki projeler: ekran genişliğine göre
  const mm = gsap.matchMedia();
  mm.add({ genis: '(min-width: 861px)', dar: '(max-width: 860px)' }, (ctx) => {
    const { genis } = ctx.conditions;
    const adimlar = $$('.adim');
    gsap.fromTo('#akisDolu', genis ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 }, {
      [genis ? 'scaleX' : 'scaleY']: 1, ease: 'none',
      scrollTrigger: {
        trigger: '#akisHat', start: genis ? 'top 78%' : 'top 70%', end: genis ? 'top 38%' : 'bottom 60%', scrub: true,
        onUpdate: (s) => {
          SAHNE.akis = s.progress;
          adimlar.forEach((a, i) => a.classList.toggle('aktif', s.progress >= i / (adimlar.length - 1) - 0.001));
        },
      },
    });
  });

  mm.add('(min-width: 1024px)', () => {
    const pist = $('#arsivPist');
    const mesafe = () => Math.max(0, pist.scrollWidth - window.innerWidth);
    const kay = gsap.to(pist, {
      x: () => -mesafe(), ease: 'none',
      scrollTrigger: { trigger: '#projeler', start: 'top top', end: () => '+=' + mesafe(), pin: true, scrub: 0.8, invalidateOnRefresh: true },
    });
    // Kartlar geçerken hafifçe dönerek 3D kayma hissi verir
    $$('.kart', pist).forEach((k) => {
      gsap.fromTo(k, { rotateY: -14, z: -60 }, {
        rotateY: 14, z: -60, ease: 'none',
        scrollTrigger: { trigger: k, containerAnimation: kay, start: 'left right', end: 'right left', scrub: true },
      });
    });
  });

  // Sabitlenen arşiv bölümünden önce oluşturulan tetikleyicilerin konumları sayfa sırasına göre yeniden hesaplanır
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
})();
