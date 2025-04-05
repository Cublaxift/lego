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
const buttonFilterDiscount = document.querySelector('#filter-discount');
const buttonFilterCommented = document.querySelector('#filter-commented');
const buttonFilterHotDeals = document.querySelector('#filter-hot-deals');
const selectSort = document.querySelector('#sort-select');

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
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
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
 * Filter deals by best discount (> 50%)
 */
const filterByBestDiscount = (deals) => {
  return deals.filter(deal => deal.discount && deal.discount > 50);
};

/**
 * Filter deals by most commented (> 15 comments)
 */
const filterByMostCommented = (deals) => {
  return deals.filter(deal => deal.comments && deal.comments > 15);
};

/**
 * Filter deals by hot deals (temperature > 100)
 */
const filterByHotDeals = (deals) => {
  return deals.filter(deal => deal.temperature && deal.temperature > 100);
};


/**
 * Sort deals by price (ascending or descending)
 */
const sortByPrice = (deals, order) => {
  return deals.sort((a, b) => {
    if (order === 'price-asc') {
      return a.price - b.price;
    } else if (order === 'price-desc') {
      return b.price - a.price;
    }
    return 0; 
  });
};

/**
 * Sort deals by date (ascending or descending)
 */
const sortByDate = (deals, order) => {
  return deals.sort((a, b) => {
    const dateA = new Date(a.published);
    const dateB = new Date(b.published);
    
    if (order === 'date-asc') {
      return dateB - dateA;
    } else if (order === 'date-desc') {
      return dateA - dateB;
    }
    return 0;
  });
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

selectPage.addEventListener('change', async (event) => {
  const selectedPage = parseInt(event.target.value); 
  const deals = await fetchDeals(selectedPage, parseInt(selectShow.value) || 6);

  setCurrentDeals(deals); 
  render(currentDeals, currentPagination); 
});

buttonFilterDiscount.addEventListener('click', async () => {
  const deals = currentDeals.length > 0 ? currentDeals : (await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value) || 6)).result;

  const filteredDeals = filterByBestDiscount(deals);
  render(filteredDeals, currentPagination);
});

buttonFilterCommented.addEventListener('click', async () => {
  const deals = currentDeals.length > 0 ? currentDeals : (await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value) || 6)).result;

  const filteredDeals = filterByMostCommented(deals);
  render(filteredDeals, currentPagination);
});

buttonFilterHotDeals.addEventListener('click', async () => {
  const deals = currentDeals.length > 0 ? currentDeals : (await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value) || 6)).result;

  const filteredDeals = filterByHotDeals(deals);
  render(filteredDeals, currentPagination);
});

selectSort.addEventListener('change', async (event) => {
  const order = event.target.value;
  let deals = currentDeals.length > 0 ? currentDeals : (await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value) || 6)).result;

  if (order.includes('price')) {
    deals = sortByPrice(deals, order);
  } else if (order.includes('date')) {
    deals = sortByDate(deals, order);
  }

  render(deals, currentPagination);
});



document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});