# Production Deployment Guide - BonChat

This guide explains how to deploy your BonChat application for production.

## Prerequisites
- Node.js (v18+)
- Docker (Optional, recommended)
- A publicly accessible URL (for Supabase & WebRTC)

## Environment Variables
Ensure the following variables are set in your production environment (`.env` file or hosting provider dashboard):

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
PORT=3000
NODE_ENV=production
```

## Option 1: Using Docker (Recommended)
We've included a `Dockerfile` for easy containerized deployment.

1. **Build the image**:
   ```bash
   docker build -t bonchat .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 --env-file .env bonchat
   ```

## Option 2: Using PM2 (Standard VPS)
If you are deploying directly to a Linux server:

1. **Install dependencies**:
   ```bash
   npm install --production
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Start with PM2**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name bonchat --env production
   ```

## Option 3: Hosting Providers (Vercel/Netlify)
> [!CAUTION]
> Because BonChat uses a **custom Express server** and **Socket.io**, standard serverless hosting like Vercel is NOT recommended. Use a platform that supports persistent processes like **Railway**, **Render**, **Fly.io**, or **DigitalOcean App Platform**.

## WebRTC Notes
For production WebRTC (Simple-Peer) to work across different networks, you may eventually need to add **TURN servers** to your configuration in `[roomId].tsx`. Currently, it uses Google's free STUN server, which works for most users but may fail on strict corporate firewalls.
