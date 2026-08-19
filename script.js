// Fallback API's voor het geval één offline is of geblokkeerd wordt
const API_ENDPOINTS = [
  'https://fortnite-api.com/v2/shop/br',
  'https://fortnite-api.com/v2/shop'
];

let shopData = [];

document.addEventListener('DOMContentLoaded', () => {
  loadShop();
  initFilters();
});

async function loadShop() {
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error-box');
  const container = document.getElementById('shop-container');
  const statusTag = document.getElementById('status-tag');

  loader.classList.remove('hidden');
  errorBox.classList.add('hidden');
  container.innerHTML = '';

  let success = false;

  for (const url of API_ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const json = await res.json();
      if (!json.data) continue;

      shopData = parseFortniteData(json.data);
      renderGrid(shopData);
      
      statusTag.innerText = `Online (${shopData.length} items)`;
      success = true;
      break; 
    } catch (e) {
      console.warn('API URL mislukt:', url, e);
    }
  }

  loader.classList.add('hidden');

  if (!success) {
    errorBox.classList.remove('hidden');
    document.getElementById('error-msg').innerText = 
      'Kan de Fortnite-server niet bereiken. Open je dit via "Live Server" in VS Code? (Rechtstreeks openen van HTML-bestanden blokkeert soms API-aanroepen).';
  }
}

// Zet complexe API datastructuren om naar een simpel, uniform formaat
function parseFortniteData(data) {
  let rawList = [];

  if (Array.isArray(data.entries)) {
    rawList = data.entries;
  } else {
    if (data.featured?.entries) rawList = rawList.concat(data.featured.entries);
    if (data.daily?.entries) rawList = rawList.concat(data.daily.entries);
  }

  return rawList.map(entry => {
    const item = entry.items?.[0] || entry.tracks?.[0] || {};
    
    const name = item.name || entry.bundle?.name || 'Unbekend Item';
    const type = item.type?.value || 'cosmetic';
    const rarity = item.rarity?.value || 'common';
    const price = entry.finalPrice || entry.regularPrice || '?';
    const image = item.images?.icon || item.images?.featured || entry.bundle?.image || 'https://via.placeholder.com/300?text=Geen+Foto';

    return { name, type, rarity: rarity.toLowerCase(), price, image };
  });
}

function renderGrid(items) {
  const container = document.getElementById('shop-container');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Geen items gevonden.</p>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'shop-grid';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card rarity-${item.rarity}`;

    card.innerHTML = `
      <div class="img-box">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
      </div>
      <div class="card-details">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="item-sub">${item.type}</div>
        </div>
        <div class="price-tag">
          <span>🪙</span> ${item.price} V-Bucks
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function initFilters() {
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let activeType = 'all';

  function apply() {
    const query = searchInput.value.toLowerCase();
    const filtered = shopData.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(query);
      const matchType = activeType === 'all' || i.type.toLowerCase().includes(activeType);
      return matchSearch && matchType;
    });
    renderGrid(filtered);
  }

  searchInput.addEventListener('input', apply);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeType = e.target.dataset.type;
      apply();
    });
  });
}
