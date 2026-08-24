const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// Load .env manually for zero-dependency local development
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (e) {
  // Ignore error if .env doesn't exist
}

const PORT = Number(process.env.PORT || 5174);
const STATIC_ROOT = path.join(__dirname, "stitch_agrisaathi_mobile_dashboard_replicated");
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};
const schemeCatalog = [
  {
    category: "Financial and Income Support",
    schemes: [
      "PM-KISAN: Rs 6,000 per year to eligible farmer families in three equal parts.",
      "PM AASHA: Protects crop prices and supports Minimum Support Price operations.",
      "PM Kisan Maan-Dhan Yojana: Pension safety net for small and marginal farmers in old age.",
    ],
  },
  {
    category: "Credit and Insurance",
    schemes: [
      "Kisan Credit Card: Short-term formal loans for farming and allied activities at low interest rates.",
      "PMFBY: Crop insurance against natural calamities, pests, and bad weather.",
      "Agriculture Infrastructure Fund: Financing for post-harvest storage, cold chains, and community farming assets.",
    ],
  },
  {
    category: "Technology and Infrastructure",
    schemes: [
      "PM-KUSUM: Subsidies for solar water pumps and solarized grid-connected agriculture pumps.",
      "SMAM: Assistance and subsidies for tractors, harvesters, and modern tools.",
      "Soil Health Card Scheme: Soil nutrient testing and fertilizer guidance.",
      "e-NAM: Online trading portal connecting regulated wholesale markets.",
    ],
  },
];

const marketSnapshot = [
  "Ujjain Krishi Upaj Mandi: Rs 2,285/qtl, 12 km away.",
  "Indore Chhawni Mandi: Rs 2,310/qtl, 45 km away.",
  "Dewas Krishi Mandi: Rs 2,250/qtl, 38 km away.",
];

let paddyKnowledge = "";
try {
  paddyKnowledge = fs.readFileSync(path.join(__dirname, "knowledge", "paddy.md"), "utf8");
} catch (e) {
  console.warn("Could not load knowledge/paddy.md. Using default knowledge.");
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function safeStaticPath(urlPathname) {
  const normalizedPath = decodeURIComponent(urlPathname === "/" ? "/index.html" : urlPathname);

  if (normalizedPath.split("/").some((segment) => segment.startsWith("."))) {
    return null;
  }

  const filePath = path.normalize(path.join(STATIC_ROOT, normalizedPath));

  if (!filePath.startsWith(STATIC_ROOT)) {
    return null;
  }

  return filePath;
}

const WMO_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function wmoToOwmCode(wmo) {
  if (wmo === 0 || wmo === 1) return 800; // Clear
  if (wmo === 2 || wmo === 3) return 801; // Clouds
  if (wmo === 45 || wmo === 48) return 741; // Fog
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(wmo)) return 500; // Rain
  if ([71,73,75,77,85,86].includes(wmo)) return 600; // Snow
  if ([95,96,99].includes(wmo)) return 200; // Thunderstorm
  return 800;
}

async function fetchOpenMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch Open-Meteo data");
  const data = await res.json();
  
  // Transform Open-Meteo to OpenWeather structure for frontend compatibility
  const current = {
    weather: [{
      description: WMO_DESCRIPTIONS[data.current.weather_code] || "Clear",
      id: wmoToOwmCode(data.current.weather_code)
    }],
    main: {
      temp: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.surface_pressure
    },
    wind: {
      speed: data.current.wind_speed_10m / 3.6 // km/h to m/s
    },
    name: "Selected Location",
    sys: { country: "IN" }
  };
  
  const forecastList = data.daily.time.map((timeStr, index) => {
    // Generate an artificial 3-hour timestamp in the middle of the day for the frontend logic
    const dt = new Date(`${timeStr}T12:00:00Z`).getTime() / 1000;
    const wmo = data.daily.weather_code[index];
    return {
      dt,
      main: {
        temp_min: data.daily.temperature_2m_min[index],
        temp_max: data.daily.temperature_2m_max[index]
      },
      weather: [{
        description: WMO_DESCRIPTIONS[wmo] || "Clear",
        id: wmoToOwmCode(wmo)
      }],
      pop: (data.daily.precipitation_probability_max[index] || 0) / 100 // 0 to 1 scale
    };
  });
  
  return { current, forecast: { list: forecastList } };
}

async function fetchOpenWeatherOrMeteo(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY_1 || process.env.OPENWEATHER_API_KEY_2;
  if (apiKey && apiKey.trim() !== "" && !apiKey.includes("your_")) {
    try {
      const currentRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
      const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
      
      if (currentRes.ok && forecastRes.ok) {
        const current = await currentRes.json();
        const forecast = await forecastRes.json();
        return { current, forecast };
      } else {
        console.warn("OpenWeather API request failed with status:", currentRes.status, forecastRes.status);
      }
    } catch (e) {
      console.error("OpenWeather API fetch error:", e);
    }
  }
  
  // Fallback to free Open-Meteo API
  return await fetchOpenMeteo(lat, lon);
}

function summarizeWeather(weatherPayload) {
  if (!weatherPayload) return "Live weather is not loaded yet.";

  return JSON.stringify(
    {
      place: weatherPayload.place,
      temperatureC: weatherPayload.temperatureC,
      condition: weatherPayload.condition,
      rainChance: weatherPayload.rainChance,
      humidity: weatherPayload.humidity,
      windKmh: weatherPayload.windKmh,
      advisory: weatherPayload.advisory,
      forecast: weatherPayload.forecast,
    },
    null,
    2,
  );
}

function fallbackReply(message, weatherPayload) {
  const lower = message.toLowerCase();

  if (lower.includes("scheme") || lower.includes("subsid") || lower.includes("kisan")) {
    return "Here are useful schemes to check: PM-KISAN for direct income support, KCC for short-term credit, PMFBY for crop insurance, PM-KUSUM for solar pumps, Soil Health Card for fertilizer planning, and e-NAM for digital market access.";
  }

  if (weatherPayload) {
    const advisory = weatherPayload.advisory?.detail ? ` ${weatherPayload.advisory.detail}` : "";
    return `Current weather for ${weatherPayload.place}: ${weatherPayload.temperatureC}°C, ${weatherPayload.condition}, rain chance ${weatherPayload.rainChance}%, wind ${weatherPayload.windKmh} km/h.${advisory}`;
  }

  return "I can help with crop care, weather planning, mandi decisions, and farmer schemes. Live AI response is unavailable right now, but the dashboard data is still visible.";
}

let newsCache = null;
let newsCacheTime = 0;
const NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache

async function handleNews(request, response) {
  // Check in-memory cache first to conserve API rate limits
  if (newsCache && (Date.now() - newsCacheTime < NEWS_CACHE_TTL_MS)) {
    sendJson(response, 200, newsCache);
    return;
  }

  const apiKey = process.env.PERIGON_API_KEY;
  
  if (apiKey) {
    try {
      const url = `https://api.goperigon.com/v1/all?apiKey=${apiKey}&q=agriculture+OR+farming+OR+crop&country=in&sortBy=date`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        
        // Map Perigon format to the expected frontend format
        const results = (data.articles || []).map(article => ({
          title: article.title,
          description: article.description || article.summary || "",
          pubDate: article.pubDate,
          source_id: article.source?.domain || "News Source",
          category: "all",
          link: article.url
        }));

        const payload = { status: "success", results };
        newsCache = payload;
        newsCacheTime = Date.now();
        sendJson(response, 200, payload);
        return;
      } else {
        console.warn(`Perigon returned ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      console.error("Perigon News fetch error", e);
    }
  }
  
  // Mock fallback if API key is invalid or not provided
  sendJson(response, 200, {
    status: "success",
    results: [
      {
        title: "Cabinet Approves 50% Subsidy on Micro-Irrigation & Drip Systems for 2026",
        description: "Under the revamped PMKSY scheme, small and marginal farmers can now claim up to 55% direct financial assistance for solar pump sets and micro-irrigation installations.",
        pubDate: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
        source_id: "Ministry of Agriculture",
        category: "subsidy",
        link: "https://agricoop.gov.in/"
      },
      {
        title: "Kharif Season Minimum Support Price (MSP) Hiked for Paddy, Cotton, and Pulses",
        description: "The government announced a fresh hike in MSP rates across 14 Kharif crops, guaranteeing a 50% return over the all-India weighted average cost of production.",
        pubDate: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        source_id: "e-NAM Market Hub",
        category: "market",
        link: "https://enam.gov.in/"
      },
      {
        title: "IMD Issues Above-Normal Rainfall Advisory for Southern & Central Peninsular Regions",
        description: "Favorable La Niña conditions are expected to enhance monsoon showers across Andhra Pradesh, Telangana, and Maharashtra. Farmers are advised to maintain active field drainage.",
        pubDate: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
        source_id: "IMD Agro-Meteorology",
        category: "weather",
        link: "https://mausam.imd.gov.in/"
      },
      {
        title: "Kisan Drone Subsidy: 75% Support for Custom Hiring Centers and FPOs",
        description: "To accelerate precision agriculture, drone technology for foliar spraying and crop health monitoring is now heavily subsidized for registered Farmer Producer Organizations.",
        pubDate: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(), // 14 hours ago
        source_id: "AgriTech India",
        category: "tech",
        link: "https://agricoop.nic.in/"
      },
      {
        title: "Record 540 Lakh Tonnes of Paddy Procured via Digital Mandis This Quarter",
        description: "Direct benefit transfers (DBT) worth ₹1.15 lakh crore have reached farmer accounts within 48 hours of mandi weighment, streamlining wholesale settlement.",
        pubDate: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22 hours ago
        source_id: "National Grain Board",
        category: "market",
        link: "https://enam.gov.in/"
      },
      {
        title: "New Bio-Fertilizer Subsidy Policy Introduced to Restore Soil Organic Carbon",
        description: "Farmers adopting organic compost and neem-coated urea blends will receive special cash vouchers and free soil health testing through local Rythu Bharosa Kendrams.",
        pubDate: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(), // Yesterday
        source_id: "ICAR Agricultural Bulletin",
        category: "subsidy",
        link: "https://soilhealth.dac.gov.in/"
      }
    ]
  });
}

async function handleWeather(requestUrl, response) {
  const lat = Number(requestUrl.searchParams.get("lat"));
  const lon = Number(requestUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    sendJson(response, 400, { error: "Latitude and longitude are required." });
    return;
  }

  try {
    sendJson(response, 200, await fetchOpenWeatherOrMeteo(lat, lon));
  } catch (error) {
    sendJson(response, 502, { error: "Unable to load live weather." });
  }
}

async function handleChat(request, response) {
  try {
    const body = JSON.parse(await readBody(request));
    const message = String(body.message || "").trim();

    if (!message) {
      sendJson(response, 400, { error: "Message is required." });
      return;
    }

    const location = body.location || {};
    let weatherPayload = body.weather || null;

    if (Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lon))) {
      try {
        const live = await fetchOpenWeatherOrMeteo(location.lat, location.lon);
        const current = live.current;
        const nextRainChance = Math.round(Math.max(...live.forecast.list.slice(0, 8).map((entry) => entry.pop || 0)) * 100);
        weatherPayload = {
          place: [current.name, current.sys.country].filter(Boolean).join(", "),
          temperatureC: Math.round(current.main.temp),
          condition: current.weather[0].description,
          rainChance: nextRainChance,
          humidity: current.main.humidity,
          windKmh: Math.round(current.wind.speed * 3.6),
        };
      } catch (error) {
        // Keep the frontend weather context if the fresh weather lookup fails.
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      sendJson(response, 200, { reply: fallbackReply(message, weatherPayload) });
      return;
    }

    const prompt = [
      "You are AgriSaathi Chat, a practical farming assistant for Indian farmers.",
      "Give concise, field-ready guidance in simple English. Use bullet points only when helpful.",
      "IMPORTANT: If the user's question about their crop is too general (e.g., 'my leaves are yellow'), DO NOT immediately guess the answer.",
      "Instead, ask clarifying questions first (e.g., What is the crop? What is the variety? How old is the crop? Are older or younger leaves affected? What was the recent weather?).",
      "When the question is risky or crop-specific, ask for crop, stage, district, and symptoms if missing.",
      "Base your recommendations strictly on the Official Knowledge Base provided below.",
      "Use the provided live weather context for irrigation, spraying, disease risk, and field work advice.",
      "Use the scheme catalog for government scheme answers.",
      "",
      `Current app page: ${body.page || "unknown"}`,
      `Live weather context: ${summarizeWeather(weatherPayload)}`,
      `Market snapshot: ${marketSnapshot.join(" | ")}`,
      `Government scheme catalog: ${JSON.stringify(schemeCatalog)}`,
      `Recent chat: ${JSON.stringify((body.history || []).slice(-8))}`,
      "",
      "--- OFFICIAL KNOWLEDGE BASE ---",
      paddyKnowledge,
      "-------------------------------",
      "",
      `Farmer question: ${message}`,
    ].join("\n");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 4096,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
          ]
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text().catch(() => "Unable to read error body");
      console.error(`Gemini API Error: ${geminiResponse.status} ${geminiResponse.statusText}`, errBody);
      sendJson(response, 200, { reply: fallbackReply(message, weatherPayload) });
      return;
    }

    const data = await geminiResponse.json();
    const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

    sendJson(response, 200, { reply: reply || fallbackReply(message, weatherPayload) });
  } catch (error) {
    console.error("Chat processing error:", error);
    sendJson(response, 500, { error: "Unable to process chat message." });
  }
}

async function handleCropAnalysis(request, response) {
  try {
    const body = JSON.parse(await readBody(request));
    const { image, cropName } = body;

    if (!image || !cropName) {
      sendJson(response, 400, { error: "Image and cropName are required." });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      sendJson(response, 500, { error: "Gemini API key is missing." });
      return;
    }

    const prompt = `Analyze this image of a ${cropName} crop. Use the Official Knowledge Base provided below to identify any diseases, pests, or deficiencies. 

Provide a short health report, mention any identified diseases or deficiencies, and suggest specific fertilizers or pesticides exactly as recommended in the Knowledge Base. If the symptom is ambiguous, state that the confidence is low and suggest what the farmer should check manually.

Format your response strictly as JSON with exactly three keys: "title" (string, short diagnosis title), "description" (string, the detailed report), and "suggestions" (array of strings, e.g., ["Apply Urea", "Foliar N Spray"]).

--- OFFICIAL KNOWLEDGE BASE ---
${paddyKnowledge}
-------------------------------`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            maxOutputTokens: 4096,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errBody = await geminiResponse.text().catch(() => "Unable to read error");
      console.error("Gemini Vision API Error:", geminiResponse.status, errBody);
      sendJson(response, 500, { error: "Failed to analyze image." });
      return;
    }

    const data = await geminiResponse.json();
    const replyText = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    
    let result;
    try {
      result = JSON.parse(replyText);
    } catch (e) {
      result = { title: "Analysis Complete", description: replyText, suggestions: [] };
    }

    sendJson(response, 200, result);
  } catch (error) {
    console.error("Crop analysis error:", error);
    sendJson(response, 500, { error: "Unable to process crop analysis." });
  }
}

async function handleMarketPrices(requestUrl, response) {
  try {
    const crop = (requestUrl.searchParams.get("crop") || "Paddy").toLowerCase();
    
    const marketData = {
      paddy: { price: "Rs 2,540", sentiment: "Strong Buy", trend: "+1.2%", description: "Prices are steady within the typical ₹1,900 – ₹3,200 range." },
      cotton: { price: "Rs 6,800", sentiment: "Hold", trend: "0.0%", description: "Trading stably within the ₹6,200 – ₹7,500 range." },
      wheat: { price: "Rs 2,250", sentiment: "Hold", trend: "+0.5%", description: "Prices are steady within the ₹2,100 – ₹2,400 range." },
      maize: { price: "Rs 1,850", sentiment: "Buy", trend: "+2.1%", description: "Demand is high; prices are within the ₹1,600 – ₹2,100 range." },
      sugarcane: { price: "Rs 350", sentiment: "Hold", trend: "0.0%", description: "Prices are steady within the ₹310 – ₹390 range." },
      soybean: { price: "Rs 4,850", sentiment: "Hold", trend: "-0.5%", description: "Prices are steady within the ₹4,500 – ₹5,200 range." },
      soyabean: { price: "Rs 4,850", sentiment: "Hold", trend: "-0.5%", description: "Prices are steady within the ₹4,500 – ₹5,200 range." },
      groundnut: { price: "Rs 6,100", sentiment: "Buy", trend: "+1.5%", description: "Good demand; prices are within the ₹5,800 – ₹6,600 range." },
      mustard: { price: "Rs 5,400", sentiment: "Hold", trend: "0.0%", description: "Prices are steady within the ₹5,100 – ₹5,800 range." },
      sunflower: { price: "Rs 5,200", sentiment: "Hold", trend: "+0.8%", description: "Trading stably within the ₹4,800 – ₹6,000 range." },
      castor: { price: "Rs 5,900", sentiment: "Hold", trend: "-1.0%", description: "Prices are steady within the ₹5,600 – ₹6,200 range." },
      jowar: { price: "Rs 2,900", sentiment: "Hold", trend: "+0.4%", description: "Trading stably within the ₹2,500 – ₹3,300 range." },
      bajra: { price: "Rs 2,300", sentiment: "Hold", trend: "0.0%", description: "Prices are steady within the ₹2,100 – ₹2,600 range." },
      ragi: { price: "Rs 3,700", sentiment: "Strong Buy", trend: "+2.5%", description: "High demand; prices are within the ₹3,400 – ₹4,100 range." },
      barley: { price: "Rs 2,100", sentiment: "Hold", trend: "-0.2%", description: "Trading stably within the ₹1,900 – ₹2,350 range." },
      jute: { price: "Rs 4,800", sentiment: "Hold", trend: "0.0%", description: "Prices are steady within the ₹4,500 – ₹5,100 range." },
      onion: { price: "Rs 2,400", sentiment: "Volatile", trend: "+5.0%", description: "Highly volatile; prices are within the ₹1,800 – ₹3,500 range." },
      potato: { price: "Rs 1,600", sentiment: "Hold", trend: "-1.2%", description: "Trading stably within the ₹1,200 – ₹2,100 range." },
      tomato: { price: "Rs 2,800", sentiment: "Volatile", trend: "-4.5%", description: "Highly volatile; prices are within the ₹2,000 – ₹4,500 range." },
      chilli: { price: "Rs 18,500", sentiment: "Buy", trend: "+1.8%", description: "Strong export demand; prices are within the ₹15,000 – ₹23,000 range." },
      turmeric: { price: "Rs 14,200", sentiment: "Hold", trend: "0.0%", description: "Prices are steady within the ₹12,500 – ₹16,500 range." },
      jeera: { price: "Rs 28,000", sentiment: "Strong Buy", trend: "+3.2%", description: "High demand; prices are within the ₹25,000 – ₹32,000 range." },
      coriander: { price: "Rs 7,500", sentiment: "Hold", trend: "-0.5%", description: "Trading stably within the ₹6,800 – ₹8,500 range." }
    };
    
    // Find matching crop or fallback to default
    let result = marketData[crop];
    if (!result) {
      // Try partial match
      const key = Object.keys(marketData).find(k => crop.includes(k) || k.includes(crop));
      result = key ? marketData[key] : { price: "Rs --", sentiment: "Unknown", trend: "--", description: "Data not available for this crop." };
    }
    
    sendJson(response, 200, result);
  } catch (error) {
    console.error("Market price error:", error);
    sendJson(response, 500, { error: "Unable to process market prices." });
  }
}

function serveStatic(requestUrl, response) {
  const filePath = safeStaticPath(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/weather") {
    handleWeather(requestUrl, response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/news") {
    handleNews(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/chat") {
    handleChat(request, response);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/analyze-crop") {
    handleCropAnalysis(request, response);
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/market-prices") {
    handleMarketPrices(requestUrl, response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(requestUrl, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`AgriSaathi app running at http://localhost:${PORT}`);
});
