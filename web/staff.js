// Pantallas del inspector (lista de espacios, detalle + infracción) y panel de la alcaldía.
(function () {
  var U = Util, R = DATA.reglas, t = I18N.t;

  function simNote() {
    return Store.isSimulatedTime() ? '<p class="muted center">' + t('common.simNote') + '</p>' : '';
  }
  function franja(r) { return U.fmtTime(r.inicio) + '–' + U.fmtTime(r.fin); }
  function badge(cls, text) { return '<span class="badge ' + cls + '">' + U.esc(text) + '</span>'; }

  // Estado del espacio para el inspector → badge HTML
  function spotBadge(id) {
    var a = Store.availability(id);
    if (a.estado === 'casual') return badge('badge-casual', t('insp.casual'));
    if (Store.listIncidents({ abiertos: true }).some(function (i) { return i.espacioId === +id; })) return badge('badge-occupied', t('insp.openIncident'));
    if (a.estado === 'bloqueado') return badge('badge-blocked', t('insp.blocked'));
    if (a.estado === 'ocupado') return badge('badge-occupied', t('insp.occupiedNoRes'));
    if (a.estado === 'reservado') return badge('badge-reserved', t('insp.reserved') + ' · ' + a.reservaActual.placa + ' · ' + franja(a.reservaActual));
    return badge('badge-free', t('insp.free'));
  }

  var TIPOS = ['ocupa_reserva', 'exceso_tiempo', 'sin_reserva'];
  function tipo(k) { return t('type.' + k); }

  // ---------- Inspector: lista ----------
  function inspector(params, el) {
    var abiertos = Store.listIncidents({ abiertos: true });
    var spots = Store.listSpots().sort(function (a, b) { return a.numero - b.numero; });
    el.innerHTML = '<div class="stack">' +
      '<h1>' + t('insp.title') + '</h1>' +
      '<p class="muted">' + U.esc(DATA.zona.nombre) + ' · ' + U.fmtDate(Store.now()) + ' ' + U.fmtTime(Store.now()) + '</p>' +
      '<h2>' + t('insp.openIncidents', { n: abiertos.length }) + '</h2>' +
      (abiertos.length ? abiertos.map(function (i) {
        var s = Store.getSpot(i.espacioId);
        return '<div class="card alert"><p><b>' + t('insp.spot', { n: s.numero }) + '</b> · ' + U.esc(s.calle) + '</p>' +
          '<p>' + t('insp.expectedPlate', { plate: U.esc(i.placaEsperada), t: U.fmtTime(i.creado) }) + '</p>' +
          (i.infraccionId ? '<p class="muted">' + t('insp.infractionLogged') + '</p>' : '') +
          '<div class="row"><a class="btn btn-sm btn-primary" href="#/inspector/espacio/' + s.id + '">' + t('insp.viewSpot') + '</a>' +
          '<button class="btn btn-sm" data-resolve="' + i.id + '">' + t('insp.resolve') + '</button></div></div>';
      }).join('') : '<p class="muted">' + t('insp.noIncidents') + '</p>') +
      '<h2>' + t('insp.spots') + '</h2>' +
      '<div class="card"><ul class="list">' + spots.map(function (s) {
        return '<li><a href="#/inspector/espacio/' + s.id + '">' + t('common.spotNo', { n: s.numero }) + ' · ' + U.esc(s.calle) + '</a>' + spotBadge(s.id) + '</li>';
      }).join('') + '</ul></div>' + simNote() + '</div>';
    el.querySelectorAll('[data-resolve]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.resolveIncident(b.getAttribute('data-resolve'));
        inspector(params, el);
      });
    });
  }

  // ---------- Inspector: detalle del espacio ----------
  function inspectorSpot(params, el, done) {
    var s = Store.getSpot(params[0]);
    if (!s) { el.innerHTML = '<div class="card">' + t('spot.notFound') + ' <a href="#/inspector">' + t('insp.backToList') + '</a></div>'; return; }
    var a = Store.availability(s.id), cur = Store.spotState(s.id);
    var inc = Store.listIncidents({ abiertos: true }).filter(function (i) { return i.espacioId === s.id; })[0];
    function resLine(label, r) {
      return '<li><span class="muted">' + label + '</span><span>' +
        (r ? '<b>' + U.esc(r.placa) + '</b> · ' + franja(r) : '—') + '</span></li>';
    }
    var ok = done ? '<div class="card success"><h2>' + t('insp.fineRecorded', { amount: U.fmtBs(done.multa) }) + '</h2>' +
      '<p>' + t('insp.plateType', { plate: U.esc(done.placa), type: tipo(done.tipo) }) + '</p>' +
      (done.compensacion ? '<p>' + t('insp.compText', { amount: U.fmtBs(done.compensacion) }) + '</p>' : '') +
      '</div>' : '';

    el.innerHTML = '<div class="stack"><a href="#/inspector">' + t('insp.back') + '</a>' + ok +
      '<div class="card"><div class="row between"><h1>' + t('insp.spot', { n: s.numero }) + '</h1>' + spotBadge(s.id) + '</div>' +
      '<p>' + U.esc(s.calle) + ' · ' + (s.tipo === 'casual' ? t('insp.typeCasual') : t('insp.typeReservable')) + '</p>' +
      (s.tipo === 'reservable' ? '<ul class="list">' + resLine(t('insp.currentRes'), a.reservaActual) + resLine(t('insp.nextRes'), a.proximaReserva) + '</ul>' : '') +
      '</div>' +
      (inc ? '<div class="card alert"><p>' + t('insp.incidentText', { plate: U.esc(inc.placaEsperada), t: U.fmtTime(inc.creado) }) + '</p></div>' : '') +
      '<div class="card"><h2>' + t('insp.spotStatus') + '</h2><div class="row">' +
      ['libre', 'ocupado', 'bloqueado'].map(function (e) {
        return '<button class="btn btn-sm' + (e === cur ? ' btn-primary' : '') + '" data-state="' + e + '">' + t('state.' + e) + '</button>';
      }).join('') + '</div></div>' +
      '<div class="card"><h2>' + t('insp.recordViolation') + '</h2>' +
      '<div class="field"><label for="i-placa">' + t('insp.violatorPlate') + '</label><input id="i-placa" placeholder="1234-ABC" autocomplete="off"></div>' +
      '<div class="field"><label for="i-tipo">' + t('insp.type') + '</label><select id="i-tipo">' + TIPOS.map(function (k) {
        return '<option value="' + k + '"' + (k === (inc ? 'ocupa_reserva' : 'sin_reserva') ? ' selected' : '') + '>' + tipo(k) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label for="i-nota">' + t('insp.note') + '</label><input id="i-nota" autocomplete="off"></div>' +
      '<p class="error" id="i-err"></p>' +
      '<button class="btn btn-danger btn-block" id="i-go">' + t('insp.recordFine', { amount: U.fmtBs(R.multa) }) + '</button></div>' +
      simNote() + '</div>';

    el.querySelectorAll('[data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        Store.setSpotState(s.id, b.getAttribute('data-state'));
        inspectorSpot(params, el);
      });
    });
    el.querySelector('#i-go').addEventListener('click', function () {
      var res = Store.addInfraction({
        espacioId: s.id, placa: el.querySelector('#i-placa').value,
        tipo: el.querySelector('#i-tipo').value, nota: el.querySelector('#i-nota').value.trim()
      });
      if (!res.ok) { el.querySelector('#i-err').textContent = res.error; return; }
      inspectorSpot(params, el, res.infraccion);
      window.scrollTo(0, 0);
    });
  }

  // ---------- Alcaldía ----------
  function metric(value, label) {
    return '<div class="metric"><div class="value">' + value + '</div><div class="label">' + label + '</div></div>';
  }
  function table(head, rows) {
    return '<div class="table-wrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '" class="muted">' + t('tbl.noData') + '</td></tr>') +
      '</tbody></table></div>';
  }
  function tr(cells) { return '<tr>' + cells.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }

  var RES_ESTADO = { activa: 'res.active', pendiente_pago: 'res.pending', cancelada: 'res.canceled', reembolsada: 'res.refunded' };

  function alcaldia(params, el) {
    var m = Store.metrics(), pct = Math.round(R.comisionApp * 100);
    el.innerHTML = '<div class="stack">' +
      '<div class="row between"><h1>' + t('city.title') + '</h1><span class="muted">' + U.fmtDate(Store.now()) + '</span></div>' +
      '<div class="metrics">' +
      metric(m.reservasHoy, t('city.resToday')) +
      metric(U.fmtBs(m.ingresos), t('city.revenueToday')) +
      metric(U.fmtBs(m.parteAlcaldia), t('city.cityShare', { n: 100 - pct })) +
      metric(U.fmtBs(m.comisionApp), t('city.appFee', { n: pct })) +
      metric(m.ocupacion + '%', t('city.occupancy')) +
      metric(m.respetadas + '%', t('city.respected')) +
      metric(m.incidentesAbiertos, t('city.openIncidents')) +
      metric(m.infraccionesHoy, t('city.violationsToday')) +
      '</div>' +
      '<div class="card"><div class="row between"><h2>' + t('city.resTodayTitle') + '</h2>' +
      '<input id="q" type="search" placeholder="' + t('city.searchPlate') + '" style="max-width:220px"></div><div id="res"></div></div>' +
      '<div class="card"><h2>' + t('city.incidentsTitle') + '</h2>' + incidentsTable() + '</div>' +
      '<div class="card"><h2>' + t('city.rulesTitle') + '</h2><p class="muted">' + t('city.readOnly') + '</p><ul class="list">' +
      [[t('rule.hours'), R.horaApertura + '–' + R.horaCierre],
        [t('rule.rate'), t('rule.rateVal', { rate: R.tarifaHora, block: R.bloqueMin })],
        [t('rule.duration'), t('rule.durationVal', { min: R.duracionMinMin, max: R.duracionMaxMin / 60 })],
        [t('rule.advance'), t('rule.advanceVal', { n: R.anticipacionMaxDias })],
        [t('rule.buffer'), t('rule.min', { n: R.margenMin })],
        [t('rule.tolerance'), t('rule.min', { n: R.toleranciaMin })],
        [t('rule.cancel'), t('rule.cancelVal', { n: R.cancelacionGratisMin })],
        [t('rule.split'), t('rule.splitVal', { city: 100 - pct, app: pct })],
        [t('rule.fine'), t('rule.fineVal', { fine: U.fmtBs(R.multa), comp: U.fmtBs(R.compensacion) })]
      ].map(function (x) { return '<li><span class="muted">' + x[0] + '</span><span>' + x[1] + '</span></li>'; }).join('') +
      '</ul></div>' +
      '<button class="btn btn-danger" id="reset">' + t('city.reset') + '</button>' + simNote() + '</div>';

    var $ = function (id) { return el.querySelector(id); };
    function reservas() {
      $('#res').innerHTML = table([t('col.spot'), t('col.plate'), t('col.window'), t('col.status'), t('col.amount')],
        Store.listReservations({ fecha: Store.now(), placa: $('#q').value.trim() }).map(function (r) {
          return tr([t('common.spotNo', { n: r.espacioId }), '<span class="nowrap">' + U.esc(r.placa) + '</span>', '<span class="nowrap">' + franja(r) + '</span>',
            (RES_ESTADO[r.estado] ? t(RES_ESTADO[r.estado]) : r.estado) + (r.compensacionPendiente ? t('city.compPending') : ''), U.fmtBs(r.monto)]);
        }));
    }
    $('#q').addEventListener('input', reservas);
    $('#reset').addEventListener('click', function () {
      if (!confirm(t('city.resetConfirm'))) return;
      Store.reset();
      alcaldia(params, el);
    });
    reservas();
  }

  function incidentsTable() {
    var rows = Store.listIncidents().map(function (i) {
      return tr([U.fmtTime(i.creado), t('inc.incident'), t('common.spotNo', { n: i.espacioId }), '<span class="nowrap">' + U.esc(i.placaEsperada) + '</span> ' + t('inc.affected'),
        i.estado === 'abierto' ? '<span class="badge badge-occupied">' + t('inc.open') + '</span>' : '<span class="badge badge-reserved">' + t('inc.resolved') + '</span>']);
    }).concat(Store.listInfractions().map(function (f) {
      return tr([U.fmtTime(f.fecha), t('inc.violation', { type: tipo(f.tipo) }), t('common.spotNo', { n: f.espacioId }), '<span class="nowrap">' + U.esc(f.placa) + '</span>' + (f.nota ? ' · ' + U.esc(f.nota) : ''),
        t('inc.fine', { amount: U.fmtBs(f.multa) }) + (f.compensacion ? t('inc.compPending', { amount: U.fmtBs(f.compensacion) }) : '')]);
    }));
    return table([t('col.time'), t('col.type'), t('col.spot'), t('col.plate'), t('col.status')], rows);
  }

  window.StaffViews = { inspector: inspector, inspectorSpot: inspectorSpot, alcaldia: alcaldia };
})();
