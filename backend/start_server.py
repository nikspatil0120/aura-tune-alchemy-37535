#!/usr/bin/env python3
"""
Startup script for the AuraTune backend server
"""
import os
import sys
import subprocess
import warnings

def check_and_install_requirements():
    """Check if requirements are installed and install if needed"""
    try:
        import fastapi
        import uvicorn
        import motor
        import sklearn
        import xgboost
        print("✅ All required packages are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing package: {e}")
        print("Installing requirements...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
            print("✅ Requirements installed successfully")
            return True
        except subprocess.CalledProcessError:
            print("❌ Failed to install requirements")
            return False

def check_models():
    """Check if ML models exist"""
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    model_path = os.path.join(models_dir, "mood_classifier.joblib")
    le_path = os.path.join(models_dir, "mood_label_encoder.joblib")
    
    if os.path.exists(model_path) and os.path.exists(le_path):
        print("✅ ML models found")
        return True
    else:
        print("⚠️  ML models not found - server will run in development mode")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting AuraTune backend server...")
    
    # Suppress sklearn version warnings
    warnings.filterwarnings("ignore", category=UserWarning)
    
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",  # Listen on all network interfaces
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

if __name__ == "__main__":
    print("🎵 AuraTune Backend Server")
    print("=" * 30)
    
    if check_and_install_requirements():
        check_models()
        start_server()
    else:
        print("❌ Cannot start server due to missing requirements")
        sys.exit(1)