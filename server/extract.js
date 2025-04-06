import * as fs from 'fs';
import Queue from 'p-queue';
import delay from 'delay';
import * as vinted from './websites/vinted.js';
import * as dealabs from './websites/dealabs.js';

// 🔍 Fonction pour extraire un ID LEGO (5 chiffres) depuis un titre
function extractLegoIdFromTitle(title) {
  const match = title.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

// 🕒 Formatage de date pour Vinted (YYYY-MM-DD)
function convertDateFormat(dateStr) {
  const date = new Date(dateStr);
  return isNaN(date) ? dateStr : date.toISOString().split('T')[0];
}

// 📦 Liste des sets LEGO à suivre
const LEGO_SET_IDS = [...new Set([
  '42182', '60363', '43231', '75403',
  '75404', '21034', '42635',
  '75405', '76266', '42176',
  '71460', '42202', '40524',
  '75402', '76262', '77051', '71387',
  '76303', '21333', '43224', '10363',
  '60373', '72032', '75332', '76959',
  '76969', '40460'
])];

// 🔁 Scraper Vinted
async function scrapeVinted() {
  const queue = new Queue({ concurrency: 1 });
  const SALES = {};

  console.log(`🧱 Scraping Vinted for ${LEGO_SET_IDS.length} LEGO sets...`);

  for (const id of LEGO_SET_IDS) {
    queue.add(async () => {
      try {
        const results = await vinted.scrape(id);
        if (results && results.length) {
          const cleaned = results
            .map(item => {
              const legoId = extractLegoIdFromTitle(item.title);
              if (!legoId) return null;
              item.id = legoId;
              item.published = convertDateFormat(item.published);
              return item;
            })
            .filter(Boolean);

          if (cleaned.length) {
            SALES[id] = cleaned;
            console.log(`✅ ${cleaned.length} results for set ${id}`);
          }
        } else {
          console.warn(`⚠️ No results for set ${id}`);
        }
      } catch (err) {
        console.error(`❌ Error scraping set ${id}:`, err.message);
      }

      await delay(5000);
    });
  }

  await queue.onIdle();
  fs.writeFileSync('./server/vintedSales_updated.json', JSON.stringify(SALES, null, 2));
  console.log('📝 vintedSales_updated.json saved!');
}

// 🔁 Scraper Dealabs
async function scrapeDealabs(baseUrl = 'https://www.dealabs.com/search?q=lego') {
  const allDeals = [];
  const maxPages = 100;

  console.log(`🔎 Scraping Dealabs from ${baseUrl}...`);

  for (let page = 1; page <= maxPages; page++) {
    const url = `${baseUrl}&page=${page}`;
    try {
      const deals = await dealabs.scrape(url);
      if (!deals.length) break;
      allDeals.push(...deals);
    } catch (err) {
      console.error(`❌ Failed to scrape page ${page}:`, err.message);
      break;
    }
  }

  const cleanedDeals = allDeals
    .map(deal => {
      const legoId = extractLegoIdFromTitle(deal.title);
      if (!legoId) return null;
      deal._id = deal.id;
      deal.id = legoId;
      return deal;
    })
    .filter(Boolean);

  fs.writeFileSync('./server/dealabsDeals_updated.json', JSON.stringify(cleanedDeals, null, 2));
  console.log(`📝 dealabsDeals_updated.json saved with ${cleanedDeals.length} deals!`);
}

// 🚀 CLI Controller
async function main() {
  const [, , target] = process.argv;

  if (target === 'vinted') {
    await scrapeVinted();
  } else if (target === 'dealabs') {
    await scrapeDealabs();
  } else {
    console.log(`❓ Usage:
    node script.js vinted     → scrape Vinted
    node script.js dealabs    → scrape Dealabs`);
  }
}

main();
