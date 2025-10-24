import os
from contextlib import asynccontextmanager

import joblib
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth as auth_router
from routers import user as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load environment for backend
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
    
    # Load ML artifacts once with error handling
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    model_path = os.path.join(models_dir, "mood_classifier.joblib")
    le_path = os.path.join(models_dir, "mood_label_encoder.joblib")
    
    app.state.mood_model = None
    app.state.mood_label_encoder = None
    
    if os.path.isfile(model_path) and os.path.isfile(le_path):
        try:
            # Suppress warnings for model loading
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                app.state.mood_model = joblib.load(model_path)
                app.state.mood_label_encoder = joblib.load(le_path)
            print("✅ ML models loaded successfully")
        except Exception as e:
            print(f"⚠️  Failed to load ML models: {e}")
            print("🔄 Server will run in development mode")
    else:
        print("⚠️  ML model files not found - running in development mode")
    
    yield
    # Teardown if necessary


app = FastAPI(lifespan=lifespan, title="AuraTune Backend", version="1.0.0")

# CORS for frontend - Enhanced configuration
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

# Comprehensive list of allowed origins for development and network access
origins = [
    frontend_origin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",  # Vite preview
    "http://127.0.0.1:4173",
    # Add null for file:// protocol (for direct HTML files)
    "null"
]

# Add network access origins (replace YOUR_IP with your actual IP)
import socket
try:
    # Get local IP address
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    # Add network origins for common ports
    network_origins = [
        f"http://{local_ip}:5173",
        f"http://{local_ip}:8080", 
        f"http://{local_ip}:3000",
        f"http://{local_ip}:4173",
    ]
    origins.extend(network_origins)
    print(f"🌐 Network access enabled for IP: {local_ip}")
except:
    print("⚠️ Could not determine local IP - network access may be limited")

print(f"🌐 CORS enabled for origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Cache-Control",
        "Pragma",
        "Expires",
    ],
    expose_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(user_router.router)


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": app.state.mood_model is not None}


