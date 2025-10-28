# 🎵 AuraTune - AI Music Therapy & Playlist Generator

> Transform your emotions through intelligent music therapy. AI-crafted playlists that understand how you feel and how you want to feel.

![AuraTune Banner](https://img.shields.io/badge/AuraTune-Music%20Therapy-blueviolet?style=for-the-badge&logo=spotify)

## ✨ Features

- **🎭 Mood-Based Playlist Generation** - Create therapeutic playlists based on your current and target emotional states
- **🧬 Musical DNA Analysis** - Deep insights into your music preferences and listening patterns  
- **💬 AI Therapeutic Chat** - Empathetic conversations with Aura, your AI music therapist
- **📊 Emotional Insights** - Track your mood patterns and musical preferences over time
- **🎧 Spotify Integration** - Seamless connection with your Spotify account for personalized recommendations
- **📈 Real-time Mood Tracking** - Visual representation of your emotional journey through music

## 🚀 Tech Stack

### Frontend
- **React 18.3** + **TypeScript 5.8** + **Vite 5.4**
- **Tailwind CSS 3.4** + **Radix UI** (Complete component library)
- **TanStack React Query 5.8** - Server state management
- **Recharts 2.15** - Data visualization and charts
- **React Router 6.30** - Client-side routing
- **React Hook Form 7.6** + **Zod 3.25** - Form handling & validation
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### Backend
- **FastAPI 0.115** - Modern Python web framework
- **Uvicorn 0.30** - ASGI server
- **Motor 3.6** - Async MongoDB driver
- **Pydantic 2.9** - Data validation and serialization
- **Python-JOSE 3.3** - JWT token handling
- **Requests 2.32** - HTTP client for external APIs

### AI & Machine Learning
- **Google Generative AI** (Gemini 2.5 Flash) - Conversational AI
- **Scikit-learn 1.7+** - Machine learning algorithms
- **XGBoost 2.1+** - Gradient boosting framework
- **Pandas 2.0+** - Data manipulation and analysis
- **NumPy 2.1** - Numerical computing
- **Joblib 1.4** - Model serialization

### External APIs
- **Spotify Web API** - Music data and playlist management
- **Google Gemini API** - Natural language processing for therapy

### Development Tools
- **ESLint 9.32** - Code linting
- **PostCSS 8.5** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js 18+** and **npm**
- **Python 3.8+** and **pip**
- **Spotify Developer Account** ([Create here](https://developer.spotify.com/))
- **Google AI Studio Account** ([Get API key](https://aistudio.google.com/))

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/aura-tune-alchemy.git
cd aura-tune-alchemy
```

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys (see Configuration section)

# Start the backend server
python start_server.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Copy and configure environment variables  
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## ⚙️ Configuration

### Backend Environment Variables (.env)
```bash
# Spotify API Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:5173/auth/callback

# Google AI Configuration  
GEMINI_API_KEY=your_gemini_api_key

# Security
JWT_SECRET=your_jwt_secret_key

# Server Configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend Environment Variables (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
VITE_REDIRECT_URI=http://localhost:5173/auth/callback
```

## 🎯 How It Works

### 1. **Emotional Assessment**
- Chat with Aura, your AI therapist, about your current emotional state
- AI analyzes conversation context and emotional patterns
- Identifies your mood and therapeutic needs

### 2. **Musical Analysis** 
- Connects to your Spotify account to analyze listening history
- Uses frequency-based algorithms to identify your actual favorite artists
- Analyzes audio features (valence, energy, tempo) for mood matching

### 3. **Therapeutic Playlist Generation**
- Creates personalized playlists based on your emotional journey
- Implements therapeutic progression: acknowledgment → processing → healing
- Combines your music taste with mood-appropriate selections

### 4. **Insights & Growth**
- Tracks your emotional patterns over time
- Provides insights into your musical DNA and preferences
- Helps you understand your relationship with music and emotions

## 🎵 Therapeutic Approach

AuraTune uses evidence-based music therapy principles:

- **Emotional Validation** - Songs that mirror current feelings help you feel understood
- **Gradual Transition** - Playlist structure guides you from pain to healing
- **Neurological Benefits** - Music releases dopamine and endorphins naturally
- **Cognitive Reframing** - Uplifting lyrics help shift negative thought patterns
- **Stress Relief** - Specific rhythms and tempos reduce cortisol and anxiety

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify** for their comprehensive Web API
- **Google** for Gemini AI capabilities  
- **The Music Therapy Community** for research and therapeutic approaches
- **Open Source Contributors** who make projects like this possible

## 📞 Support

- 📧 Email: support@auratune.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/aura-tune-alchemy/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/aura-tune-alchemy/discussions)

---

**Made with ❤️ for mental health and music therapy**

*AuraTune - Where technology meets emotional wellness through the power of music.*