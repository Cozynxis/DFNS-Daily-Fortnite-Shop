const API_URL = 'https://fortnite-api.com/v2/shop/br';
let rawShopData = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchShopData();
  setupSearchAndFilters();
});

async function fetchShopData() {
  const loader = document.getElementById('loader');
  const errorMessage = document.getElementById('error-message');
  const shopSections = document.getElementById('shop-sections');
  const statusText = document.getElementById('last-updated');

  // UI Reset
  loader.classList.remove('hidden');
  errorMessage.classList.add('hidden');
  shopSections.innerHTML = '';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP Fout: ${response.status}`);
    
    const result = await response.json();
    
    if (!result.data || !result.data.featured && !result.data.daily && !result.data.entries) {
      throw new Error('Onverwachte datastructuur ontvangen.');
    }

    // Verkrijg alle items (werkt voor zowel oude als nieuwe API structuren)
    rawShopData = extractItems(result.data);

    statusText.innerText = `Bijgewerkt: ${new Date().toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'})}`;
    loader.classList.add('hidden');
    
    renderShop(rawShopData);

  } catch (error) {
    console.error('API Error:', error);
    loader.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    document.getElementById('error-details').innerText = error.message;
  }
}

// Helper om items uit verschillende API structuren te halen
function extractItems(data) {
  let entries = [];
  
  if (data.entries) {
    entries = data.entries;
  } else {
    if (data.featured?.entries) entries = entries.concat(data.featured.entries);
    if (data.daily?.entries) entries = entries.concat(data.daily.entries);
  }

  return entries.map(entry => {
    // Zoek het primaire item in de bundel/entry
    const primaryItem = entry.items ? entry.items[0] : null;
    
    const name = primaryItem?.name || entry.bundle?.name || 'Onbekend Item';
    const type = primaryItem?.type?.value || 'Cosmetic';
    const rarity = primaryItem?.rarity?.value || 'common';
    
    // Zoek de beste beschikbare afbeelding
    const image = primaryItem?.images?.icon || 
                  primaryItem?.images?.featured || 
                  entry.bundle?.image || 
                  'https://via.placeholder.com/250?text=Geen+Afbeelding';

    return {
      id: entry.devName || name,
      name: name,
      price: entry.finalPrice || entry.regularPrice || 0,
      type: type,
      rarity: rarity.toLowerCase(),
      section: entry.section?.name || 'Uitgelicht',
      image: image
    };
  });
}

function renderShop(items) {
  const container = document.getElementById('shop-sections');
  container.innerHTML = '';

  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center;">Geen items gevonden.</p>';
    return;
  }

  // Groepeer op sectie (bijv. Featured, Daily)
  const sections = {};
  items.forEach(item => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  // Render per sectie
  Object.keys(sections).forEach(sectionName => {
    const sectionEl = document.createElement('section');
    
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerText = sectionName;
    sectionEl.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    sections[sectionName].forEach(item => {
      const card = document.createElement('div');
      card.className = `item-card rarity-${item.rarity}`;

      card.innerHTML = `
        <div class="image-wrapper">
          <img src="${item.image}" alt="${item.name}" loading="lazy">
        </div>
        <div class="item-details">
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-type">${item.type}</div>
          </div>
          <div class="item-price">
            <span>🪙</span> ${item.price} V-Bucks
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    sectionEl.appendChild(grid);
    container.appendChild(sectionEl);
  });
}

function setupSearchAndFilters() {
  const searchInput = document.getElementById('search-input');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let currentCategory = 'all';

  function applyFilters() {
    const query = searchInput.value.toLowerCase();
    
    const filtered = rawShopData.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(query);
      const matchesCategory = (currentCategory === 'all') || 
                              (item.type.toLowerCase() === currentCategory);
      return matchesSearch && matchesCategory;
    });

    renderShop(filtered);
  }

  searchInput.addEventListener('input', applyFilters);

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.filter;
      applyFilters();
    });
  });
}
