const API_URL = 'https://fortnite-api.com/v2/shop';
let shopData = [];

// Lokale SVG als veilige afbeelding-fallback
const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%2318202d"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%237a8b9e" font-family="sans-serif" font-size="16">Geen Afbeelding</text></svg>';

document.addEventListener('DOMContentLoaded', () => {
  loadShop();
  initControls();
});

async function loadShop() {
  const loader = document.getElementById('loader');
  const errorBox = document.getElementById('error-box');
  const statusTag = document.getElementById('status-tag');

  loader.classList.remove('hidden');
  errorBox.classList.add('hidden');

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP Fout status: ${res.status}`);

    const json = await res.json();
    if (!json.data || !json.data.entries) throw new Error('Ongeldige respons ontvangen.');

    shopData = parseShopEntries(json.data.entries);
    renderGrid(shopData);

    if (statusTag) {
      statusTag.innerText = `Online (${shopData.length} items geladen)`;
    }
  } catch (e) {
    console.error('DFNS Error:', e);
    errorBox.classList.remove('hidden');
    document.getElementById('error-msg').innerText = e.message;
  } finally {
    loader.classList.add('hidden');
  }
}

function parseShopEntries(entries) {
  const parsed = [];

  entries.forEach(entry => {
    // Haal het hoofd-item of de bundel op
    const primaryItem = entry.items?.[0] || entry.tracks?.[0] || {};
    
    // Naam bepalen
    const name = primaryItem.name || entry.bundle?.name || entry.devName || 'Fortnite Item';
    
    // Type en Rarity bepalen
    const rawType = primaryItem.type?.value || primaryItem.type?.displayValue || 'cosmetic';
    const rarity = primaryItem.rarity?.value || 'common';
    
    // V-Bucks prijs
    const price = entry.finalPrice ?? entry.regularPrice ?? 0;

    // Afbeelding zoeken uit diverse mogelijke API velden
    let image = primaryItem.images?.icon || 
                primaryItem.images?.featured || 
                entry.bundle?.image || 
                entry.newDisplayAsset?.renderImages?.[0]?.image || 
                entry.newDisplayAsset?.materialInstances?.[0]?.images?.Background ||
                FALLBACK_IMAGE;

    parsed.push({
      id: entry.offerId || Math.random(),
      name: name,
      type: rawType.toLowerCase(),
      displayType: rawType,
      rarity: rarity.toLowerCase(),
      price: price,
      image: image
    });
  });

  return parsed;
}

function renderGrid(items) {
  const container = document.getElementById('shop-container');
  container.innerHTML = '';

  if (!items || items.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-sub);">Geen items gevonden voor deze zoekopdracht.</p>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card rarity-${item.rarity}`;

    card.innerHTML = `
      <div class="img-container">
        <img src="${item.image}" alt="${item.name}" loading="lazy" onerror="this.src='${FALLBACK_IMAGE}'">
      </div>
      <div class="card-info">
        <div>
          <div class="item-title">${item.name}</div>
          <div class="item-category">${item.displayType}</div>
        </div>
        <div class="price-box">
          <span>🪙</span> ${item.price} V-Bucks
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function initControls() {
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');
  let activeFilter = 'all';

  function filterAndRender() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = shopData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(query);
      
      let matchesFilter = false;
      if (activeFilter === 'all') {
        matchesFilter = true;
      } else {
        matchesFilter = item.type.includes(activeFilter);
      }

      return matchesSearch && matchesFilter;
    });

    renderGrid(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterAndRender);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeFilter = e.target.dataset.type;
      filterAndRender();
    });
  });
}
