/**
 * DHDL Startup-Datenbank – Search (Fuse.js-like, zero dependencies)
 * Local fuzzy search over startups & investors. No external API calls.
 */

(function () {
  'use strict';

  var searchBtn = document.getElementById('searchBtn');
  var searchOverlay = document.getElementById('searchOverlay');
  var searchInput = document.getElementById('searchInput');
  var searchResults = document.getElementById('searchResults');
  var searchIndex = [];
  var activeIndex = -1;
  var basePath = '';

  if (!searchBtn || !searchOverlay || !searchInput || !searchResults) return;

  // Determine base path
  basePath = window.DHDL ? window.DHDL.getBasePath() : '';

  // ========== Load Search Index ==========
  function loadSearchIndex() {
    if (searchIndex.length > 0) return Promise.resolve();

    return Promise.all([
      fetch(basePath + 'data/startups.json').then(function (r) { return r.json(); }),
      fetch(basePath + 'data/investors.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
      var startups = results[0];
      var investors = results[1];

      startups.forEach(function (s) {
        searchIndex.push({
          type: 'startup',
          name: s.name,
          detail: s.product + ' · Staffel ' + s.season,
          icon: getIndustryIcon(s.industry),
          url: basePath + 'pages/startups/' + s.slug + '.html',
          keywords: [s.name, s.product, s.industry, s.city || ''].join(' ').toLowerCase()
        });
      });

      investors.forEach(function (inv) {
        searchIndex.push({
          type: 'investor',
          name: inv.name,
          detail: inv.company + ' · ' + inv.total_deals + ' Deals',
          icon: getInitials(inv.name),
          url: basePath + 'pages/investors/' + inv.slug + '.html',
          keywords: [inv.name, inv.company, inv.focus_industries.join(' ')].join(' ').toLowerCase()
        });
      });
    }).catch(function () {
      // Search unavailable without data
    });
  }

  // ========== Open / Close ==========
  function openSearch() {
    loadSearchIndex();
    searchOverlay.classList.add('active');
    searchInput.value = '';
    searchInput.focus();
    activeIndex = -1;
    showDefault();
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  searchBtn.addEventListener('click', openSearch);

  searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) closeSearch();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    // Escape to close
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // ========== Search Logic ==========
  searchInput.addEventListener('input', function () {
    var query = searchInput.value.trim().toLowerCase();
    activeIndex = -1;

    if (query.length === 0) {
      showDefault();
      return;
    }

    var results = searchIndex.filter(function (item) {
      return fuzzyMatch(query, item.keywords);
    });

    renderResults(results, query);
  });

  // Arrow key navigation
  searchInput.addEventListener('keydown', function (e) {
    var items = searchResults.querySelectorAll('.search-result');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActiveResult(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveResult(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        window.location.href = items[activeIndex].getAttribute('data-url');
      }
    }
  });

  function updateActiveResult(items) {
    items.forEach(function (item, i) {
      item.classList.toggle('search-result--active', i === activeIndex);
    });
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  // ========== Fuzzy Match ==========
  function fuzzyMatch(query, text) {
    // Simple substring + token matching
    if (text.includes(query)) return true;

    var tokens = query.split(/\s+/);
    return tokens.every(function (token) {
      return text.includes(token);
    });
  }

  // ========== Render ==========
  function showDefault() {
    searchResults.textContent = '';
    var empty = document.createElement('div');
    empty.className = 'search-results__empty';
    empty.textContent = 'Tippe einen Suchbegriff ein\u2026';
    searchResults.appendChild(empty);
  }

  function renderResults(results, query) {
    searchResults.textContent = '';

    if (results.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'search-results__empty';
      empty.textContent = 'Keine Ergebnisse f\u00fcr \u201e' + query + '\u201c';
      searchResults.appendChild(empty);
      return;
    }

    results.slice(0, 10).forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'search-result';
      el.setAttribute('data-url', item.url);
      el.tabIndex = 0;

      var iconEl = document.createElement('div');
      iconEl.className = 'search-result__icon';
      iconEl.textContent = item.icon;

      var infoEl = document.createElement('div');
      infoEl.className = 'search-result__info';

      var nameEl = document.createElement('div');
      nameEl.className = 'search-result__name';
      nameEl.textContent = item.name;

      var detailEl = document.createElement('div');
      detailEl.className = 'search-result__detail';
      detailEl.textContent = item.detail;

      infoEl.appendChild(nameEl);
      infoEl.appendChild(detailEl);
      el.appendChild(iconEl);
      el.appendChild(infoEl);

      el.addEventListener('click', function () {
        window.location.href = item.url;
      });

      searchResults.appendChild(el);
    });
  }

  // ========== Helpers ==========
  function getIndustryIcon(industry) {
    var icons = {
      'Food': '\uD83C\uDF7D\uFE0F',
      'Konsumg\u00fcter': '\uD83D\uDED2',
      'Gesundheit': '\uD83D\uDC9A',
      'Technologie': '\uD83D\uDCBB',
      'Beauty': '\u2728',
      'Nachhaltigkeit': '\u267B\uFE0F',
      'Sport': '\u26BD',
      'Mobilit\u00e4t': '\uD83D\uDE97'
    };
    return icons[industry] || '\uD83D\uDE80';
  }

  function getInitials(name) {
    return name.split(' ').map(function (n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
  }

})();
