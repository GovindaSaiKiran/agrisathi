const pageTitles = {
  dashboard: "Farm Dashboard",
  weather: "Weather Intelligence",
  markets: "Market Analytics",
  crop: "Crop Health Lab",
  schemes: "Schemes & Subsidies",
  news: "Farming News",
};

const DEFAULT_LOCATION = {
  lat: 16.3067,
  lon: 80.4365,
  label: "Guntur, Andhra Pradesh",
};

const pageButtons = Array.from(document.querySelectorAll("[data-page-target]"));
const pages = Array.from(document.querySelectorAll("[data-page]"));
const title = document.querySelector("#page-title");
const refreshWeatherButton = document.querySelector("#refresh-weather");
const weatherStatus = document.querySelector("#weather-status");
const chatToggle = document.querySelector("#chat-toggle");
const chatPanel = document.querySelector("#chat-panel");
const chatClose = document.querySelector("#chat-close");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatMessages = document.querySelector("#chat-messages");

let activePage = "dashboard";
let latestLocation = DEFAULT_LOCATION;
let latestWeatherContext = null;
const chatHistory = [];

function setActivePage(pageName) {
  const nextPage = pageTitles[pageName] ? pageName : "dashboard";
  activePage = nextPage;

  pages.forEach((page) => {
    page.classList.toggle("active", page.dataset.page === nextPage);
  });

  pageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === nextPage);
  });

  title.textContent = pageTitles[nextPage];
  window.history.replaceState(null, "", `#${nextPage}`);
}

pageButtons.forEach((button) => {
  button.addEventListener("click", () => setActivePage(button.dataset.pageTarget));
});

window.addEventListener("hashchange", () => {
  setActivePage(window.location.hash.replace("#", ""));
});

setActivePage(window.location.hash.replace("#", "") || "dashboard");

function titleCase(value) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function weatherIcon(code) {
  const iconCode = String(code || "");

  if (iconCode.startsWith("2")) return "thunderstorm";
  if (iconCode.startsWith("3") || iconCode.startsWith("5")) return "rainy";
  if (iconCode.startsWith("6")) return "weather_snowy";
  if (iconCode.startsWith("7")) return "foggy";
  if (iconCode === "800") return "sunny";
  if (iconCode === "801") return "partly_cloudy_day";
  return "cloud";
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function getRainChanceFromForecast(forecast) {
  const nextEntries = forecast.list.slice(0, 8);
  const maxProbability = Math.max(...nextEntries.map((entry) => entry.pop || 0));

  return Math.round(maxProbability * 100);
}

function dailyForecastRows(forecast) {
  const days = new Map();

  forecast.list.forEach((entry) => {
    const date = new Date(entry.dt * 1000);
    const key = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const existing = days.get(key) || {
      label: date.toLocaleDateString([], { weekday: "short" }),
      condition: titleCase(entry.weather[0].description),
      min: entry.main.temp_min,
      max: entry.main.temp_max,
      pop: entry.pop || 0,
    };

    existing.min = Math.min(existing.min, entry.main.temp_min);
    existing.max = Math.max(existing.max, entry.main.temp_max);
    existing.pop = Math.max(existing.pop, entry.pop || 0);

    if (date.getHours() >= 9 && date.getHours() <= 15) {
      existing.condition = titleCase(entry.weather[0].description);
    }

    days.set(key, existing);
  });

  return Array.from(days.values()).slice(0, 7);
}

function advisoryForWeather(current, rainChance) {
  const temp = current.main.temp;
  const wind = current.wind.speed;

  if (rainChance >= 60) {
    return {
      alertCount: "2 Active",
      alert: "High rain chance in the next 24 hours. Postpone irrigation.",
      title: "Postpone irrigation",
      detail: `Rain probability is ${rainChance}%. Avoid irrigation today unless rainfall stays below 8 mm.`,
      panelTitle: "Rainfall advisory",
      panelDetail: "Keep drainage channels clear and delay fertilizer spraying until the rain window passes.",
      headline: "Rain may change today's field plan.",
    };
  }

  if (temp >= 38) {
    return {
      alertCount: "1 Active",
      alert: "High temperature detected. Protect seedlings and maintain soil moisture.",
      title: "Reduce heat stress",
      detail: "Schedule irrigation in the early morning or evening and avoid pesticide spraying during peak heat.",
      panelTitle: "Heatwave watch",
      panelDetail: "Temperatures are high enough to stress young crops. Keep irrigation reserves ready.",
      headline: "Heat stress needs attention today.",
    };
  }

  if (wind >= 9) {
    return {
      alertCount: "1 Active",
      alert: "Wind speed is elevated. Delay spraying for better coverage.",
      title: "Delay spraying",
      detail: "Wind may drift foliar sprays away from the crop canopy. Recheck conditions later today.",
      panelTitle: "Spray caution",
      panelDetail: "Current wind is high for precise spraying. Prefer calmer hours for pesticide or nutrient application.",
      headline: "Wind may affect field operations.",
    };
  }

  return {
    alertCount: "0 Active",
    alert: "Weather is suitable for routine field operations.",
    title: "Proceed with planned work",
    detail: "Conditions look stable. Continue crop inspection and routine water management.",
    panelTitle: "Field ready",
    panelDetail: "No major weather risks are detected for the current location.",
    headline: "Your farm conditions look stable today.",
  };
}

function updateForecast(forecast) {
  const rows = dailyForecastRows(forecast);
  const dashboardForecast = document.querySelector("[data-dashboard-forecast]");
  const forecastTable = document.querySelector("[data-forecast-table]");

  dashboardForecast.innerHTML = rows
    .map((day) => `<span>${day.label} <b>${Math.round(day.max)}°</b></span>`)
    .join("");

  forecastTable.innerHTML = rows
    .map(
      (day, index) => `
        <div>
          <b>${index === 0 ? "Today" : day.label}</b>
          <span>${day.condition}</span>
          <strong>${Math.round(day.max)}° / ${Math.round(day.min)}°</strong>
          <em>${Math.round(day.pop * 100)}% rain</em>
        </div>
      `,
    )
    .join("");
}

function updateWeatherUi(current, forecast, sourceLabel) {
  const condition = titleCase(current.weather[0].description);
  const temp = Math.round(current.main.temp);
  const rainChance = getRainChanceFromForecast(forecast);
  const icon = weatherIcon(current.weather[0].id);
  const place = [current.name, current.sys.country].filter(Boolean).join(", ");
  const advisory = advisoryForWeather(current, rainChance);

  latestWeatherContext = {
    place: place || sourceLabel,
    condition,
    temperatureC: temp,
    rainChance,
    humidity: current.main.humidity,
    windKmh: Math.round(current.wind.speed * 3.6),
    pressure: current.main.pressure,
    visibilityKm: Math.round((current.visibility || 0) / 1000),
    advisory,
    forecast: dailyForecastRows(forecast).map((day) => ({
      day: day.label,
      condition: day.condition,
      minC: Math.round(day.min),
      maxC: Math.round(day.max),
      rainChance: Math.round(day.pop * 100),
    })),
  };

  setText("#location-label", latestWeatherContext.place);
  setText("[data-dashboard-weather-summary]", `${temp}°C • ${condition}`);
  setText("[data-current-temp]", `${temp}°C`);
  setText("[data-current-summary]", `${condition} • Updated ${formatTime()}`);
  setText("[data-rain-chance]", `${rainChance}%`);
  
  const notificationList = document.getElementById("notification-list");
  const notificationBadge = document.getElementById("notification-badge");
  if (notificationList && forecast) {
    let html = "";
    let alertCountNum = 0;
    
    // Alert for Rain > 60%
    if (rainChance >= 60) {
      html += `
        <div style="background: rgba(239,68,68,0.1); border-left: 4px solid var(--accent-red); padding: 12px; margin-bottom: 12px; border-radius: 4px;">
          <strong><span class="material-symbols-outlined" style="font-size:16px; vertical-align:text-bottom;">warning</span> Rain Alert</strong>
          <p style="margin:4px 0 0; font-size:0.875rem;">Rain probability is ${rainChance}% in the coming days. Please postpone irrigation and spraying.</p>
        </div>
      `;
      alertCountNum++;
    }
    
    html += `<h4 style="margin: 0 0 8px 0; font-size: 0.875rem; color: var(--text-muted);">7-Day Weather Updates</h4>`;
    
    const days = dailyForecastRows(forecast);
    days.forEach(day => {
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--surface-high);">
          <span style="font-weight: 500;">${day.label}</span>
          <span style="color: var(--text-muted); font-size: 0.875rem;">${day.condition} • ${Math.round(day.min)}° - ${Math.round(day.max)}° • ${Math.round(day.pop * 100)}% rain</span>
        </div>
      `;
    });
    
    notificationList.innerHTML = html;
    
    if (notificationBadge) {
      if (alertCountNum > 0) {
        notificationBadge.textContent = alertCountNum;
        notificationBadge.style.display = "block";
      } else {
        notificationBadge.style.display = "none";
      }
    }
  }

  setText("[data-weather-alert-count]", advisory.alertCount);
  setText("[data-weather-alert-text]", advisory.alert);
  setText("[data-advisory-title]", advisory.title);
  setText("[data-advisory-text]", advisory.detail);
  setText("[data-alert-title]", advisory.panelTitle);
  setText("[data-alert-detail]", advisory.panelDetail);
  setText("[data-weather-headline]", advisory.headline);
  setText("[data-humidity]", `${current.main.humidity}%`);
  setText("[data-wind]", `${latestWeatherContext.windKmh} km/h`);
  setText("[data-pressure]", `${current.main.pressure} hPa`);
  setText("[data-visibility]", `${latestWeatherContext.visibilityKm} km`);
  setText("[data-weather-icon]", icon);

  updateForecast(forecast);
  weatherStatus.textContent = `Live weather from OpenWeather for ${latestWeatherContext.place}.`;
}

async function fetchWeather(location) {
  weatherStatus.textContent = "Loading live weather...";
  latestLocation = location;

  const params = new URLSearchParams({
    lat: location.lat,
    lon: location.lon,
  });
  const response = await fetch(`/api/weather?${params}`);

  if (!response.ok) {
    throw new Error("Weather request failed");
  }

  const { current, forecast } = await response.json();
  updateWeatherUi(current, forecast, location.label);
}

function loadWeatherForCurrentPosition() {
  if (!navigator.geolocation) {
    fetchWeather(DEFAULT_LOCATION).catch(() => {
      weatherStatus.textContent = "Unable to load live weather. Open the app from the Node server and check API settings.";
    });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchWeather({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        label: "Current location",
      }).catch(() => {
        weatherStatus.textContent = "Unable to load live weather. Showing saved sample data.";
      });
    },
    () => {
      fetchWeather(DEFAULT_LOCATION).catch(() => {
        weatherStatus.textContent = "Location permission was unavailable and live weather could not load.";
      });
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 600000 },
  );
}

function openChat() {
  chatPanel.hidden = false;
  chatToggle.setAttribute("aria-expanded", "true");
  chatInput.focus();
}

function closeChat() {
  chatPanel.hidden = true;
  chatToggle.setAttribute("aria-expanded", "false");
}

function addChatMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;
  message.textContent = text;
  chatMessages.append(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatLoading(isLoading) {
  const sendButton = chatForm.querySelector("button");
  chatInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  sendButton.textContent = isLoading ? "..." : "Send";
}

async function sendChatMessage(message) {
  chatHistory.push({ role: "user", text: message });
  addChatMessage("user", message);
  setChatLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        page: activePage,
        location: latestLocation,
        weather: latestWeatherContext,
        history: chatHistory.slice(-8),
      }),
    });

    if (!response.ok) {
      throw new Error("Chat request failed");
    }

    const data = await response.json();
    const reply = data.reply || "I could not generate a response right now.";
    chatHistory.push({ role: "assistant", text: reply });
    addChatMessage("assistant", reply);
  } catch (error) {
    const fallback = "I could not reach the farm assistant backend. Please open this app from the Node server URL and try again.";
    chatHistory.push({ role: "assistant", text: fallback });
    addChatMessage("assistant", fallback);
  } finally {
    setChatLoading(false);
  }
}

refreshWeatherButton.addEventListener("click", loadWeatherForCurrentPosition);
chatToggle.addEventListener("click", () => {
  if (chatPanel.hidden) {
    openChat();
  } else {
    closeChat();
  }
});
chatClose.addEventListener("click", closeChat);
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();

  if (!message) return;

  chatInput.value = "";
  sendChatMessage(message);
});

loadWeatherForCurrentPosition();

// --- Crop Health Analysis Logic ---
const cropImageUpload = document.getElementById("crop-image-upload");
const uploadTitle = document.getElementById("upload-title");
const uploadDesc = document.getElementById("upload-desc");
const analyzeButton = document.getElementById("analyze-button");
const cropSelector = document.getElementById("crop-selector");
const diagnosisCard = document.getElementById("diagnosis-card");

let currentCropImageBase64 = null;

if (cropImageUpload) {
  cropImageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadTitle.textContent = "Image Selected";
      uploadDesc.textContent = file.name;
      analyzeButton.disabled = false;
      const reader = new FileReader();
      reader.onload = (ev) => {
        currentCropImageBase64 = ev.target.result.split(",")[1];
      };
      reader.readAsDataURL(file);
    }
  });

  analyzeButton.addEventListener("click", async () => {
    if (!currentCropImageBase64) return;
    
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> Analyzing...`;
    
    diagnosisCard.hidden = false;
    document.getElementById("diagnosis-status").textContent = "Analyzing...";
    document.getElementById("diagnosis-status").className = "chip orange";
    document.getElementById("diagnosis-title").textContent = "Processing image...";
    document.getElementById("diagnosis-desc").textContent = "Gemini AI is analyzing your crop...";
    document.getElementById("diagnosis-tags").innerHTML = "";

    try {
      const response = await fetch("/api/analyze-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: currentCropImageBase64,
          cropName: cropSelector.value
        })
      });

      if (!response.ok) throw new Error("Failed to analyze image");

      const data = await response.json();
      
      document.getElementById("diagnosis-status").textContent = "Analysis Complete";
      document.getElementById("diagnosis-status").className = "chip blue";
      document.getElementById("diagnosis-title").textContent = data.title || "Crop Analysis";
      document.getElementById("diagnosis-desc").textContent = data.description || "Analysis provided.";
      
      const tagsHtml = (data.suggestions || []).map(tag => `<span>${tag}</span>`).join("");
      document.getElementById("diagnosis-tags").innerHTML = tagsHtml;
    } catch (err) {
      document.getElementById("diagnosis-status").textContent = "Error";
      document.getElementById("diagnosis-status").className = "chip neutral";
      document.getElementById("diagnosis-title").textContent = "Analysis Failed";
      document.getElementById("diagnosis-desc").textContent = "Could not analyze the image right now.";
    } finally {
      analyzeButton.disabled = false;
      analyzeButton.innerHTML = `<span class="material-symbols-outlined">memory</span> Analyze`;
    }
  });
}

// Scheme tabs logic
const schemeTabs = document.querySelectorAll(".tabs button");
const schemeCategories = document.querySelectorAll(".scheme-category");

schemeTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    schemeTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    if (index === 0) {
      schemeCategories.forEach(c => c.style.display = "");
    } else {
      schemeCategories.forEach((c, cIndex) => {
        c.style.display = (cIndex === index - 1) ? "" : "none";
      });
    }
  });
});

// Google Maps & Places API Logic
let map;
let placesService;
let mapMarkers = [];

function initMap() {
  const mapElement = document.getElementById("markets-map");
  if (!mapElement || typeof google === "undefined") return;

  const center = { lat: latestLocation.lat, lng: latestLocation.lon };
  
  map = new google.maps.Map(mapElement, {
    center: center,
    zoom: 11,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  });

  placesService = new google.maps.places.PlacesService(map);
  
  // Only search places when map is visible to avoid unnecessary API calls
  if (activePage === "markets") {
    searchPlaces();
  }
}

function clearMarkers() {
  mapMarkers.forEach(marker => marker.setMap(null));
  mapMarkers = [];
}

function searchPlaces() {
  if (!map) return;
  clearMarkers();

  const isRbk = document.getElementById("map-filter-rbk")?.classList.contains("active");
  const cropSelect = document.getElementById("market-crop-select");
  const crop = cropSelect ? cropSelect.value.split(" ")[0] : "Crop";
  const searchInput = document.getElementById("map-search-input");
  
  let query = "";
  if (searchInput && searchInput.value.trim() !== "") {
    query = searchInput.value.trim();
  } else {
    query = isRbk 
      ? "Agriculture " + latestLocation.label 
      : `${crop} Market ${latestLocation.label}`;
  }

  // Use free Nominatim API to bypass the Google Places REQUEST_DENIED error
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
    .then(res => res.json())
    .then(results => {
      if (results && results.length > 0) {
        map.setCenter({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
        map.setZoom(12);

        results.forEach(place => {
          const pos = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
          const titleName = place.name || place.display_name.split(',')[0];
          
          const marker = new google.maps.Marker({
            map,
            position: pos,
            title: titleName,
            icon: isRbk 
              ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" 
              : "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="map-info-window">
                <h3>${titleName}</h3>
                <p>${place.display_name || "Nearby location"}</p>
                <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.display_name)}', '_blank')">Get Directions</button>
              </div>
            `
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          mapMarkers.push(marker);
        });
      } else {
        // Fallback to mock data for demonstration if OpenStreetMap doesn't have the specific query
        const center = map.getCenter();
        const lat = center.lat();
        const lng = center.lng();
        
        const mockResults = [
          { lat: lat + 0.02, lon: lng + 0.02, name: query.split(" near")[0] + " (Branch 1)", display_name: "Local center, nearby" },
          { lat: lat - 0.015, lon: lng + 0.025, name: query.split(" near")[0] + " (Branch 2)", display_name: "Local center, nearby" },
          { lat: lat + 0.03, lon: lng - 0.01, name: query.split(" near")[0] + " (Main)", display_name: "Local center, nearby" }
        ];

        map.setZoom(11);

        mockResults.forEach(place => {
          const pos = { lat: place.lat, lng: place.lon };
          const marker = new google.maps.Marker({
            map,
            position: pos,
            title: place.name,
            icon: isRbk 
              ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png" 
              : "http://maps.google.com/mapfiles/ms/icons/orange-dot.png"
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="map-info-window">
                <h3>${place.name}</h3>
                <p>${place.display_name}</p>
                <button onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}', '_blank')">Get Directions</button>
              </div>
            `
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          mapMarkers.push(marker);
        });
      }
    })
    .catch(err => {
      console.error("Geocoding error:", err);
      alert("Error searching map: " + err.message);
    });
}

const rbkFilter = document.getElementById("map-filter-rbk");
const marketFilter = document.getElementById("map-filter-market");

if (rbkFilter && marketFilter) {
  rbkFilter.addEventListener("click", () => {
    rbkFilter.classList.add("active");
    marketFilter.classList.remove("active");
    if (document.getElementById("map-search-input")) document.getElementById("map-search-input").value = "";
    searchPlaces();
  });
  marketFilter.addEventListener("click", () => {
    marketFilter.classList.add("active");
    rbkFilter.classList.remove("active");
    if (document.getElementById("map-search-input")) document.getElementById("map-search-input").value = "";
    searchPlaces();
  });
}

const cropSelect = document.getElementById("market-crop-select");
if (cropSelect) {
  cropSelect.addEventListener("change", searchPlaces);
}

const searchInput = document.getElementById("map-search-input");
const searchBtn = document.getElementById("map-search-btn");

function triggerCustomSearch() {
  rbkFilter?.classList.remove("active");
  marketFilter?.classList.remove("active");
  searchPlaces();
}

if (searchInput) {
  // Catch "search" event (triggered by soft keyboards or clicking 'x')
  searchInput.addEventListener("search", () => {
    triggerCustomSearch();
  });
  
  // Catch Enter key explicitly just in case
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      triggerCustomSearch();
    }
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", triggerCustomSearch);
}

// Call initMap after a slight delay to ensure Google script has executed
setTimeout(initMap, 500);

// Re-search when switching to the markets page
pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.pageTarget === "markets" && map) {
      setTimeout(searchPlaces, 100);
    }
  });
});

// Schemes Interactive Filtering Logic
const schemesSearchInput = document.getElementById("schemes-search-input");
const schemesSearchBtn = document.getElementById("schemes-search-btn");
const schemeTabBar = document.getElementById("schemes-tab-bar");
let activeSchemeTab = "all";

// Trigger filter on button click
if (schemesSearchBtn) {
  schemesSearchBtn.addEventListener("click", filterSchemes);
}
// Trigger filter on Enter key in input
if (schemesSearchInput) {
  schemesSearchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      filterSchemes();
    }
  });
}

function filterSchemes() {
  const query = schemesSearchInput ? schemesSearchInput.value.toLowerCase().trim() : "";
  const categories = document.querySelectorAll(".scheme-category");

  categories.forEach(catSection => {
    const catType = catSection.dataset.catSection;
    const matchesTab = (activeSchemeTab === "all" || activeSchemeTab === catType);

    if (!matchesTab) {
      catSection.style.display = "none";
      return;
    }

    const cards = catSection.querySelectorAll(".scheme-card");
    let visibleCardsInCat = 0;

    cards.forEach(card => {
      const text = card.textContent.toLowerCase() + " " + (card.dataset.schemeName || "");
      const matchesSearch = !query || text.includes(query);

      if (matchesSearch) {
        card.style.display = "flex";
        visibleCardsInCat++;
      } else {
        card.style.display = "none";
      }
    });

    if (visibleCardsInCat > 0) {
      catSection.style.display = "block";
    } else {
      catSection.style.display = "none";
    }
  });
}

if (schemesSearchInput) {
  schemesSearchInput.addEventListener("input", filterSchemes);
}

if (schemeTabBar) {
  schemeTabBar.querySelectorAll(".scheme-tab-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      schemeTabBar.querySelectorAll(".scheme-tab-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeSchemeTab = chip.dataset.schemeTab || "all";
      filterSchemes();
    });
  });
}

// News System State & Logic
let allNewsArticles = [];
let activeNewsCategory = "all";
let newsSearchQuery = "";

function getCategoryMeta(category, title = "", desc = "") {
  const text = (category + " " + title + " " + desc).toLowerCase();
  if (text.includes("subsid") || text.includes("scheme") || text.includes("kisan") || text.includes("pmksy") || text.includes("soil")) {
    return { name: "Scheme & Subsidy", class: "news-badge-subsidy", icon: "account_balance" };
  }
  if (text.includes("mandi") || text.includes("msp") || text.includes("price") || text.includes("procure") || text.includes("grain")) {
    return { name: "Mandi & MSP Rates", class: "news-badge-market", icon: "trending_up" };
  }
  if (text.includes("weather") || text.includes("rain") || text.includes("monsoon") || text.includes("imd") || text.includes("temp")) {
    return { name: "Weather & Advisory", class: "news-badge-weather", icon: "rainy" };
  }
  if (text.includes("drone") || text.includes("tech") || text.includes("digital") || text.includes("ai") || text.includes("solar")) {
    return { name: "AgriTech & Innovation", class: "news-badge-tech", icon: "smart_toy" };
  }
  return { name: "Farming Update", class: "news-badge-subsidy", icon: "newspaper" };
}

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString([], { month: "short", day: "numeric" });
}

function showNewsToast(msg) {
  const toast = document.getElementById("news-toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function copyArticleLink(link) {
  if (!link || link === "#") {
    showNewsToast("Article link recorded!");
    return;
  }
  navigator.clipboard.writeText(link).then(() => {
    showNewsToast("Article link copied to clipboard!");
  }).catch(() => {
    showNewsToast("Article link ready to share!");
  });
}

function renderNewsUI() {
  const heroContainer = document.getElementById("news-hero-container");
  const cardsGrid = document.getElementById("news-cards-grid");
  const countLabel = document.getElementById("news-results-count");
  if (!cardsGrid) return;

  // Filter articles by category and search query
  let filtered = allNewsArticles.filter(art => {
    const meta = getCategoryMeta(art.category, art.title, art.description);
    const matchesCat = (activeNewsCategory === "all") ||
      (activeNewsCategory === "subsidy" && meta.class.includes("subsidy")) ||
      (activeNewsCategory === "market" && meta.class.includes("market")) ||
      (activeNewsCategory === "weather" && meta.class.includes("weather")) ||
      (activeNewsCategory === "tech" && meta.class.includes("tech"));

    const query = newsSearchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      art.title.toLowerCase().includes(query) ||
      (art.description && art.description.toLowerCase().includes(query)) ||
      (art.source_id && art.source_id.toLowerCase().includes(query));

    return matchesCat && matchesSearch;
  });

  if (countLabel) {
    countLabel.textContent = `Showing ${filtered.length} of ${allNewsArticles.length} updates`;
  }

  if (filtered.length === 0) {
    if (heroContainer) heroContainer.innerHTML = "";
    cardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: rgba(255,255,255,0.4); border-radius: 20px;">
        <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;">search_off</span>
        <h4 style="margin: 0 0 8px; font-size: 1.1rem;">No matching news found</h4>
        <p class="muted" style="margin: 0;">Try searching for a different keyword or select "All News".</p>
      </div>
    `;
    return;
  }

  // Render Hero Banner (Only when viewing "all" category and no search active)
  if (heroContainer) {
    if (activeNewsCategory === "all" && !newsSearchQuery && filtered.length > 0) {
      const hero = filtered[0];
      const meta = getCategoryMeta(hero.category, hero.title, hero.description);
      heroContainer.innerHTML = `
        <div class="news-hero-story">
          <div>
            <div class="news-hero-badge-row">
              <span class="news-hero-badge">
                <span class="material-symbols-outlined" style="font-size: 15px; vertical-align: middle; margin-right: 4px;">star</span>
                Featured Story • ${meta.name}
              </span>
              <span style="font-size: 0.85rem; color: rgba(255,255,255,0.85);">
                <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">schedule</span>
                ${formatTimeAgo(hero.pubDate)}
              </span>
            </div>
            <h3 class="news-hero-title">
              <a href="${hero.link || '#'}" target="_blank">${hero.title}</a>
            </h3>
            <p class="news-hero-desc">${hero.description || "Click below for full details on this critical agricultural update."}</p>
          </div>
          <div class="news-hero-footer">
            <div class="news-hero-meta">
              <span>🏛️ ${hero.source_id || "AgriSaathi Special"}</span>
              <span>•</span>
              <span>⚡ High Farmer Impact</span>
            </div>
            <div style="display: flex; gap: 12px;">
              <button class="news-icon-btn" onclick="copyArticleLink('${hero.link || '#'}')" title="Share Story" style="background: rgba(255,255,255,0.2); color: white;">
                <span class="material-symbols-outlined" style="font-size: 18px;">share</span>
              </button>
              <a href="${hero.link || '#'}" target="_blank" class="news-hero-btn">
                Read Full Story
                <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      `;
    } else {
      heroContainer.innerHTML = "";
    }
  }

  // Render Grid (Skip first if hero is showing)
  const itemsToRender = (activeNewsCategory === "all" && !newsSearchQuery && filtered.length > 0)
    ? filtered.slice(1)
    : filtered;

  cardsGrid.innerHTML = itemsToRender.map((article) => {
    const meta = getCategoryMeta(article.category, article.title, article.description);
    const timeAgo = formatTimeAgo(article.pubDate);
    const safeLink = article.link || "#";

    return `
      <article class="news-item-card">
        <div>
          <div class="news-card-header">
            <span class="news-badge ${meta.class}">
              <span class="material-symbols-outlined" style="font-size: 14px;">${meta.icon}</span>
              ${meta.name}
            </span>
            <span class="news-card-source">${article.source_id || "AgriSaathi"}</span>
          </div>
          <h4 class="news-card-title">
            <a href="${safeLink}" target="_blank">${article.title}</a>
          </h4>
          <p class="news-card-desc">${article.description || "Stay tuned for verified field reports and updates on this development."}</p>
        </div>
        <div class="news-card-footer">
          <span class="news-card-time">
            <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
            ${timeAgo}
          </span>
          <div class="news-card-actions">
            <button class="news-icon-btn" onclick="this.querySelector('.material-symbols-outlined').textContent = (this.querySelector('.material-symbols-outlined').textContent === 'bookmark' ? 'bookmark_border' : 'bookmark'); showNewsToast('Saved to your reading list!');" title="Bookmark">
              <span class="material-symbols-outlined" style="font-size: 17px;">bookmark_border</span>
            </button>
            <button class="news-icon-btn" onclick="copyArticleLink('${safeLink}')" title="Share Story">
              <span class="material-symbols-outlined" style="font-size: 17px;">share</span>
            </button>
            <a href="${safeLink}" target="_blank" class="news-read-btn">
              Read
              <span class="material-symbols-outlined" style="font-size: 15px;">open_in_new</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// News Fetch Engine
async function fetchNews() {
  const cardsGrid = document.getElementById("news-cards-grid");
  if (!cardsGrid) return;
  
  try {
    const res = await fetch("/api/news");
    const data = await res.json();
    
    if (data.status === "success" && data.results && data.results.length > 0) {
      allNewsArticles = data.results;
      renderNewsUI();
    } else {
      cardsGrid.innerHTML = `<p class="muted">No news updates available at the moment.</p>`;
    }
  } catch (e) {
    console.error("Failed to fetch news:", e);
    cardsGrid.innerHTML = `<p class="muted">Failed to load news. Please try again later.</p>`;
  }
}

// News Category Filters Event Listeners
const newsFiltersContainer = document.getElementById("news-category-filters");
if (newsFiltersContainer) {
  newsFiltersContainer.querySelectorAll(".news-cat-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      newsFiltersContainer.querySelectorAll(".news-cat-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      activeNewsCategory = chip.dataset.category || "all";
      renderNewsUI();
    });
  });
}

// News Search Input Event Listener
const newsSearchInput = document.getElementById("news-search-input");
if (newsSearchInput) {
  newsSearchInput.addEventListener("input", (e) => {
    newsSearchQuery = e.target.value;
    renderNewsUI();
  });
}

fetchNews();

// Market Price Dynamic Fetching
const marketCropSelect = document.getElementById("market-crop-select");
const marketSentimentTitle = document.getElementById("market-sentiment-title");
const marketTrendChip = document.getElementById("market-trend-chip");
const marketSentimentDesc = document.getElementById("market-sentiment-desc");
const marketPrice = document.getElementById("market-price");

async function fetchMarketPrices(crop) {
  if (!marketPrice) return;
  
  marketSentimentTitle.textContent = "Analyzing...";
  marketTrendChip.textContent = "---";
  marketSentimentDesc.textContent = "Fetching live market data for " + crop + "...";
  marketPrice.textContent = "Rs --";
  
  try {
    const response = await fetch("/api/market-prices?crop=" + encodeURIComponent(crop));
    const data = await response.json();
    
    if (data.sentiment) {
      marketSentimentTitle.textContent = data.sentiment;
      marketTrendChip.textContent = data.trend || "";
      marketSentimentDesc.textContent = data.description || "";
      marketPrice.textContent = data.price || "";
    } else {
      marketSentimentTitle.textContent = "Data Unavailable";
      marketSentimentDesc.textContent = "Could not fetch prices.";
    }
  } catch (err) {
    marketSentimentTitle.textContent = "Error";
    marketSentimentDesc.textContent = "Network error fetching prices.";
  }
}

if (marketCropSelect) {
  marketCropSelect.addEventListener("change", (e) => {
    fetchMarketPrices(e.target.value);
  });
  
  // Initial fetch if we are on markets page or simply after load
  setTimeout(() => {
    fetchMarketPrices(marketCropSelect.value);
  }, 1000);
}
const notificationBtn = document.getElementById("notification-btn");
const notificationDropdown = document.getElementById("notification-dropdown");

if (notificationBtn && notificationDropdown) {
  notificationBtn.addEventListener("click", () => {
    if (notificationDropdown.style.display === "none") {
      notificationDropdown.style.display = "block";
    } else {
      notificationDropdown.style.display = "none";
    }
  });
  
  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!notificationBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
      notificationDropdown.style.display = "none";
    }
  });
}
