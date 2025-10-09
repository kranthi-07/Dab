// ---------------------------- ELEMENTS ----------------------------
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById("overlay");
const views = document.querySelectorAll(".content-view");
const favSection = document.querySelector("#favoritesView .content-body");
const searchWrapper = document.getElementById('searchWrapper');
const searchInput = document.getElementById('searchInput');
const suggestionsBox = document.getElementById('suggestions');




function addDragClose(el) {
  let startX = 0;
  let currentX = 0;
  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX; touchingSidebar = true;
  });
  el.addEventListener("touchmove", e => {
    if (!touchingSidebar) return;
    currentX = e.touches[0].clientX;
    const delta = currentX - startX;
    if (delta < -70) {
      closeAllViews();
      touchingSidebar = false;
    }
  });
  el.addEventListener("touchend", () => {
    touchingSidebar = false;
  });
}
addDragClose(sidebar);
views.forEach(view => addDragClose(view));
// ---------------------------- ITEMS DATA ----------------------------
const itemData = {
  Punugulu: { price: 25, desc: "Crispy, fluffy South Indian snack", image: "Assets/Punugulu.jpg" },
  Bajji: { price: 25, desc: "Street-style, hot bajjis", image: "Assets/Bajji.jpg" },
  Vada: { price: 25, desc: "Donut-style, crispy vada", image: "Assets/Vada.jpg" },
  Idli: { price: 25, desc: "Soft and fluffy idlis", image: "Assets/Idli.jpg" },
  Dosa: { price: 25, desc: "Thin and crispy dosa", image: "Assets/Dosa.jpg" },
  Upma: { price: 20, desc: "Spicy, healthy upma", image: "Assets/Upma.jpg" },
  Pesarattu: { price: 30, desc: "Green gram crepe from Andhra", image: "Assets/Pesarattu.jpg" },
  Bites: { price: 25, desc: "Assorted South Indian snacks", image: "Assets/Dosa.jpg" }
};
const items = Object.keys(itemData);



// _____________________________________Order Now______________________________________

function goToOrder() {
  document.getElementById('order').scrollIntoView({ behavior: "smooth" });
}


// ---------------------------- SIDEBAR ----------------------------
menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("active");
});

function closeAllViews() {
  sidebar.classList.remove("open");
  overlay.classList.remove("active");
  views.forEach(v => v.classList.remove("active"));
}

function openView(viewId) {
  closeAllViews();
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add("active");
    overlay.classList.add("active");
  }
}

function goBack(viewId) {
  const view = document.getElementById(viewId);
  if (view) view.classList.remove("active");
  sidebar.classList.add("open");
  overlay.classList.add("active");
}

// ---------------------------- SEARCH ----------------------------
function toggleSearch() {
  searchWrapper.classList.add("active");
  suggestionsBox.innerHTML = "";
  searchInput.value = "";
  searchInput.focus();
  document.querySelector(".template").style.display = "none";
  document.querySelector(".popular-section").style.display = "none";
}

function showSuggestions() {
  const value = searchInput.value.toLowerCase().trim();
  suggestionsBox.innerHTML = "";

  if (!value) {
    document.querySelector(".template").style.display = "block";
    document.querySelector(".popular-section").style.display = "block";
    return;
  }

  const filtered = items.filter(item => item.toLowerCase().includes(value));

  if (filtered.length === 0) {
    const noMatch = document.createElement("div");
    noMatch.className = "suggestion-item";
    noMatch.textContent = "No items found";
    suggestionsBox.appendChild(noMatch);
    return;
  }

  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = item;
    div.onclick = () => goToItem(item);
    suggestionsBox.appendChild(div);
  });
}

function handleKey(e) {
  if (e.key === "Enter") {
    const value = searchInput.value.toLowerCase();
    const match = items.find(item => item.toLowerCase().includes(value));
    if (match) goToItem(match);
    else suggestionsBox.innerHTML = '<div class="suggestion-item">No items found</div>';
  }
}

function closeSearch() {
  searchWrapper.classList.remove("active");
  suggestionsBox.innerHTML = "";
  searchInput.value = "";
  document.querySelector(".template").style.display = "flex";
  document.querySelector(".popular-section").style.display = "block";
}

// ---------------------------- NAVIGATE TO ITEM ----------------------------
function goToItem(name) {
  const data = itemData[name];
  if (!data) return alert("Item details not found!");
  const params = new URLSearchParams({
    name,
    price: `₹${data.price}`,
    desc: data.desc,
    image: data.image
  });
  window.location.href = `item.html?${params.toString()}`;
}

// ---------------------------- USER PROFILE ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const header = document.getElementById("userHeader");
  const userIcon = document.getElementById("defaultUserIcon");
  const avatarEl = document.getElementById("userAvatar");

  loader.style.display = "block";
  userIcon.style.display = "none";

  fetch("https://dab-1.onrender.com/api/auth/profile", { method: "GET", credentials: "include" })
    .then(res => {
      loader.style.display = "none";
      if (res.status === 401) {
        document.getElementById("profileCard").innerHTML =
          `<p style="color:gray; font-weight:bold;">Please login to view your profile.</p>`;
        userIcon.style.display = "inline-block";
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (data && data.user) {
        const name = data.user.name || "User";
        document.getElementById("userName").textContent = name;
        document.getElementById("userMobile").textContent = data.user.mobile || "N/A";
        document.getElementById("userAddress").textContent = "SSN College Of Engineering";
        avatarEl.textContent = name.charAt(0).toUpperCase();

        header.removeAttribute("href");
        header.style.cursor = "pointer";
        header.innerHTML = `<div id="headerAvatar" class="avatar">${name.charAt(0).toUpperCase()}</div>`;
        header.addEventListener("click", () => openView('profileView'));
      }
    }).catch(err => {
      loader.style.display = "none";
      userIcon.style.display = "inline-block";
      console.error("Profile fetch failed:", err);
    });
});

// ---------------------------- LOGOUT ----------------------------
function confirmLogout() {
  fetch("https://dab-1.onrender.com/logout", { method: "GET", credentials: "include" })
    .then(res => res.json())
    .then(data => {
      if (data.success) window.location.replace("/signin.html");
      else alert("Logout failed. Try again.");
    })
    .catch(err => console.error("Logout error:", err));
}

// ---------------------------- CART ----------------------------
async function addToCart(productId, name, qty = 1) {
  try {
    const profileRes = await fetch('https://dab-1.onrender.com/api/auth/profile', { credentials: 'include' });
    if (profileRes.status === 401) {
      alert("Please login to add items to cart.");
      return;
    }

    const addRes = await fetch('https://dab-1.onrender.com/api/cart', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, name, qty, price: itemData[name].price, image: itemData[name].image, desc: itemData[name].desc })
    });

    const data = await addRes.json();
    if (data.success) alert(`${name} added to cart!`);
    else alert("Failed to add item to cart");
  } catch (err) {
    console.error("Add to cart error:", err);
    alert("Error adding item to cart");
  }
}

// ---------------------------- FAVORITES ----------------------------
async function isLoggedIn() {
  try {
    const res = await fetch('https://dab-1.onrender.com/api/auth/profile', { credentials: 'include' });
    return res.ok;
  } catch (err) {
    return false;
  }
}
async function fetchFavorites() {
  try {
    const res = await fetch('https://dab-1.onrender.com/api/favorites', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Fetch favorites error:', err);
    return [];
  }
}

async function renderFavoritesMenu() {
  const favContainer = document.getElementById('favoritesContent');
  if (!favContainer) return;

  favContainer.innerHTML = `<div class="fav-loader"><div></div></div>`;

  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    favContainer.innerHTML = `<div class="empty-message fade-in">Please login to view your favorites.</div>`;
    return;
  }

  try {
    const favorites = await fetchFavorites();
    favContainer.innerHTML = '';

    if (!favorites.length) {
      favContainer.innerHTML = `<div class="empty-message fade-in">You haven’t favorited any items yet.</div>`;
      return;
    }

    favorites.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = "fav-item fade-in";
      div.style.animationDelay = `${i * 0.05}s`;
      div.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:8px;
      `;

      div.innerHTML = `
        <div style="display:flex;align-items:center;cursor:pointer;">
          <img src="${item.image}" alt="${item.name}" style="width:50px;height:50px;border-radius:8px;margin-right:10px;">
          <span>${item.name}</span>
        </div>
        <button style="background:#ef4444;color:#fff;border:none;border-radius:5px;padding:5px 8px;cursor:pointer;">Remove</button>
      `;

      div.children[0].onclick = () => goToItem(item.name);

      div.children[1].onclick = async () => {
        await fetch('https://dab-1.onrender.com/api/favorites', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: item.productId })
        });
        renderFavoritesMenu();
      };

      favContainer.appendChild(div);
    });
  } catch (err) {
    favContainer.innerHTML = `<div class="empty-message fade-in">Failed to load favorites. Please try again later.</div>`;
  }
}

// --- Trigger fade-in when sidebar opens ---
function openView(viewId) {
  closeAllViews();
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.add("active", "fade-in");
    overlay.classList.add("active");
    if (viewId === "favoritesView") renderFavoritesMenu();
  }
}


// Favorite button in item.html
async function updateFavButton(name, productId, price, image, desc, favBtn) {
  const favorites = await fetchFavorites();
  const exists = favorites.some(f => f.productId === productId);
  favBtn.textContent = exists ? "❤ Remove from Favorites" : "❤ Add to Favorites";

  favBtn.onclick = async () => {
    if (!await isLoggedIn()) { alert("Login first!"); window.location.href = 'signin.html'; return; }

    if (exists) {
      await fetch('https://dab-1.onrender.com/api/favorites', { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) });
    } else {
      await fetch('https://dab-1.onrender.com/api/favorites', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, name, price, image, desc }) });
    }

    updateFavButton(name, productId, price, image, desc, favBtn);
    renderFavoritesMenu();
  };
}

// Initialize item page
function initItemPage() {
  const params = new URLSearchParams(window.location.search);
  const name = decodeURIComponent(params.get("name") || "");
  if (!name) return;

  const priceStr = decodeURIComponent(params.get("price") || "0");
  const price = parseInt(priceStr.replace("₹", "").trim()) || 0;
  const desc = decodeURIComponent(params.get("desc") || "");
  const image = decodeURIComponent(params.get("image") || "Assets/placeholder.png");
  const productId = name.replace(/\s+/g, "_");

  const itemNameEl = document.getElementById("itemName");
  const itemPriceEl = document.getElementById("itemPrice");
  const itemDescEl = document.getElementById("itemDesc");
  const itemImageEl = document.getElementById("itemImage");
  const favBtn = document.getElementById("favBtn");

  if (!itemNameEl) return;

  itemNameEl.textContent = name;
  itemPriceEl.textContent = `₹${price}`;
  itemDescEl.textContent = desc;
  itemImageEl.src = image;

  updateFavButton(name, productId, price, image, desc, favBtn);
}

// ---------------------------- INIT ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderFavoritesMenu();
  initItemPage();
});



/* ----------------- GO TO ITEM (shows login popup if not logged in) ----------------- */
// Popup and item logic
const popupOverlay = document.getElementById("popupOverlay");
const loginBtn = document.getElementById("loginBtn");
const cancelBtn = document.getElementById("cancelBtn");

// Handles navigation or popup trigger
async function goToItem(name) {
  const data = itemData[name];
  if (!data) return alert("Item not found!");

  if (await isLoggedIn()) {
    // user is logged in -> go to item page
    const params = new URLSearchParams({
      name,
      price: `₹${data.price}`,
      desc: data.desc,
      image: data.image
    });
    window.location.href = `item.html?${params.toString()}`;
  } else {
    // user not logged in -> show popup
    popupOverlay.classList.add("active");
    popupOverlay.setAttribute("aria-hidden", "false");
    // store attempted item so we can return after login
    localStorage.setItem("redirectAfterLogin", name);
  }
}

// Button handlers
loginBtn.addEventListener("click", () => {
  window.location.href = "signin.html";
});

cancelBtn.addEventListener("click", () => {
  popupOverlay.classList.remove("active");
  popupOverlay.setAttribute("aria-hidden", "true");
});

popupOverlay.addEventListener("click", (e) => {
  if (e.target === popupOverlay) {
    popupOverlay.classList.remove("active");
    popupOverlay.setAttribute("aria-hidden", "true");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && popupOverlay.classList.contains("active")) {
    popupOverlay.classList.remove("active");
    popupOverlay.setAttribute("aria-hidden", "true");
  }
});
