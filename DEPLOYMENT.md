# Sai Dental Clinic — Production Deployment Guide

This guide walks you through deploying the **Backend API on Render** and the **Frontend Client on Vercel**.

---

## Step 1: Deploy Backend on Render

1. **Log in to Render**: Go to [render.com](https://render.com/) and log in with your GitHub account.
2. **Create New Web Service**:
   - Click **New +** -> **Web Service**.
   - Connect your GitHub repository (`sai-dental-dp`).
3. **Configure Service Details**:
   - **Name**: `sai-dental-backend`
   - **Region**: Select closest region (e.g. Singapore or Oregon)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
4. **Set Environment Variables**:
   Add the following variables under **Environment**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/sai_dental?retryWrites=true&w=majority` *(Your MongoDB Atlas connection string)*
   - `JWT_SECRET`: Generate a strong random string
   - `JWT_REFRESH_SECRET`: Generate another strong random string
   - `CLIENT_URL`: `https://<your-vercel-app-name>.vercel.app` *(Update this after deploying Vercel)*
5. **Deploy**:
   - Click **Create Web Service**.
   - Copy your deployed Render backend URL (e.g. `https://sai-dental-backend.onrender.com`).

---

## Step 2: Deploy Frontend Client on Vercel

1. **Log in to Vercel**: Go to [vercel.com](https://vercel.com/) and log in with your GitHub account.
2. **Import Repository**:
   - Click **Add New...** -> **Project**.
   - Select your repository (`sai-dental-dp`).
3. **Configure Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - Add variable name: `VITE_API_URL`
   - Value: `https://sai-dental-backend.onrender.com/api` *(Your Render Backend API URL + `/api`)*
5. **Deploy**:
   - Click **Deploy**.
   - Once deployed, copy your production Vercel URL (e.g. `https://sai-dental-clinic.vercel.app`).

---

## Step 3: Link Backend CORS to Vercel Domain

1. Return to your **Render Dashboard** -> `sai-dental-backend` -> **Environment**.
2. Update `CLIENT_URL` to your live Vercel domain:
   ```
   CLIENT_URL=https://sai-dental-clinic.vercel.app
   ```
3. Render will automatically redeploy the backend.
