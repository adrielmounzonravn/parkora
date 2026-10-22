// Estado de la demo (localStorage) + reglas de negocio. Tiempos en ms (timestamps), hora local = hora de Bolivia.
(function () {
  var KEY = 'parqueo-demo';
  var R = DATA.reglas;
  var MIN = 60e3;
  var BLOQUE = R.bloqueMin * MIN;
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
    // Lunes 00:00 de la semana de d
    startOfWeek: function (d) { d = new Date(Util.startOfDay(d)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); },
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
  // ¿El instante t cae en una franja de hora pico?
  function isPeak(t) {
    var d = new Date(t), m = d.getHours() * 60 + d.getMinutes();
    return R.horasPico.some(function (p) { return m >= hmToMin(p[0]) && m < hmToMin(p[1]); });
  }

  // ---------- Persistencia ----------
  var state;
  function fresh() {
    return { version: 2, seedDay: null, seq: 1, estadosEspacio: {}, reservas: [], pagos: [], incidentes: [], infracciones: [], listaEspera: [], rondas: [] };
  }
  function nextId(prefix) { return prefix + (state.seq++); }

  function seed() {
    var hoy = Util.dayKey(now());
    if (state.seedDay === hoy) return;
    state.reservas = state.reservas.filter(function (r) { return !r.semilla; });
    DATA.reservasSemilla(now()).forEach(function (s) {
      var p = price(s.inicio, s.fin, s.espacioId);
      var r = {
        id: nextId('R'), espacioId: s.espacioId, inicio: s.inicio, fin: s.fin, placa: s.placa,
        estado: 'activa', monto: p.total, parteAlcaldia: p.parteAlcaldia, comisionApp: p.comisionApp,
        creada: s.inicio - 60 * MIN, pagadaEn: s.inicio - 60 * MIN, propia: false, semilla: true
      };
      state.reservas.push(r);
      state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'pago', monto: r.monto, parteAlcaldia: r.parteAlcaldia, comisionApp: r.comisionApp, fecha: r.pagadaEn });
    });
    state.rondas.push(now() - 20 * MIN); // la última ronda del inspector fue hace 20 min
    state.seedDay = hoy;
    save();
  }

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = mem; }
    try { state = raw ? JSON.parse(raw) : fresh(); } catch (e) { state = fresh(); }
    if (!state || state.version !== 2) state = fresh();
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
  // Cuenta para los límites por placa: ocupa o ya ocupó el espacio
  function counts(r) { return holds(r) || r.estado === 'terminada'; }

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
  function listWaitlist() { return state.listaEspera.slice().sort(function (a, b) { return a.creado - b.creado; }); }
  // Puesto en la fila: entradas que esperan el mismo espacio en un horario que se cruza, anotadas antes
  function waitlistPosition(e) {
    return state.listaEspera.filter(function (x) {
      return x.estado === 'esperando' && x.espacioId === e.espacioId && x.creado <= e.creado && x.inicio < e.fin && x.fin > e.inicio;
    }).length || 1;
  }
  function lastRound() { return state.rondas.length ? Math.max.apply(null, state.rondas) : null; }

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

  // Hasta cuándo el titular de una reserva tiene prioridad para extenderla
  function finPrioridad(r) { return r.fin - R.liberarPrioridadMin * MIN; }

  // Primer choque de [inicio, fin) con otra reserva del espacio → { tipo: 'reservado' | 'prioridad', reserva } | null.
  // Incluye el margen entre reservas y, mientras siga vigente, los minutos reservados para que el titular extienda.
  function conflict(espacioId, inicio, fin, ignoreId) {
    var m = R.margenMin * MIN, n = now(), out = null;
    state.reservas.some(function (r) {
      if (r.id === ignoreId || r.espacioId !== +espacioId || !holds(r)) return false;
      if (inicio < r.fin + m && fin + m > r.inicio) out = { tipo: 'reservado', reserva: r };
      else if (n < finPrioridad(r) && inicio < r.fin + R.prioridadExtenderMin * MIN + m && fin > r.fin) out = { tipo: 'prioridad', reserva: r };
      return !!out;
    });
    return out;
  }

  // ¿Se puede reservar [inicio, fin)? ignoreId: reserva a ignorar.
  function isFree(espacioId, inicio, fin, ignoreId) {
    var spot = getSpot(espacioId);
    if (!spot || spot.tipo !== 'reservable' || spotState(spot.id) === 'bloqueado') return false;
    return !conflict(spot.id, inicio, fin, ignoreId);
  }

  function round2(n) { return Math.round(n * 100) / 100; }
  function split(monto) {
    var comisionApp = round2(monto * R.comisionApp);
    return { comisionApp: comisionApp, parteAlcaldia: round2(monto - comisionApp) };
  }

  // Tarifa por hora en el instante t para una calle según su demanda (sin recargo por duración)
  function hourlyRate(demanda, t) {
    return R.tarifaHora * (1 + (demanda === 'alta' ? R.recargoDemandaAlta : 0) + (isPeak(t) ? R.recargoPico : 0));
  }

  // Precio variable: cada bloque paga la tarifa base más los recargos por calle de alta demanda,
  // hora pico y estadía larga. El total se redondea a R.redondeo.
  function price(inicio, fin, espacioId) {
    var spot = getSpot(espacioId), alta = !!spot && spot.demanda === 'alta';
    var minutos = Math.max(0, Math.round((fin - inicio) / MIN));
    var bloques = Math.ceil(minutos / R.bloqueMin), bruto = 0, pico = 0, largos = 0;
    for (var i = 0; i < bloques; i++) {
      var f = 1 + (alta ? R.recargoDemandaAlta : 0);
      if (isPeak(inicio + i * BLOQUE)) { f += R.recargoPico; pico++; }
      if (i * R.bloqueMin >= R.duracionSinRecargoMin) { f += R.recargoDuracion; largos++; }
      bruto += R.precioBloque * f;
    }
    var total = Math.round(bruto / R.redondeo) * R.redondeo, s = split(total);
    return {
      minutos: minutos, bloques: bloques, total: total, comisionApp: s.comisionApp, parteAlcaldia: s.parteAlcaldia,
      alta: alta, bloquesPico: pico, bloquesLargos: largos
    };
  }

  // Límites por placa contra el acaparamiento → mensaje de error o null
  function limitError(placa, inicio, fin, ignoreId) {
    var p = normPlaca(placa);
    var mias = state.reservas.filter(function (r) { return r.id !== ignoreId && counts(r) && normPlaca(r.placa) === p; });
    if (mias.some(function (r) { return inicio < r.fin && fin > r.inicio; })) return t('err.onePerPlate');
    if (mias.filter(function (r) { return Util.sameDay(r.inicio, inicio); }).length >= R.reservasPorDiaMax) return t('err.perDay', { n: R.reservasPorDiaMax });
    var semana = Util.startOfWeek(inicio), dias = {};
    mias.forEach(function (r) { if (Util.startOfWeek(r.inicio) === semana) dias[Util.dayKey(r.inicio)] = 1; });
    if (!dias[Util.dayKey(inicio)] && Object.keys(dias).length >= R.diasPorSemanaMax) return t('err.perWeek', { n: R.diasPorSemanaMax });
    return null;
  }

  // Valida todas las reglas → { ok: true } | { ok: false, error: 'mensaje', code }
  // code 'ocupado' = el horario ya está tomado (se puede entrar a la lista de espera).
  function validate(espacioId, inicio, fin, placa) {
    var spot = getSpot(espacioId), dur = (fin - inicio) / MIN, n = now();
    function err(m, code) { return { ok: false, error: m, code: code }; }
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
    var c = conflict(spot.id, inicio, fin);
    if (c && c.tipo === 'prioridad') return err(t('err.priority', { t: Util.fmtTime(finPrioridad(c.reserva)) }), 'ocupado');
    if (c) return err(t('err.taken', { n: R.margenMin }), 'ocupado');
    if (placa) { var l = limitError(placa, inicio, fin); if (l) return err(l, 'limite'); }
    return { ok: true };
  }

  // ---------- Acciones ----------
  // → { ok: true, reserva } | { ok: false, error }
  function createReservation(o) {
    var inicio = +new Date(o.inicio), fin = +new Date(o.fin);
    var placa = String(o.placa || '').trim().toUpperCase();
    if (!placa) return { ok: false, error: t('err.enterPlateCar') };
    var v = validate(o.espacioId, inicio, fin, placa);
    if (!v.ok) return v;
    var p = price(inicio, fin, o.espacioId);
    var r = {
      id: nextId('R'), espacioId: +o.espacioId, inicio: inicio, fin: fin, placa: placa,
      estado: 'pendiente_pago', monto: p.total, parteAlcaldia: p.parteAlcaldia, comisionApp: p.comisionApp,
      creada: now(), pagadaEn: null, propia: true, semilla: false
    };
    state.reservas.push(r);
    state.listaEspera.forEach(function (e) {
      if (e.estado === 'disponible' && e.espacioId === r.espacioId && normPlaca(e.placa) === normPlaca(placa)) e.estado = 'atendida';
    });
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

  // Reembolso total (sin monto) o parcial
  function refund(r, monto) {
    var s = monto == null ? r : split(monto);
    if (monto == null) monto = r.monto;
    state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'reembolso', monto: -monto, parteAlcaldia: -s.parteAlcaldia, comisionApp: -s.comisionApp, fecha: now() });
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
    notifyWaitlist(r.espacioId);
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

  // Opciones para extender una reserva activa (+30 min, +1 h) → [{ minutos, fin, extra }].
  // El titular tiene prioridad: nadie más puede reservar esos minutos hasta finPrioridad(r).
  function extensionOptions(id) {
    var r = getReservation(id);
    if (!r || r.estado !== 'activa' || r.fin <= now()) return [];
    return [R.bloqueMin, 2 * R.bloqueMin].map(function (m) {
      var fin = r.fin + m * MIN;
      return { minutos: m, fin: fin, extra: round2(price(r.inicio, fin, r.espacioId).total - r.monto) };
    }).filter(function (o) {
      return o.fin - r.inicio <= R.duracionMaxMin * MIN && o.fin <= cierre(r.inicio) && !conflict(r.espacioId, r.inicio, o.fin, r.id);
    });
  }

  // Extiende y cobra la diferencia (pago simulado)
  function extend(id, minutos) {
    var r = getReservation(id);
    var o = extensionOptions(id).filter(function (x) { return x.minutos === minutos; })[0];
    if (!r || !o) return { ok: false, error: t('err.cantExtend') };
    var s = split(o.extra);
    r.fin = o.fin;
    r.monto = round2(r.monto + o.extra);
    r.comisionApp = round2(r.comisionApp + s.comisionApp);
    r.parteAlcaldia = round2(r.parteAlcaldia + s.parteAlcaldia);
    r.extendidaMin = (r.extendidaMin || 0) + minutos;
    state.pagos.push({ id: nextId('P'), reservaId: r.id, tipo: 'extension', monto: o.extra, parteAlcaldia: s.parteAlcaldia, comisionApp: s.comisionApp, fecha: now() });
    save();
    return { ok: true, reserva: r, extra: o.extra };
  }

  // Reembolso por terminar antes: un porcentaje de los bloques completos que no se usarán
  function earlyRefund(r) {
    var usados = Math.max(1, Math.ceil((now() - r.inicio) / BLOQUE));
    var corte = Math.min(r.fin, r.inicio + usados * BLOQUE);
    return Math.max(0, round2((r.monto - price(r.inicio, corte, r.espacioId).total) * R.reembolsoAnticipado));
  }

  // "Ya me voy": el espacio queda libre al instante para otros conductores
  function endEarly(id) {
    var r = getReservation(id), n = now();
    if (!r || r.estado !== 'activa' || r.inicio > n || r.fin <= n) return { ok: false, error: t('err.cantEnd') };
    var monto = earlyRefund(r);
    if (monto > 0) refund(r, monto);
    r.estado = 'terminada';
    r.finReservado = r.fin;
    r.fin = n;
    r.reembolsoAnticipado = monto;
    notifyWaitlist(r.espacioId);
    save();
    return { ok: true, reembolso: monto, reserva: r };
  }

  // ---------- Lista de espera ----------
  function joinWaitlist(o) {
    var placa = String(o.placa || '').trim().toUpperCase();
    if (!placa) return { ok: false, error: t('err.enterPlateCar') };
    var e = { id: nextId('E'), espacioId: +o.espacioId, inicio: +o.inicio, fin: +o.fin, placa: placa, creado: now(), estado: 'esperando', avisado: null };
    state.listaEspera.push(e);
    save();
    return { ok: true, entrada: e, posicion: waitlistPosition(e) };
  }
  function leaveWaitlist(id) {
    var e = state.listaEspera.filter(function (x) { return x.id === id; })[0];
    if (e) { e.estado = 'retirada'; save(); }
    return { ok: !!e };
  }
  // Cuando un espacio se libera, avisa a la primera persona en la fila cuyo horario quedó libre.
  function notifyWaitlist(espacioId) {
    var n = now();
    var e = listWaitlist().filter(function (x) {
      return x.estado === 'esperando' && x.espacioId === +espacioId && x.fin > n && isFree(x.espacioId, x.inicio, x.fin);
    })[0];
    if (e) { e.estado = 'disponible'; e.avisado = n; }
  }

  // ---------- Control ----------
  // El inspector libera un espacio cuyo conductor no llegó dentro de la tolerancia (sin reembolso).
  function releaseNoShow(id) {
    var r = getReservation(id), n = now();
    if (!r || r.estado !== 'activa' || n < r.inicio + R.toleranciaMin * MIN || r.fin <= n) return { ok: false, error: t('err.cantRelease') };
    r.estado = 'no_show';
    r.liberada = n;
    notifyWaitlist(r.espacioId);
    save();
    return { ok: true, reserva: r };
  }
  function addRound() { state.rondas.push(now()); save(); return { ok: true }; }

  function setSpotState(espacioId, estado) {
    if (['libre', 'ocupado', 'bloqueado'].indexOf(estado) < 0) return { ok: false, error: t('err.invalidState') };
    if (estado === 'libre') delete state.estadosEspacio[+espacioId]; else state.estadosEspacio[+espacioId] = estado;
    if (estado === 'libre') notifyWaitlist(espacioId);
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
    var vigentes = pagadas.filter(function (r) { return r.estado !== 'cancelada'; });
    var horasReservadas = vigentes.reduce(function (s, r) { return s + (r.fin - r.inicio) / (60 * MIN); }, 0);
    var montoVigentes = vigentes.reduce(function (s, r) { return s + r.monto; }, 0);
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
      respetadas: pagadas.length ? Math.round((pagadas.length - reportadas) / pagadas.length * 100) : 100,
      precioHora: horasReservadas ? round2(montoVigentes / horasReservadas) : 0,
      liberadas: hoy.filter(function (r) { return r.estado === 'terminada' || r.estado === 'no_show'; }).length,
      enEspera: state.listaEspera.filter(function (e) { return e.estado === 'esperando'; }).length,
      rondasHoy: state.rondas.filter(function (x) { return Util.sameDay(x, n); }).length,
      ultimaRonda: lastRound()
    };
  }

  window.Util = Util;
  window.Store = {
    load: load, save: save, reset: reset,
    now: now, isSimulatedTime: isSimulatedTime, apertura: apertura, cierre: cierre, isPeak: isPeak,
    getSpot: getSpot, listSpots: listSpots, spotState: spotState,
    getReservation: getReservation, listReservations: listReservations,
    listIncidents: listIncidents, listInfractions: listInfractions, listPayments: listPayments,
    listWaitlist: listWaitlist, waitlistPosition: waitlistPosition, lastRound: lastRound,
    availability: availability, isFree: isFree, price: price, hourlyRate: hourlyRate, validate: validate,
    finPrioridad: finPrioridad, earlyRefund: earlyRefund, extensionOptions: extensionOptions,
    createReservation: createReservation, pay: pay, cancel: cancel, reportOccupied: reportOccupied,
    extend: extend, endEarly: endEarly, joinWaitlist: joinWaitlist, leaveWaitlist: leaveWaitlist,
    releaseNoShow: releaseNoShow, addRound: addRound,
    setSpotState: setSpotState, addInfraction: addInfraction, resolveIncident: resolveIncident,
    metrics: metrics
  };
  load();
})();
