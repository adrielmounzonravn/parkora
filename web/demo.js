// Demo automática para la presentación. Solo se activa con ?demo en la URL (ej. index.html?demo=1).
// Usa almacenamiento en memoria (no toca los datos guardados de la demo normal) y recorre el flujo
// principal: buscar → elegir espacio → horario → pago QR → confirmación → el inspector actualiza
// el estado de un espacio (y el conductor lo ve al instante) → panel de la alcaldía.
// Avisa cada paso a la página padre con postMessage({ parkoraDemo: 'step', step }) y al terminar ('done').
(function () {
  if (!/[?&]demo\b/.test(location.search)) return;

  // ---------- Almacenamiento en memoria ----------
  var mem = {};
  var fake = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };
  try { Object.defineProperty(window, 'localStorage', { value: fake, configurable: true }); } catch (e) {}
  if (location.hash && location.hash !== '#/') history.replaceState(null, '', location.pathname + location.search);

  // ---------- Estilos: dedo, resaltado, sin barras de scroll ----------
  var css = document.createElement('style');
  css.textContent =
    'html{scrollbar-width:none;scroll-behavior:smooth}::-webkit-scrollbar{display:none}' +
    '#app>.stack>p.muted.center:last-child{display:none}' +
    '#demo-finger{position:fixed;left:0;top:0;width:0;height:0;z-index:99999;pointer-events:none;' +
    'transition:transform .55s cubic-bezier(.3,.7,.2,1);transform:translate(195px,760px)}' +
    '#demo-finger i{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;' +
    'background:rgba(43,89,232,.22);border:2.5px solid rgba(43,89,232,.85);box-shadow:0 4px 14px rgba(0,0,0,.18);transition:transform .15s,background .15s}' +
    '#demo-finger.tap i{transform:scale(.78);background:rgba(255,176,32,.7);border-color:#FFB020}' +
    '.demo-flash{outline:3px solid #FFB020!important;outline-offset:2px;transition:outline-color .3s}' +
    'tr.demo-row td{background:#FFF4DB}';
  document.head.appendChild(css);

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var q = function (s) { return document.querySelector(s); };
  var finger;

  function post(step) { try { parent.postMessage({ parkoraDemo: 'step', step: step }, '*'); } catch (e) {} }

  async function waitFor(fn, ms) {
    var end = Date.now() + (ms || 5000), el;
    while (!(el = typeof fn === 'string' ? q(fn) : fn()) && Date.now() < end) await sleep(60);
    return el;
  }
  async function moveTo(el) {
    var r = el.getBoundingClientRect();
    if (r.top < 70 || r.bottom > innerHeight - 20) { el.scrollIntoView({ block: 'center' }); await sleep(450); r = el.getBoundingClientRect(); }
    finger.style.transform = 'translate(' + (r.left + Math.min(r.width / 2, 120)) + 'px,' + (r.top + r.height / 2) + 'px)';
    await sleep(600);
  }
  async function tap(el) {
    await moveTo(el);
    finger.classList.add('tap'); await sleep(170); finger.classList.remove('tap');
    el.click(); await sleep(250);
  }
  async function type(el, text) {
    await tap(el); el.focus();
    for (var i = 0; i < text.length; i++) {
      el.value += text[i]; el.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(85);
    }
  }
  async function choose(sel, value) {
    await tap(sel);
    sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.classList.add('demo-flash'); await sleep(500); sel.classList.remove('demo-flash');
  }

  async function run() {
    finger = document.createElement('div'); finger.id = 'demo-finger'; finger.innerHTML = '<i></i>';
    document.body.appendChild(finger);

    // 1. Buscar
    post('find');
    var search = await waitFor('#q'); await sleep(1200);
    await type(search, 'Bolivar'); await sleep(500);
    var free = await waitFor(function () {
      var b = document.querySelector('#spots .badge-free'); return b && b.parentNode.querySelector('a');
    });
    var badge = free.parentNode.querySelector('.badge-free');
    badge.classList.add('demo-flash'); await moveTo(badge); await sleep(400);
    await tap(free);

    // 2. Horario + placa
    post('window');
    var fIn = await waitFor('#f-in'); await sleep(500);
    var outs = Array.prototype.map.call(q('#f-out').options, function (o) { return o.value; });
    await choose(q('#f-out'), outs[3] || outs[1]);
    if (q('#go').disabled) await choose(q('#f-out'), outs[1]);
    await type(q('#f-placa'), '2468-PKR'); await sleep(300);
    await tap(q('#go'));

    // 3. Pago QR
    post('pay');
    await waitFor('#paid'); await sleep(300);
    await moveTo(q('.qr')); await sleep(1100);
    await tap(q('#paid'));

    // 4. Confirmación
    post('confirmed');
    await waitFor('.card.success'); await moveTo(q('.card.success p')); await sleep(2600);

    // 5. El inspector (parquímetro) actualiza el estado de un espacio en la calle
    post('attendant');
    window.scrollTo(0, 0); await sleep(350);
    await tap(q('.roles a[data-role="inspector"]'));
    var freeLi = await waitFor(function () {
      var b = document.querySelector('.list .badge-free'); return b && b.parentNode;
    });
    var spotLink = freeLi.querySelector('a'), spotName = spotLink.textContent;
    await moveTo(freeLi.querySelector('.badge-free')); await sleep(700);
    await tap(spotLink);
    var occBtn = await waitFor('[data-state="ocupado"]'); await sleep(700);
    await tap(occBtn);
    var occBadge = await waitFor('.card .badge-occupied');
    occBadge.classList.add('demo-flash'); await moveTo(occBadge); await sleep(1600);

    //    …y el conductor ya lo ve ocupado en el mapa
    window.scrollTo(0, 0); await sleep(300);
    await tap(q('.roles a[data-role="conductor"]'));
    var li = await waitFor(function () {
      var links = document.querySelectorAll('#spots a');
      for (var i = 0; i < links.length; i++) if (links[i].textContent === spotName) return links[i].parentNode;
    });
    if (li) { var ob = li.querySelector('.badge'); ob.classList.add('demo-flash'); await moveTo(ob); }
    await sleep(2000);

    // 6. Panel de la alcaldía
    post('city');
    window.scrollTo(0, 0); await sleep(350);
    await tap(q('.roles a[data-role="alcaldia"]'));
    await waitFor('.metrics'); await sleep(1800);
    var row = await waitFor(function () {
      var rows = document.querySelectorAll('#res tr');
      for (var i = 0; i < rows.length; i++) if (rows[i].textContent.indexOf('2468-PKR') >= 0) return rows[i];
    });
    if (row) { row.classList.add('demo-row'); row.scrollIntoView({ block: 'center' }); await sleep(500); await moveTo(row); }
    await sleep(2500);
    finger.style.opacity = '0';
    try { parent.postMessage({ parkoraDemo: 'done' }, '*'); } catch (e) {}
  }

  window.addEventListener('load', function () { run().catch(function (e) { console.error('demo', e); }); });
})();
