/* UniTOgether — prototipo HCI (gruppo ET). Nessun backend: tutto simulato sul client. */
(function () {
  'use strict';
  const UT = window.UT, P = UT.progetti;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '\u00a0€';
  const ic = n => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const pct = p => Math.round(p.raccolto / p.obiettivo * 100);
  const find = id => P.find(p => p.id === id);
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const qs = new URLSearchParams(location.search);
  const page = document.body.dataset.page;
  const PRE = ''; /* tutti i file stanno nella stessa cartella: nessun prefisso per link e immagini generati da JavaScript */
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  /* Sessione di accesso. Aprendo i file direttamente (file://), Firefox e Safari non condividono sempre sessionStorage tra
     index.html e le pagine nella sottocartella: la sessione si salva quindi in tre posti (sessionStorage, localStorage,
     window.name) e si legge dal primo che risponde. Scade dopo 4 ore; «Esci» la cancella ovunque. */
  const SESS_KEY = 'ut_user', SESS_TTL = 4 * 3600 * 1000, WN = 'UTSESS=';
  const sess = {
    get() {
      let raw = null;
      try { raw = sessionStorage.getItem(SESS_KEY); } catch (e) {}
      if (!raw) try { raw = localStorage.getItem(SESS_KEY); } catch (e) {}
      if (!raw) try { if (window.name.indexOf(WN) === 0) raw = window.name.slice(WN.length); } catch (e) {}
      if (!raw) return null;
      try { const o = JSON.parse(raw); if (o && o.u && Date.now() - o.t < SESS_TTL) return o.u; } catch (e) {}
      return null;
    },
    set(u) { const raw = JSON.stringify({ u, t: Date.now() });
      try { sessionStorage.setItem(SESS_KEY, raw); } catch (e) {} try { localStorage.setItem(SESS_KEY, raw); } catch (e) {} try { window.name = WN + raw; } catch (e) {} },
    del() { try { sessionStorage.removeItem(SESS_KEY); } catch (e) {} try { localStorage.removeItem(SESS_KEY); } catch (e) {} try { if (window.name.indexOf(WN) === 0) window.name = ''; } catch (e) {} }
  };
  const days = p => p.giorni === 1 ? '1 giorno rimasto' : p.giorni + ' giorni rimasti';
  const safeNext = n => /^[a-z0-9-]+\.html(#[a-z-]+)?$/.test(n || '') ? n : 'index.html';

  /* ---------- feedback: toast e copia link ---------- */
  const toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
  let tt; function toast(msg) { toastEl.innerHTML = ic('check') + '<span>' + esc(msg) + '</span>'; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove('on'), 2800); }
  function copy(text) {
    const fb = () => { const a = document.createElement('textarea'); a.value = text; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(fb);
    fb(); return Promise.resolve();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    copy(b.dataset.share || location.href).then(() => toast('Link copiato negli appunti'));
  });

  /* ---------- sessione simulata (Area personale) ---------- */
  const user = sess.get();
  const svg = (d, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    caret: '<path d="m6 9 6 6 6-6"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };

  /* ---------- tema chiaro / scuro ---------- */
  const THEME_KEY = 'ut_theme';
  const savedTheme = () => { try { const t = localStorage.getItem(THEME_KEY); return t === 'dark' || t === 'light' ? t : null; } catch (e) { return null; } };
  const sysTheme = () => (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  const curTheme = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  function setTheme(t, remember) {
    document.documentElement.setAttribute('data-theme', t);
    if (remember) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
    const sw = $('#themeSw'); if (sw) sw.setAttribute('aria-checked', t === 'dark');
  }
  setTheme(savedTheme() || sysTheme(), false);
  const hdrArea = $('#areaBtn');
  if (hdrArea) {
    const sw = document.createElement('button');
    sw.type = 'button'; sw.id = 'themeSw'; sw.className = 'tswitch'; sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', curTheme() === 'dark');
    sw.innerHTML = `<span>Tema scuro</span><span class="ts-track" aria-hidden="true"><span class="ts-knob">${svg(ICON.sun, 'i-sun')}${svg(ICON.moon, 'i-moon')}</span></span>`;
    sw.addEventListener('click', () => setTheme(curTheme() === 'dark' ? 'light' : 'dark', true));
    hdrArea.parentNode.insertBefore(sw, hdrArea);
  }

  /* ---------- pulsante «Area personale» / menu dell'account ---------- */
  const guestBtn = () => { const a = document.createElement('a'); a.className = 'btn btn-outline btn-sm'; a.id = 'areaBtn'; a.href = PRE + 'accedi.html'; a.innerHTML = ic('user') + 'Area personale'; return a; };
  function userMenu(u) {
    const here = page === 'area', w = document.createElement('div'); w.className = 'usermenu';
    w.innerHTML = `<button type="button" class="btn btn-outline btn-sm um-btn" id="areaBtn" aria-expanded="false" aria-controls="umenu" aria-label="Ciao, ${esc(u.nome)}: apri il menu dell'account">${svg(ICON.user)}Ciao, ${esc(u.nome)}${svg(ICON.caret, 'um-caret')}</button>
      <div class="um-panel" id="umenu" hidden>
        <div class="um-id"><b>${esc(u.completo || u.nome)}</b><span>${esc(u.email)}</span></div>
        <a class="um-item" id="umArea" href="${PRE}area-personale.html"${here ? ' aria-current="page"' : ''}>${svg(ICON.user)}<span>Vai all'area personale</span>${here ? '<span class="um-here">Sei qui</span>' : ''}</a>
        <button type="button" class="um-item um-out" id="umOut">${svg(ICON.out)}<span>Esci</span></button>
      </div>`;
    const btn = $('.um-btn', w), panel = $('#umenu', w);
    const close = back => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (back) btn.focus(); };
    btn.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open); if (open) $('#umArea', w).focus(); });
    document.addEventListener('click', e => { if (!w.contains(e.target)) close(false); });
    w.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(true); } });
    w.addEventListener('focusout', e => { if (e.relatedTarget && !w.contains(e.relatedTarget)) close(false); });
    $('#umArea', w).addEventListener('click', e => { if (here) { e.preventDefault(); close(true); } }); /* già nell'area personale: niente ricaricamento */
    $('#umOut', w).addEventListener('click', () => {
      sess.del(); store.del('ut_draft'); store.del('ut_cl');
      if (['area', 'staff', 'proponi'].includes(page)) { store.set('ut_flash', 'Hai effettuato l\u2019uscita.'); location.reload(); return; }
      const g = guestBtn(); w.replaceWith(g); g.focus(); toast('Hai effettuato l\u2019uscita.');
    });
    return w;
  }
  const flash = store.get('ut_flash'); if (flash) { store.del('ut_flash'); toast(flash); }
  if (hdrArea && user) hdrArea.replaceWith(userMenu(user));
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- componenti riusabili ---------- */
  function badge(p) {
    if (p.stato === 'concluso') return p.esito === 'raggiunto' ? `<span class="tag ok">${ic('check')}Concluso: obiettivo raggiunto</span>` : '<span class="tag">Concluso</span>';
    if (pct(p) >= 100) return `<span class="tag ok">${ic('check')}Obiettivo raggiunto</span>`;
    if (p.giorni <= 7) return `<span class="tag warn">${ic('clock')}Ultimi giorni</span>`;
    return '<span class="tag sky">In corso</span>';
  }
  function progress(p) {
    const x = pct(p), w = Math.min(x, 100);
    return `<div class="pct"><strong>${x}%</strong><span>raccolto</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${w}" aria-label="Raccolto: ${x}% dell'obiettivo"><i class="${x >= 100 ? 'done' : ''}" style="width:${w}%"></i></div>
    <div class="meta"><span><b>${eur(p.raccolto)}</b> su ${eur(p.obiettivo)}</span><span>${p.stato === 'corso' ? '<b>' + days(p) + '</b>' : 'Campagna conclusa'}</span></div>`;
  }
  function card(p) {
    return `<article class="card pcard"><img class="thumb" src="${PRE}img/${p.img}" alt="${esc(p.alt)}" loading="lazy">
    <div class="body"><div class="tags">${badge(p)}<span class="tag">${esc(p.area)}</span></div>
    <h3><a href="${PRE}progetto.html?id=${p.id}">${esc(p.titolo)}</a></h3><p class="small muted mb0">${esc(p.dip)}</p>
    ${progress(p)}<div class="small muted">${p.donatori} sostenitori</div>
    <a class="btn btn-outline" href="${PRE}progetto.html?id=${p.id}">Scopri il progetto<span class="sr">: ${esc(p.titolo)}</span>${ic('arrow')}</a></div></article>`;
  }
  function tabs(root, hashes) {
    const ts = $$('[role=tab]', root), ps = ts.map(t => $('#' + t.getAttribute('aria-controls')));
    function sel(i, focus) { ts.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; ps[j].hidden = i !== j; }); if (focus) ts[i].focus(); }
    ts.forEach((t, i) => { t.addEventListener('click', () => { sel(i); if (hashes) history.replaceState(null, '', '#' + hashes[i]); });
      t.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (k) { e.preventDefault(); sel((i + k + ts.length) % ts.length, true); } }); });
    const h = hashes ? hashes.indexOf(location.hash.slice(1)) : -1; sel(h >= 0 ? h : 0);
    return sel;
  }

  /* ---------- validazione dei form (H5, H9) ---------- */
  const pwRules = v => [['Almeno 6 caratteri', v.length >= 6], ['Una lettera maiuscola', /[A-Z]/.test(v)], ['Una lettera minuscola', /[a-z]/.test(v)], ['Un numero', /\d/.test(v)], ['Un carattere speciale (per esempio ! ? € @ #)', /[^A-Za-z0-9\s]/.test(v)]].map(([t, ok]) => ({ t, ok }));
  const luhn = d => { let s = 0; d.split('').reverse().forEach((c, i) => { let n = +c; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; }); return s % 10 === 0; };
  const checks = {
    pw: v => pwRules(v).every(r => r.ok) ? '' : 'La password non rispetta tutti i requisiti: guarda l\'elenco qui sotto.',
    card: v => { const d = v.replace(/\s/g, ''); return /^\d{16}$/.test(d) && luhn(d) ? '' : 'Il numero della carta non è corretto. Controlla le 16 cifre (per la prova usa 4242 4242 4242 4242).'; },
    exp: v => { const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v); if (!m) return 'Scrivi la scadenza come mese/anno, per esempio 12/30.'; const d = new Date(), y = +m[2] + 2000, mo = +m[1]; return (y < d.getFullYear() || (y === d.getFullYear() && mo < d.getMonth() + 1)) ? 'La carta risulta scaduta. Controlla la data di scadenza.' : ''; },
    int: v => /^[1-9]\d{0,11}$/.test(v) ? '' : 'Scrivi solo cifre, senza punti, virgole, spazi o simboli e senza decimali (per esempio 8000).',
    cvc: v => /^\d{3}$/.test(v) ? '' : 'Il codice di sicurezza ha 3 cifre ed è scritto sul retro della carta.'
  };
  function msgFor(el) {
    if (el.disabled || el.closest('[hidden]')) return '';
    const isC = el.type === 'checkbox', v = isC ? el.checked : el.value.trim();
    if (el.required && !v) return el.dataset.eRequired || (isC ? 'Per continuare devi spuntare questa casella.' : 'Questo campo è obbligatorio.');
    if (!v) return '';
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return el.dataset.eFormat || 'L\'email non è valida: deve essere simile a nome@esempio.it.';
    if (el.dataset.match && v !== $(el.dataset.match).value.trim()) return el.dataset.eMatch || 'I due valori non coincidono.';
    if (el.minLength > 0 && v.length < el.minLength) return `Servono almeno ${el.minLength} caratteri (ne hai scritti ${v.length}).`;
    if (el.type === 'number') { const n = Number(v); if (isNaN(n) || (el.min !== '' && n < +el.min) || (el.max !== '' && n > +el.max)) return el.dataset.eRange || `Inserisci un numero tra ${el.min} e ${el.max}.`; }
    if (el.dataset.check) return checks[el.dataset.check](v);
    return '';
  }
  function setErr(el, msg) {
    const f = el.closest('.field'); if (!f) return;
    f.classList.toggle('invalid', !!msg); el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    let m = f.querySelector('.err-msg');
    if (!m) { m = document.createElement('span'); m.className = 'err-msg'; m.setAttribute('aria-live', 'polite'); m.id = 'err-' + (el.id || el.name); const h0 = f.querySelector('.hint[id]'); if (h0) f.insertBefore(m, h0); else f.appendChild(m); }
    m.innerHTML = msg ? ic('alert') + '<span>' + esc(msg) + '</span>' : '';
    const h = f.querySelector('.hint[id]'), ids = [h && h.id, msg && m.id].filter(Boolean).join(' '); if (ids) el.setAttribute('aria-describedby', ids); else el.removeAttribute('aria-describedby');
  }
  function validateForm(f) {
    let bad = [];
    $$('input,select,textarea', f).forEach(el => { if (el.type === 'hidden' || el.type === 'radio') return; const m = msgFor(el); setErr(el, m); if (m) bad.push(el); });
    const s = $('.sum-err', f);
    if (s) { s.hidden = !bad.length; if (bad.length) s.innerHTML = ic('alert') + `<p>Ci ${bad.length === 1 ? 'è 1 campo' : 'sono ' + bad.length + ' campi'} da correggere. Li trovi evidenziati qui sotto, con la spiegazione.</p>`; }
    if (bad.length) bad[0].focus();
    return !bad.length;
  }
  const handlers = {};
  function wireForms() {
    $$('form[data-validate]').forEach(f => {
      f.addEventListener('focusout', e => { if (e.target.matches('input:not([type=radio]),select,textarea')) setErr(e.target, msgFor(e.target)); });
      f.addEventListener('input', e => {
        const t = e.target, fl = t.closest('.field');
        if (fl && fl.classList.contains('invalid')) setErr(t, msgFor(t));
        $$('[data-match]', f).forEach(m => { if (m.value && m !== t) setErr(m, msgFor(m)); });
      });
      f.addEventListener('submit', e => {
        e.preventDefault(); if (!validateForm(f)) return;
        if (handlers[f.id]) return handlers[f.id](f);
        const ok = $(f.dataset.success); if (ok) { f.hidden = true; ok.hidden = false; ok.focus(); ok.scrollIntoView({ block: 'center' }); }
      });
    });
    $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => { const i = $(b.dataset.togglePw); const h = i.type === 'password'; i.type = h ? 'text' : 'password'; b.textContent = h ? 'Nascondi' : 'Mostra'; b.setAttribute('aria-pressed', h); }));
    $$('[data-pwlist]').forEach(l => { const i = $(l.dataset.pwlist); const r = () => { l.innerHTML = pwRules(i.value).map(x => `<li class="${x.ok ? 'ok' : ''}">${x.ok ? ic('check') + '<span>' + x.t + '<span class="sr"> (soddisfatto)</span></span>' : '<span class="ic" aria-hidden="true">○</span><span>' + x.t + '<span class="sr"> (da soddisfare)</span></span>'}</li>`).join(''); }; i.addEventListener('input', r); r(); });
  }

  /* ---------- HOME ---------- */
  function initHome() { $('#herocard').innerHTML = card(find('dialetto')); $('#featured').innerHTML = ['culle', 'dialetto', 'alveari'].map(id => card(find(id))).join(''); }

  /* ---------- ESPLORA PROGETTI ---------- */
  function initProgetti() {
    const q = $('#q'), area = $('#area'), sort = $('#sort'), list = $('#list'), count = $('#count'); let all = false;
    area.innerHTML = '<option value="">Tutte le aree</option>' + [...new Set(P.map(p => p.area))].sort().map(a => `<option>${a}</option>`).join('');
    q.value = qs.get('q') || ''; if (qs.get('area')) area.value = qs.get('area');
    $$('input[name=stato]').forEach(r => { if (r.value === (qs.get('stato') || 'tutti')) r.checked = true; });
    function render() {
      const st = $('input[name=stato]:checked').value, t = norm(q.value.trim());
      let r = P.filter(p => (!area.value || p.area === area.value) && (st === 'tutti' || p.stato === st) && (!t || norm([p.titolo, p.breve, p.dip, p.area, p.descr.join(' ')].join(' ')).includes(t)));
      const s = sort.value;
      r.sort((a, b) => s === 'scadenza' ? (a.giorni ?? 999) - (b.giorni ?? 999) : s === 'pct' ? pct(b) - pct(a) : b.donatori - a.donatori);
      const shown = all ? r : r.slice(0, 6);
      count.textContent = r.length ? `Mostrati ${shown.length} progetti su ${r.length}` : 'Nessun progetto trovato';
      if (!r.length) { list.innerHTML = `<div class="empty"><h2>Nessun progetto corrisponde alla ricerca</h2><p>Prova a scrivere meno parole o a togliere qualche filtro.</p><div class="btn-row" style="justify-content:center"><button class="btn btn-primary" id="reset" type="button">Cancella i filtri</button><a class="btn btn-outline" href="contatti.html">Non trovi quello che cerchi? Contattaci</a></div></div>`; $('#reset').onclick = () => { q.value = ''; area.value = ''; $('input[name=stato][value=tutti]').checked = true; render(); q.focus(); }; return; }
      list.innerHTML = `<div class="grid g3">${shown.map(card).join('')}</div>` + (r.length > 6 ? `<p class="center mt"><button class="btn btn-outline" id="more" type="button">${all ? 'Mostra solo i primi 6' : 'Mostra tutti i progetti'}</button></p>` : '');
      const m = $('#more'); if (m) m.onclick = () => { all = !all; render(); };
    }
    $('#filters').addEventListener('input', () => { all = false; render(); }); /* solo 'input': 'change' al blur rirenderizzava la lista e faceva perdere il clic */
    $('#filters').addEventListener('submit', e => e.preventDefault()); render();
  }

  /* ---------- SCHEDA PROGETTO ---------- */
  function initProgetto() {
    const p = find(qs.get('id')), app = $('#app');
    if (!p) { app.innerHTML = `<div class="empty"><h1>Progetto non trovato</h1><p>Il link potrebbe essere incompleto o scaduto. Nessun problema: puoi cercare il progetto tra tutti gli altri.</p><a class="btn btn-primary" href="progetti.html">Vai a tutti i progetti</a></div>`; $('#crumb-title').textContent = 'Progetto non trovato'; return; }
    document.title = p.titolo + ' — UniTOgether'; $('#crumb-title').textContent = p.titolo;
    const x = pct(p), tot = p.fondi.reduce((a, f) => a + f[1], 0), ini = n => n.replace(/^(Dott\.ssa|Dott\.|Prof\.ssa|Prof\.|Ing\.)\s*/, '').split(' ').map(w => w[0]).slice(0, 2).join('');
    const cta = p.stato === 'corso'
      ? `<a class="btn btn-primary btn-lg" href="sostieni.html?id=${p.id}">Sostieni questo progetto</a><p class="small muted" style="margin:10px 0 0">${ic('check')} Non serve registrarsi.</p>`
      : `<div class="callout info">${ic('info')}<p><b>Campagna conclusa.</b> ${p.esito === 'raggiunto' ? 'L\'obiettivo è stato raggiunto e l\'Ateneo ha raddoppiato i contributi.' : 'L\'obiettivo non è stato raggiunto.'}</p></div><a class="btn btn-primary mt" href="progetti.html?stato=corso">Scopri i progetti in corso</a>`;
    const dopp = p.stato === 'corso' ? `<div class="inline-note mt">${ic('heart')}<p class="mb0">${x >= 100 ? '<b>Obiettivo raggiunto: l\'Ateneo raddoppia i contributi.</b>' : 'Se il progetto raggiunge il <b>100%</b>, l\'Ateneo raddoppia i contributi (fino a 10.000 €).'}</p></div>` : '';
    const rel = [...P.filter(o => o.id !== p.id && o.area === p.area), ...P.filter(o => o.id !== p.id && o.area !== p.area && o.stato === 'corso')].slice(0, 3);
    app.innerHTML = `<div class="layout"><div>
      <img class="hero-img" src="img/${p.img}" alt="${esc(p.alt)}">
      <div class="tags">${badge(p)}<span class="tag">${esc(p.area)}</span></div>
      <h1 class="mt" style="margin-bottom:.2em">${esc(p.titolo)}</h1><p class="muted">${esc(p.dip)}</p><p class="lead">${esc(p.breve)}</p>
      <div class="tabs" role="tablist" aria-label="Sezioni del progetto" id="ptabs">
        <button class="tab" role="tab" id="t-progetto" aria-controls="p-progetto">Il progetto</button>
        <button class="tab" role="tab" id="t-fondi" aria-controls="p-fondi">Uso dei fondi</button>
        <button class="tab" role="tab" id="t-aggiornamenti" aria-controls="p-aggiornamenti">Aggiornamenti (${p.agg.length})</button></div>
      <div role="tabpanel" id="p-progetto" aria-labelledby="t-progetto" tabindex="0">
        <h2>Di cosa si tratta</h2>${p.descr.map(d => '<p>' + esc(d) + '</p>').join('')}
        <h3>Perché è importante</h3><p>${esc(p.perche)}</p>
        <h3>Chi lo porta avanti</h3><p class="muted">Responsabile: <b>${esc(p.resp.nome)}</b>, ${esc(p.resp.ruolo.toLowerCase())}.</p>
        ${p.team.map(t => `<div class="person"><span class="avatar" aria-hidden="true">${ini(t[0])}</span><span><b>${esc(t[0])}</b><br><span class="muted small">${esc(t[1])}</span></span></div>`).join('')}
        <details class="mt"><summary>Cos'è il raddoppio?</summary><div><p>Quando un progetto raggiunge il 100% dell'obiettivo, l'Ateneo aggiunge una cifra uguale a quella raccolta, fino a 10.000 € per progetto. Se doni 25 €, il progetto può ricevere 50 €.</p></div></details>
        <details><summary>E se l'obiettivo non viene raggiunto?</summary><div><p>Ti scriviamo e puoi scegliere se riavere il contributo o destinarlo a un altro progetto.</p></div></details></div>
      <div role="tabpanel" id="p-fondi" aria-labelledby="t-fondi" tabindex="0" hidden>
        <h2>A cosa serviranno i fondi</h2><p>L'obiettivo di <b>${eur(p.obiettivo)}</b> è diviso in queste voci.</p>
        <div style="overflow-x:auto"><table class="data"><caption class="sr">Voci di spesa del progetto</caption><thead><tr><th scope="col">Voce</th><th scope="col">Cosa comprende</th><th scope="col" class="num-r">Importo</th><th scope="col" class="num-r">Quota</th></tr></thead><tbody>
        ${p.fondi.map(f => `<tr><th scope="row" style="background:none">${esc(f[0])}</th><td>${esc(f[2])}</td><td class="num-r">${eur(f[1])}</td><td class="num-r">${Math.round(f[1] / tot * 100)}%</td></tr>`).join('')}
        <tr><th scope="row" style="background:none">Totale</th><td></td><td class="num-r"><b>${eur(tot)}</b></td><td class="num-r"><b>100%</b></td></tr></tbody></table></div></div>
      <div role="tabpanel" id="p-aggiornamenti" aria-labelledby="t-aggiornamenti" tabindex="0" hidden>
        <h2>Aggiornamenti dal team</h2>${p.agg.map(a => `<div class="upd"><time>${a[0]}</time><h3>${esc(a[1])}</h3><p><b>In breve:</b> ${esc(a[2])}</p><details><summary>Leggi tutto</summary><div><p>${esc(a[3])}</p></div></details></div>`).join('')}</div>
    </div>
    <aside class="aside" aria-label="Stato della raccolta"><div class="panel"><h2 class="sr">Stato della raccolta</h2>${progress(p)}
      <div class="meta mt"><span>${ic('users')} <b>${p.donatori}</b> sostenitori</span></div>${dopp}<div class="mt">${cta}</div>
      <p class="mt mb0"><button class="btn btn-outline" type="button" data-share="${esc(location.href)}">${ic('share')}Condividi</button></p></div></aside></div>
      <section style="padding:56px 0 0"><h2>Progetti simili</h2><div class="grid g3">${rel.map(card).join('')}</div></section>`;
    tabs($('#ptabs').parentNode, ['progetto', 'fondi', 'aggiornamenti']);
  }

  /* ---------- SOSTIENI: 3 passi ---------- */
  function initSostieni() {
    const sel = $('#proj'), custom = $('#altro'), S = { imp: 25, pay: 'card' }; let cur = 1;
    sel.innerHTML = P.filter(p => p.stato === 'corso').map(p => `<option value="${p.id}">${esc(p.titolo)}</option>`).join('');
    const want = find(qs.get('id')); if (want && want.stato === 'corso') sel.value = want.id; else if (want) $('#closedMsg').hidden = false;
    const proj = () => find(sel.value), imp = () => { const r = $('input[name=imp]:checked').value; return r === 'altro' ? Number(custom.value) : Number(r); };
    function side() {
      const p = proj(), i = imp();
      $('#summary').innerHTML = `<h2 style="font-size:1.1rem">Il tuo sostegno</h2><div class="person"><img src="img/${p.img}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px"><b>${esc(p.titolo)}</b></div>${progress(p)}
      <table class="sum mt"><tr><th scope="row">Il tuo contributo</th><td>${i >= 5 ? eur(i) : '—'}</td></tr><tr class="tot"><th scope="row">Con il raddoppio</th><td>${i >= 5 ? 'fino a ' + eur(i * 2) : '—'}</td></tr></table><p class="small muted mt mb0">Il raddoppio scatta se il progetto raggiunge il 100%.</p>`;
      $('#effect').innerHTML = i >= 5 ? `Con <b>${eur(i)}</b> sostieni «${esc(p.titolo)}». Al raggiungimento dell'obiettivo l'Ateneo raddoppierà la somma raccolta.` : 'Scegli un importo per vedere l\'effetto del tuo contributo.';
    }
    function go(n, first) {
      cur = n; ['1', '2', '3'].forEach(k => $('#step' + k).hidden = +k !== n);
      $$('#stepper li').forEach((li, i) => { li.className = i + 1 < n ? 'done' : i + 1 === n ? 'cur' : ''; li.setAttribute('aria-current', i + 1 === n ? 'step' : 'false'); });
      $('#stepnow').textContent = `Passo ${n} di 3`; const h = $('#step' + n + ' h2'); if (!first) { h.tabIndex = -1; h.focus(); window.scrollTo({ top: 0 }); } if (n === 3) render3(); side();
    }
    $$('input[name=imp]').forEach(r => r.addEventListener('change', () => { const o = r.value === 'altro'; custom.disabled = !o; custom.closest('.field').hidden = !o; if (o) custom.focus(); else setErr(custom, ''); side(); }));
    custom.closest('.field').hidden = true; custom.addEventListener('input', side); sel.addEventListener('change', side);
    handlers.f1 = () => { S.imp = imp(); S.id = sel.value; S.anon = $('#anon').checked; go(2); };
    $$('input[name=pay]').forEach(r => r.addEventListener('change', () => { const c = r.value === 'card'; $('#cardFields').hidden = !c; $('#ppNote').hidden = c; }));
    $('#cardnum').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); });
    $('#exp').addEventListener('input', e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; });
    $('#cvc').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); });
    handlers.f2 = () => { S.nome = $('#nome').value.trim(); S.email = $('#email').value.trim(); S.pay = $('input[name=pay]:checked').value; S.card = $('#cardnum').value.replace(/\s/g, ''); go(3); };
    function render3() {
      const p = proj();
      $('#recap').innerHTML = `<table class="sum"><tr><th scope="row">Progetto</th><td>${esc(p.titolo)}</td></tr>
      <tr><th scope="row">Importo</th><td><b>${eur(S.imp)}</b> <button class="linkbtn" type="button" data-go="1">Modifica<span class="sr"> importo</span></button></td></tr>
      <tr><th scope="row">Nome</th><td>${esc(S.nome)} ${S.anon ? '<span class="tag">Sostenitore anonimo</span>' : ''}</td></tr>
      <tr><th scope="row">Email per la conferma</th><td>${esc(S.email)} <button class="linkbtn" type="button" data-go="2">Modifica<span class="sr"> dati</span></button></td></tr>
      <tr><th scope="row">Pagamento</th><td>${S.pay === 'card' ? 'Carta che termina con ' + S.card.slice(-4) : 'PayPal (simulato)'} <button class="linkbtn" type="button" data-go="2">Modifica<span class="sr"> metodo</span></button></td></tr>
      <tr class="tot"><th scope="row">Totale da pagare</th><td>${eur(S.imp)}</td></tr></table>`;
      $$('[data-go]', $('#recap')).forEach(b => b.onclick = () => go(+b.dataset.go));
      $('#confirm').innerHTML = `Conferma il sostegno di ${eur(S.imp)}`; $('#payErr').hidden = true;
    }
    $$('[data-back]').forEach(b => b.addEventListener('click', () => go(cur - 1)));
    $('#confirm').addEventListener('click', () => {
      const b = $('#confirm'); b.disabled = true; b.innerHTML = '<span class="spin" aria-hidden="true"></span>Sto elaborando il pagamento…'; $('#payErr').hidden = true;
      setTimeout(() => {
        if (S.pay === 'card' && S.card === '4000000000000002') { b.disabled = false; b.innerHTML = 'Riprova a confermare'; const e = $('#payErr'); e.hidden = false; e.focus(); return; }
        const ref = 'UT-2026-' + String(Math.floor(10000 + Math.random() * 89999));
        location.href = 'conferma.html?' + new URLSearchParams({ ref, id: S.id, imp: S.imp, nome: S.nome, email: S.email, anon: S.anon ? 1 : 0 });
      }, 1600);
    });
    side(); go(1, true);
  }

  /* ---------- CONFERMA ---------- */
  function initConferma() {
    const p = find(qs.get('id')), imp = Number(qs.get('imp')), ref = qs.get('ref');
    if (!p || !ref || !(imp > 0)) { $('#ok').hidden = true; $('#none').hidden = false; return; }
    $('#nome').textContent = qs.get('nome') || ''; $('#mail').textContent = qs.get('email') || ''; $('#ref').textContent = ref;
    $('#cimp').textContent = eur(imp); $('#cproj').textContent = p.titolo;
    const before = pct(p), p1 = v => (Math.round(v / p.obiettivo * 1000) / 10).toString().replace('.', ',');
    $('#effect').textContent = before >= 100 ? 'Il progetto aveva già raggiunto l\'obiettivo: il tuo contributo lo rafforza e viene raddoppiato dall\'Ateneo.' : `Con il tuo contributo il progetto passa dal ${p1(p.raccolto)}% al ${p1(p.raccolto + imp)}%. Se arriva al 100%, l'Ateneo aggiunge altri ${eur(imp)}.`;
    $('#back').href = 'progetto.html?id=' + p.id; $('#share').dataset.share = new URL('progetto.html?id=' + p.id, location.href).href;
    document.title = 'Grazie per il tuo sostegno — UniTOgether';
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    const q = $('#faqq'), items = $$('.faq-item'), c = $('#faqcount'), none = $('#faqnone');
    function f() { const t = norm(q.value.trim()); let n = 0; items.forEach(d => { const m = !t || norm(d.textContent).includes(t); d.hidden = !m; if (m) n++; d.open = !!t && m && n <= 3 ? true : (!t ? false : d.open); });
      c.textContent = t ? (n ? n + (n === 1 ? ' risposta trovata' : ' risposte trovate') : 'Nessun risultato') : items.length + ' domande'; none.hidden = n > 0; }
    q.addEventListener('input', f); $('#faqform').addEventListener('submit', e => e.preventDefault()); f();
  }
  function initCome() {
    const ds = $$('details.sec');
    $('#expand').onclick = () => ds.forEach(d => d.open = true); $('#collapse').onclick = () => ds.forEach(d => d.open = false);
  }

  /* ---------- ACCEDI / REGISTRATI ---------- */
  function initAccedi() {
    const u0 = sess.get();
    if (u0) { location.replace(qs.get('next') ? safeNext(qs.get('next')) : 'area-personale.html'); return; }
    const nx = qs.get('next') ? safeNext(qs.get('next')) : 'area-personale.html';
    const sel = tabs($('#authtabs'), ['accedi', 'registrati']);
    function enter(a, msg, pending) {
      sess.set(userOf(a)); $('#authbox').hidden = true; const ok = $('#authok'); ok.hidden = false;
      $('#okmsg').textContent = msg;
      $('#okp').textContent = pending ? 'L\'Ufficio candidature deve ancora confermare la tua registrazione. Nel frattempo puoi dare un\'occhiata alla tua area personale.' : (qs.get('next') ? 'Ti porto alla pagina che stavi cercando.' : 'Ti porto alla tua area personale.');
      $('#okgo').href = pending ? 'area-personale.html' : nx; $('#okgo').textContent = qs.get('next') && !pending ? 'Continua' : 'Vai alla tua area personale';
      ok.focus();
      if (!pending) setTimeout(() => { location.href = nx; }, 1800);
    }
    handlers.fLogin = f => {
      const em = $('#lemail'), pw = $('#lpw'), a = findAcc(em.value);
      if (!a) { setErr(em, 'Non c\'è nessun account con questa email. Controlla di averla scritta bene oppure registrati.'); em.focus(); return; }
      if (a.password !== pw.value) { setErr(pw, 'La password non è corretta. Riprova: puoi vederla premendo «Mostra».'); pw.focus(); return; }
      if (a.stato === 'rifiutato') { setErr(em, 'La registrazione di questo account non è stata confermata dall\'Ufficio candidature. Se pensi sia un errore, scrivici dalla pagina «Contatti».'); em.focus(); return; }
      enter(a, 'Accesso effettuato.', false);
    };
    handlers.fReg = f => {
      const em = $('#remail'), ruolo = $('#rruolo');
      if (!REG_ROLES.includes(ruolo.value)) { setErr(ruolo, 'Da qui ci si può registrare solo come ricercatore o dottorando. Gli altri account li crea l\'Ateneo.'); ruolo.focus(); return; }
      if (findAcc(em.value)) { setErr(em, 'Esiste già un account con questa email. Vai su «Accedi» per entrare.'); em.focus(); return; }
      const a = { nome: $('#rnome').value.trim(), email: em.value.trim(), password: $('#rpw').value, ruolo: ruolo.value, stato: CONFERMA ? 'attesa' : 'attivo' };
      lset(AK, [...savedAcc(), a]);
      enter(a, CONFERMA ? 'Registrazione inviata.' : 'Registrazione completata. Il tuo account è pronto.', CONFERMA);
    };
    $$('[data-goreg]').forEach(b => b.addEventListener('click', () => sel(1, true)));
  }

  /* ---------- AREA PERSONALE ---------- */
  function initArea() {
    const u = sess.get();
    if (!u) { $('#needlogin').hidden = false; return; }
    const acc = findAcc(u.email) || { nome: u.completo || u.nome, email: u.email, ruolo: u.ruolo, stato: 'attivo' };
    const staff = acc.ruolo === 'staff', pending = acc.stato === 'attesa', refused = acc.stato === 'rifiutato';
    $('#apanel').hidden = false;
    $('#pname').textContent = acc.nome; $('#pmail').textContent = acc.email; $('#prole').textContent = ROLES[acc.ruolo] || acc.ruolo;
    $('#pstato').innerHTML = pending ? `<span class="tag warn">${ic('clock')}In attesa di conferma</span>` : refused ? '<span class="tag">Non confermato</span>' : `<span class="tag ok">${ic('check')}Confermato</span>`;
    $('#pending').hidden = !(pending || refused);
    if (refused) $('#pendingtxt').textContent = 'La tua registrazione non è stata confermata dall\'Ufficio candidature. Per chiarimenti scrivici dalla pagina «Contatti».';

    /* foto: segnaposto, oppure l'immagine scelta (ridotta e salvata nel browser) */
    const key = mail(acc.email), box = $('#photo'), perr = $('#pherr');
    const drawPhoto = () => { const m = lget(FK, {}), src = m[key];
      box.innerHTML = src ? `<img src="${src}" alt="La tua foto del profilo">` : `${ic('user')}<span class="sr">Nessuna foto caricata</span>`;
      $('#rmphoto').hidden = !src; $('#phbtn').firstChild.textContent = src ? 'Cambia foto' : 'Carica una foto'; };
    drawPhoto();
    $('#phbtn').addEventListener('click', () => $('#phfile').click());
    $('#rmphoto').addEventListener('click', () => { const m = lget(FK, {}); delete m[key]; lset(FK, m); perr.textContent = ''; drawPhoto(); toast('Foto rimossa'); });
    $('#phfile').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return; perr.textContent = '';
      const bad = () => { perr.textContent = 'Non riesco a usare questo file. Scegli una foto in formato JPG o PNG.'; };
      if (!/^image\//.test(file.type)) return bad();
      const rd = new FileReader();
      rd.onerror = bad;
      rd.onload = () => { const img = new Image(); img.onerror = bad;
        img.onload = () => { const c = document.createElement('canvas'), n = 240; c.width = c.height = n; const k = Math.max(n / img.width, n / img.height), w = img.width * k, h = img.height * k;
          c.getContext('2d').drawImage(img, (n - w) / 2, (n - h) / 2, w, h); const m = lget(FK, {}); m[key] = c.toDataURL('image/jpeg', 0.82); lset(FK, m); drawPhoto(); toast('Foto aggiornata'); };
        img.src = rd.result; };
      rd.readAsDataURL(file); e.target.value = '';
    });

    /* cambio password */
    const dlg = $('#pwdlg'), f = $('#fPw');
    $('#pwopen').addEventListener('click', () => { f.reset(); $$('input', f).forEach(i => setErr(i, '')); $('#pwnew').dispatchEvent(new Event('input')); const s = $('.sum-err', f); if (s) s.hidden = true; dlg.showModal(); $('#pwcur').focus(); });
    $('#pwcancel').addEventListener('click', () => dlg.close());
    handlers.fPw = () => {
      const cur = $('#pwcur'), nw = $('#pwnew'), real = (findAcc(acc.email) || acc).password;
      if (cur.value !== real) { setErr(cur, 'La password attuale non è corretta. Riprova: puoi vederla premendo «Mostra».'); cur.focus(); return; }
      if (nw.value === cur.value) { setErr(nw, 'La nuova password deve essere diversa da quella attuale.'); nw.focus(); return; }
      setPw(acc.email, nw.value); dlg.close(); toast('Password cambiata');
    };

    /* sezione in basso: cambia con il ruolo */
    const sect = $('#asect'), money = c => eur(c.budget);
    const candCard = (c, extra) => `<article class="card pad"><div class="tags">${statoTag(c.stato)}<span class="tag">${esc(c.id)}</span></div>
      <h3 class="mt" style="margin-bottom:.2em">${esc(c.titolo)}</h3><p class="muted small">${esc(c.dip)}${extra ? '<br>' + extra : ''} · budget ${money(c)} · inviata il ${dataIt(c.data)}</p>
      ${c.nota ? `<div class="inline-note" style="margin-top:auto">${ic('mail')}<p class="mb0"><b>Messaggio dell'Ufficio:</b> ${esc(c.nota)}</p></div>` : ''}</article>`;
    if (staff) {
      const todo = cands().filter(c => c.stato === 'valutazione').sort((a, b) => b.data.localeCompare(a.data)), regs = savedAcc().filter(a => a.stato === 'attesa').length;
      sect.innerHTML = `<h2>Candidature da valutare</h2>
        <p class="muted">Sono le candidature arrivate all'Ufficio che aspettano un esito: quelle di esempio e quelle inviate dal sito.</p>
        ${regs ? `<div class="callout warn" style="margin-bottom:20px">${ic('alert')}<p><b>${regs === 1 ? 'C\'è 1 richiesta di registrazione' : 'Ci sono ' + regs + ' richieste di registrazione'} da confermare.</b> <a href="staff.html#registrazioni">Vai alle richieste</a></p></div>` : ''}
        ${todo.length ? `<div class="grid g2">${todo.map(c => `<article class="card pad"><div class="tags">${statoTag(c.stato)}<span class="tag">${esc(c.id)}</span></div><h3 class="mt" style="margin-bottom:.2em">${esc(c.titolo)}</h3>
          <p class="muted small">${esc(c.dip)}<br>${esc(c.referente)} · budget ${money(c)} · inviata il ${dataIt(c.data)}</p>
          <p style="margin-top:auto"><a class="btn btn-primary btn-sm" href="staff.html?stato=valutazione#c-${esc(c.id)}">Valuta<span class="sr">: ${esc(c.titolo)}</span></a></p></article>`).join('')}</div>`
        : `<div class="callout ok">${ic('check')}<p><b>Nessuna candidatura da valutare.</b> Quando ne arriva una nuova la trovi qui.</p></div>`}
        <p class="mt"><a class="btn btn-outline" href="staff.html">Apri l'Area dell'Ufficio candidature</a></p>`;
    } else {
      const mine = cands().filter(c => mail(c.email || '') === mail(acc.email)).sort((a, b) => b.data.localeCompare(a.data));
      const can = !pending && !refused;
      const newBtn = can ? '<a class="btn btn-primary btn-lg" href="proponi.html#candidatura">Crea un nuovo progetto</a>' : '<button class="btn btn-primary btn-lg" type="button" disabled>Crea un nuovo progetto</button><p class="small muted" style="margin:12px 0 0">Potrai farlo dopo la conferma dell\'Ufficio candidature.</p>';
      sect.innerHTML = `<h2>I miei progetti</h2>` + (mine.length
        ? `<p class="muted">Le candidature che hai inviato e il loro stato. Lo aggiorna l'Ufficio candidature.</p><div class="grid g3">${mine.map(c => candCard(c)).join('')}${can ? '<a class="newtile" href="proponi.html#candidatura"><span class="plus" aria-hidden="true">+</span><span>Nuovo progetto</span></a>' : '<div class="newtile off"><span class="plus" aria-hidden="true">+</span><span>Nuovo progetto</span></div>'}</div>`
        : `<div class="empty"><h3>Non hai ancora nessun progetto</h3><p>Hai un'idea di ricerca? Candidala: l'Ufficio candidature la valuta e ti risponde.</p>${newBtn}</div>`);
    }
  }

  /* ---------- PROPONI + CANDIDATURA ---------- */
  function initProponi() {
    const boxes = $$('#checklist input'), bar = $('#clbar'), txt = $('#cltxt');
    const saved = store.get('ut_cl') || []; boxes.forEach((b, i) => { b.checked = !!saved[i]; });
    const up = () => { const n = boxes.filter(b => b.checked).length; txt.textContent = `${n} di ${boxes.length} materiali pronti`; bar.style.width = n / boxes.length * 100 + '%'; bar.parentNode.setAttribute('aria-valuenow', n); store.set('ut_cl', boxes.map(b => b.checked)); };
    boxes.forEach(b => b.addEventListener('change', up)); up();
    const u = sess.get(), f = $('#fcand');
    if (!u) { f.hidden = true; $('#needlogin').hidden = false; return; }
    const acc = findAcc(u.email);
    if (u.ruolo === 'staff' || (acc && acc.ruolo === 'staff')) { f.hidden = true; $('#staffonly').hidden = false; return; }
    if (acc && acc.stato !== 'attivo') { f.hidden = true; $('#pending').hidden = false; $('#pendingtxt').textContent = acc.stato === 'attesa' ? 'L\'Ufficio candidature deve ancora confermare la tua registrazione: finché non lo fa non puoi inviare candidature. Intanto puoi leggere i requisiti e preparare i materiali qui sopra.' : 'La tua registrazione non è stata confermata dall\'Ufficio candidature, quindi non puoi inviare candidature. Per chiarimenti scrivici dalla pagina «Contatti».'; return; }
    $('#cname').value = u.completo || u.nome; const d = store.get('ut_draft');
    if (d) { $('#ctitolo').value = d.t || ''; $('#cdip').value = d.d || ''; $('#cabs').value = d.a || ''; $('#cbud').value = d.b || ''; }
    const cnt = () => { $('#abscount').textContent = $('#cabs').value.length + ' / 600 caratteri'; }; $('#cabs').addEventListener('input', cnt); cnt();
    $('#savedraft').onclick = () => { store.set('ut_draft', { t: $('#ctitolo').value, d: $('#cdip').value, a: $('#cabs').value, b: $('#cbud').value }); const t = new Date(); toast('Bozza salvata alle ' + t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })); };
    const dlg = $('#cdlg');
    handlers.fcand = () => { $('#crecap').innerHTML = `<table class="sum"><tr><th scope="row">Titolo</th><td>${esc($('#ctitolo').value)}</td></tr><tr><th scope="row">Dipartimento</th><td>${esc($('#cdip').value)}</td></tr><tr><th scope="row">Budget richiesto</th><td>${eur($('#cbud').value)}</td></tr><tr><th scope="row">Referente</th><td>${esc($('#cname').value)}</td></tr></table>`; dlg.showModal(); };
    $('#cedit').onclick = () => dlg.close();
    const renderMine = () => { const mine = cands().filter(c => (c.email || '').toLowerCase() === (u.email || '').toLowerCase()).sort((a, b) => b.data.localeCompare(a.data)); $('#mycands').hidden = !mine.length;
      $('#mycandlist').innerHTML = mine.map(c => `<div class="card pad" style="margin-bottom:12px"><div class="tags">${statoTag(c.stato)}<span class="tag">${esc(c.id)}</span></div><h3 class="mt" style="margin-bottom:.2em">${esc(c.titolo)}</h3><p class="muted small mb0">${esc(c.dip)} · budget ${eur(c.budget)} · inviata il ${dataIt(c.data)}</p>${c.nota ? `<div class="inline-note mt">${ic('mail')}<p class="mb0"><b>Messaggio dell'Ufficio:</b> ${esc(c.nota)}</p></div>` : ''}</div>`).join(''); }; renderMine();
    $('#csend').onclick = () => { dlg.close(); store.del('ut_draft'); f.hidden = true; const id = 'CAND-2026-' + Math.floor(1000 + Math.random() * 8999); $('#cref').textContent = id;
      lset(CK, [...lget(CK, []), { id, titolo: $('#ctitolo').value.trim(), dip: $('#cdip').value, abs: $('#cabs').value.trim(), budget: Number($('#cbud').value), referente: $('#cname').value, email: u.email, data: new Date().toISOString().slice(0, 10), stato: 'valutazione', nota: '' }]); renderMine(); const ok = $('#cok'); ok.hidden = false; ok.focus(); ok.scrollIntoView({ block: 'center' }); };
  }

  /* ---------- CANDIDATURE (condivise tra Proponi, Area dell'Ufficio e Area personale) ---------- */
  const CK = 'ut_cands', CS = 'ut_cstate';
  /* Dati salvati nel browser (localStorage): è il «database» del prototipo, senza server. Se il browser lo blocca (alcune finestre private) si usa la memoria della pagina. */
  const mem = {};
  const lget = (k, d) => { try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v) || d; } catch (e) {} return mem[k] !== undefined ? mem[k] : d; };
  const lset = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  /* candidature: quelle di esempio (data.js) + quelle inviate dal sito, con l'esito deciso dall'Ufficio */
  const cands = () => { const st = lget(CS, {}); return [...(UT.candidature || []), ...lget(CK, []).map(c => ({ ...c, dyn: true }))].map(c => st[c.id] ? { ...c, ...st[c.id] } : c); };
  /* account: quelli di data.js + quelli registrati dal sito. stato: attivo | attesa (da confermare) | rifiutato */
  const AK = 'ut_accounts', PK = 'ut_pw', FK = 'ut_foto', CONFERMA = UT.CONFERMA_REGISTRAZIONI !== false;
  const REG_ROLES = ['ricercatore', 'dottorando'];
  const ROLES = { ricercatore: 'Ricercatore o ricercatrice', dottorando: 'Dottorando o dottoranda', docente: 'Docente', tecnico: 'Personale tecnico-amministrativo', staff: 'Personale dell\'Ateneo (Ufficio candidature)' };
  const mail = s => String(s).trim().toLowerCase();
  const first = n => n.trim().split(/\s+/)[0];
  const savedAcc = () => lget(AK, []);
  const accounts = () => { const pw = lget(PK, {}); return [...(UT.account || []), ...savedAcc()].map(a => ({ stato: 'attivo', ...a })).map(a => pw[mail(a.email)] ? { ...a, password: pw[mail(a.email)] } : a); };
  const findAcc = e => accounts().find(a => mail(a.email) === mail(e));
  const userOf = a => ({ nome: first(a.nome), completo: a.nome, email: a.email, ruolo: a.ruolo });
  const setAccStato = (email, stato) => lset(AK, savedAcc().map(a => mail(a.email) === mail(email) ? { ...a, stato } : a));
  const setPw = (email, p) => { const m = lget(PK, {}); m[mail(email)] = p; lset(PK, m); };
  const setCand = (id, stato, nota) => { const st = lget(CS, {}); st[id] = { stato, nota: nota || '' }; lset(CS, st); };
  const STATI = { valutazione: ['In valutazione', 'sky', 'clock'], approvata: ['Approvata', 'ok', 'check'], modifiche: ['Servono modifiche', 'warn', 'alert'], rifiutata: ['Non approvata', '', 'info'] };
  const statoTag = s => { const [t, c, i] = STATI[s]; return `<span class="tag ${c}">${ic(i)}${t}</span>`; };
  const dataIt = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);

  /* ---------- RISULTATI E IMPATTO ---------- */
  function initRisultati() {
    const tot = sum(P, p => p.raccolto), don = sum(P, p => p.donatori), dips = new Set(P.map(p => p.dip)).size;
    $('#s-tot').textContent = eur(tot); $('#s-pro').textContent = P.length; $('#s-don').textContent = don; $('#s-dip').textContent = dips;
    $('#arbody').innerHTML = [...new Set(P.map(p => p.area))].sort().map(a => { const l = P.filter(p => p.area === a);
      return `<tr><th scope="row" style="background:none">${esc(a)}</th><td class="num-r">${l.length}</td><td class="num-r">${eur(sum(l, p => p.raccolto))}</td><td class="num-r">${sum(l, p => p.donatori)}</td><td class="num-r">${l.filter(p => pct(p) >= 100).length} su ${l.length}</td></tr>`; }).join('');
    $('#conclusi').innerHTML = P.filter(p => p.stato === 'concluso').map(card).join('');
    $('#mkreport').onclick = () => { const b = $('#report'), conc = P.filter(p => p.stato === 'concluso'), rad = sum(conc.filter(p => pct(p) >= 100), p => Math.min(p.raccolto, UT.RADDOPPIO_MAX));
      b.hidden = false;
      $('#rep-body').innerHTML = `<table class="sum"><tr><th scope="row">Totale raccolto</th><td>${eur(tot)}</td></tr><tr><th scope="row">Progetti</th><td>${P.length} (${conc.length} conclusi)</td></tr><tr><th scope="row">Progetti con obiettivo raggiunto</th><td>${P.filter(p => pct(p) >= 100).length}</td></tr><tr><th scope="row">Sostenitori</th><td>${don}</td></tr><tr><th scope="row">Dipartimenti coinvolti</th><td>${dips}</td></tr><tr><th scope="row">Raddoppio assegnato dall'Ateneo (progetti conclusi)</th><td>${eur(rad)}</td></tr></table>`;
      b.focus(); toast('Scheda di sintesi generata'); };
    $('#print').onclick = () => window.print();
  }

  /* ---------- AREA DELL'UFFICIO CANDIDATURE (personale dell'Ateneo) ---------- */
  function initStaff() {
    const u = sess.get();
    if (!u) { $('#needlogin').hidden = false; return; }
    if (u.ruolo !== 'staff') { $('#notstaff').hidden = false; return; }
    $('#spanel').hidden = false; $('#sname').textContent = u.nome;
    let filtro = STATI[qs.get('stato')] ? qs.get('stato') : 'tutte', target = null, azione = null; const dlg = $('#sdlg');
    $$('input[name=sstato]').forEach(r => { r.checked = r.value === filtro; });
    function render() {
      const all = cands();
      Object.keys(STATI).forEach(k => { $('#n-' + k).textContent = all.filter(c => c.stato === k).length; });
      const list = (filtro === 'tutte' ? all : all.filter(c => c.stato === filtro)).sort((a, b) => b.data.localeCompare(a.data));
      $('#scount').textContent = list.length ? `${list.length} ${list.length === 1 ? 'candidatura' : 'candidature'}` : 'Nessuna candidatura in questo stato';
      $('#slist').innerHTML = list.map(c => `<article class="card pad" id="c-${esc(c.id)}"><div class="tags">${statoTag(c.stato)}<span class="tag">${esc(c.id)}</span>${c.dyn ? '<span class="tag sky">Inviata dal sito</span>' : ''}</div>
        <h3 class="mt" style="margin-bottom:.2em">${esc(c.titolo)}</h3><p class="muted small">${esc(c.dip)}<br>${esc(c.referente)} · inviata il ${dataIt(c.data)}</p>
        <p><b>Budget richiesto:</b> ${eur(c.budget)}</p>
        <details><summary>Leggi la descrizione</summary><div><p>${esc(c.abs)}</p></div></details>
        ${c.nota ? `<div class="inline-note" style="margin-bottom:12px">${ic('mail')}<p class="mb0"><b>Messaggio inviato:</b> ${esc(c.nota)}</p></div>` : ''}
        <div class="btn-row" style="margin-top:auto">${c.stato === 'valutazione'
          ? `<button class="btn btn-primary btn-sm" type="button" data-act="approva" data-id="${esc(c.id)}">Approva<span class="sr">: ${esc(c.titolo)}</span></button><button class="btn btn-outline btn-sm" type="button" data-act="modifiche" data-id="${esc(c.id)}">Chiedi modifiche<span class="sr">: ${esc(c.titolo)}</span></button><button class="btn btn-outline btn-sm" type="button" data-act="rifiuta" data-id="${esc(c.id)}">Non approvare<span class="sr">: ${esc(c.titolo)}</span></button>`
          : `<button class="btn btn-outline btn-sm" type="button" data-act="riapri" data-id="${esc(c.id)}">Riporta in valutazione<span class="sr">: ${esc(c.titolo)}</span></button>`}</div></article>`).join('');
    }
    $('#slist').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return; const c = cands().find(x => x.id === b.dataset.id); if (!c) return; target = c.id; azione = b.dataset.act;
      if (azione === 'approva') { setCand(c.id, 'approvata'); toast('Candidatura approvata. Il referente riceverà l\'esito (simulato).'); render(); }
      else if (azione === 'riapri') { setCand(c.id, 'valutazione'); toast('Candidatura riportata in valutazione.'); render(); }
      else {
        $('#sdt').textContent = azione === 'modifiche' ? 'Chiedi modifiche' : 'Non approvare la candidatura';
        $('#sdsub').textContent = `«${c.titolo}» — ${c.referente}`; $('#sdok').textContent = 'Invia esito'; $('#snota').value = ''; setErr($('#snota'), ''); dlg.showModal(); $('#snota').focus();
      }
    });
    handlers.fdec = () => { setCand(target, azione === 'modifiche' ? 'modifiche' : 'rifiutata', $('#snota').value.trim()); dlg.close(); toast(azione === 'modifiche' ? 'Richiesta di modifiche inviata (simulata).' : 'Esito inviato al referente (simulato).'); render(); };
    $('#sdno').onclick = () => dlg.close();
    /* richieste di registrazione (account creati dal sito) */
    const ST_ACC = { attesa: ['Da confermare', 'warn', 'clock'], attivo: ['Confermato', 'ok', 'check'], rifiutato: ['Non confermato', '', 'info'] };
    function renderRegs() {
      const regs = savedAcc(), pend = regs.filter(a => a.stato === 'attesa').length;
      $('#rwarn').hidden = !pend; $('#rwarntxt').textContent = pend === 1 ? 'C\'è 1 richiesta di registrazione da confermare.' : 'Ci sono ' + pend + ' richieste di registrazione da confermare.';
      $('#rcount').textContent = regs.length ? (pend ? pend + ' da confermare su ' + regs.length : 'Tutte le richieste hanno un esito') : 'Nessuna richiesta di registrazione';
      $('#rlist').innerHTML = regs.map(a => { const [t, c, i] = ST_ACC[a.stato || 'attivo'], e = esc(a.email);
        return `<article class="card pad"><div class="tags"><span class="tag ${c}">${ic(i)}${t}</span></div><h3 class="mt" style="margin-bottom:.2em">${esc(a.nome)}</h3><p class="muted small">${e}<br>${esc(ROLES[a.ruolo] || a.ruolo)}</p>
        <div class="btn-row" style="margin-top:auto">${a.stato === 'attesa' ? `<button class="btn btn-primary btn-sm" type="button" data-racc="attivo" data-email="${e}">Conferma<span class="sr">: ${esc(a.nome)}</span></button><button class="btn btn-outline btn-sm" type="button" data-racc="rifiutato" data-email="${e}">Non confermare<span class="sr">: ${esc(a.nome)}</span></button>` : `<button class="btn btn-outline btn-sm" type="button" data-racc="attesa" data-email="${e}">Riporta in attesa<span class="sr">: ${esc(a.nome)}</span></button>`}</div></article>`; }).join('');
    }
    $('#rlist').addEventListener('click', e => { const b = e.target.closest('[data-racc]'); if (!b) return; setAccStato(b.dataset.email, b.dataset.racc);
      toast(b.dataset.racc === 'attivo' ? 'Registrazione confermata. Ora può inviare candidature (simulato).' : b.dataset.racc === 'rifiutato' ? 'Registrazione non confermata (simulato).' : 'Registrazione riportata in attesa.'); renderRegs(); });
    renderRegs();
    $('#sfilters').addEventListener('input', e => { filtro = e.target.value; render(); }); $('#sfilters').addEventListener('submit', e => e.preventDefault());
    render();
    const h = location.hash.slice(1), t = h && document.getElementById(h); if (t) t.scrollIntoView({ block: 'center' });
  }

  const init = { home: initHome, progetti: initProgetti, progetto: initProgetto, sostieni: initSostieni, conferma: initConferma, faq: initFaq, come: initCome, accedi: initAccedi, area: initArea, proponi: initProponi, risultati: initRisultati, staff: initStaff };
  wireForms(); if (init[page]) init[page]();
})();
