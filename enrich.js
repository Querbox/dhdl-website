#!/usr/bin/env node
/**
 * Enriches startups.json with product descriptions, founders, industry from research data.
 * Usage: node enrich.js
 * Reads: data/startups.json, data/enrichment.json
 * Writes: data/startups.json
 */
const fs = require('fs');

const startups = JSON.parse(fs.readFileSync('data/startups.json', 'utf8'));
const enrichment = JSON.parse(fs.readFileSync('data/enrichment.json', 'utf8'));

// Build lookup by normalized name + season
function normalize(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9äöüß]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

const enrichMap = new Map();
for (const e of enrichment) {
  const key = normalize(e.name) + '_' + e.season;
  enrichMap.set(key, e);
  // Also store without season for fuzzy matching
  if (!enrichMap.has(normalize(e.name))) {
    enrichMap.set(normalize(e.name), e);
  }
}

let matched = 0, unmatched = 0;
for (const s of startups) {
  const key = normalize(s.name) + '_' + s.season;
  const e = enrichMap.get(key) || enrichMap.get(normalize(s.name));

  if (e) {
    matched++;
    if (e.product && !s.product) s.product = e.product;
    if (e.founders && e.founders.length > 0 && s.founders.length === 0) {
      // founders are stored as slug IDs in the scraper format
      s.founders = e.founders.map(f => f.toLowerCase().replace(/[^a-zäöüß0-9 -]/g, '').replace(/\s+/g, '-'));
    }
    if (e.industry && s.industry === 'Sonstige') s.industry = e.industry;
    if (e.city && !s.city) s.city = e.city;
    if (e.website && !s.website) s.website = e.website;
    if (e.current_status && e.current_status !== 'unknown' && s.current_status === 'unknown') {
      s.current_status = e.current_status;
    }
    // Enrich investors
    if (e.deal && e.deal.investors && e.deal.investors.length > 0 && s.deal.investors.length === 0) {
      s.deal.investors = e.deal.investors;
    }
  } else {
    unmatched++;
  }
}

fs.writeFileSync('data/startups.json', JSON.stringify(startups, null, 2));
console.log(`Enriched: ${matched} matched, ${unmatched} unmatched out of ${startups.length}`);
