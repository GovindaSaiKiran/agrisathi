# AgriSathi

Agrisathi is a smart agricultural assistance platform designed to help farmers with weather insights, crop advisories, market price tracking, government scheme awareness, and crop health support. The project is built as a college expo initiative focused on making farming more informed, data-driven, and accessible.

Live Demo: https://agrisathi-alpha.vercel.app/

## Project Overview

Agriculture depends heavily on timely decisions related to rainfall, crop health, irrigation planning, market price movement, and subsidy availability. AgriSathi brings these critical tools into a single dashboard so farmers can quickly access actionable information in a user-friendly format.

The application is tailored for Indian farmers and includes:

- Weather intelligence based on live location data
- Market price information for major crops
- Agricultural recommendations and crop knowledge support
- Government schemes and subsidy awareness
- Crop health analysis using image input and AI assistance
- AI-powered chat help for farming-related questions

## Why This Project Matters

Farmers often face uncertainty in daily decisions due to insufficient access to real-time information. AgriSathi aims to reduce that information gap by combining weather, market, scheme, and crop guidance into a simple digital tool.

This project is especially useful for:

- Small and marginal farmers
- Farmers planning crop operations based on weather
- People exploring agricultural digital tools for the first time
- College-level innovation projects focused on social impact

## Features

### 1. Weather Intelligence
- Live weather information using OpenWeather/Open-Meteo APIs
- Current temperature, humidity, wind, and rain probability
- Forecast insight for daily agricultural planning
- Recommendations based on weather conditions

### 2. Market Analytics
- Crop-wise market price tracking
- Price sentiment and trend indicators
- Quick decision support for selling and planning harvest timing

### 3. Government Schemes and Subsidies
- Information about agricultural schemes and financial support
- Awareness of policies such as PM-KISAN, Kisan Credit Card, PMFBY, PM-KUSUM, and others
- Farmer-friendly presentation of subsidy benefits

### 4. Crop Health Lab
- Upload crop images for AI-based assessment
- Possible disease, pest, or deficiency identification
- Guidance on next steps and crop management

### 5. AI Chat Assistant
- Farmer query support using Gemini AI
- Context-aware responses based on weather and crop knowledge
- Answers for crop care, irrigation, disease issues, and scheme-related questions

### 6. Agriculture Knowledge Base
- Crop-specific knowledge content for paddy and related agricultural guidance
- Practical recommendations based on recognized agronomic practices

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Responsive dashboard UI

### Backend
- Node.js
- JavaScript server running on a lightweight HTTP server

### External APIs / Services
- OpenWeather API
- Open-Meteo API
- Google Gemini AI
- Perigon News API

## Project Structure

```text
agrisathi/
├── .env.example
├── .gitignore
├── README.md
├── background.jpg
├── package.json
├── server.js
├── vercel.json
├── knowledge/
│   └── paddy.md
├── stitch_agrisaathi_mobile_dashboard_replicated/
│   ├── app.js
│   ├── index.html
│   ├── styles.css
│   ├── background-paddy.jpg
│   ├── central_dashboard/
│   ├── crop_health_lab/
│   ├── market_analytics/
│   ├── schemes_subsidies/
│   ├── weather_intelligence/
│   └── agrisaathi/
└── ...
```

## Architecture Overview

The application consists of a lightweight Node.js backend that serves the frontend assets and exposes API routes for:

- `/api/health` — health check
- `/api/weather` — weather data
- `/api/news` — agriculture-related news
- `/api/chat` — AI assistant chat
- `/api/analyze-crop` — crop image analysis
- `/api/market-prices` — crop market prices

The frontend is a dashboard-like mobile interface built around crop, market, scheme, and weather panels.

## Environment Variables

Create a `.env` file in the project root based on `.env.example`.

Example:

```env
OPENWEATHER_API_KEY_1="your_first_weather_api_key_here"
OPENWEATHER_API_KEY_2="your_second_weather_api_key_here"
GEMINI_API_KEY="your_gemini_api_key_here"
PERIGON_API_KEY="your_perigon_api_key_here"
```

### Notes
- The app falls back to Open-Meteo if OpenWeather credentials are unavailable.
- Gemini AI is used for the chat assistant and crop image analysis.
- The project is configured to work well with Vercel deployment.

## Local Setup

### Prerequisites
- Node.js (recommended: v18 or above)
- npm
- A valid API key for Gemini and weather services (optional for local demo depending on fallback behavior)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/GovindaSaiKiran/agrisathi.git
cd agrisathi
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file and add required environment variables.

4. Start the server:

```bash
npm start
```

5. Open the app in your browser:

```text
http://localhost:5174
```

## Deployment

This project is configured for Vercel deployment. The repository includes a `vercel.json` file to support deployment routing.

Live project:

https://agrisathi-alpha.vercel.app/

## Features in Detail

### Weather and Field Planning

The weather module helps with:
- Rain probability monitoring
- Temperature-based scheduling
- Irrigation planning
- Risk estimation for crop stress

### Market Support

Farmers can check stable or volatile crop prices, helping them decide when to sell and with what level of confidence.

### Crop Health Assistance

The crop analysis feature allows users to upload an image and receive structured recommendations that can help identify visible crop problems.

### Farmer Scheme Guidance

The app explains available support schemes and financial assistance in a simplified, farmer-friendly way.

## Use Cases

Agrisathi can be used for:

- Checking current field conditions before irrigation
- Looking up crop prices to decide harvest timing
- Understanding weather patterns during planting and harvesting
- Learning about government crop support schemes
- Diagnosing visual symptoms in crops with AI assistance

## Challenges Addressed

This project addresses real agricultural problems such as:

- Lack of timely weather knowledge
- Poor market awareness
- Limited access to digital agricultural aid
- Difficulty understanding government support programs
- Slow diagnosis of crop issues

## Potential Future Enhancements

- Login and farmer profile system
- Multi-language support (Hindi, Telugu, Marathi, etc.)
- Voice assistance for farmers
- Real-time mandi data integration
- More crop-specific knowledge modules
- Offline mode for low-connectivity regions
- SMS/WhatsApp alert notifications

## Academic / Expo Value

This project demonstrates:

- Problem-solving through technology
- Integration of AI, APIs, and dashboard design
- Social impact in agriculture
- Real-world application of frontend and backend development
- Innovation with a focus on accessible digital tools for rural communities

## License

This repository is currently shared for academic and project demonstration purposes.

## Acknowledgements

- OpenWeather and Open-Meteo for weather data
- Google Gemini AI for conversational and image-based crop intelligence
- Agriculture and government data sources used for scheme and market awareness
- College project expo community for encouraging practical innovation

## Contact

For project discussion, collaboration, or enhancement ideas:

- GitHub: https://github.com/GovindaSaiKiran
- Project Repository: https://github.com/GovindaSaiKiran/agrisathi

## Summary

Agrisathi is a farmer-focused digital dashboard built to simplify decision-making with real-time weather, market insight, crop guidance, AI support, and subsidy awareness. It reflects a meaningful use of technology to support agricultural productivity and farmer knowledge.

---

If you want, I can also create a more polished version of this README specifically for GitHub with:

- badges
- a demo screenshot section
- a technical architecture diagram in markdown
- a Hindi/English bilingual version for better project presentation
