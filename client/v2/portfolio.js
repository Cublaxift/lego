// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const filterDiscount = document.querySelector('#discount-filter');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @param  {Number}  [discount=0] - minimum discount percentage to filter deals
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param {Array} deals
 */
const renderDeals = deals => {
  const dealsToRender = showOnlyFavorites ? favoriteDeals : deals;

  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = dealsToRender
    .map(deal => {
      const isFavorite = favoriteDeals.some(fav => fav.uuid === deal.uuid);
      return `
      <div class="deal" id=${deal.uuid}>
        <button class="favorite-btn" data-id="${deal.uuid}">${isFavorite ? '✖️' : '⭐'}</button>
        <span>${deal.id}</span>
        <a href="${deal.link}" target="_blank">${deal.title}</a>
        <span>${deal.price}€,</span>
        <span>${deal.discount}% discount</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);

  document.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', handleFavoriteClick);
  });
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Select the number of the page to display
 */
selectPage.addEventListener('change', async (event) => {
  const deals = await fetchDeals(parseInt(event.target.value), selectShow.value);

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Initialize application on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

const filterDiscountButton = document.querySelector('#filters button:first-of-type');
filterDiscountButton.addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, selectShow.value);
  const filteredDeals = deals.result.filter(deal => deal.discount > 50);
  const filteredPagination = {
    ...currentPagination,
    count: filteredDeals.length,
    pageCount: Math.ceil(filteredDeals.length / selectShow.value),
  };

  setCurrentDeals({ result: filteredDeals, meta: filteredPagination });
  render(currentDeals, filteredPagination);
});

const sortSelect = document.querySelector('#sort-select');

sortSelect.addEventListener('change', async (event) => {
  const sortOption = event.target.value;
  if (sortOption === 'discount-asc') {
    const sortedDeals = sortDealsByDiscount([...currentDeals], 'desc');
    render(sortedDeals, currentPagination);
  }
});

/**
 * Sort deals by discount
 * @param {Array} deals - List of deals
 * @param {String} order - Order of sorting ('desc' for best discount first)
 * @return {Array}
 */
const sortDealsByDiscount = (deals, order = 'desc') => {
  return deals.sort((a, b) => {
    if (order === 'desc') {
      return b.discount - a.discount;
    }
    return a.discount - b.discount;
  });
};

const filterCommentsButton = document.querySelector('#filters button:nth-of-type(2)');
filterCommentsButton.addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, selectShow.value);
  const filteredDeals = deals.result.filter(deal => deal.comments > 15);
  const filteredPagination = {
    ...currentPagination,
    count: filteredDeals.length,
    pageCount: Math.ceil(filteredDeals.length / selectShow.value),
  };

  setCurrentDeals({ result: filteredDeals, meta: filteredPagination });
  render(currentDeals, filteredPagination);
});

const sortDealsByComments = (deals, order = 'desc') => {
  return deals.sort((a, b) => {
    if (order === 'desc') {
      return b.comments - a.comments;
    }
    return a.comments - b.comments; 
  });
};

const sortSelect2 = document.querySelector('#sort-select');
sortSelect2.addEventListener('change', async (event) => {
  const sortOption = event.target.value;
  if (sortOption === 'comments-desc') {
    const sortedDeals = sortDealsByComments([...currentDeals], 'desc');
    render(sortedDeals, currentPagination);
  }
});


const filterHotDealsButton = document.querySelector('#filters button:nth-of-type(3)');
filterHotDealsButton.addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, selectShow.value);
  const filteredDeals = deals.result.filter(deal => deal.temperature > 100);
  const filteredPagination = {
    ...currentPagination,
    count: filteredDeals.length,
    pageCount: Math.ceil(filteredDeals.length / selectShow.value),
  };

  setCurrentDeals({ result: filteredDeals, meta: filteredPagination });
  render(currentDeals, filteredPagination);
});

const sortSelect3 = document.querySelector('#sort-select');
sortSelect3.addEventListener('change', async (event) => {
  const sortOption = event.target.value;
  if (sortOption === 'temperature-desc') {
    const sortedDeals = sortDealsByTemperature([...currentDeals], 'desc');
    render(sortedDeals, currentPagination);
  }
});

/**
 * Sort deals by temperature
 * @param {Array} deals
 * @param {String} order
 * @return {Array}
 */
const sortDealsByTemperature = (deals, order = 'desc') => {
  return deals.sort((a, b) => {
    if (order === 'desc') {
      return b.temperature - a.temperature;
    }
    return a.temperature - b.temperature;
  });
};

sortSelect.addEventListener('change', async (event) => {
  const sortOption = event.target.value;

  if (sortOption === 'price-asc') {
    const sortedDeals = sortDealsByPrice([...currentDeals], 'asc');
    render(sortedDeals, currentPagination);
  } else if (sortOption === 'price-desc') {
    const sortedDeals = sortDealsByPrice([...currentDeals], 'desc');
    render(sortedDeals, currentPagination);
  }
});

/**
 * Sort deals by price
 * @param {Array} deals
 * @param {String} order
 * @return {Array}
 */
const sortDealsByPrice = (deals, order = 'asc') => {
  return deals.sort((a, b) => {
    if (order === 'asc') {
      return a.price - b.price;
    }
    return b.price - a.price;
  });
};

sortSelect.addEventListener('change', async (event) => {
  const sortOption = event.target.value;
  if (sortOption === 'date-asc') {
    const sortedDeals = sortDealsByDate([...currentDeals], 'asc');
    render(sortedDeals, currentPagination);
  } else if (sortOption === 'date-desc') {
    const sortedDeals = sortDealsByDate([...currentDeals], 'desc');
    render(sortedDeals, currentPagination);
  }
});

/**
 * Sort deals by price
 * @param {Array} deals
 * @param {String} order
 * @return {Array}
 */
const sortDealsByDate = (deals, order = 'asc') => {
  return deals.sort((a, b) => {
    if (order === 'asc') {
      return a.price - b.price;
    }
    return b.price - a.price;
  });
};

let currentSales = [];

const sectionSales= document.querySelector('#sales');

/**
 * Set global value
 * @param {Array} result - sales to display
 */
const setCurrentSales = ({result}) => {
  currentSales = result;
};

/**
 * Fetch sales from api
 * @param  {Number}  [id=42182] - id to fetch
 * @return {Object}
 */
const fetchSales = async (id = 42182) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/sales?id=${id}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentSales, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentSales, currentPagination};
  }
};

/**
 * Render list of sales
 * @param  {Array} sales
 */
const renderSales = sales => {
  if (!sectionSales) {
    console.error("Section 'Sales' not found in the DOM.");
    return;
  }

  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = sales
    .map(sale => {
      return `
      <div class="sale" id=${sale.uuid},>
        <a href="${sale.link}" target="_blank">${sale.title}</a>
        <span>${sale.price}€,</span>
        <span>${sale.published}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionSales.innerHTML = '<h2>Sales</h2>';
  sectionSales.appendChild(fragment);
};

const renderS = (sales) => {
  renderSales(sales);
  renderIndicatorsSales(sales);
};

selectLegoSetIds.addEventListener('change', async (event) => {
  const sales = await fetchSales(parseInt(event.target.value));

  setCurrentSales(sales);
  renderS(currentSales);
});

const spanNbSales = document.querySelector('#nbSales');
const renderIndicatorsSales = (sales) => {
  spanNbSales.innerHTML = sales.length;
  spanP5Value.innerHTML = calculatePercentile(sales, 5);
  spanP25Value.innerHTML = calculatePercentile(sales, 25);
  spanP50Value.innerHTML = calculatePercentile(sales, 50);
  spanLifetimeValue.innerHTML = calculateLifetimeValue(sales);
};

const spanP5Value = document.querySelector('#p5_value');
const spanP25Value = document.querySelector('#p25_value');
const spanP50Value = document.querySelector('#p50_value');

function calculatePercentile(sales, percentile) {
  if (sales.length === 0) {
    return 0;
  }
  const prices = sales.map(sale => sale.price);
  prices.sort((a, b) => a - b);
  const index = (percentile / 100) * (prices.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return prices[index];
  }
  const lowerValue = prices[lower];
  const upperValue = prices[upper];

  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

const spanLifetimeValue = document.querySelector('#LifeTimeValue');

function calculateLifetimeValue(sales) {
  if (sales.length === 0) {
    return 0;
  }

  const now = new Date();
  let totalDays = 0;

  sales.forEach(sale => {
    const publishedDate = new Date(sale.published);
    const differenceInTime = now - publishedDate;
    const differenceInDays = differenceInTime / (1000 * 3600 * 24); // Convert milliseconds to days
    totalDays += differenceInDays;
  });

  return totalDays / sales.length;
}

let favoriteDeals = [];

/**
 * Handle favorite button click
 * @param {Event} event
 */
const handleFavoriteClick = event => {
  const dealId = event.target.getAttribute('data-id');
  const deal = currentDeals.find(d => d.uuid === dealId);

  if (deal) {
    const isFavorite = favoriteDeals.some(fav => fav.uuid === dealId);
    if (isFavorite) {
      favoriteDeals = favoriteDeals.filter(fav => fav.uuid !== dealId);
    } else {
      favoriteDeals.push(deal);
    }
    renderFavorites();
    renderDeals(currentDeals);
  }
};

const renderFavorites = () => {
  const favoriteSection = document.querySelector('#favorites');
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = favoriteDeals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}" target="_blank">${deal.title}</a>
        <span>${deal.price}€,</span>
        <span>${deal.discount}% off,</span>
        <span>${deal.comments} comments,</span>
        <span>${deal.temperature}°,</span>
        <span>${deal.published}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  favoriteSection.innerHTML = '<h2>Favorite Deals</h2>';
  favoriteSection.appendChild(fragment);
};

let showOnlyFavorites = false;

document.querySelector('#filter-favorites-btn').addEventListener('click', () => {
  showOnlyFavorites = !showOnlyFavorites;
  renderDeals(currentDeals);
});