/**
 * DHDL Startup-Datenbank – Filter & Startup Grid
 * Renders startup cards and handles filter logic. No external dependencies.
 */

(function () {
  'use strict';

  var grid = document.getElementById('startupsGrid');
  var countEl = document.getElementById('resultsCount');
  var filterSeason = document.getElementById('filterSeason');
  var filterIndustry = document.getElementById('filterIndustry');
  var filterStatus = document.getElementById('filterStatus');
  var filterReset = document.getElementById('filterReset');

  if (!grid) return;

  var allStartups = [];
  var basePath = window.DHDL ? window.DHDL.getBasePath() : '../../';

  // Load startup data
  fetch(basePath + 'data/startups.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allStartups = data;
      renderStartups(allStartups);
    })
    .catch(function () {
      // noscript fallback
    });

  // Filter event listeners
  if (filterSeason) filterSeason.addEventListener('change', applyFilters);
  if (filterIndustry) filterIndustry.addEventListener('change', applyFilters);
  if (filterStatus) filterStatus.addEventListener('change', applyFilters);
  if (filterReset) {
    filterReset.addEventListener('click', function () {
      if (filterSeason) filterSeason.value = '';
      if (filterIndustry) filterIndustry.value = '';
      if (filterStatus) filterStatus.value = '';
      renderStartups(allStartups);
    });
  }

  function applyFilters() {
    var season = filterSeason ? filterSeason.value : '';
    var industry = filterIndustry ? filterIndustry.value : '';
    var status = filterStatus ? filterStatus.value : '';

    var filtered = allStartups.filter(function (s) {
      if (season && String(s.season) !== season) return false;
      if (industry && s.industry !== industry) return false;
      if (status && s.current_status !== status) return false;
      return true;
    });

    renderStartups(filtered);
  }

  function renderStartups(startups) {
    grid.textContent = '';

    if (countEl) {
      countEl.textContent = startups.length + ' Startup' + (startups.length !== 1 ? 's' : '') + ' gefunden';
    }

    if (startups.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'text-secondary';
      empty.style.gridColumn = '1 / -1';
      empty.style.textAlign = 'center';
      empty.style.padding = '3rem 0';
      empty.textContent = 'Keine Startups f\u00fcr diese Filter gefunden.';
      grid.appendChild(empty);
      return;
    }

    startups.forEach(function (s) {
      var card = document.createElement('article');
      card.className = 'card';

      var body = document.createElement('div');
      body.className = 'card__body';

      // Meta
      var meta = document.createElement('div');
      meta.className = 'card__meta';
      var statusTag = document.createElement('span');
      statusTag.className = 'tag ' + getStatusTagClass(s.current_status);
      statusTag.textContent = getStatusLabel(s.current_status);
      meta.appendChild(statusTag);
      var seasonSpan = document.createElement('span');
      seasonSpan.textContent = 'Staffel ' + s.season + ' \u00b7 ' + s.air_date.split('-')[0];
      meta.appendChild(seasonSpan);

      // Title
      var title = document.createElement('h3');
      title.className = 'card__title';
      var link = document.createElement('a');
      link.href = s.slug + '.html';
      link.textContent = s.name;
      title.appendChild(link);

      // Description
      var desc = document.createElement('p');
      desc.className = 'card__description';
      desc.textContent = s.product;

      // Footer
      var footer = document.createElement('div');
      footer.className = 'card__footer';

      var statusEl = document.createElement('span');
      statusEl.className = 'status status--' + s.current_status;
      var dot = document.createElement('span');
      dot.className = 'status__dot';
      statusEl.appendChild(dot);
      statusEl.appendChild(document.createTextNode(' ' + getStatusLabel(s.current_status)));

      var dealTag = document.createElement('span');
      dealTag.className = 'tag';
      if (s.deal && s.deal.agreed_investment) {
        dealTag.textContent = window.DHDL.formatCurrency(s.deal.agreed_investment);
      } else {
        dealTag.textContent = 'Kein Deal';
      }

      footer.appendChild(statusEl);
      footer.appendChild(dealTag);

      body.appendChild(meta);
      body.appendChild(title);
      body.appendChild(desc);
      body.appendChild(footer);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function getStatusTagClass(status) {
    var map = {
      growing: 'tag--success',
      acquired: 'tag--primary',
      closed: 'tag--danger',
      unknown: ''
    };
    return map[status] || '';
  }

  function getStatusLabel(status) {
    var map = {
      growing: 'Wachsend',
      acquired: '\u00dcbernommen',
      closed: 'Eingestellt',
      unknown: 'Unbekannt'
    };
    return map[status] || status;
  }

})();
