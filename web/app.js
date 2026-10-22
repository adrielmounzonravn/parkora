// Router por hash. Cada vista es una función (params, el) que pinta en el.
(function () {
  var routes = [
    [/^#?\/?$/,                       function () { return DriverViews.map; }],
    [/^#\/espacio\/([^/]+)(?:\/(\d+)\/(\d+))?$/, function () { return DriverViews.spot; }],
    [/^#\/pago\/([^/]+)$/,             function () { return DriverViews.pay; }],
    [/^#\/reserva\/([^/]+)$/,          function () { return DriverViews.reservation; }],
    [/^#\/mis-reservas$/,              function () { return DriverViews.myReservations; }],
    [/^#\/inspector$/,                 function () { return StaffViews.inspector; }],
    [/^#\/inspector\/espacio\/([^/]+)$/, function () { return StaffViews.inspectorSpot; }],
    [/^#\/alcaldia$/,                  function () { return StaffViews.alcaldia; }]
  ];

  function roleOf(hash) {
    if (hash.indexOf('#/inspector') === 0) return 'inspector';
    if (hash.indexOf('#/alcaldia') === 0) return 'alcaldia';
    return 'conductor';
  }

  var App = {
    onLeave: null, // las vistas pueden asignar una función de limpieza (ej. map.remove())
    go: function (hash) {
      if (location.hash === hash) App.render(); else location.hash = hash;
    },
    render: function () {
      var hash = location.hash || '#/';
      var el = document.getElementById('app');
      if (typeof App.onLeave === 'function') { try { App.onLeave(); } catch (e) {} }
      App.onLeave = null;

      // Textos del header según el idioma
      document.documentElement.lang = I18N.lang;
      document.title = t('app.title');
      document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
      var lb = document.getElementById('lang');
      if (lb) lb.title = t('lang.switchTitle');

      var role = roleOf(hash);
      document.querySelectorAll('.roles a').forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-role') === role);
      });
      el.classList.toggle('wide', role === 'alcaldia');

      for (var i = 0; i < routes.length; i++) {
        var m = hash.match(routes[i][0]);
        if (m) {
          el.innerHTML = '';
          routes[i][1]()(m.slice(1).map(function (x) { return x == null ? x : decodeURIComponent(x); }), el);
          window.scrollTo(0, 0);
          return;
        }
      }
      el.innerHTML = '<div class="card center"><h2>' + t('app.notFound') + '</h2><a class="btn btn-primary" href="#/">' + t('app.goToMap') + '</a></div>';
    }
  };

  window.App = App;
  window.addEventListener('hashchange', App.render);
  document.getElementById('lang').addEventListener('click', function () {
    I18N.set(I18N.lang === 'en' ? 'es' : 'en');
    App.render();
  });
  App.render();
})();
