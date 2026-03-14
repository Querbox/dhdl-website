/**
 * DHDL Startup-Datenbank – Main Application
 * No external dependencies. Fully GDPR compliant.
 */

(function () {
  'use strict';

  // ========== Mobile Menu ==========
  var menuBtn = document.getElementById('menuBtn');
  var mainNav = document.getElementById('mainNav');

  if (menuBtn && mainNav) {
    menuBtn.addEventListener('click', function () {
      mainNav.classList.toggle('active');
      var isOpen = mainNav.classList.contains('active');
      menuBtn.setAttribute('aria-expanded', isOpen);
      menuBtn.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
    });
  }

  // ========== GDPR Banner ==========
  var gdprBanner = document.getElementById('gdprBanner');
  var gdprAccept = document.getElementById('gdprAccept');

  if (gdprBanner && gdprAccept) {
    if (!localStorage.getItem('dhdl-gdpr-acknowledged')) {
      gdprBanner.classList.add('active');
    }

    gdprAccept.addEventListener('click', function () {
      localStorage.setItem('dhdl-gdpr-acknowledged', 'true');
      gdprBanner.classList.remove('active');
    });
  }

  // ========== Seasons Grid (Homepage & Season page) ==========
  var seasonsGrid = document.getElementById('seasonsGrid');

  if (seasonsGrid) {
    loadSeasons();
  }

  function loadSeasons() {
    var basePath = getBasePath();
    fetch(basePath + 'data/seasons.json')
      .then(function (res) { return res.json(); })
      .then(function (seasons) {
        // Clear existing content
        seasonsGrid.textContent = '';

        seasons.forEach(function (season) {
          var link = document.createElement('a');
          link.href = basePath + 'pages/seasons/' + season.slug + '.html';
          link.className = 'card';

          var body = document.createElement('div');
          body.className = 'card__body';

          var meta = document.createElement('div');
          meta.className = 'card__meta';
          var metaSpan = document.createElement('span');
          metaSpan.textContent = season.year;
          meta.appendChild(metaSpan);

          var title = document.createElement('h3');
          title.className = 'card__title';
          title.textContent = 'Staffel ' + season.id;

          var desc = document.createElement('p');
          desc.className = 'card__description';
          desc.textContent = season.episodes + ' Episoden · Premiere: ' + formatDate(season.premiere);

          body.appendChild(meta);
          body.appendChild(title);
          body.appendChild(desc);
          link.appendChild(body);
          seasonsGrid.appendChild(link);
        });
      })
      .catch(function () {
        // Silently fail – noscript fallback will show
      });
  }

  // ========== Utility Functions ==========

  function getBasePath() {
    var path = window.location.pathname;
    if (path.includes('/pages/')) {
      var depth = path.split('/pages/')[1].split('/').filter(Boolean).length;
      var segments = path.split('/').filter(Boolean);
      if (segments[segments.length - 1].includes('.')) {
        depth = depth - 1;
      }
      return '../'.repeat(depth + 1);
    }
    return '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  }

  function formatCurrency(amount) {
    if (!amount) return '';
    return amount.toLocaleString('de-DE') + ' \u20ac';
  }

  // Expose utilities globally for other scripts
  window.DHDL = {
    getBasePath: getBasePath,
    formatDate: formatDate,
    formatCurrency: formatCurrency
  };

})();
