const API_URL = 'https://fortnite-api.com/v2/shop/br';

async function fetchShop() {
  const container = document.getElementById('shop-container');
  
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    // Verwijder de "Shop laden..." tekst
    container.innerHTML = '';

    // De shop-items zitten in data.data.featured.entries of data.data.daily.entries
    const entries = data.data.featured?.entries || data.data.daily?.entries || [];

    entries.forEach(entry => {
      const item = entry.items[0]; // Pak het eerste item uit de bundel/entry
      if (!item) return;

      const card = document.createElement('div');
      card.className = 'item-card';

      const imgUrl = item.images.icon || item.images.featured || '';
      const name = item.name;
      const price = entry.finalPrice;

      card.innerHTML = `
        <img src="${imgUrl}" alt="${name}">
        <div class="item-name">${name}</div>
        <div class="item-price">🪙 ${price} V-Bucks</div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Fout bij ophalen shop:', error);
    container.innerHTML = '<p>Kon de shop niet laden. Probeer het later opnieuw.</p>';
  }
}

fetchShop();
