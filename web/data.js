// Datos de ejemplo de la demo. Zona piloto: Centro – Plaza 14 de Septiembre, Cochabamba.
(function () {
  var CASUALES = [10, 20, 21, 30];

  // Tres cuadras junto a la plaza (geometría de OpenStreetMap), 10 espacios por cuadra, en línea
  // junto a la acera interior de la manzana, a ~2 m del eje, ~6,5 m entre espacios y ~15 m libres en cada esquina.
  // Bolívar (España → 25 de Mayo, acera sur), 25 de Mayo (Bolívar → Sucre, acera oeste),
  // Sucre (25 de Mayo → plaza, acera norte; con hueco frente al Pasaje Sucre).
  var calles = [
    { calle: 'Calle Bolívar', puntos: [
      [-17.393173, -66.156196], [-17.393162, -66.156135],
      [-17.393152, -66.156075], [-17.393141, -66.156015],
      [-17.393130, -66.155955], [-17.393120, -66.155895],
      [-17.393109, -66.155835], [-17.393098, -66.155775],
      [-17.393087, -66.155714], [-17.393077, -66.155654]
    ] },
    { calle: 'Calle 25 de Mayo', puntos: [
      [-17.393273, -66.155350], [-17.393330, -66.155339],
      [-17.393387, -66.155328], [-17.393445, -66.155317],
      [-17.393502, -66.155306], [-17.393560, -66.155296],
      [-17.393617, -66.155285], [-17.393675, -66.155274],
      [-17.393732, -66.155263], [-17.393790, -66.155252]
    ] },
    { calle: 'Calle Sucre', puntos: [
      [-17.394077, -66.155364], [-17.394088, -66.155424],
      [-17.394098, -66.155484], [-17.394109, -66.155544],
      [-17.394120, -66.155604], [-17.394159, -66.155826],
      [-17.394169, -66.155887], [-17.394180, -66.155947],
      [-17.394190, -66.156007], [-17.394200, -66.156067]
    ] }
  ];

  var espacios = [];
  calles.forEach(function (c, ci) {
    c.puntos.forEach(function (pt, i) {
      var n = ci * 10 + i + 1;
      espacios.push({
        id: n,
        numero: n,
        calle: c.calle,
        lat: pt[0],
        lng: pt[1],
        tipo: CASUALES.indexOf(n) >= 0 ? 'casual' : 'reservable'
      });
    });
  });

  // Reservas de otros conductores, relativas a "ahora" (ms) para que la demo siempre se vea viva.
  // offset y duración en minutos; "ahora" se redondea hacia abajo a 30 min.
  var PLANTILLA = [
    // cubren ahora
    { espacioId: 2,  offset: -30, dur: 120, placa: '2345-KTR' },
    { espacioId: 5,  offset: -60, dur: 150, placa: '4012-BHN' },
    { espacioId: 9,  offset: 0,   dur: 60,  placa: '3871-PLD' },
    { espacioId: 13, offset: -30, dur: 90,  placa: '5120-GZX' },
    { espacioId: 17, offset: -90, dur: 180, placa: '1987-CTF' },
    { espacioId: 24, offset: 0,   dur: 120, placa: '4456-RMB' },
    { espacioId: 27, offset: -60, dur: 90,  placa: '2903-HJS' },
    // más tarde hoy
    { espacioId: 3,  offset: 60,  dur: 90,  placa: '3349-DKL' },
    { espacioId: 7,  offset: 90,  dur: 120, placa: '5567-TNW' },
    { espacioId: 12, offset: 120, dur: 60,  placa: '1654-SPQ' },
    { espacioId: 16, offset: 60,  dur: 150, placa: '4780-YVC' },
    { espacioId: 22, offset: 150, dur: 90,  placa: '2218-LMA' },
    { espacioId: 26, offset: 180, dur: 60,  placa: '3092-FRE' },
    // ya terminó hoy
    { espacioId: 8,  offset: -150, dur: 60, placa: '6021-KBX' }
  ];

  function reservasSemilla(ahora) {
    var base = new Date(ahora);
    base.setMinutes(base.getMinutes() < 30 ? 0 : 30, 0, 0);
    var hoy = new Date(base); hoy.setHours(0, 0, 0, 0);
    var abre = hoy.getTime() + 8 * 3600e3, cierra = hoy.getTime() + 16 * 3600e3;
    return PLANTILLA.map(function (p) {
      var inicio = Math.max(base.getTime() + p.offset * 60e3, abre);
      var fin = Math.min(inicio + p.dur * 60e3, cierra);
      return { espacioId: p.espacioId, inicio: inicio, fin: fin, placa: p.placa };
    }).filter(function (r) { return r.fin - r.inicio >= 30 * 60e3; });
  }

  window.DATA = {
    zona: {
      id: 'centro',
      nombre: 'Centro – Plaza 14 de Septiembre',
      ciudad: 'Cochabamba',
      centro: [-17.393639, -66.155724],
      zoom: 18
    },
    reglas: {
      horaApertura: '08:00',
      horaCierre: '16:00',
      tarifaHora: 2,          // Bs por hora
      bloqueMin: 30,          // se cobra por bloques de 30 min
      precioBloque: 1,        // Bs por bloque
      duracionMinMin: 30,
      duracionMaxMin: 240,
      anticipacionMaxDias: 7,
      margenMin: 10,          // margen entre dos reservas del mismo espacio
      toleranciaMin: 15,      // tolerancia de llegada tarde
      cancelacionGratisMin: 30,
      comisionApp: 0.10,      // 10% para la app, 90% para la alcaldía
      multa: 150,             // Bs
      compensacion: 30        // Bs de la multa para el conductor afectado
    },
    espacios: espacios,
    reservasSemilla: reservasSemilla // función (ahoraMs) → [{espacioId, inicio, fin, placa}] (ms)
  };
})();
