# Plant Care AI - Server (Backend)

Flask API for plant disease analysis using Gemini, Hugging Face, or mock providers.

## Quick Start

```bash
cd server
python -m venv venv
venv\Scripts\activate       # Windows
source venv/bin/activate    # Mac/Linux

pip install -U pip
pip install -r requirements.txt

python app.py
```

The API listens on `http://localhost:8000`.

## Configuration

Edit `.env`:

```dotenv
# Hugging Face Inference API
HUGGINGFACE_API_KEY=your_hf_token
HUGGINGFACE_MODEL=juppy44/plant-identification-2m-vit-b

# Google Gemini
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash

# Provider order (tries in sequence)
PROVIDER_ORDER=gemini,hf,mock

# Flask
FLASK_DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://agrosense-health.vercel.app
```

## Endpoints

- **POST /api/analyze** – Analyze a plant image
  ```json
  {
    "image": "data:image/jpeg;base64,..."
  }
  ```
  Returns disease info, confidence, severity, and treatment steps.

- **GET /api/health** – Server status
- **GET /api/diseases** – List all disease types

## Logs

Rotating logs in `logs/app.log` with request/response timing and error details.

## Production

```bash
pip install -r requirements.txt
waitress-serve --host=0.0.0.0 --port=8000 app:app
```

## Render

For Render, deploy from the `server` directory using the included [render.yaml](c:\Users\solan\OneDrive\Desktop\AgroSense\server\render.yaml).

The default `requirements.txt` intentionally excludes heavyweight local-model packages such as PyTorch and Transformers so the service can boot reliably on small cloud instances. If you want offline local-model support for development, also install:

```bash
pip install -r requirements-optional-local-models.txt
```
