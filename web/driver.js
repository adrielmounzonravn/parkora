// Pantallas del conductor: mapa → espacio → pago → confirmación → mis reservas.
(function () {
  var U = Util, R = DATA.reglas, MIN = 60e3, t = I18N.t;

  function simNote() {
    return Store.isSimulatedTime() ? '<p class="muted center">' + t('common.simNote') + '</p>' : '';
  }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function window_(r) { return U.fmtTime(r.inicio) + ' – ' + U.fmtTime(r.fin); }

  // Estado de un espacio ahora → { cls, text, color }
  function status(id) {
    var a = Store.availability(id);
    if (a.estado === 'casual') return { cls: 'badge-casual', text: t('st.casual'), hex: '#2563eb' };
    if (a.estado === 'libre' && a.libre) return { cls: 'badge-free', text: t('st.freeUntil', { t: U.fmtTime(a.libreHasta) }), hex: '#16a34a' };
    if (a.estado === 'bloqueado') return { cls: 'badge-blocked', text: t('st.blocked'), hex: '#9ca3af' };
    if (a.estado === 'ocupado') return { cls: 'badge-occupied', text: t('st.occupied'), hex: '#9ca3af' };
    if (a.estado === 'reservado') return { cls: 'badge-reserved', text: t('st.reservedUntil', { t: U.fmtTime(a.reservaActual.fin) }), hex: '#9ca3af' };
    return { cls: 'badge-reserved', text: t('st.reserved'), hex: '#9ca3af' };
  }
  function badge(s) { return '<span class="badge ' + s.cls + '">' + U.esc(s.text) + '</span>'; }

  var STATE_BADGE = {
    pendiente_pago: ['badge-occupied', 'res.pending'],
    activa: ['badge-free', 'res.active'],
    cancelada: ['badge-reserved', 'res.canceled'],
    reembolsada: ['badge-casual', 'res.refunded']
  };
  function stateBadge(r) {
    var b = STATE_BADGE[r.estado] || ['badge-reserved', r.estado];
    if (r.estado === 'activa' && r.fin <= Store.now()) b = ['badge-reserved', 'res.ended'];
    return '<span class="badge ' + b[0] + '">' + U.esc(t(b[1])) + '</span>';
  }

  // ---------- 1. Mapa ----------
  function map(params, el) {
    el.innerHTML =
      '<div class="stack">' +
      '<div class="row between"><h1>' + t('map.title') + '</h1><a href="#/mis-reservas">' + t('map.myReservations') + '</a></div>' +
      '<p class="muted">' + U.esc(DATA.zona.nombre) + ', ' + U.esc(DATA.zona.ciudad) + '</p>' +
      '<input id="q" type="search" placeholder="' + t('map.search') + '">' +
      (window.L ? '<div id="map"></div>' : '<p class="muted">' + t('map.offline') + '</p>') +
      '<div class="legend"><span><span class="dot" style="background:var(--free)"></span> ' + t('map.legendFree') + '</span>' +
      '<span><span class="dot" style="background:var(--reserved)"></span> ' + t('map.legendReserved') + '</span>' +
      '<span><span class="dot" style="background:var(--casual)"></span> ' + t('map.legendCasual') + '</span></div>' +
      '<div class="card"><ul class="list" id="spots"></ul></div>' + simNote() + '</div>';

    var lmap = null, layer = null;
    if (window.L) {
      lmap = L.map('map').setView(DATA.zona.centro, DATA.zona.zoom);
      // Esri World Street Map: a diferencia de tile.openstreetmap.org (y CARTO), no pide API key
      // ni bloquea páginas abiertas desde file:// o embebidas en la presentación.
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, attribution: 'Tiles &copy; Esri'
      }).addTo(lmap);
      lmap.fitBounds(Store.listSpots().map(function (s) { return [s.lat, s.lng]; }), { padding: [30, 30] });
      layer = L.layerGroup().addTo(lmap);
      App.onLeave = function () { lmap.remove(); };
    }

    function draw() {
      var q = norm(el.querySelector('#q').value.trim());
      var spots = Store.listSpots().filter(function (s) {
        return !q || norm('nº ' + s.numero + ' ' + s.calle).indexOf(q) >= 0 || String(s.numero) === q;
      });
      el.querySelector('#spots').innerHTML = spots.length ? spots.map(function (s) {
        return '<li><a href="#/espacio/' + s.id + '">' + t('common.spotNo', { n: s.numero }) + ' · ' + U.esc(s.calle) + '</a>' + badge(status(s.id)) + '</li>';
      }).join('') : '<li class="muted">' + t('map.noResults') + '</li>';
      if (!layer) return;
      layer.clearLayers();
      spots.forEach(function (s) {
        var st = status(s.id);
        L.circleMarker([s.lat, s.lng], { radius: 6, color: '#fff', weight: 1.5, fillColor: st.hex, fillOpacity: 0.95 })
          .bindTooltip(t('common.spotNo', { n: s.numero }) + ' · ' + st.text)
          .on('click', function () { App.go('#/espacio/' + s.id); })
          .addTo(layer);
      });
    }
    el.querySelector('#q').addEventListener('input', draw);
    draw();
  }

  // ---------- 2. Detalle + elegir horario ----------
  function spot(params, el) {
    var s = Store.getSpot(params[0]);
    if (!s) { el.innerHTML = '<div class="card">' + t('spot.notFound') + ' <a href="#/">' + t('spot.backToMap') + '</a></div>'; return; }
    var head =
      '<a href="#/">' + t('spot.back') + '</a>' +
      '<div class="card"><div class="row between"><h1>' + t('spot.title', { n: s.numero }) + '</h1>' + badge(status(s.id)) + '</div>' +
      '<p>' + U.esc(s.calle) + ' · ' + U.esc(DATA.zona.nombre) + '</p>' +
      '<p class="muted">' + t('spot.rate', { rate: R.tarifaHora, block: R.bloqueMin, from: R.horaApertura, to: R.horaCierre }) + '</p></div>';

    if (s.tipo === 'casual') {
      el.innerHTML = '<div class="stack">' + head +
        '<div class="card"><h2>' + t('spot.casualTitle') + '</h2><p>' + t('spot.casualText') + '</p></div>' +
        '<a class="btn btn-block" href="#/">' + t('spot.otherSpots') + '</a></div>';
      return;
    }

    var now = Store.now(), today = U.startOfDay(now);
    var days = [];
    for (var i = 0; i <= R.anticipacionMaxDias; i++) days.push(U.addDays(today, i));
    // Llegadas posibles en un día (hoy: solo las que aún no pasaron)
    function arrivals(day) {
      return U.timeOptions(R.horaApertura, R.horaCierre, R.bloqueMin).slice(0, -1).filter(function (t) {
        return !U.sameDay(day, now) || U.atTime(day, t) + R.bloqueMin * MIN > now;
      });
    }
    if (!arrivals(days[0]).length) days.shift();

    el.innerHTML = '<div class="stack">' + head +
      '<div class="card"><h2>' + t('spot.chooseWindow') + '</h2>' +
      '<div class="field"><label for="f-dia">' + t('spot.date') + '</label><select id="f-dia">' + days.map(function (d) {
        return '<option value="' + d + '">' + (U.sameDay(d, now) ? t('spot.today') : '') + U.fmtDate(d) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field grid-2"><div><label for="f-in">' + t('spot.arrival') + '</label><select id="f-in"></select></div>' +
      '<div><label for="f-out">' + t('spot.departure') + '</label><select id="f-out"></select></div></div>' +
      '<div class="field"><label for="f-placa">' + t('spot.plate') + '</label><input id="f-placa" placeholder="1234-ABC" autocomplete="off"></div>' +
      '<div class="field row between"><b>' + t('spot.total') + '</b><b id="total" style="font-size:1.3rem"></b></div>' +
      '<p class="error" id="err"></p>' +
      '<button class="btn btn-primary btn-block" id="go">' + t('spot.continue') + '</button>' +
      '<p class="muted" style="margin-top:.6rem">' + t('spot.policy', { cancel: R.cancelacionGratisMin, tol: R.toleranciaMin }) + '</p>' +
      '</div>' + simNote() + '</div>';

    var $ = function (id) { return el.querySelector(id); };
    var fDia = $('#f-dia'), fIn = $('#f-in'), fOut = $('#f-out');
    function opts(list, sel) { return list.map(function (t) { return '<option' + (t === sel ? ' selected' : '') + '>' + t + '</option>'; }).join(''); }
    function range() { var d = +fDia.value; return [U.atTime(d, fIn.value), U.atTime(d, fOut.value)]; }

    function fillArrivals() {
      var d = +fDia.value, list = arrivals(d);
      // Por defecto: la primera llegada con al menos 1 h libre
      var pick = list.filter(function (t) { return Store.validate(s.id, U.atTime(d, t), U.atTime(d, t) + 60 * MIN).ok; })[0] || list[0];
      fIn.innerHTML = opts(list, pick);
      fillDepartures(true);
    }
    function fillDepartures(reset) {
      var a = U.atTime(+fDia.value, fIn.value), prev = fOut.value;
      var list = U.timeOptions(R.horaApertura, R.horaCierre, R.bloqueMin).filter(function (t) {
        var x = U.atTime(+fDia.value, t);
        return x > a && x - a <= R.duracionMaxMin * MIN;
      });
      var def = list[1] || list[0];
      fOut.innerHTML = opts(list, !reset && list.indexOf(prev) >= 0 ? prev : def);
      update();
    }
    function update() {
      var r = range(), v = Store.validate(s.id, r[0], r[1]);
      $('#total').textContent = U.fmtBs(Store.price(r[0], r[1]).total);
      $('#err').textContent = v.ok ? '' : v.error;
      $('#go').disabled = !v.ok;
    }
    fDia.addEventListener('change', fillArrivals);
    fIn.addEventListener('change', function () { fillDepartures(false); });
    fOut.addEventListener('change', update);
    $('#go').addEventListener('click', function () {
      var r = range();
      var res = Store.createReservation({ espacioId: s.id, inicio: r[0], fin: r[1], placa: $('#f-placa').value });
      if (!res.ok) { $('#err').textContent = res.error; return; }
      App.go('#/pago/' + res.reserva.id);
    });
    fillArrivals();
  }

  // ---------- 3. Pago QR simulado ----------
  function fakeQr(seed) {
    var n = 25, h = 0, cells = '';
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    function finder(x, y) { return x < 7 && y < 7 || x >= n - 7 && y < 7 || x < 7 && y >= n - 7; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
      var on;
      if (finder(x, y)) {
        var fx = x < 7 ? x : x - (n - 7), fy = y < 7 ? y : y - (n - 7);
        on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        on = (h >>> 16) % 2 === 0;
      }
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg class="qr" viewBox="-1 -1 ' + (n + 2) + ' ' + (n + 2) + '" shape-rendering="crispEdges">' +
      '<rect x="-1" y="-1" width="' + (n + 2) + '" height="' + (n + 2) + '" fill="#fff"/><g fill="#111">' + cells + '</g></svg>';
  }

  function summary(r, paid) {
    var s = Store.getSpot(r.espacioId);
    return '<ul class="list">' +
      '<li><span class="muted">' + t('sum.spot') + '</span><b>' + t('common.spotNo', { n: s.numero }) + '</b></li>' +
      '<li><span class="muted">' + t('sum.street') + '</span><span>' + U.esc(s.calle) + '</span></li>' +
      '<li><span class="muted">' + t('sum.date') + '</span><span>' + U.fmtDate(r.inicio) + '</span></li>' +
      '<li><span class="muted">' + t('sum.window') + '</span><span>' + window_(r) + '</span></li>' +
      '<li><span class="muted">' + t('sum.plate') + '</span><span>' + U.esc(r.placa) + '</span></li>' +
      '<li><span class="muted">' + (paid ? t('sum.totalPaid') : t('sum.total')) + '</span><b>' + U.fmtBs(r.monto) + '</b></li></ul>';
  }
  function notFound(el) { el.innerHTML = '<div class="card">' + t('res.notFound') + ' <a href="#/">' + t('spot.backToMap') + '</a></div>'; }

  function pay(params, el) {
    var r = Store.getReservation(params[0]);
    if (!r) return notFound(el);
    if (r.estado !== 'pendiente_pago') return App.go('#/reserva/' + r.id);
    el.innerHTML = '<div class="stack"><h1>' + t('pay.title') + '</h1>' +
      '<div class="card">' + summary(r) + '</div>' +
      '<div class="card center">' + fakeQr(r.id + r.placa) +
      '<p style="margin-top:.6rem"><b>' + U.fmtBs(r.monto) + '</b> · ' + t('pay.scan') + '</p></div>' +
      '<button class="btn btn-primary btn-block" id="paid">' + t('pay.paid') + '</button>' +
      '<a class="btn btn-ghost btn-block" href="#/espacio/' + r.espacioId + '">' + t('pay.back') + '</a></div>';
    el.querySelector('#paid').addEventListener('click', function () {
      Store.pay(r.id);
      App.go('#/reserva/' + r.id);
    });
  }

  // ---------- 4. Confirmación ----------
  function reservation(params, el) {
    var r = Store.getReservation(params[0]);
    if (!r) return notFound(el);
    var s = Store.getSpot(r.espacioId), now = Store.now(), top = '';
    if (r.estado === 'activa') {
      top = '<div class="card success center"><h1>' + t('conf.reserved') + '</h1><p class="muted">' +
        t('conf.arriveBetween', { from: U.fmtTime(r.inicio), to: U.fmtTime(r.inicio + R.toleranciaMin * MIN) }) + '</p></div>';
    } else if (r.estado === 'reembolsada') {
      top = '<div class="card alert"><h2>' + t('conf.reportedTitle') + '</h2>' +
        '<p>' + t('conf.reportedText', { amount: U.fmtBs(r.monto), comp: U.fmtBs(R.compensacion) }) + '</p>' +
        (r.compensacionPendiente ? '<p><b>' + t('conf.finedText', { comp: U.fmtBs(R.compensacion) }) + '</b></p>' : '') + '</div>';
    } else if (r.estado === 'cancelada') {
      top = '<div class="card"><h2>' + t('conf.canceledTitle') + '</h2><p class="muted">' +
        (r.reembolsoCancelacion ? t('conf.refunded', { amount: U.fmtBs(r.monto) }) : t('conf.noRefund', { n: R.cancelacionGratisMin })) + '</p></div>';
    } else if (r.estado === 'pendiente_pago') {
      top = '<div class="card alert"><h2>' + t('conf.pendingTitle') + '</h2><a class="btn btn-primary" href="#/pago/' + r.id + '">' + t('conf.goToPay') + '</a></div>';
    }
    var live = r.estado === 'activa' && r.fin > now && U.sameDay(r.inicio, now);
    el.innerHTML = '<div class="stack">' + top +
      '<div class="card">' + summary(r, !!r.pagadaEn) + '</div>' +
      '<a class="btn btn-block" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng + '">' + t('conf.directions') + '</a>' +
      (live ? '<button class="btn btn-danger btn-block" id="occ">' + t('conf.occupied') + '</button>' : '') +
      '<div class="row between"><a href="#/mis-reservas">' + t('map.myReservations') + '</a><a href="#/">' + t('spot.backToMap') + '</a></div>' + simNote() + '</div>';
    if (live) el.querySelector('#occ').addEventListener('click', function () {
      if (!confirm(t('conf.occupiedConfirm', { n: s.numero }))) return;
      Store.reportOccupied(r.id);
      reservation(params, el);
    });
  }

  // ---------- 5. Mis reservas ----------
  function myReservations(params, el) {
    var now = Store.now();
    var all = Store.listReservations({ propias: true });
    var upcoming = all.filter(function (r) { return (r.estado === 'activa' || r.estado === 'pendiente_pago') && r.fin > now; });
    var past = all.filter(function (r) { return upcoming.indexOf(r) < 0; }).reverse();
    function item(r) {
      var s = Store.getSpot(r.espacioId);
      return '<li><a href="#/reserva/' + r.id + '"><b>' + t('common.spotNo', { n: s.numero }) + ' · ' + U.esc(s.calle) + '</b><br><span class="muted">' +
        U.fmtDate(r.inicio) + ' · ' + window_(r) + '</span></a><span class="stack" style="text-align:right">' + stateBadge(r) +
        (upcoming.indexOf(r) >= 0 && r.inicio > now ? '<br><button class="btn btn-sm" data-cancel="' + r.id + '">' + t('my.cancel') + '</button>' : '') + '</span></li>';
    }
    function section(title, list) {
      return '<div class="card"><h2>' + title + '</h2>' +
        (list.length ? '<ul class="list">' + list.map(item).join('') + '</ul>' : '<p class="muted">' + t('my.empty') + '</p>') + '</div>';
    }
    el.innerHTML = '<div class="stack"><div class="row between"><h1>' + t('my.title') + '</h1><a href="#/">' + t('spot.back') + '</a></div>' +
      (all.length ? section(t('my.upcoming'), upcoming) + section(t('my.past'), past)
        : '<div class="card center"><p>' + t('my.none') + '</p><a class="btn btn-primary" href="#/">' + t('my.reserve') + '</a></div>') +
      simNote() + '</div>';
    el.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var r = Store.getReservation(b.getAttribute('data-cancel'));
        var free = r.estado !== 'activa' || now <= r.inicio - R.cancelacionGratisMin * MIN;
        if (!confirm(free ? t('my.cancelConfirm') + (r.estado === 'activa' ? t('my.cancelRefund', { amount: U.fmtBs(r.monto) }) : '')
          : t('my.cancelLate', { n: R.cancelacionGratisMin }))) return;
        var res = Store.cancel(r.id);
        if (res.ok && res.reembolso) alert(t('my.canceledAlert', { amount: U.fmtBs(r.monto) }));
        myReservations(params, el);
      });
    });
  }

  window.DriverViews = { map: map, spot: spot, pay: pay, reservation: reservation, myReservations: myReservations };
})();
