// app.js — HOLI give page (PROD Square + Apple/Google/Cash App/Afterpay/ACH)

(function(){
  const root = document.documentElement;
  const body = document.body;

  const DEBUG = new URLSearchParams(location.search).has('debug');
  const dlog = (...a)=> { if (DEBUG) console.log('[HOLI]', ...a); };

  // ---------- i18n ----------
  const i18n = {
    en: {
      scripture: "“A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another.” — John 13:34–35",
      amountLabel: "Amount",
      amountPlaceholder: "Enter amount",
      amountHelp: "Minimum $1.00. (Tip: use the chips or type a custom amount.)",
      amountError: "Enter a valid amount between $1 and $10,000.",
      fundLabel: "Fund",
      tithe: "Tithe", offering: "Offering", missions: "Missions", building: "Building Fund",
      name: "Your Name (required once)",
      email: "Email (required once)",
      giveNow: "Give Now",
      cancel: "Cancel",
      confirmGive: "Confirm & Give",
      sheet: { title:"Secure Payment", fund:"Fund", gift:"Gift", total:"Total" },
      toastThanks: "Gift received. Thank you!"
    },
    rw: {
      scripture: "“Ndabaha itegeko rishya: mukundane. Nk'uko nabakunze, namwe mukundane. Ibyo ni byo bose bazamenyeraho ko muri abigishwa banjye, nimukundana.” — Yohana 13:34–35",
      amountLabel: "Umubare",
      amountPlaceholder: "Injiza umubare",
      amountHelp: "Ntoya ni $1.00. (Inama: koresha udupfundi cyangwa andika umubare.)",
      amountError: "Injiza umubare wemewe hagati ya $1 na $10,000.",
      fundLabel: "Ikigega",
      tithe: "Icyacumi", offering: "Ituro", missions: "Ivugabutumwa", building: "Ikigega cy'ubwubatsi",
      name: "Izina ryawe (bikenewe rimwe)",
      email: "Imeli (bikenewe rimwe)",
      giveNow: "Tanga Ubu",
      cancel: "Hagarika",
      confirmGive: "Emeza utange",
      sheet: { title:"Kwishyura kwizewe", fund:"Ikigega", gift:"Ituro", total:"Igiteranyo" },
      toastThanks: "Ituro ryakiriwe. Murakoze!"
    },
    fr: {
      scripture: "« Je vous donne un commandement nouveau : aimez-vous les uns les autres ; comme je vous ai aimés, vous aussi aimez-vous les uns les autres. À ceci tous connaîtront que vous êtes mes disciples, si vous avez de l’amour les uns pour les autres. » — Jean 13:34–35",
      amountLabel: "Montant",
      amountPlaceholder: "Saisir le montant",
      amountHelp: "Minimum 1,00 $. (Astuce : utilisez les boutons ou saisissez un montant.)",
      amountError: "Entrez un montant valide entre 1 $ et 10 000 $.",
      fundLabel: "Fonds",
      tithe: "Dîme", offering: "Offrande", missions: "Missions", building: "Fonds de construction",
      name: "Votre nom (requis une fois)",
      email: "E-mail (requis une fois)",
      giveNow: "Donner maintenant",
      cancel: "Annuler",
      confirmGive: "Confirmer et donner",
      sheet: { title:"Paiement sécurisé", fund:"Fonds", gift:"Don", total:"Total" },
      toastThanks: "Don reçu. Merci !"
    }
  };
  const supportedLangs = ['en','rw','fr'];
  const STATE = { lang: 'en' };

  // ---------- Local storage ----------
  const LS = {
    get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  window.addEventListener('load', () => {
    body.classList.add('loaded');
    const ySpan = document.getElementById('year');
    if (ySpan) ySpan.textContent = new Date().getFullYear();

    startAmbientOscillation();
    initI18n();
    setupGiving();
    setupParallaxFooter();
    setupDevPanel();
    try{ document.querySelector('meta[name="theme-color"]').setAttribute('content', '#ffffff'); }catch{}
  });

  // ---------- Ambient ----------
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  let baseX = 0, baseY = 0;
  function setStage(x,y){ root.style.setProperty('--stage-x', x.toFixed(1) + 'px'); root.style.setProperty('--stage-y', y.toFixed(1) + 'px'); }
  window.addEventListener('pointermove', (e) => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 3;
    const dx = (e.clientX - cx) / window.innerWidth;
    const dy = (e.clientY - cy) / window.innerHeight;
    const x = clamp(dx * 18, -20, 20);
    const y = clamp(dy * 14, -16, 16);
    setStage(baseX + x, baseY + y);
  });
  window.addEventListener('scroll', () => { const sc = window.scrollY || 0; baseY = clamp(sc * -0.05, -22, 0); setStage(baseX, baseY); }, {passive:true});
  function startAmbientOscillation(){
    let t = 0; const spd = 0.0018;
    function tick(){ t += spd * 16; const x = Math.sin(t) * 6; const y = Math.cos(t*0.8) * 5; setStage(baseX + x, baseY + y); requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }

  // ---------- i18n ----------
  function t(key){
    const langMap = i18n[STATE.lang] || i18n.en;
    return key.split('.').reduce((o,k)=> (o && o[k] != null) ? o[k] : null, langMap) ?? key;
  }
  function applyI18n(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k = el.getAttribute('data-i18n'); const val = t(k); if (val) el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el=>{
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(pair=>{
        const [attr, key] = pair.split(':');
        const val = t(key); if (val) el.setAttribute(attr.trim(), val);
      });
    });
  }
  function initI18n(){
    let savedLang = LS.get('holi.lang');
    if (!supportedLangs.includes(savedLang)) {
      savedLang = 'en';
      LS.set('holi.lang', savedLang);
    }
    STATE.lang = savedLang || 'en';
    const langSel = document.getElementById('lang');
    if (langSel) {
      langSel.value = STATE.lang;
      langSel.addEventListener('change', ()=>{
        const next = langSel.value;
        STATE.lang = supportedLangs.includes(next) ? next : 'en';
        LS.set('holi.lang', STATE.lang);
        applyI18n();
        if (STATE._updateSummary) STATE._updateSummary();
      });
    }
    applyI18n();
  }

  // ---------- Giving ----------
  function setupGiving(){
    const form = document.getElementById('donationForm');
    if (!form) return;

    const chips = Array.from(form.querySelectorAll('.chip'));
    const amountInput = form.querySelector('#amount');
    const fundSel = form.querySelector('#fund');
    const giveBtn = form.querySelector('#giveBtn');

    const amountError = document.getElementById('amountError');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const summary = document.getElementById('summary');

    // Sheet bits
    const sheet = document.getElementById('paySheet');
    const sFund = document.getElementById('sFund');
    const sBase = document.getElementById('sBase');
    const sTotal = document.getElementById('sTotal');
    const confirmPay = document.getElementById('confirmPay');
    const confirmSpin = document.getElementById('confirmSpin');
    const confirmText = document.getElementById('confirmText');

    // Prefill from localStorage
    const saved = {
      fund: LS.get('holi.fund'),
      name: LS.get('holi.name'),
      email: LS.get('holi.email')
    };
    if (saved.fund) fundSel.value = saved.fund;
    if (saved.name) nameInput.value = saved.name;
    if (saved.email) emailInput.value = saved.email;

    const MIN = 1, MAX = 10000;
    const fmtUSD = (n)=> n.toLocaleString(undefined,{style:'currency',currency:'USD'});
    const emailOK = (s)=> /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

    function parseAmt(){
      const raw = (amountInput.value || '').replace(/[^\d.]/g,'');
      const n = parseFloat(raw);
      return isFinite(n) ? n : 0;
    }
    function formatInput(){
      const n = parseAmt();
      amountInput.value = n ? n.toFixed(2) : '';
    }

    function setFieldInvalid(inputEl, errorEl, on){
      if (!inputEl || !errorEl) return;
      inputEl.setAttribute('aria-invalid', on ? 'true' : 'false');
      errorEl.classList.toggle('hidden', !on);
    }

    function updateSummary(){
      const amt = parseAmt();
      const invalidAmt = !(amt >= MIN && amt <= MAX);
      setFieldInvalid(amountInput, amountError, invalidAmt);

      const nameMissing = !(nameInput.value || '').trim();
      const emailMissing = !emailOK(emailInput.value);

      setFieldInvalid(nameInput, nameError, nameMissing);
      setFieldInvalid(emailInput, emailError, emailMissing);

      const invalid = invalidAmt || nameMissing || emailMissing;

      giveBtn.disabled = invalid;

      const fundText = fundSel.options[fundSel.selectedIndex].textContent.trim();
      summary.textContent = (!invalid && amt)
        ? `${fmtUSD(amt)} → ${fundText}. ${i18n[STATE.lang].sheet.total}: ${fmtUSD(amt)}.`
        : '';

      STATE._updateSummary = updateSummary;
      return !invalid;
    }

    // Persist prefs on change
    fundSel.addEventListener('change', ()=>{ LS.set('holi.fund', fundSel.value); updateSummary(); });
    nameInput.addEventListener('blur', ()=>{ const v=nameInput.value.trim(); if(v){ LS.set('holi.name', v); } updateSummary(); });
    emailInput.addEventListener('blur', ()=>{ const v=emailInput.value.trim(); if(emailOK(v)){ LS.set('holi.email', v); } updateSummary(); });

    // Interactions
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(x => x.classList.remove('on'));
      ch.classList.add('on');
      amountInput.value = parseFloat(ch.dataset.amount).toFixed(2);
      updateSummary();
      amountInput.focus();
    }));
    amountInput.addEventListener('input', () => { chips.forEach(x => x.classList.remove('on')); updateSummary(); });
    amountInput.addEventListener('blur', () => { formatInput(); updateSummary();
      const v = parseAmt(); const match = chips.find(c => parseFloat(c.dataset.amount) === v); if (match) match.classList.add('on');
    });
    amountInput.addEventListener('keydown', (e)=>{ if (e.key === 'Enter'){ e.preventDefault(); if (updateSummary()) openSheet(); } });

    // ----- Payment Sheet open/close -----
    function openSheet(){
      if (!updateSummary()) return;
      const amt = parseAmt();

      const fundText = fundSel.options[fundSel.selectedIndex].textContent.trim();
      sFund && (sFund.textContent = fundText);
      sBase && (sBase.textContent = fmtUSD(amt));
      sTotal && (sTotal.textContent = fmtUSD(amt));

      const sTotalBottom = document.getElementById('sTotal_bottom');
      if (sTotalBottom) sTotalBottom.textContent = fmtUSD(amt);

      const cardEl = document.querySelector('#paySheet .sheet-card');
      cardEl?.classList.remove('pop');
      sheet.classList.remove('hidden');
      requestAnimationFrame(()=> cardEl?.classList.add('pop'));

      confirmPay.disabled = true;
      initAndMountPayments(amt).catch((err)=> showPayError(err?.message || 'Failed to initialize payment form.'));

      setTab('card');
      confirmPay.focus();
    }
    function closeSheet(){ sheet.classList.add('hidden'); }

    sheet.addEventListener('click', (e) => { if (e.target.matches('[data-close]')) closeSheet(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ closeSheet(); } });

    // Confirm (Card only)
    confirmPay.addEventListener('click', async () => {
      confirmPay.disabled = true; confirmSpin.classList.remove('hidden');
      confirmText.textContent = i18n[STATE.lang].confirmGive + '…';
      try{
        if (!SQ.card) throw new Error('Card not ready');
        const res = await SQ.card.tokenize();
        if (res.status !== 'OK') throw new Error(res?.errors?.[0]?.message || 'Could not tokenize card');

        await completePayment(
          res.token,
          parseAmt(),
          fundSel.value,
          fundSel.options[fundSel.selectedIndex]?.textContent.trim(),
          nameInput.value.trim(),
          emailInput.value.trim()
        );

        showToast(i18n[STATE.lang].toastThanks || i18n.en.toastThanks);
        try{ confettiBurst({ count: 90, duration: 1800, drift: 0.012, gravity: 0.14 }); }catch{}
        closeSheet();
      }catch(err){
        showPayError(err?.message || 'Payment error');
      }finally{
        confirmSpin.classList.add('hidden'); confirmText.textContent = i18n[STATE.lang].confirmGive; confirmPay.disabled = false;
      }
    });

    // --- Tabs (segmented control) ---
    function setTab(tab){
      document.querySelectorAll('#payTabs .seg').forEach(btn=>{
        const on = btn.dataset.tab === tab;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('#paySheet .panel').forEach(p=>{
        p.classList.toggle('active', p.id === `panel-${tab}`);
      });

      // Confirm button for Card only
      const confirm = document.getElementById('confirmPay');
      if (confirm) confirm.disabled = (tab !== 'card');
    }
    const tabs = document.getElementById('payTabs');
    if (tabs){
      tabs.addEventListener('click', (e)=>{
        const b = e.target.closest('.seg'); if (!b) return;
        setTab(b.dataset.tab);
      });
    }

    updateSummary();
    giveBtn.addEventListener('click', openSheet);
  }

  // ---------- Square Web Payments ----------
  const SQ = {}; // holds instances

  function getSquareCreds(){
    const appId = document.querySelector('meta[name="square:app-id"]')?.content?.trim();
    const locationId = document.querySelector('meta[name="square:location-id"]')?.content?.trim();
    return { appId, locationId };
  }

  async function ensurePayments(){
    if (!window.Square){
      showPayError('Square SDK not loaded.');
      return null;
    }
    if (window.__holi_sq_payments) return window.__holi_sq_payments;

    const { appId, locationId } = getSquareCreds();
    if (!appId || !locationId){
      showPayError('Missing Square App ID or Location ID in meta tags.');
      return null;
    }

    try{
      window.__holi_sq_payments = await window.Square.payments(appId, locationId);
      // tiny warning if sandbox lib is used in prod
      try{
        const src = Array.from(document.scripts).find(s=>/squarecdn\.com/.test(s.src))?.src || '';
        if (!/sandbox\.web\.squarecdn\.com/.test(src)) dlog('Using PRODUCTION Square SDK');
        else dlog('Using SANDBOX Square SDK');
      }catch{}
      return window.__holi_sq_payments;
    }catch(err){
      showPayError(err?.message || 'Square payments init failed.');
      return null;
    }
  }

  // NOTE: Wallets require a Square PaymentRequest object created via payments.paymentRequest(...)
  async function initAndMountPayments(amount){
    const payments = await ensurePayments();
    if (!payments) throw new Error("Square not initialized");

    const amountStr = (amount ?? 0).toFixed(2);
    const paymentRequest = payments.paymentRequest({
      countryCode: 'US',
      currencyCode: 'USD',
      total: { amount: amountStr, label: 'HOLI Gift' },
      requestBillingContact: true
      // requestShippingContact: true, // uncomment if you need shipping info (e.g., Afterpay shipping flows)
    });

    // Containers
    const cardContainer = document.getElementById('card-container');
    const appleBtn = document.getElementById('apple-pay-button');
    const gpayEl = document.getElementById('google-pay-button');
    const cashAppEl = document.getElementById('cash-app-pay-button');
    const afterpayEl = document.getElementById('afterpay-button');
    const achBtn = document.getElementById('ach-button');

    // Clear containers
    if (cardContainer) cardContainer.innerHTML = '';
    if (gpayEl) gpayEl.innerHTML = '';
    if (cashAppEl) cashAppEl.innerHTML = '';
    if (afterpayEl) afterpayEl.innerHTML = '';

    await new Promise(requestAnimationFrame);

    // ---- Card (always) ----
    SQ.card = await payments.card();
    await SQ.card.attach('#card-container');
    dlog('card attached');

    // ---- Apple Pay ----
    try {
      const ap = await payments.applePay(paymentRequest);
      const can = await ap.canMakePayment();
      dlog('applePay.canMakePayment:', can);
      if (can && appleBtn) {
        SQ.applePay = ap;
        appleBtn.classList.remove('hidden');
        appleBtn.onclick = async (e)=>{
          e.preventDefault();
          try{
            const res = await SQ.applePay.tokenize();
            if (res?.status === 'OK') await completePayment(res.token, amount);
            else showPayError(res?.errors?.[0]?.message || 'Apple Pay error');
          }catch(err){ showPayError(err?.message || 'Apple Pay error'); }
        };
      } else { appleBtn && appleBtn.classList.add('hidden'); }
    } catch (e) {
      dlog('applePay init error:', e?.message || e);
      appleBtn && appleBtn.classList.add('hidden');
    }

    // ---- Google Pay ----
    try {
      const gp = await payments.googlePay(paymentRequest);
      const can = await gp.canMakePayment();
      dlog('googlePay.canMakePayment:', can);
      if (can) {
        SQ.googlePay = gp;
        await gp.attach('#google-pay-button');
        gpayEl && gpayEl.classList.remove('hidden');
        // Call tokenize on click of the attached element
        gpayEl.addEventListener('click', async ()=>{
          try{
            const tokenResult = await gp.tokenize();
            if (tokenResult?.status === 'OK') await completePayment(tokenResult.token, amount);
            else showPayError(tokenResult?.errors?.[0]?.message || 'Google Pay error');
          }catch(err){ showPayError(err?.message || 'Google Pay error'); }
        }, { once:false });
      } else { gpayEl && gpayEl.classList.add('hidden'); }
    } catch (e) {
      dlog('googlePay init error:', e?.message || e);
      gpayEl && gpayEl.classList.add('hidden');
    }

    // ---- Cash App Pay ----
    try {
      const cap = await payments.cashAppPay(paymentRequest, { redirectURL: location.origin + location.pathname });
      await cap.attach('#cash-app-pay-button');
      SQ.cashAppPay = cap;
      cashAppEl && cashAppEl.classList.remove('hidden');
      cap.addEventListener('ontokenization', async (ev)=>{
        const { tokenResult, error } = ev.detail || {};
        if (error) return showPayError(error?.message || 'Cash App Pay error');
        if (tokenResult?.status === 'OK') await completePayment(tokenResult.token, amount);
      });
      dlog('cashAppPay attached');
    } catch (e) {
      dlog('cashAppPay init error:', e?.message || e);
      cashAppEl && cashAppEl.classList.add('hidden');
    }

    // ---- Afterpay/Clearpay ----
    try{
      const apcp = await payments.afterpayClearpay(paymentRequest);
      await apcp.attach('#afterpay-button');
      SQ.afterpay = apcp;
      afterpayEl && afterpayEl.classList.remove('hidden');
      afterpayEl?.addEventListener('click', async (e)=>{
        e.preventDefault();
        try{
          const res = await apcp.tokenize();
          if (res?.status === 'OK') await completePayment(res.token, amount);
          else showPayError(res?.errors?.[0]?.message || 'Afterpay/Clearpay error');
        }catch(err){ showPayError(err?.message || 'Afterpay/Clearpay error'); }
      }, { once:false });
      dlog('afterpay attached');
    } catch (e) {
      dlog('afterpay init error:', e?.message || e);
      afterpayEl && afterpayEl.classList.add('hidden');
    }

    // ---- ACH (Bank) ----
    try {
      SQ.ach = await payments.ach({ redirectURI: location.origin + location.pathname, transactionId: cryptoRandom() });
      achBtn && achBtn.classList.remove('hidden');
      achBtn && (achBtn.onclick = async (e)=>{
        e.preventDefault();
        try{
          SQ.ach.addEventListener('ontokenization', async (ev)=>{
            const { tokenResult, error } = ev.detail || {};
            if (error) return showPayError(String(error));
            if (tokenResult?.status === 'OK') await completePayment(tokenResult.token, amount);
          }, { once:true });
          await SQ.ach.tokenize({
            accountHolderName: (document.getElementById('name')?.value || 'Donor').trim(),
            intent: 'CHARGE',
            amount: amountStr,
            currency: 'USD'
          });
        }catch(err){ showPayError(err?.message || 'ACH error'); }
      });
      dlog('ach ready');
    } catch (e) {
      dlog('ach init error:', e?.message || e);
      achBtn && achBtn.classList.add('hidden');
    }

    // Wallet availability badge
    const anyWallet =
      !document.getElementById('apple-pay-button')?.classList.contains('hidden') ||
      !document.getElementById('google-pay-button')?.classList.contains('hidden') ||
      !document.getElementById('cash-app-pay-button')?.classList.contains('hidden') ||
      !document.getElementById('afterpay-button')?.classList.contains('hidden');

    const tabWallets = document.getElementById('tab-wallets');
    const noWallets  = document.getElementById('noWallets');
    if (tabWallets){
      tabWallets.disabled = !anyWallet;
      tabWallets.classList.toggle('disabled', !anyWallet);
    }
    if (noWallets) noWallets.classList.toggle('hidden', anyWallet === true);

    // Enable confirm for Card tab
    const confirmPay = document.getElementById('confirmPay');
    if (confirmPay) confirmPay.disabled = false;
  }

  function cryptoRandom(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c=>{
      const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8); return v.toString(16);
    });
  }

  async function completePayment(sourceId, amount, fundValue, fundLabel, buyerName, buyerEmail){
    const { locationId } = getSquareCreds();
    try{
      const resp = await fetch('/api/pay', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          sourceId,
          amount: Math.round((amount||0) * 100),
          currency: 'USD',
          locationId,
          fund: fundValue,
          fundLabel,
          buyerName,
          buyerEmail
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok) throw new Error(data?.error || 'Payment failed');
      dlog('payment success:', data?.payment?.id);
      return true;
    }catch(err){
      showPayError(err?.message || 'Payment error');
      throw err;
    }
  }

  function showPayError(msg){
    const el = document.getElementById('payError');
    if (!el) { alert(msg); return; }
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  // ---------- Footer micro-parallax ----------
  function setupParallaxFooter(){
    const links = Array.from(document.querySelectorAll('.drift-link'));
    function onScroll(){
      const max = 4;
      const p = Math.min(1, (window.scrollY || 0) / 600);
      const y = -p * max;
      links.forEach((a)=> a.style.transform = `translateY(${y}px)`);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  }

  // ---------- Dev Neon Dial ----------
  function setupDevPanel(){
    const params = new URLSearchParams(location.search);
    const dev = params.get('dev') === '1';
    const panel = document.getElementById('devPanel');
    if (!dev || !panel) return;
    panel.classList.remove('hidden');
    const dial = document.getElementById('neonDial');
    const val = document.getElementById('neonVal');
    function set(v){ root.style.setProperty('--neon-strength', v); val.textContent = `${(+v).toFixed(1)}×`; }
    dial.addEventListener('input', ()=> set(dial.value));
    set(dial.value);
  }

  // ---------- Toast ----------
  function showToast(msg){
    const toast = document.getElementById('toast'); if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(()=> toast.classList.add('show'));
    setTimeout(()=> { toast.classList.remove('show'); setTimeout(()=> toast.classList.add('hidden'), 250); }, 2200);
  }

  // ---------- Gentle falling confetti ----------
  function confettiBurst(opts = {}) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { count = 90, duration = 1800, gravity = 0.14, drift = 0.012,
      colors = ['#ec4899','#ef4444','#6366f1','#10b981','#f59e0b','#06b6d4','#111827'] } = opts;

    const c = document.createElement('canvas');
    c.style.position = 'fixed'; c.style.inset = '0'; c.style.pointerEvents = 'none'; c.style.zIndex = '9999';
    document.body.appendChild(c);
    const ctx = c.getContext('2d');

    const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    function resize(){ c.width = Math.floor(innerWidth * DPR); c.height = Math.floor(innerHeight * DPR);
      c.style.width = '100%'; c.style.height = '100%'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    resize(); addEventListener('resize', resize, { passive: true });

    const rand = (a, b) => a + Math.random() * (b - a);
    const choice = (arr) => arr[(Math.random() * arr.length) | 0];

    const particles = Array.from({ length: count }, () => {
      const size = rand(4, 9);
      return { x: rand(0, innerWidth), y: rand(-60, -10), vx: rand(-drift, drift), vy: rand(0.8, 2.2),
        size, color: choice(colors), shape: Math.random() < 0.6 ? 'rect' : 'circle',
        rot: rand(0, Math.PI * 2), vr: rand(-0.06, 0.06), life: duration, born: performance.now(), opacity: 1 };
    });

    let raf;
    (function tick(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i], age = now - p.born, t = Math.min(1, age / p.life);
        p.opacity = 1 - t; p.vy += gravity * 0.98; p.vx += rand(-drift * 0.1, drift * 0.1);
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;

        ctx.globalAlpha = Math.max(0, p.opacity); ctx.fillStyle = p.color;
        if (p.shape === 'rect') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.7); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2); ctx.fill(); }

        if (p.y - p.size > innerHeight || p.opacity <= 0) particles.splice(i, 1);
      }
      if (particles.length === 0) { cancelAnimationFrame(raf); removeEventListener('resize', resize); document.body.removeChild(c); return; }
      raf = requestAnimationFrame(tick);
    })(performance.now());
  }

})();
