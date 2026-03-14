#!/usr/bin/env node
/**
 * Scrapes dhdl.info for all seasons/episodes and generates startups.json
 * Fetches season pages -> episode pages -> parses startup data from tables.
 */
const fs = require('fs');
const path = require('path');

const TOTAL_SEASONS = 19;
const DELAY_MS = 800;

const INVESTOR_MAP = {
  'judith williams': 'judith-williams', 'frank thelen': 'frank-thelen',
  'carsten maschmeyer': 'carsten-maschmeyer', 'dagmar wöhrl': 'dagmar-woehrl',
  'ralf dümmel': 'ralf-duemmel', 'georg kofler': 'georg-kofler',
  'nico rosberg': 'nico-rosberg', 'nils glagau': 'nils-glagau',
  'janna ensthaler': 'janna-ensthaler', 'tillman schulz': 'tillman-schulz',
  'tijen onaran': 'tijen-onaran', 'vural öger': 'vural-oeger',
  'jochen schweizer': 'jochen-schweizer', 'lencke steiner': 'lencke-steiner',
  'lencke wischhusen': 'lencke-steiner',
};

function slugify(t) {
  return t.toLowerCase()
    .replace(/[äÄ]/g,'ae').replace(/[öÖ]/g,'oe').replace(/[üÜ]/g,'ue').replace(/ß/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'DHDL-DB/1.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

function parseNum(s) {
  if (!s || s === '--') return null;
  return parseInt(s.replace(/\./g, '').replace(/[^\d]/g, '')) || null;
}

function parsePct(s) {
  if (!s || s === '--') return null;
  const m = s.match(/([\d,]+)/);
  return m ? parseFloat(m[1].replace(',','.')) : null;
}

function getEpisodeLinks(html, seasonNum) {
  const links = [];
  const re = /href="(https?:\/\/www\.dhdl\.info\/staffel-\d+\/folge[^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!links.includes(m[1])) links.push(m[1]);
  }
  // Sort by episode number
  links.sort((a, b) => {
    const na = parseInt((a.match(/folge-\d+-(\d+)/) || [])[1] || '0');
    const nb = parseInt((b.match(/folge-\d+-(\d+)/) || [])[1] || '0');
    return na - nb;
  });
  return links;
}

function parseEpisodePage(html, seasonNum, episodeNum, airDate) {
  const startups = [];

  // Split by <h2> to get startup blocks
  const parts = html.split(/<h2[^>]*>/i);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];

    // Get startup name (text before closing </h2> or first tag)
    const nameMatch = block.match(/^([\s\S]*?)<\/h2>/i);
    if (!nameMatch) continue;
    let name = nameMatch[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
    if (!name || name.length > 80 || name.length < 2) continue;
    // Skip non-startup headings
    if (name.match(/^(TV-Quote|Produkte|Weitere|Sendetermin|Kommentar|Share|Teile|Amazon|Anzeige)/i)) continue;
    if (name.match(/^(Staffel|Die Höhle|DHDL)/i)) continue;

    // Get the text after the heading until next h2
    const text = block.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

    // Parse deal table: look for "Gesuch" row and "Deal"/"Kein Deal" row
    let reqInv = null, reqEq = null, reqVal = null;
    let agrInv = null, agrEq = null;
    let dealStatus = 'unknown';

    // Extract all td values
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds = [];
    let tdm;
    while ((tdm = tdRegex.exec(block)) !== null) {
      tds.push(tdm[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€').trim());
    }

    // Look for the pattern: Gesuch | amount | pct | valuation
    for (let j = 0; j < tds.length; j++) {
      if (tds[j] === 'Gesuch' && j + 3 < tds.length) {
        reqInv = parseNum(tds[j+1]);
        reqEq = parsePct(tds[j+2]);
        reqVal = parseNum(tds[j+3]);
      }
    }

    // Check for deal/kein deal
    if (block.includes('tabelle-kein-deal') || block.includes('kein-deal-label')) {
      dealStatus = 'no_deal';
    } else if (block.includes('tabelle-deal') || block.includes('deal-label')) {
      dealStatus = 'completed';
      // Find the Deal row values (right after "Kein Deal" or "Deal" label)
      for (let j = 0; j < tds.length; j++) {
        if ((tds[j] === 'Deal' || tds[j].includes('Deal')) && tds[j] !== 'Kein Deal' && j + 3 < tds.length) {
          if (tds[j] !== 'Gesuch' && tds[j] !== 'Bewertung') {
            agrInv = parseNum(tds[j+1]);
            agrEq = parsePct(tds[j+2]);
          }
        }
      }
    }

    // Try to find investor names from the block text
    const investorIds = [];
    const lowerText = text.toLowerCase();
    for (const [invName, invId] of Object.entries(INVESTOR_MAP)) {
      if (lowerText.includes(invName)) {
        if (!investorIds.includes(invId)) investorIds.push(invId);
      }
    }

    // Also check the HTML for investor links
    const invLinkRegex = /href="[^"]*loewen\/([^"/]+)/gi;
    let ilm;
    while ((ilm = invLinkRegex.exec(block)) !== null) {
      const slug = ilm[1].replace(/\//g, '');
      // Map common investor slugs
      const slugMap = {
        'judith-williams': 'judith-williams', 'frank-thelen': 'frank-thelen',
        'carsten-maschmeyer': 'carsten-maschmeyer', 'dagmar-woehrl': 'dagmar-woehrl',
        'ralf-duemmel': 'ralf-duemmel', 'georg-kofler': 'georg-kofler',
        'nico-rosberg': 'nico-rosberg', 'nils-glagau': 'nils-glagau',
        'janna-ensthaler': 'janna-ensthaler', 'tillman-schulz': 'tillman-schulz',
        'tijen-onaran': 'tijen-onaran', 'vural-oeger': 'vural-oeger',
        'jochen-schweizer': 'jochen-schweizer', 'lencke-steiner': 'lencke-steiner',
      };
      const id = slugMap[slug] || slug;
      if (!investorIds.includes(id)) investorIds.push(id);
    }

    // Try to find link to startup detail page for more info
    const detailLink = block.match(/href="(https?:\/\/www\.dhdl\.info\/gruender\/[^"]+)"/i);

    // Extract product description if available
    let product = '';
    const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (descMatch) {
      product = descMatch[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
      if (product.length > 200) product = product.substring(0, 197) + '...';
      // Skip if it's just navigation text
      if (product.match(/^(Am\s|Die\s+\w+\s+Folge|In der|Auch|Weitere|mehr zu)/)) product = '';
    }

    startups.push({
      id: slugify(name),
      name: name,
      slug: slugify(name),
      product: product,
      description: '',
      founders: [],
      season: seasonNum,
      episode: episodeNum,
      air_date: airDate || null,
      industry: 'Sonstige',
      country: 'Deutschland',
      city: null,
      website: null,
      deal: {
        requested_investment: reqInv,
        requested_equity: reqEq,
        agreed_investment: dealStatus === 'completed' ? (agrInv || reqInv) : null,
        agreed_equity: dealStatus === 'completed' ? (agrEq || reqEq) : null,
        investors: investorIds,
        status: dealStatus
      },
      current_status: 'unknown',
      status_detail: null,
      timeline: [],
      image: null,
      tags: []
    });
  }

  return startups;
}

async function main() {
  console.log('DHDL Scraper - fetching all seasons and episodes\n');
  const allStartups = [];
  let totalEpisodes = 0;

  for (let s = 1; s <= TOTAL_SEASONS; s++) {
    console.log('\n=== Staffel ' + s + ' ===');
    try {
      const seasonHtml = await fetchPage('https://www.dhdl.info/staffel-' + s + '/');
      const episodeLinks = getEpisodeLinks(seasonHtml, s);
      console.log('  Found ' + episodeLinks.length + ' episode links');

      for (let e = 0; e < episodeLinks.length; e++) {
        const epUrl = episodeLinks[e];
        const epNum = e + 1;

        // Extract air date from link title if present
        const dateMatch = seasonHtml.match(new RegExp('href="' + epUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*title="[^"]*?(\\d{2}\\.\\d{2}\\.\\d{4})'));
        let airDate = null;
        if (dateMatch) {
          const parts = dateMatch[1].split('.');
          airDate = parts[2] + '-' + parts[1] + '-' + parts[0];
        }

        try {
          await sleep(DELAY_MS);
          const epHtml = await fetchPage(epUrl);
          const startups = parseEpisodePage(epHtml, s, epNum, airDate);
          console.log('  Ep ' + epNum + ': ' + startups.length + ' startups');
          allStartups.push(...startups);
          totalEpisodes++;
        } catch (err) {
          console.error('  Ep ' + epNum + ' error: ' + err.message);
        }
      }
    } catch (err) {
      console.error('  Error: ' + err.message);
    }
  }

  // Deduplicate by slug
  const seen = new Set();
  const unique = allStartups.filter(s => {
    if (seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });

  console.log('\n=== SUMMARY ===');
  console.log('Episodes fetched: ' + totalEpisodes);
  console.log('Total startups: ' + allStartups.length);
  console.log('Unique startups: ' + unique.length);

  // Per season count
  for (let s = 1; s <= TOTAL_SEASONS; s++) {
    const count = unique.filter(x => x.season === s).length;
    if (count > 0) console.log('  Staffel ' + s + ': ' + count);
  }

  const outPath = path.join(__dirname, 'data/startups.json');
  fs.writeFileSync(outPath, JSON.stringify(unique, null, 2));
  console.log('\nWritten to ' + outPath);
}

main().catch(console.error);
