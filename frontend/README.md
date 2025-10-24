# AuraTune - Music Mood Therapy & Playlist Generator

AI-crafted playlists that understand how you feel and how you want to feel. Transform your mood with therapeutic music experiences.

## Project Overview

AuraTune is an intelligent music therapy platform that creates personalized playlists based on your current emotional state and desired mood. Using advanced AI and Spotify integration, it analyzes your listening history to craft therapeutic musical journeys.

## Features

- **Mood-Based Playlist Generation**: Create playlists based on your current and target emotional states
- **Spotify Integration**: Seamless connection with your Spotify account for personalized recommendations
- **Musical DNA Analysis**: Deep insights into your music preferences and listening patterns
- **Therapeutic Chat Interface**: AI-powered conversations to understand your emotional needs
- **Real-time Mood Tracking**: Visual representation of your emotional journey through music

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: React Query + Context API
- **Routing**: React Router
- **Charts**: Recharts
- **Backend**: Python FastAPI
- **AI**: Google Gemini API
- **Music API**: Spotify Web API

## Getting Started

### Prerequisites

- Node.js & npm installed
- Python 3.8+ installed
- Spotify Developer Account
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aura-tune-alchemy
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python start_server.py
   ```

4. **Environment Variables**
   
   Create `.env` files in both frontend and backend directories with the required API keys and configuration.

## Development

- **Frontend**: Runs on `http://localhost:5173`
- **Backend**: Runs on `http://localhost:8000`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.