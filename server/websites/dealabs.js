const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Formatte une URL d'image (optionnel)
 * @param {String} imageUrl - URL d'origine
 * @return {String|null} - URL formatée
 */
function formatImage(imageUrl) {
    return imageUrl ? `https://cdn.example.com/${imageUrl}` : null;
}

/**
 * Analyse le HTML et extrait les informations des deals
 * @param {String} html - Contenu HTML de la page
 * @return {Array<Object>} - Liste des objets deals
 */
const parseDealsFromHTML = html => {
    const $ = cheerio.load(html, { xmlMode: true });

    return $('div.js-threadList article')
        .map((i, article) => {
            const dealUrl = $(article)
                .find('a[data-t="threadLink"]')
                .attr('href');

            const vueData = $(article)
                .find('div.js-vue2')
                .attr('data-vue2');

            const parsedData = JSON.parse(vueData);
            const deal = parsedData.props.thread;

            const originalPrice = deal.nextBestPrice;
            const currentPrice = deal.price;
            const discountPercentage = originalPrice
                ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
                : 0;

            return {
                id: deal.threadId,
                title: deal.title,
                link: dealUrl,
                price: currentPrice,
                retail: originalPrice,
                discount: discountPercentage,
                temperature: deal.temperature,
                comments: deal.commentCount,
                published: deal.publishedAt,
                photo: deal.mainImage || null // ou formatImage(deal.mainImage) si tu veux appliquer un formatage
            };
        })
        .get(); // Transforme en tableau JS
};

/**
 * Récupère les deals depuis une page web
 * @param {String} url - URL de la page à scraper
 * @return {Promise<Array<Object>|null>} - Liste des deals ou null en cas d'erreur
 */
module.exports.scrape = async url => {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Erreur lors du fetch : ${response.status}`);
            return null;
        }

        const htmlContent = await response.text();
        return parseDealsFromHTML(htmlContent);

    } catch (error) {
        console.error('Erreur lors du scraping :', error);
        return null;
    }
};
