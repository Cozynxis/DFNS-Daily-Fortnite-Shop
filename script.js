// Actieve endpoint voor de huidige Fortnite API
const API_URL = 'https://fortnite-api.com/v2/shop';

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

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`Server reageerde met status ${res.status}`);

    const json = await res.json();
    if (!json.data || !json.data.entries) {
      throw new Error('Geen geldige shopdata ontvangen.');
    }

    shopData = parseFortniteData(json.data.entries);
    renderGrid(shopData);
    
    if (statusTag) {
      statusTag.innerText = `Online (${shopData.length} items)`;
    }
  } catch (e) {
    console.error('API Fout:', e);
    errorBox.classList.remove('hidden');
    document.getElementById('error-msg').innerText = `Fout bij ophalen: ${e.message}`;
  } finally {
    loader.classList.add('hidden');
  }
}

// Verwerkt de nieuwe v2/shop datastructuur veilig
function parseFortniteData(entries) {
  return entries.map(entry => {
    // Pak het eerste item uit de entry of bundel
    const item = entry.items?.[0] || entry.tracks?.[0] || {};
    
    const name = item.name || entry.bundle?.name || entry.devName || 'Onbekend Item';
    const type = item.type?.value || item.type?.displayValue || 'Cosmetic';
    const rarity = item.rarity?.value || 'common';
    const price = entry.finalPrice ?? entry.regularPrice ?? '?';
    
    // Zoek de best beschikbare afbeelding
    const image = item.images?.icon || 
                  item.images?.featured || 
                  entry.bundle?.image || 
                  entry.newDisplayAsset?.renderImages?.[0]?.image ||
                  'https://via.placeholder.com/300?text=Geen+Afbeelding';

    return { 
      name, 
      type: type.toLowerCase(), 
      rarity: rarity.toLowerCase(), 
      price, 
      image 
    };
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
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const filtered = shopData.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(query);
      const matchType = activeType === 'all' || i.type.includes(activeType);
      return matchSearch && matchType;
    });
    renderGrid(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', apply);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeType = e.target.dataset.type;
      apply();
    });
  });
}
