#!/usr/bin/env node

/**
 * DHDL Website – Static Site Generator
 * Generates all HTML pages from JSON data files.
 * No external dependencies – runs with plain Node.js.
 */

const fs = require('fs');
const path = require('path');

// ========== Load Data ==========
const DATA_DIR = path.join(__dirname, 'data');
const PAGES_DIR = path.join(__dirname, 'pages');

const startups = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'startups.json'), 'utf8'));
const investors = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'investors.json'), 'utf8'));
const seasons = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seasons.json'), 'utf8'));
const founders = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'founders.json'), 'utf8'));

console.log(`Loaded: ${startups.length} startups, ${investors.length} investors, ${seasons.length} seasons, ${founders.length} founders`);

// ========== Helpers ==========

function slugify(text) {
  return text.toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatCurrency(amount) {
  if (!amount) return '–';
  return amount.toLocaleString('de-DE') + ' \u20ac';
}

function formatDate(dateStr) {
  if (!dateStr) return '–';
  var parts = dateStr.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
}

function getStatusLabel(status) {
  var map = { growing: 'Wachsend', acquired: '\u00dcbernommen', closed: 'Eingestellt', unknown: 'Unbekannt' };
  return map[status] || status || 'Unbekannt';
}

function getStatusClass(status) {
  var map = { growing: 'status--growing', acquired: 'status--acquired', closed: 'status--closed', unknown: 'status--unknown' };
  return map[status] || 'status--unknown';
}

function getStatusTagClass(status) {
  var map = { growing: 'tag--success', acquired: 'tag--primary', closed: 'tag--danger', unknown: '' };
  return map[status] || '';
}

function getDealStatusLabel(status) {
  var map = { completed: 'Deal abgeschlossen', collapsed: 'Deal geplatzt', no_deal: 'Kein Deal' };
  return map[status] || status || '–';
}

function getDealStatusTagClass(status) {
  var map = { completed: 'tag--success', collapsed: 'tag--warning', no_deal: 'tag--danger' };
  return map[status] || '';
}

function getInvestorName(id) {
  var inv = investors.find(function(i) { return i.id === id; });
  return inv ? inv.name : id;
}

function getInvestorInitials(name) {
  return name.split(' ').map(function(n) { return n[0]; }).join('').substring(0, 2).toUpperCase();
}

function getIndustryIcon(industry) {
  var icons = {
    'Food': '\uD83C\uDF7D\uFE0F', 'Konsumg\u00fcter': '\uD83D\uDED2', 'Gesundheit': '\uD83D\uDC9A',
    'Technologie': '\uD83D\uDCBB', 'Beauty': '\u2728', 'Nachhaltigkeit': '\u267B\uFE0F',
    'Sport': '\u26BD', 'Mobilit\u00e4t': '\uD83D\uDE97', 'Mode': '\uD83D\uDC57',
    'Haushalt': '\uD83C\uDFE0', 'Kinder': '\uD83E\uDDF8', 'Finanzen': '\uD83D\uDCB0',
    'Bildung': '\uD83D\uDCDA', 'Medien': '\uD83C\uDFAC', 'Software': '\uD83D\uDCBB',
    'Hardware': '\u2699\uFE0F', 'Tier': '\uD83D\uDC3E', 'Getr\u00e4nke': '\uD83C\uDF79',
    'Freizeit': '\uD83C\uDFAF', 'Dienstleistung': '\uD83D\uDD27', 'Soziales': '\u2764\uFE0F',
    'Garten': '\uD83C\uDF31', 'Reinigung': '\uD83E\uDDF9', 'Pflege': '\uD83D\uDC86',
  };
  return icons[industry] || '\uD83D\uDE80';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ========== Templates ==========

function headerHtml(basePath, activePage) {
  return `<header class="header">
    <div class="header__inner">
      <a href="${basePath}index.html" class="header__logo">
        <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="28" height="28" rx="6" fill="#1d1d1f"/>
          <text x="14" y="20" text-anchor="middle" fill="white" font-size="16" font-weight="bold">L</text>
        </svg>
        DHDL<span>DB</span>
      </a>
      <nav class="nav" id="mainNav">
        <a href="${basePath}index.html" class="nav__link${activePage === 'home' ? ' nav__link--active' : ''}">Home</a>
        <a href="${basePath}pages/startups/" class="nav__link${activePage === 'startups' ? ' nav__link--active' : ''}">Startups</a>
        <a href="${basePath}pages/investors/" class="nav__link${activePage === 'investors' ? ' nav__link--active' : ''}">Investoren</a>
        <a href="${basePath}pages/seasons/" class="nav__link${activePage === 'seasons' ? ' nav__link--active' : ''}">Staffeln</a>
        <a href="${basePath}pages/was-wurde-aus/" class="nav__link${activePage === 'seo' ? ' nav__link--active' : ''}">Was wurde aus\u2026?</a>
        <button class="nav__search-btn" id="searchBtn" type="button" aria-label="Suche \u00f6ffnen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Suche\u2026
          <kbd>\u2318K</kbd>
        </button>
      </nav>
      <button class="header__menu-btn" id="menuBtn" type="button" aria-label="Men\u00fc \u00f6ffnen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
  </header>`;
}

function searchModalHtml() {
  return `<div class="search-overlay" id="searchOverlay">
    <div class="search-modal">
      <div class="search-modal__input-wrap">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" class="search-modal__input" id="searchInput" placeholder="Startup, Investor oder Produkt suchen\u2026" autocomplete="off">
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-results__empty">Tippe einen Suchbegriff ein\u2026</div>
      </div>
      <div class="search-modal__footer">
        <span><kbd>\u2191\u2193</kbd> Navigieren</span>
        <span><kbd>\u21b5</kbd> \u00d6ffnen</span>
        <span><kbd>Esc</kbd> Schlie\u00dfen</span>
      </div>
    </div>
  </div>`;
}

function footerHtml(basePath) {
  return `<footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div class="footer__brand">
          <div class="footer__brand-name">DHDL Startup-Datenbank</div>
          <p>Die umfassende Datenbank aller Startups aus \u201eDie H\u00f6hle der L\u00f6wen\u201c.</p>
        </div>
        <div>
          <div class="footer__heading">Entdecken</div>
          <a href="${basePath}pages/startups/" class="footer__link">Alle Startups</a>
          <a href="${basePath}pages/investors/" class="footer__link">Investoren</a>
          <a href="${basePath}pages/seasons/" class="footer__link">Staffeln</a>
          <a href="${basePath}pages/was-wurde-aus/" class="footer__link">Was wurde aus\u2026?</a>
        </div>
        <div>
          <div class="footer__heading">Top-Listen</div>
          <a href="${basePath}pages/startups/?filter=success" class="footer__link">Erfolgreichste Startups</a>
          <a href="${basePath}pages/startups/?filter=deals" class="footer__link">Gr\u00f6\u00dfte Deals</a>
          <a href="${basePath}pages/startups/?filter=closed" class="footer__link">Gescheiterte Startups</a>
        </div>
        <div>
          <div class="footer__heading">Rechtliches</div>
          <a href="${basePath}pages/impressum.html" class="footer__link">Impressum</a>
          <a href="${basePath}pages/datenschutz.html" class="footer__link">Datenschutz</a>
        </div>
      </div>
      <div class="footer__bottom">
        <span>Kein offizielles Produkt von VOX oder RTL. Alle Markenrechte liegen bei den jeweiligen Inhabern.</span>
        <span>Open Source \u00b7 Kein Tracking \u00b7 DSGVO-konform</span>
      </div>
    </div>
  </footer>`;
}

function scriptsHtml(basePath) {
  return `<script src="${basePath}js/app.js"></script>
  <script src="${basePath}js/search.js"></script>`;
}

function pageShell(options) {
  var basePath = options.basePath || '';
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(options.description)}">
  <meta name="robots" content="${options.noindex ? 'noindex' : 'index, follow'}">
  <title>${escapeHtml(options.title)} \u2013 DHDL Startup-Datenbank</title>
  <link rel="stylesheet" href="${basePath}css/style.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>\uD83E\uDD81</text></svg>">
  ${options.structuredData ? '<script type="application/ld+json">' + JSON.stringify(options.structuredData) + '</script>' : ''}
</head>
<body>
  ${headerHtml(basePath, options.activePage || '')}
  ${searchModalHtml()}
  ${options.body}
  ${footerHtml(basePath)}
  ${scriptsHtml(basePath)}
  ${options.extraScripts || ''}
</body>
</html>`;
}

// ========== Generate Startup Pages ==========

function generateStartupPage(startup) {
  var basePath = '../../';
  var investorNames = (startup.deal && startup.deal.investors)
    ? startup.deal.investors.map(getInvestorName)
    : [];

  var hasImage = startup.image && fs.existsSync(path.join(__dirname, startup.image));
  var imageHtml = hasImage
    ? `<img src="${basePath}${startup.image}" alt="${escapeHtml(startup.name)}" class="card__image">`
    : `<div class="card__image card__image--placeholder" aria-label="${escapeHtml(startup.name)}">${getIndustryIcon(startup.industry)}</div>`;

  var timelineHtml = '';
  if (startup.timeline && startup.timeline.length > 0) {
    timelineHtml = `<section class="content-section">
      <h2 class="content-section__title">Timeline</h2>
      <div class="timeline">
        ${startup.timeline.map(function(t) {
          return `<div class="timeline__item">
            <div class="timeline__dot"></div>
            <div class="timeline__year">${escapeHtml(String(t.year))}</div>
            <div class="timeline__text">${escapeHtml(t.event)}</div>
          </div>`;
        }).join('\n        ')}
      </div>
    </section>`;
  }

  var dealBoxHtml = '';
  if (startup.deal) {
    var d = startup.deal;
    var investorAvatarsHtml = investorNames.map(function(name) {
      return `<div class="flex" style="gap: 0.75rem; margin-bottom: 0.5rem;">
        <div class="investor-card__avatar" style="width: 36px; height: 36px; font-size: 0.75rem;">${getInvestorInitials(name)}</div>
        <div>
          <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(name)}</div>
        </div>
      </div>`;
    }).join('\n');

    dealBoxHtml = `<div class="deal-box">
      <div class="deal-box__header"><h3>Deal-Details</h3></div>
      <div class="deal-box__grid">
        <div class="deal-box__item">
          <div class="deal-box__label">Gefordert</div>
          <div class="deal-box__value">${formatCurrency(d.requested_investment)}</div>
        </div>
        <div class="deal-box__item">
          <div class="deal-box__label">Angeboten</div>
          <div class="deal-box__value">${d.requested_equity ? d.requested_equity + '%' : '\u2013'}</div>
        </div>
        ${d.status !== 'no_deal' ? `<div class="deal-box__item">
          <div class="deal-box__label">Deal</div>
          <div class="deal-box__value deal-box__value--highlight">${formatCurrency(d.agreed_investment)}</div>
        </div>
        <div class="deal-box__item">
          <div class="deal-box__label">F\u00fcr</div>
          <div class="deal-box__value deal-box__value--highlight">${d.agreed_equity ? d.agreed_equity + '%' : '\u2013'}</div>
        </div>` : ''}
      </div>
      <div class="deal-box__footer">
        ${investorAvatarsHtml || '<div class="text-sm text-tertiary">Kein Investor</div>'}
        <div style="margin-top: 0.75rem;">
          <span class="tag ${getDealStatusTagClass(d.status)}">${getDealStatusLabel(d.status)}</span>
        </div>
      </div>
    </div>`;
  }

  var foundersHtml = '';
  if (startup.founders && startup.founders.length > 0) {
    var founderCards = startup.founders.map(function(fId) {
      var f = founders.find(function(fo) { return fo.id === fId; });
      var name = f ? f.name : fId;
      var bio = f ? f.bio : '';
      var initials = getInvestorInitials(name);
      return `<div class="card">
        <div class="card__body">
          <div class="flex" style="gap: 1rem;">
            <div class="investor-card__avatar" style="width: 56px; height: 56px; font-size: 1rem; flex-shrink: 0;">${initials}</div>
            <div>
              <h4 style="margin-bottom: 0.25rem;">${escapeHtml(name)}</h4>
              <p class="text-sm text-secondary">${escapeHtml(bio)}</p>
            </div>
          </div>
        </div>
      </div>`;
    }).join('\n');

    foundersHtml = `<section class="content-section">
      <h2 class="content-section__title">Gr\u00fcnder</h2>
      <div class="grid grid--2">${founderCards}</div>
    </section>`;
  }

  var tagsHtml = (startup.tags || []).map(function(t) {
    return `<span class="tag">${escapeHtml(t)}</span>`;
  }).join(' ');

  var body = `
  <div class="page-header">
    <div class="container">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <a href="${basePath}pages/startups/">Startups</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>${escapeHtml(startup.name)}</span>
      </nav>
      <div class="page-header__title-row">
        <div>
          <div class="flex" style="gap: 0.75rem; margin-bottom: 0.5rem;">
            <span class="tag ${getStatusTagClass(startup.current_status)}">${getStatusLabel(startup.current_status)}</span>
            <span class="tag">${escapeHtml(startup.industry || '')}</span>
            <span class="tag">Staffel ${startup.season}</span>
          </div>
          <h1 class="page-header__title">${escapeHtml(startup.name)}</h1>
        </div>
        <span class="status ${getStatusClass(startup.current_status)}" style="font-size: 1rem;">
          <span class="status__dot"></span>
          ${getStatusLabel(startup.current_status)}
        </span>
      </div>
      <p class="page-header__description">${escapeHtml(startup.product || startup.description || '')}</p>
    </div>
  </div>

  <div class="container">
    <div class="detail-layout">
      <div class="detail-layout__main">
        ${startup.description ? `<section class="content-section">
          <h2 class="content-section__title">\u00dcber ${escapeHtml(startup.name)}</h2>
          <p style="color: var(--color-text-secondary); line-height: 1.8;">${escapeHtml(startup.description)}</p>
        </section>` : ''}
        ${timelineHtml}
        ${foundersHtml}
        ${startup.status_detail ? `<section class="content-section">
          <h2 class="content-section__title">Status heute</h2>
          <div style="padding: 1.5rem; background: var(--color-surface-alt); border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
            <p style="font-weight: 600; margin-bottom: 0.5rem;">${getStatusLabel(startup.current_status)}</p>
            <p class="text-sm text-secondary">${escapeHtml(startup.status_detail)}</p>
          </div>
        </section>` : ''}
      </div>
      <aside class="detail-layout__sidebar">
        ${dealBoxHtml}
        <div class="deal-box">
          <div class="deal-box__header"><h3>Steckbrief</h3></div>
          <div style="padding: 0;">
            <table class="info-table" style="padding: 0 1.5rem;">
              <tr><td>Produkt</td><td>${escapeHtml(startup.product || '')}</td></tr>
              <tr><td>Branche</td><td>${escapeHtml(startup.industry || '')}</td></tr>
              <tr><td>Staffel</td><td><a href="${basePath}pages/seasons/staffel-${startup.season}.html">Staffel ${startup.season}</a></td></tr>
              <tr><td>Episode</td><td>${startup.episode || '\u2013'}</td></tr>
              <tr><td>Ausstrahlung</td><td>${formatDate(startup.air_date)}</td></tr>
              ${startup.city ? `<tr><td>Stadt</td><td>${escapeHtml(startup.city)}</td></tr>` : ''}
              <tr><td>Land</td><td>${escapeHtml(startup.country || 'Deutschland')}</td></tr>
              ${startup.website ? `<tr><td>Website</td><td><a href="${escapeHtml(startup.website)}" rel="noopener noreferrer" target="_blank">${escapeHtml(startup.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></td></tr>` : ''}
            </table>
          </div>
        </div>
        ${tagsHtml ? `<div class="deal-box">
          <div class="deal-box__header"><h3>Tags</h3></div>
          <div style="padding: 1rem 1.5rem;">
            <div class="flex flex--wrap" style="gap: 0.5rem;">${tagsHtml}</div>
          </div>
        </div>` : ''}
      </aside>
    </div>
  </div>`;

  return pageShell({
    title: startup.name,
    description: `${startup.name} bei Die H\u00f6hle der L\u00f6wen: ${startup.product || ''}. Staffel ${startup.season}. Alle Details zum Pitch, Deal und aktuellen Status.`,
    activePage: 'startups',
    basePath: basePath,
    body: body,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: startup.name,
      description: startup.product || startup.description || '',
      url: startup.website || undefined
    }
  });
}

// ========== Generate SEO "Was wurde aus" Pages ==========

function generateSeoPage(startup) {
  var basePath = '../../';
  var investorNames = (startup.deal && startup.deal.investors)
    ? startup.deal.investors.map(getInvestorName)
    : [];

  var timelineHtml = '';
  if (startup.timeline && startup.timeline.length > 0) {
    timelineHtml = `<div class="timeline" style="margin: 1.5rem 0;">
      ${startup.timeline.map(function(t) {
        return `<div class="timeline__item">
          <div class="timeline__dot"></div>
          <div class="timeline__year">${escapeHtml(String(t.year))}</div>
          <div class="timeline__text">${escapeHtml(t.event)}</div>
        </div>`;
      }).join('\n      ')}
    </div>`;
  }

  var dealSummary = 'Kein Deal';
  if (startup.deal && startup.deal.status !== 'no_deal') {
    dealSummary = formatCurrency(startup.deal.agreed_investment) + ' f\u00fcr ' + (startup.deal.agreed_equity || '?') + '% von ' + investorNames.join(' & ');
  }

  var body = `
  <div class="page-header">
    <div class="container container--narrow">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <a href="${basePath}pages/was-wurde-aus/">Was wurde aus\u2026?</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>${escapeHtml(startup.name)}</span>
      </nav>
      <h1 class="page-header__title" style="font-size: clamp(1.5rem, 4vw, 2.25rem);">
        Was wurde aus ${escapeHtml(startup.name)} nach Die H\u00f6hle der L\u00f6wen?
      </h1>
      <p class="page-header__description">${escapeHtml(startup.product || startup.description || '')}</p>
      <div class="flex flex--wrap" style="gap: 0.5rem; margin-top: 1rem;">
        <span class="tag ${getStatusTagClass(startup.current_status)}">${getStatusLabel(startup.current_status)}</span>
        <span class="tag">Staffel ${startup.season} \u00b7 ${(startup.air_date || '').split('-')[0]}</span>
        ${investorNames.map(function(n) { return '<span class="tag">' + escapeHtml(n) + '</span>'; }).join('')}
      </div>
    </div>
  </div>

  <article class="container container--narrow" style="padding-top: var(--space-2xl); padding-bottom: var(--space-4xl);">
    <div class="stats" style="margin-bottom: var(--space-2xl);">
      <div class="stat">
        <div class="stat__value">${startup.deal && startup.deal.agreed_investment ? formatCurrency(startup.deal.agreed_investment).replace(' \u20ac', '') : 'Kein'}</div>
        <div class="stat__label">${startup.deal && startup.deal.agreed_investment ? 'Investment' : 'Deal'}</div>
      </div>
      <div class="stat">
        <div class="stat__value">${startup.deal && startup.deal.agreed_equity ? startup.deal.agreed_equity + '%' : '\u2013'}</div>
        <div class="stat__label">Anteile</div>
      </div>
      <div class="stat">
        <div class="stat__value">Staffel ${startup.season}</div>
        <div class="stat__label">${(startup.air_date || '').split('-')[0]}</div>
      </div>
      <div class="stat">
        <div class="stat__value">${getStatusLabel(startup.current_status)}</div>
        <div class="stat__label">Status heute</div>
      </div>
    </div>

    <section class="content-section">
      <h2 class="content-section__title">Der Pitch</h2>
      <p style="color: var(--color-text-secondary); line-height: 1.8;">
        ${escapeHtml(startup.name)} trat in Staffel ${startup.season}${startup.episode ? ', Episode ' + startup.episode : ''} von \u201eDie H\u00f6hle der L\u00f6wen\u201c auf${startup.air_date ? ' (ausgestrahlt am ' + formatDate(startup.air_date) + ')' : ''}.
        ${startup.deal && startup.deal.requested_investment ? 'Die Gr\u00fcnder forderten ' + formatCurrency(startup.deal.requested_investment) + ' f\u00fcr ' + startup.deal.requested_equity + '% der Anteile.' : ''}
      </p>
    </section>

    <section class="content-section">
      <h2 class="content-section__title">Der Deal</h2>
      <div class="deal-box" style="margin-bottom: 1.5rem;">
        <div class="deal-box__grid">
          <div class="deal-box__item">
            <div class="deal-box__label">Gefordert</div>
            <div class="deal-box__value">${startup.deal ? formatCurrency(startup.deal.requested_investment) + ' f\u00fcr ' + (startup.deal.requested_equity || '?') + '%' : '\u2013'}</div>
          </div>
          <div class="deal-box__item">
            <div class="deal-box__label">Ergebnis</div>
            <div class="deal-box__value ${startup.deal && startup.deal.status !== 'no_deal' ? 'deal-box__value--highlight' : ''}">${dealSummary}</div>
          </div>
        </div>
        <div class="deal-box__footer">
          <span class="tag ${startup.deal ? getDealStatusTagClass(startup.deal.status) : 'tag--danger'}">${startup.deal ? getDealStatusLabel(startup.deal.status) : 'Kein Deal'}</span>
        </div>
      </div>
    </section>

    ${timelineHtml ? `<section class="content-section">
      <h2 class="content-section__title">Was danach geschah</h2>
      ${timelineHtml}
    </section>` : ''}

    ${startup.status_detail ? `<section class="content-section">
      <h2 class="content-section__title">Status heute</h2>
      <div style="padding: 1.5rem; background: var(--color-surface-alt); border-radius: var(--radius-md); border-left: 4px solid var(--color-primary);">
        <p style="font-weight: 600; margin-bottom: 0.5rem;">${getStatusLabel(startup.current_status)}</p>
        <p class="text-sm text-secondary">${escapeHtml(startup.status_detail)}</p>
      </div>
    </section>` : ''}

    <div class="flex" style="gap: 1rem; margin-top: var(--space-2xl); flex-wrap: wrap;">
      <a href="${basePath}pages/startups/${startup.slug}.html" class="btn btn--primary">Zum Startup-Profil \u2192</a>
      <a href="${basePath}pages/was-wurde-aus/" class="btn btn--secondary">Alle Geschichten</a>
    </div>
  </article>`;

  return pageShell({
    title: 'Was wurde aus ' + startup.name + ' nach Die H\u00f6hle der L\u00f6wen?',
    description: 'Was wurde aus ' + startup.name + ' nach Die H\u00f6hle der L\u00f6wen? ' + (startup.status_detail || startup.product || ''),
    activePage: 'seo',
    basePath: basePath,
    body: body
  });
}

// ========== Generate Season Pages ==========

function generateSeasonPage(season) {
  var basePath = '../../';
  var seasonStartups = startups.filter(function(s) { return s.season === season.id; });

  var startupsListHtml = seasonStartups.length > 0
    ? `<div class="grid grid--3">
        ${seasonStartups.map(function(s) {
          return `<article class="card">
            <div class="card__body">
              <div class="card__meta">
                <span class="tag ${getStatusTagClass(s.current_status)}">${getStatusLabel(s.current_status)}</span>
                ${s.episode ? '<span>Episode ' + s.episode + '</span>' : ''}
              </div>
              <h3 class="card__title"><a href="${basePath}pages/startups/${s.slug}.html">${escapeHtml(s.name)}</a></h3>
              <p class="card__description">${escapeHtml(s.product || '')}</p>
              <div class="card__footer">
                <span class="status ${getStatusClass(s.current_status)}">
                  <span class="status__dot"></span>
                  ${getStatusLabel(s.current_status)}
                </span>
                <span class="tag">${s.deal && s.deal.status !== 'no_deal' ? formatCurrency(s.deal.agreed_investment) : 'Kein Deal'}</span>
              </div>
            </div>
          </article>`;
        }).join('\n')}
      </div>`
    : '<p class="text-secondary text-center" style="padding: 3rem 0;">Noch keine Startups f\u00fcr diese Staffel eingetragen.</p>';

  var body = `
  <div class="page-header">
    <div class="container">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <a href="${basePath}pages/seasons/">Staffeln</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Staffel ${season.id}</span>
      </nav>
      <h1 class="page-header__title">Staffel ${season.id} (${season.year})</h1>
      <p class="page-header__description">
        ${season.episodes} Episoden \u00b7 Premiere: ${formatDate(season.premiere)} \u00b7 ${seasonStartups.length} Startups erfasst
      </p>
    </div>
  </div>

  <section class="section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-header__title">Startups in Staffel ${season.id}</h2>
      </div>
      ${startupsListHtml}
    </div>
  </section>`;

  return pageShell({
    title: 'Staffel ' + season.id + ' (' + season.year + ')',
    description: 'Die H\u00f6hle der L\u00f6wen Staffel ' + season.id + ' (' + season.year + '): ' + season.episodes + ' Episoden, ' + seasonStartups.length + ' Startups.',
    activePage: 'seasons',
    basePath: basePath,
    body: body
  });
}

// ========== Generate Investor Pages ==========

function generateInvestorPage(investor) {
  var basePath = '../../';
  var invStartups = startups.filter(function(s) {
    return s.deal && s.deal.investors && s.deal.investors.indexOf(investor.id) !== -1;
  });

  var startupsHtml = invStartups.length > 0
    ? `<div class="grid grid--3">
        ${invStartups.map(function(s) {
          return `<article class="card">
            <div class="card__body">
              <div class="card__meta">
                <span class="tag ${getStatusTagClass(s.current_status)}">${getStatusLabel(s.current_status)}</span>
                <span>Staffel ${s.season}</span>
              </div>
              <h3 class="card__title"><a href="${basePath}pages/startups/${s.slug}.html">${escapeHtml(s.name)}</a></h3>
              <p class="card__description">${escapeHtml(s.product || '')}</p>
              <div class="card__footer">
                <span class="tag">${s.deal ? formatCurrency(s.deal.agreed_investment) : ''}</span>
              </div>
            </div>
          </article>`;
        }).join('\n')}
      </div>`
    : '<p class="text-secondary">Noch keine Startups erfasst.</p>';

  var hasImage = investor.image && fs.existsSync(path.join(__dirname, investor.image));

  var body = `
  <div class="page-header">
    <div class="container">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <a href="${basePath}pages/investors/">Investoren</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>${escapeHtml(investor.name)}</span>
      </nav>
      <div class="flex" style="gap: 1.5rem; align-items: flex-start;">
        <div class="investor-card__avatar" style="width: 96px; height: 96px; font-size: 2rem; flex-shrink: 0;">
          ${hasImage ? '<img src="' + basePath + investor.image + '" alt="' + escapeHtml(investor.name) + '">' : getInvestorInitials(investor.name)}
        </div>
        <div>
          <h1 class="page-header__title">${escapeHtml(investor.name)}</h1>
          <p class="text-secondary" style="margin-top: 0.5rem;">${escapeHtml(investor.company || '')} \u00b7 ${escapeHtml(investor.role || '')}</p>
          <p class="page-header__description" style="margin-top: 0.5rem;">${escapeHtml(investor.bio || '')}</p>
          <div class="flex flex--wrap" style="gap: 0.5rem; margin-top: 1rem;">
            ${(investor.focus_industries || []).map(function(ind) { return '<span class="tag">' + escapeHtml(ind) + '</span>'; }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>

  <section class="section">
    <div class="container">
      <div class="stats" style="margin-bottom: var(--space-2xl);">
        <div class="stat">
          <div class="stat__value">${investor.total_deals || invStartups.length}</div>
          <div class="stat__label">Deals</div>
        </div>
        <div class="stat">
          <div class="stat__value">${(investor.seasons_active || []).length}</div>
          <div class="stat__label">Staffeln</div>
        </div>
        <div class="stat">
          <div class="stat__value">${(investor.focus_industries || []).length}</div>
          <div class="stat__label">Branchen</div>
        </div>
      </div>

      <div class="section-header">
        <h2 class="section-header__title">Portfolio (${invStartups.length} erfasste Startups)</h2>
      </div>
      ${startupsHtml}
    </div>
  </section>`;

  return pageShell({
    title: investor.name,
    description: investor.name + ' bei Die H\u00f6hle der L\u00f6wen: ' + (investor.total_deals || invStartups.length) + ' Deals. ' + (investor.bio || ''),
    activePage: 'investors',
    basePath: basePath,
    body: body
  });
}

// ========== Build All ==========

function build() {
  console.log('\nGenerating startup pages...');
  ensureDir(path.join(PAGES_DIR, 'startups'));
  startups.forEach(function(s) {
    if (!s.slug) s.slug = slugify(s.name);
    var filePath = path.join(PAGES_DIR, 'startups', s.slug + '.html');
    fs.writeFileSync(filePath, generateStartupPage(s));
  });
  console.log(`  \u2713 ${startups.length} startup pages`);

  console.log('Generating SEO pages...');
  ensureDir(path.join(PAGES_DIR, 'was-wurde-aus'));
  startups.forEach(function(s) {
    var filePath = path.join(PAGES_DIR, 'was-wurde-aus', s.slug + '.html');
    fs.writeFileSync(filePath, generateSeoPage(s));
  });
  console.log(`  \u2713 ${startups.length} SEO pages`);

  console.log('Generating season pages...');
  ensureDir(path.join(PAGES_DIR, 'seasons'));
  seasons.forEach(function(season) {
    var filePath = path.join(PAGES_DIR, 'seasons', season.slug + '.html');
    fs.writeFileSync(filePath, generateSeasonPage(season));
  });
  console.log(`  \u2713 ${seasons.length} season pages`);

  console.log('Generating investor pages...');
  ensureDir(path.join(PAGES_DIR, 'investors'));
  investors.forEach(function(inv) {
    var filePath = path.join(PAGES_DIR, 'investors', inv.slug + '.html');
    fs.writeFileSync(filePath, generateInvestorPage(inv));
  });
  console.log(`  \u2713 ${investors.length} investor pages`);

  // Generate updated startups index page with filter options from actual data
  generateStartupsIndex();

  // Generate updated was-wurde-aus index
  generateSeoIndex();

  console.log('\n\u2705 Build complete!');
  console.log(`Total pages: ${startups.length * 2 + seasons.length + investors.length + 2}`);
}

function generateStartupsIndex() {
  var basePath = '../../';
  var allSeasons = [...new Set(startups.map(function(s) { return s.season; }))].sort(function(a, b) { return a - b; });
  var allIndustries = [...new Set(startups.map(function(s) { return s.industry; }).filter(Boolean))].sort();
  var allStatuses = [...new Set(startups.map(function(s) { return s.current_status; }).filter(Boolean))];

  var seasonOptions = allSeasons.map(function(s) { return '<option value="' + s + '">Staffel ' + s + '</option>'; }).join('\n          ');
  var industryOptions = allIndustries.map(function(i) { return '<option value="' + escapeHtml(i) + '">' + escapeHtml(i) + '</option>'; }).join('\n          ');
  var statusOptions = allStatuses.map(function(s) { return '<option value="' + s + '">' + getStatusLabel(s) + '</option>'; }).join('\n          ');

  var body = `
  <div class="page-header">
    <div class="container">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Startups</span>
      </nav>
      <h1 class="page-header__title">Alle Startups</h1>
      <p class="page-header__description">
        Entdecke alle ${startups.length} Startups aus \u201eDie H\u00f6hle der L\u00f6wen\u201c.
      </p>
    </div>
  </div>

  <section class="section">
    <div class="container">
      <div class="filter-bar" id="filterBar">
        <span class="filter-bar__label">Filtern:</span>
        <select class="filter-select" id="filterSeason" aria-label="Staffel filtern">
          <option value="">Alle Staffeln</option>
          ${seasonOptions}
        </select>
        <select class="filter-select" id="filterIndustry" aria-label="Branche filtern">
          <option value="">Alle Branchen</option>
          ${industryOptions}
        </select>
        <select class="filter-select" id="filterStatus" aria-label="Status filtern">
          <option value="">Alle Status</option>
          ${statusOptions}
        </select>
        <button class="filter-btn" id="filterReset">Zur\u00fccksetzen</button>
      </div>
      <p class="text-sm text-secondary" style="margin-bottom: var(--space-lg);" id="resultsCount"></p>
      <div class="grid grid--3" id="startupsGrid"></div>
    </div>
  </section>`;

  var html = pageShell({
    title: 'Alle Startups',
    description: 'Alle ' + startups.length + ' Startups aus Die H\u00f6hle der L\u00f6wen. Filtern nach Staffel, Branche und Status.',
    activePage: 'startups',
    basePath: basePath,
    body: body,
    extraScripts: '<script src="' + basePath + 'js/filter.js"></script>'
  });

  fs.writeFileSync(path.join(PAGES_DIR, 'startups', 'index.html'), html);
  console.log('  \u2713 startups index page');
}

function generateSeoIndex() {
  var basePath = '../../';
  var cardsHtml = startups.map(function(s) {
    return `<a href="${s.slug}.html" class="card">
      <div class="card__body">
        <div class="card__meta">
          <span class="tag ${getStatusTagClass(s.current_status)}">${getStatusLabel(s.current_status)}</span>
          <span>Staffel ${s.season} \u00b7 ${(s.air_date || '').split('-')[0] || ''}</span>
        </div>
        <h3 class="card__title">Was wurde aus ${escapeHtml(s.name)} nach Die H\u00f6hle der L\u00f6wen?</h3>
        <p class="card__description">${escapeHtml(s.product || s.description || '')}</p>
      </div>
    </a>`;
  }).join('\n');

  var body = `
  <div class="page-header">
    <div class="container">
      <nav class="page-header__breadcrumb">
        <a href="${basePath}index.html">Home</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Was wurde aus\u2026?</span>
      </nav>
      <h1 class="page-header__title">Was wurde aus\u2026?</h1>
      <p class="page-header__description">
        Die spannendsten Geschichten aus \u201eDie H\u00f6hle der L\u00f6wen\u201c \u2013 was passierte nach dem Pitch?
      </p>
    </div>
  </div>
  <section class="section">
    <div class="container">
      <div class="grid grid--2">${cardsHtml}</div>
    </div>
  </section>`;

  var html = pageShell({
    title: 'Was wurde aus\u2026?',
    description: 'Was wurde aus den Startups nach Die H\u00f6hle der L\u00f6wen? Alle Geschichten: Erfolge, Pleiten und \u00dcberraschungen.',
    activePage: 'seo',
    basePath: basePath,
    body: body
  });

  fs.writeFileSync(path.join(PAGES_DIR, 'was-wurde-aus', 'index.html'), html);
  console.log('  \u2713 SEO index page');
}

// Run
build();
