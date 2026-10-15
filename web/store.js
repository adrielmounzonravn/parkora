// Estado de la demo (localStorage) + reglas de negocio. Tiempos en ms (timestamps), hora local = hora de Bolivia.
(function () {
  var KEY = 'parqueo-demo';
  var R = DATA.reglas;
  var MIN = 60e3;
  var mem = null; // respaldo en memoria si localStorage falla

  // ---------- Util ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hmToMin(hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; }
  function minToHm(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  var Util = {
    pad: pad,
    fmtTime: function (d) { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    fmtDate: function (d) {
      d = new Date(d);
      return t('date.fmt', { day: t('days')[d.getDay()], date: d.getDate(), month: t('months')[d.getMonth()] });
    },
    fmtBs: function (n) {
      n = Math.round(n * 100) / 100;
      return 'Bs ' + (n % 1 === 0 ? String(n) : n.toFixed(2).replace('.', I18N.dec()));
    },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    // timeOptions('08:00', '16:00', 30) → ['08:00', '08:30', ..., '16:00']
    timeOptions: function (from, to, stepMin) {
      var out = [], a = hmToMin(from), b = hmToMin(to);
      for (var m = a; m <= b; m += (stepMin || 30)) out.push(minToHm(m));
      return out;
    },
    startOfDay: function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d.getTime(); },
    addDays: function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d.getTime(); },
    dayKey: function (d) { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    // atTime(día, 'HH:MM') → ms de ese día a esa hora
    atTime: function (day, hm) { return Util.startOfDay(day) + hmToMin(hm) * MIN; },
    sameDay: function (a, b) { return Util.dayKey(a) === Util.dayKey(b); }
  };

  // ---------- Reloj ----------
  // Si la demo se abre fuera del horario (08:00–16:00), se simula que son las 11:00 de hoy.
  function realNow() { return Date.now(); }
  function isSimulatedTime() {
    var n = new Date(realNow()), m = n.getHours() * 60 + n.getMinutes();
    return m < hmToMin(R.horaApertura) || m >= hmToMin(R.horaCierre);
  }
  function now() { return isSimulatedTime() ? Util.atTime(realNow(), '11:00') : realNow(); }
  function apertura(day) { return Util.atTime(day, R.horaApertura); }
  function cierre(day) { return Util.atTime(day, R.horaCierre); }

  // ---------- Persistencia ----------
  var state;
  function fresh() {
    return { version: 1, seedDay: null, seq: 1, estadosEspacio: {}, reservas: [], pagos: [], incidentes: [], infracciones: [] };
  }
  function nextId(prefix) { return prefix + (state.seq++); }

  function seed() {
    var hoy = Util.dayKey(now());
    if (state.seedDay === hoy) return;
    state.reservas = state.reservas.filter(function (r) { return !r.semilla; });
    DATA.reservasSemilla(now()).forEach(function (s) {
      var p = price(s.inicio, s.fin);
      var r = {
        id: nextId('R'), espacioId: s.espacioId, inicio: s.inicio, fin: s.fin, placa: s.placa,
        estado: 'activa', monto: p.total, parteAlcaldia: p.parteAlcaldia, comisionApp: p.comisionApp,
        creada: s.inicio - 60 * MIN, pagadaEn: s.inicio - 60 * MIN, propia: false, semilla: true
      };
      state.reservas.push(r);
      state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'pago', monto: r.monto, parteAlcaldia: r.parteAlcaldia, comisionApp: r.comisionApp, fecha: r.pagadaEn });
    });
    state.seedDay = hoy;
    save();
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = mem; }
    try { state = raw ? JSON.parse(raw) : fresh(); } catch (e) { state = fresh(); }
    if (!state || state.version !== 1) state = fresh();
    seed();
    return state;
  }
  function save() {
    var raw = JSON.stringify(state);
    mem = raw;
    try { localStorage.setItem(KEY, raw); } catch (e) { /* queda en memoria */ }
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = null;
    state = fresh();
    seed();
    return state;
  }

  // ---------- Getters ----------
  function getSpot(id) { id = +id; return DATA.espacios.filter(function (e) { return e.id === id; })[0] || null; }
  function listSpots() { return DATA.espacios.slice(); }
  function spotState(id) { return state.estadosEspacio[+id] || 'libre'; }
  function getReservation(id) { return state.reservas.filter(function (r) { return r.id === id; })[0] || null; }
  function holds(r) { return r.estado === 'activa' || r.estado === 'pendiente_pago'; }

  function normPlaca(p) { return String(p).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  // filtros: { fecha, placa, espacioId, propias, estados: [] }
  function listReservations(f) {
    f = f || {};
    return state.reservas.filter(function (r) {
      if (f.fecha != null && !Util.sameDay(r.inicio, f.fecha)) return false;
      if (f.placa && normPlaca(r.placa).indexOf(normPlaca(f.placa)) < 0) return false;
      if (f.espacioId != null && r.espacioId !== +f.espacioId) return false;
      if (f.propias && !r.propia) return false;
      if (f.estados && f.estados.indexOf(r.estado) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.inicio - b.inicio; });
  }
  function listIncidents(f) {
    f = f || {};
    return state.incidentes.filter(function (i) { return !f.abiertos || i.estado === 'abierto'; })
      .sort(function (a, b) { return b.creado - a.creado; });
  }
  function listInfractions() { return state.infracciones.slice().sort(function (a, b) { return b.fecha - a.fecha; }); }
  function listPayments() { return state.pagos.slice(); }

  // ---------- Disponibilidad ----------
  function availability(espacioId, fecha) {
    var t = fecha == null ? now() : +new Date(fecha);
    var spot = getSpot(espacioId);
    var out = { estado: 'libre', libre: false, libreHasta: null, reservaActual: null, proximaReserva: null };
    if (!spot) { out.estado = 'desconocido'; return out; }
    if (spot.tipo === 'casual') { out.estado = 'casual'; return out; }
    if (spotState(spot.id) === 'bloqueado') { out.estado = 'bloqueado'; return out; }
    var rs = listReservations({ espacioId: spot.id }).filter(holds);
    out.reservaActual = rs.filter(function (r) { return r.inicio <= t && t < r.fin; })[0] || null;
    out.proximaReserva = rs.filter(function (r) { return r.inicio > t; })[0] || null;
    if (out.reservaActual) { out.estado = 'reservado'; return out; }
    if (spotState(spot.id) === 'ocupado') { out.estado = 'ocupado'; return out; }
    var hasta = cierre(t);
    if (out.proximaReserva && Util.sameDay(out.proximaReserva.inicio, t)) {
      hasta = Math.min(hasta, out.proximaReserva.inicio - R.margenMin * MIN);
    }
    out.estado = 'libre';
    out.libre = t < hasta;
    out.libreHasta = hasta;
    return out;
  }

  // ¿Se puede reservar [inicio, fin)? Considera el margen entre reservas. ignoreId: reserva a ignorar.
  function isFree(espacioId, inicio, fin, ignoreId) {
    var spot = getSpot(espacioId);
    if (!spot || spot.tipo !== 'reservable' || spotState(spot.id) === 'bloqueado') return false;
    var m = R.margenMin * MIN;
    return !state.reservas.some(function (r) {
      return r.id !== ignoreId && r.espacioId === spot.id && holds(r) && inicio < r.fin + m && fin + m > r.inicio;
    });
  }

  function price(inicio, fin) {
    var minutos = Math.max(0, Math.round((fin - inicio) / MIN));
    var bloques = Math.ceil(minutos / R.bloqueMin);
    var total = bloques * R.precioBloque;
    var comisionApp = Math.round(total * R.comisionApp * 100) / 100;
    return { minutos: minutos, bloques: bloques, total: total, comisionApp: comisionApp, parteAlcaldia: Math.round((total - comisionApp) * 100) / 100 };
  }

  // Valida todas las reglas → { ok: true } | { ok: false, error: 'mensaje' }
  function validate(espacioId, inicio, fin) {
    var spot = getSpot(espacioId), dur = (fin - inicio) / MIN, n = now();
    function err(m) { return { ok: false, error: m }; }
    if (!spot) return err(t('err.spotNotFound'));
    if (spot.tipo === 'casual') return err(t('err.casual'));
    if (spotState(spot.id) === 'bloqueado') return err(t('err.blocked'));
    if (!(fin > inicio)) return err(t('err.departureAfter'));
    if (!Util.sameDay(inicio, fin - 1)) return err(t('err.singleDay'));
    if (inicio < apertura(inicio) || fin > cierre(inicio)) return err(t('err.hours', { from: R.horaApertura, to: R.horaCierre }));
    if (dur < R.duracionMinMin) return err(t('err.minDuration', { n: R.duracionMinMin }));
    if (dur > R.duracionMaxMin) return err(t('err.maxDuration', { n: R.duracionMaxMin / 60 }));
    if (dur % R.bloqueMin !== 0) return err(t('err.blocks', { n: R.bloqueMin }));
    if (fin <= n) return err(t('err.timePassed'));
    if (inicio < n - R.bloqueMin * MIN) return err(t('err.arrivalPast'));
    if (inicio > Util.addDays(Util.startOfDay(n), R.anticipacionMaxDias + 1)) return err(t('err.maxAdvance', { n: R.anticipacionMaxDias }));
    if (!isFree(spot.id, inicio, fin)) return err(t('err.taken', { n: R.margenMin }));
    return { ok: true };
  }

  // ---------- Acciones ----------
  // → { ok: true, reserva } | { ok: false, error }
  function createReservation(o) {
    var inicio = +new Date(o.inicio), fin = +new Date(o.fin);
    var placa = String(o.placa || '').trim().toUpperCase();
    if (!placa) return { ok: false, error: t('err.enterPlateCar') };
    var v = validate(o.espacioId, inicio, fin);
    if (!v.ok) return v;
    var p = price(inicio, fin);
    var r = {
      id: nextId('R'), espacioId: +o.espacioId, inicio: inicio, fin: fin, placa: placa,
      estado: 'pendiente_pago', monto: p.total, parteAlcaldia: p.parteAlcaldia, comisionApp: p.comisionApp,
      creada: now(), pagadaEn: null, propia: true, semilla: false
    };
    state.reservas.push(r);
    save();
    return { ok: true, reserva: r };
  }

  function pay(id) {
    var r = getReservation(id);
    if (!r || r.estado !== 'pendiente_pago') return { ok: false, error: t('err.notPending') };
    r.estado = 'activa';
    r.pagadaEn = now();
    state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'pago', monto: r.monto, parteAlcaldia: r.parteAlcaldia, comisionApp: r.comisionApp, fecha: r.pagadaEn });
    save();
    return { ok: true, reserva: r };
  }

  function refund(r) {
    state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'reembolso', monto: -r.monto, parteAlcaldia: -r.parteAlcaldia, comisionApp: -r.comisionApp, fecha: now() });
  }

  // Gratis hasta 30 min antes de la llegada (reembolso 100%); después, se cancela sin reembolso.
  function cancel(id) {
    var r = getReservation(id);
    if (!r || !holds(r)) return { ok: false, error: t('err.cantCancel') };
    if (r.fin <= now()) return { ok: false, error: t('err.ended') };
    var reembolso = false;
    if (r.estado === 'activa' && now() <= r.inicio - R.cancelacionGratisMin * MIN) { refund(r); reembolso = true; }
    r.estado = 'cancelada';
    r.reembolsoCancelacion = reembolso;
    save();
    return { ok: true, reembolso: reembolso, reserva: r };
  }

  // "Mi espacio está ocupado": reembolso 100% + incidente para el inspector.
  function reportOccupied(id) {
    var r = getReservation(id);
    if (!r || r.estado !== 'activa') return { ok: false, error: t('err.onlyActive') };
    refund(r);
    r.estado = 'reembolsada';
    var inc = {
      id: nextId('I'), reservaId: r.id, espacioId: r.espacioId, placaEsperada: r.placa,
      creado: now(), estado: 'abierto', resuelto: null, compensacionPendiente: false, infraccionId: null
    };
    state.incidentes.push(inc);
    save();
    return { ok: true, reserva: r, incidente: inc };
  }

  function setSpotState(espacioId, estado) {
    if (['libre', 'ocupado', 'bloqueado'].indexOf(estado) < 0) return { ok: false, error: t('err.invalidState') };
    if (estado === 'libre') delete state.estadosEspacio[+espacioId]; else state.estadosEspacio[+espacioId] = estado;
    save();
    return { ok: true };
  }

  // tipo: 'ocupa_reserva' | 'exceso_tiempo' | 'sin_reserva'. Si hay un incidente abierto en el espacio,
  // se vincula y la reserva afectada queda con compensación pendiente.
  function addInfraction(o) {
    var placa = String(o.placa || '').trim().toUpperCase();
    if (!placa) return { ok: false, error: t('err.enterPlate') };
    var inc = listIncidents({ abiertos: true }).filter(function (i) { return i.espacioId === +o.espacioId; })[0] || null;
    var inf = {
      id: nextId('M'), espacioId: +o.espacioId, placa: placa, tipo: o.tipo || 'ocupa_reserva', nota: o.nota || '',
      fecha: now(), multa: R.multa, compensacion: inc ? R.compensacion : 0,
      reservaAfectadaId: inc ? inc.reservaId : null, incidenteId: inc ? inc.id : null,
      compensacionPendiente: !!inc
    };
    state.infracciones.push(inf);
    if (inc) {
      inc.compensacionPendiente = true;
      inc.infraccionId = inf.id;
      var r = getReservation(inc.reservaId);
      if (r) r.compensacionPendiente = true;
    }
    save();
    return { ok: true, infraccion: inf };
  }

  function resolveIncident(id) {
    var inc = state.incidentes.filter(function (i) { return i.id === id; })[0];
    if (!inc) return { ok: false, error: t('err.incidentNotFound') };
    inc.estado = 'resuelto';
    inc.resuelto = now();
    save();
    return { ok: true, incidente: inc };
  }

  // ---------- Métricas (del día de hoy) ----------
  function metrics() {
    var n = now();
    var hoy = listReservations({ fecha: n });
    var pagadas = hoy.filter(function (r) { return r.pagadaEn; });
    var pagosHoy = state.pagos.filter(function (p) { return Util.sameDay(p.fecha, n); });
    function sum(k) { return Math.round(pagosHoy.reduce(function (s, p) { return s + p[k]; }, 0) * 100) / 100; }
    var reservables = DATA.espacios.filter(function (e) { return e.tipo === 'reservable'; });
    // Ocupación = horas reservadas hoy / horas disponibles de los espacios reservables (mvp.md §7)
    var horasDisponibles = reservables.length * (cierre(n) - apertura(n)) / (60 * MIN);
    var horasReservadas = pagadas.filter(function (r) { return r.estado !== 'cancelada'; })
      .reduce(function (s, r) { return s + (r.fin - r.inicio) / (60 * MIN); }, 0);
    var reportadas = pagadas.filter(function (r) { return r.estado === 'reembolsada'; }).length;
    var incHoy = state.incidentes.filter(function (i) { return Util.sameDay(i.creado, n); });
    return {
      reservasHoy: pagadas.length,
      ingresos: sum('monto'),
      parteAlcaldia: sum('parteAlcaldia'),
      comisionApp: sum('comisionApp'),
      ocupacion: horasDisponibles ? Math.round(horasReservadas / horasDisponibles * 100) : 0,
      espaciosReservables: reservables.length,
      incidentesHoy: incHoy.length,
      incidentesAbiertos: state.incidentes.filter(function (i) { return i.estado === 'abierto'; }).length,
      infraccionesHoy: state.infracciones.filter(function (m) { return Util.sameDay(m.fecha, n); }).length,
      respetadas: pagadas.length ? Math.round((pagadas.length - reportadas) / pagadas.length * 100) : 100
    };
  }

  window.Util = Util;
  window.Store = {
    load: load, save: save, reset: reset,
    now: now, isSimulatedTime: isSimulatedTime, apertura: apertura, cierre: cierre,
    getSpot: getSpot, listSpots: listSpots, spotState: spotState,
    getReservation: getReservation, listReservations: listReservations,
    listIncidents: listIncidents, listInfractions: listInfractions, listPayments: listPayments,
    availability: availability, isFree: isFree, price: price, validate: validate,
    createReservation: createReservation, pay: pay, cancel: cancel, reportOccupied: reportOccupied,
    setSpotState: setSpotState, addInfraction: addInfraction, resolveIncident: resolveIncident,
    metrics: metrics
  };
  load();
})();
