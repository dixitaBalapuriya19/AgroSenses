# 🚀 Deployment Guide - AgroSense

## Overview
- **Frontend**: Vercel (https://agrosense-health.vercel.app)
- **Backend**: Render (https://agrosense-backend-otb9.onrender.com)

---

## 🔧 Backend Deployment (Render)

### 0. Deploy the `server/` service correctly

Use these Render settings for the backend service:

```bash
Root Directory: server
Build Command: pip install -r requirements.txt
Start Command: waitress-serve --host=0.0.0.0 --port=$PORT app:app
```

Do not install local-model packages such as `torch` or `transformers` on Render unless you are using a much larger instance. This repo now keeps them in `server/requirements-optional-local-models.txt` for local/offline use only.

### 1. Set Environment Variables in Render Dashboard

Go to your Render service dashboard → **Environment** tab and add:

```bash
# CORS Configuration - CRITICAL for frontend access
CORS_ORIGINS=https://agrosense-health.vercel.app,http://localhost:5173

# Server Config
PORT=8000
HOST=0.0.0.0
FLASK_DEBUG=false

# API Keys (add your actual keys)
HUGGINGFACE_API_KEY=your_actual_key_here
GEMINI_API_KEY=your_actual_key_here
OPENWEATHER_API_KEY=your_actual_key_here

# Provider Order
PROVIDER_ORDER=gemini,hf,mock

# Environmental Data
DEFAULT_LOCATION=Rajkot,Gujarat,IN
DEFAULT_LATITUDE=22.3039
DEFAULT_LONGITUDE=70.8022
```

### 2. Verify Backend is Running

Test your backend health endpoint:
```bash
curl https://agrosense-backend-otb9.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Plant Disease Detection API",
  "time": "2026-03-11T...Z"
}
```

---

## 🌐 Frontend Deployment (Vercel)

### 1. Set Environment Variables in Vercel Dashboard

Go to **Project Settings** → **Environment Variables** and add:

**Variable Name**: `VITE_API_URL`  
**Value**: `https://agrosense-backend-otb9.onrender.com/api`  
**Environment**: Production, Preview, Development (all)

### 2. Redeploy Frontend

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the three dots (...) on the latest deployment
3. Select **Redeploy**
4. ✅ Check "Use existing Build Cache"
5. Click **Redeploy**

---

## 🐛 Troubleshooting

### Error: `ERR_BLOCKED_BY_CLIENT`

**Cause**: CORS misconfiguration or missing environment variables

**Fix**:
1. ✅ Verify `CORS_ORIGINS` in Render includes your Vercel URL
2. ✅ Verify `VITE_API_URL` in Vercel points to Render backend
3. ✅ Redeploy **both** services after changes

### Error: `Failed to fetch`

**Cause**: Backend not responding or wrong URL

**Fix**:
1. Test backend directly: `curl https://agrosense-backend-otb9.onrender.com/health`
2. Confirm Render Root Directory is `server`
3. Confirm Render Start Command is `waitress-serve --host=0.0.0.0 --port=$PORT app:app`
4. Check Render logs for dependency install or boot failures
5. Verify backend is not sleeping (Render free tier spins down after 15 min inactivity)

### CORS Errors in Browser Console

**Fix**:
1. Open Render dashboard → Environment
2. Update `CORS_ORIGINS` to include:
   ```
   https://agrosense-health.vercel.app,https://agrosense-health-git-*.vercel.app
   ```
3. Restart Render service

---

## 🧪 Testing in Production

### Test Frontend → Backend Connection

1. Open: https://agrosense-health.vercel.app
2. Open browser DevTools (F12) → **Network** tab
3. Upload an image
4. Check the network request to `/api/analyze`:
   - Should show status `200 OK`
   - Should NOT show `ERR_BLOCKED_BY_CLIENT`

### Verify CORS Headers

```bash
curl -I -X OPTIONS \
  -H "Origin: https://agrosense-health.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  https://agrosense-backend-otb9.onrender.com/api/analyze
```

Expected headers:
```
Access-Control-Allow-Origin: https://agrosense-health.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 📝 Quick Fix Checklist

Before deploying, ensure:

- [ ] Backend `CORS_ORIGINS` includes Vercel URL
- [ ] Frontend `VITE_API_URL` points to Render backend
- [ ] Render Root Directory is `server`
- [ ] Render Start Command uses `waitress-serve`
- [ ] Both services redeployed after config changes
- [ ] Backend `/api/health` endpoint responds successfully
- [ ] API keys are set in Render environment
- [ ] Render service is awake (not sleeping)

---

## 🔄 Local Development

### Backend
```bash
cd server
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd client
npm install
npm run dev
```

---

## 📚 Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [CORS Debugging](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors)
- [Vite Env Variables](https://vitejs.dev/guide/env-and-mode.html)
