// vinted.js
import { v5 as uuidv5 } from 'uuid';

const parse = data => {
  try {
    const { items } = data;

    return items.map(item => {
      const link = item.url;
      const price = item.total_item_price?.amount || null;
      const published = item.photo?.high_resolution?.timestamp;

      return {
        link,
        price,
        title: item.title,
        published: published ? new Date(published * 1000).toUTCString() : null,
        uuid: uuidv5(link, uuidv5.URL)
      };
    });
  } catch (error) {
    console.error('Error parsing data:', error);
    return [];
  }
};

export const scrape = async searchText => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const url = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&time=${now}&search_text=${searchText}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    const json = await response.json();
    return parse(json);
  } catch (error) {
    console.error('Error scraping Vinted:', error);
    return [];
  }
};
