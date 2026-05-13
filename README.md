# ✈️ Jravel - AI-Powered Travel Planner

> Final Year Capstone Project | React · Firebase · Gemini AI

**Live Demo**: [https://capstone-project-kappa-mauve.vercel.app/](https://capstone-project-kappa-mauve.vercel.app/)  
**Presentation**: [Watch on YouTube](https://youtu.be/ldB8Z27gqvk?si=2TuTDuKAseisKwOy)

---

## 🌟 What is Jravel?

Jravel is a full-stack travel planning web app where users can plan trips individually or with a group. It features real-time collaboration, AI-powered destination suggestions, and integrated booking links - all in one platform.

Journey detail,
Reservation ticket, 
Activities, 
Vehicle, 
Expenses, 
Luggage                                 (JRAVEL)
---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🤖 AI Trip Planner | 2-agent AI flow: suggests destinations then builds a full day-by-day itinerary |
| 🗺️ Custom Itinerary Builder | Drag-and-drop trip planning with interactive map |
| 💬 Live Group Chat | Real-time chat inside each trip (Firebase Realtime) |
| 👥 Collaborators | Invite admin/viewer members to plan trips together |
| 💰 Budget Tracker | Set budgets, track spending per trip in ₹ |
| 🏨 Booking Links | Direct links to MakeMyTrip (flights, hotels) and IRCTC (trains) |
| 🔐 Auth | Email/password login via Firebase Auth |

---

## 🤖 How the AI Trip Planner Works

The AI feature uses a **2-agent orchestration pattern** (inspired by the [A2A Protocol](https://github.com/extrawest/a2a_protocol_fundamentals_python)):

1. **Agent 1 - Trip Suggester**: Takes user inputs (vibe, duration, city, budget) and calls the Gemini API to return 4 personalised destination options
2. **Agent 2 - Itinerary Planner**: Takes the user's selected destination and generates a complete day-by-day itinerary with activities, food tips, and cost breakdown

Both agents run entirely client-side. If no API key is present, the app gracefully falls back to 28 curated destinations across 7 travel vibes.

---

## 🛠️ Tech Stack

- **Frontend**: React (Create React App), Material UI, Leaflet Maps
- **Backend/DB**: Firebase Firestore, Firebase Auth, Firebase Storage
- **AI**: Google Gemini 1.5 Flash (via REST API)
- **Deployment**: Vercel

---

## ⚙️ Getting Started

### 1. Clone and install
```bash
git clone https://github.com/Ady-OZz/Capstone-Project.git
cd Capstone-Project
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and add your Gemini API key
# Get one free at: https://aistudio.google.com/app/apikey
```

### 3. Run locally
```bash
npm start
# Opens at http://localhost:3000
```

### 4. Build for production
```bash
CI=false DISABLE_ESLINT_PLUGIN=true npm run build
```

---

## 🌐 Deploying to Vercel

1. Connect your GitHub repo at [vercel.com](https://vercel.com)
2. Framework: **Create React App**
3. Add environment variables:
   - `CI` = `false`
   - `DISABLE_ESLINT_PLUGIN` = `true`
   - `REACT_APP_GEMINI_API_KEY` = your key
4. Deploy

The `vercel.json` in this repo handles SPA routing so page refreshes don't 404.

---

## 👥 Team

Final Year Project - [Watch our presentation](https://youtu.be/ldB8Z27gqvk?si=2TuTDuKAseisKwOy) to see each member's contributions.

---

## 📄 License

MIT
