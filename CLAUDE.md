# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WhatsApp bot application built with **WPPConnect** that uses **Link Code authentication** instead of QR codes. The system is designed to run on Railway.com and provides a web-based control panel for bot management.

## Architecture

### Core Components
- **Main Application** (`app.js`): Unified entry point handling both frontend and API routes with WPPConnect integration
- **Backend Service** (`backend/`): Alternative Express API server with modular WhatsApp service
- **Frontend** (`public/index.html`): Web control panel for bot management
- **WhatsApp Service** (`backend/services/whatsappService.js`): Singleton service managing WPPConnect operations

### Key Features
- **Link Code Authentication**: Uses WhatsApp's Link Code system instead of QR codes for better container/remote deployment
- **Dual Architecture**: Both standalone (`app.js`) and modular (`backend/`) implementations
- **Railway Deployment**: Optimized Docker configuration for Railway.com hosting
- **Real-time Status**: Web panel with live bot status and health monitoring

## Development Commands

### Local Development
```bash
# Start main application (recommended)
npm start

# Development with auto-reload
npm run dev

# Start backend only (alternative)
npm run backend
npm run backend:dev

# Install backend dependencies
npm run install:backend
```

### Deployment
```bash
# Railway optimized start (memory limited)
npm run railway:start

# Build (frontend already built in dist/)
npm run build
```

### Testing
```bash
# No test framework configured
npm test  # Currently returns error
```

## Railway Deployment Configuration

### Environment Variables
- `NODE_ENV=production`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`
- `CHROME_BIN=/usr/bin/chromium-browser`
- `RAILWAY_ENVIRONMENT=true`

### Docker Optimization
- Uses **Alpine Linux** for smaller image size
- Installs **Chromium** instead of Google Chrome for better repository stability
- Memory optimized for Railway Hobby plan (256-512MB)
- Non-root user configuration for security

## WhatsApp Bot Integration

### WPPConnect Configuration
The bot uses **Link Code authentication** with these key settings:
- `phoneNumber`: Required for Link Code generation
- `catchLinkCode`: Callback for Link Code handling (not catchQR)
- `headless: 'new'`: Optimized for containerized environments
- `useChrome: true`: In production environments
- `qrTimeout: 0`: QR Code disabled in favor of Link Code

### Message Handling
Bot responds to:
- `Hello` → Greeting response
- `/help` → Command list
- `/status` → Bot status
- `/web` → Web panel URL

## Development Environment Detection

The application automatically detects production environment using:
- `process.env.NODE_ENV === 'production'`
- `process.env.RAILWAY_ENVIRONMENT`
- Frontend detects Railway domain patterns

## File Structure Patterns

### Session Management
- Sessions stored in `tokens/session_[phoneNumber]/`
- Token directories excluded from Docker builds via `.dockerignore`

### API Routes Structure
- Main routes in `app.js`: `/start-bot`, `/stop-bot`, `/link-code`
- Backend routes in `backend/routes/`: `/api/whatsapp/*`, `/api/status`
- Health check endpoint: `/health`

## Common Issues & Solutions

### Railway Deployment
- **Chromium Installation**: Use Alpine Linux with `apk add chromium` instead of Ubuntu with Google Chrome
- **Memory Limits**: Use `--max-old-space-size=256` for Railway Hobby plan
- **Browser Args**: Include `--no-sandbox`, `--disable-setuid-sandbox`, `--single-process`

### WhatsApp Authentication  
- **Link Code vs QR**: Always use Link Code in production containers
- **Session Persistence**: Tokens are stored in filesystem, cleared on container restart
- **Phone Number Format**: Validate as 12-13 digits starting with '55' (Brazil format)

### Environment-Specific Configuration
- **Production**: Uses Chromium, optimized browser args, Link Code only
- **Development**: More permissive settings, allows both authentication methods

## Browser Configuration for Containers

Essential browser arguments for Railway/Docker deployment:
```javascript
'--no-sandbox',
'--disable-setuid-sandbox', 
'--disable-dev-shm-usage',
'--disable-gpu',
'--single-process',
'--disable-web-security',
'--memory-pressure-off'
```

## API Integration Points

### Main Application Endpoints (`app.js`)
- `POST /start-bot` → Initialize bot with phone number
- `POST /stop-bot` → Disconnect bot session
- `GET /link-code` → Retrieve current Link Code
- `GET /health` → System health status

### Backend API Endpoints (`backend/routes/`)
- `POST /api/whatsapp/connect`
- `POST /api/whatsapp/disconnect` 
- `POST /api/whatsapp/send-message`

When working with this codebase, prioritize the main application (`app.js`) approach as it's more streamlined for Railway deployment.