# Voxora — Enterprise AI Voice Operations Platform

Voxora is an enterprise-grade AI voice platform designed to configure voice agents, conduct real-time voice conversations via browser speech interfaces, manage telephone calls, and review conversational intelligence.

---

## 1. Project Status

> **Current Milestone: Phase 10 — Final Testing, Live Deployment & Production Launch COMPLETED**  
> Complete 10-phase production-ready AI Voice Calling Platform: Enterprise Charcoal & Champagne Gold design system, Gemini-powered conversational engine, persistent call history & transcripts, managed contact directory with consent tracking, analytics KPIs & RFC 4180 CSV export, dynamic agent persona & voice settings, immutable server safety guardrails, vendor-neutral telephony abstraction with emergency number blacklisting and sliding-window rate limiting, and production-hardened deployment configuration (`render.yaml`, `Dockerfile`, `Procfile`, `vercel.json`). All 57 backend pytest tests and 66 frontend Vitest tests pass with 0 TypeScript errors and 0 ESLint errors. Next.js production build succeeds with all 10 routes prerendered. Real telephony calls safely remain in mock sandbox mode (`TELEPHONY_ENABLE_REAL_CALLS=False`) until explicit carrier credential provisioning. Ready for live cloud launch on Vercel and Render.

---

## 2. Technology Stack & Design System

### Technology Stack
- **Frontend:** Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vitest
- **Backend:** Python 3.13, FastAPI, Uvicorn, Pydantic V2 Settings, Google Gen AI SDK (`google-genai`), Pytest
- **AI Model Target:** `gemini-2.5-flash` (configurable server-side via `GEMINI_MODEL`)
- **Speech Audio Pipeline:** Browser Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) with server-side AI processing
- **Telephony (Upcoming):** Twilio / Telnyx SIP media streaming over WebSockets (Phase 5)

### Visual Design System
Voxora uses a restrained, high-contrast, premium enterprise aesthetic:
- **Charcoal:** `#171916` (Primary dark background and deep surfaces)
- **Warm Ivory:** `#F4F0E7` (Primary typography and soft highlights)
- **Champagne Gold:** `#C7A66A` (Brand accents, active indicators, and badges)
- **Muted Sage:** `#DDE4D8` (Success states, system readiness indicators)

---

## 3. Prerequisites (Windows)

Before running the application locally on Windows, ensure the following are installed:

1. **Node.js (v20+ or v24+):**
   - Download from [nodejs.org](https://nodejs.org).
   - Verify in PowerShell:
     ```powershell
     node --version
     npm --version
     ```

2. **Python (v3.11+ or v3.13+):**
   - Download from [python.org](https://www.python.org). Ensure "Add Python to PATH" is checked.
   - Verify in PowerShell:
     ```powershell
     python --version
     ```

3. **Git:**
   - Verify in PowerShell:
     ```powershell
     git --version
     ```

---

## 4. Windows Step-by-Step Setup Guide

### Step 1: Open Workspace in PowerShell
```powershell
cd c:\Users\Admin\OneDrive\Desktop\voxora-voice-agent
```

### Step 2: Backend Setup (FastAPI & Gemini Service)
1. Navigate into the backend directory:
   ```powershell
   cd backend
   ```
2. (Optional) Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install backend dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Copy the example environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
5. *(Optional for live Gemini calls)* Edit `backend/.env` and supply your Gemini API key:
   ```text
   GEMINI_API_KEY="your-actual-gemini-api-key"
   GEMINI_MODEL="gemini-2.5-flash"
   ```
   *(Note: If no key is set or the placeholder is left intact, the backend safely returns a 503 setup notice and the frontend falls back to deterministic demo responses without crashing).*
6. Run backend automated unit tests:
   ```powershell
   python -m pytest
   ```
7. Start the FastAPI development server:
   ```powershell
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be running at:
   - Interactive Swagger API Documentation: `http://localhost:8000/docs`
   - Health Probe: `http://localhost:8000/api/v1/health`
   - Gemini Status Probe: `http://localhost:8000/api/v1/conversation/status`
   - Conversation Endpoint: `POST http://localhost:8000/api/v1/conversation`

### Step 3: Frontend Setup (Next.js Voice Client)
Open a second PowerShell window and run:
1. Navigate into the frontend directory:
   ```powershell
   cd c:\Users\Admin\OneDrive\Desktop\voxora-voice-agent\frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Copy the example environment file:
   ```powershell
   Copy-Item .env.example .env.local
   ```
4. Run frontend automated tests:
   ```powershell
   npm test
   ```
5. Run TypeScript and ESLint verification:
   ```powershell
   npx tsc --noEmit
   npm run lint
   ```
6. Start the Next.js development server:
   ```powershell
   npm run dev
   ```
7. Open your browser and visit: `http://localhost:3000` (or `http://localhost:3000/voice` for the Voice Playground).

---

## 5. Project Directory Structure

```text
voxora-voice-agent/
│
├── frontend/                     # Next.js App Router & React TypeScript client
│   ├── app/                      # Application routes
│   │   ├── page.tsx              # Operations dashboard (KPIs, charts, recent activity)
│   │   ├── voice/page.tsx        # Voice Playground (Microphone, transcript, audio stream)
│   │   ├── agent/page.tsx        # Agent persona & system prompt configuration
│   │   ├── calls/page.tsx        # Call history archive with search & status filters
│   │   ├── contacts/page.tsx     # Managed directory with add-contact form validation
│   │   ├── analytics/page.tsx    # Statistical duration & outcome distributions (Recharts)
│   │   ├── settings/page.tsx     # Operator profile preferences & integration status
│   │   ├── globals.css           # Design tokens, variables, scrollbar styling
│   │   └── layout.tsx            # Global HTML document shell
│   ├── components/               # Reusable enterprise UI components
│   │   ├── app-shell.tsx         # Responsive sidebar & header shell wrapper
│   │   ├── sidebar.tsx           # Persistent desktop & slide-out mobile navigation
│   │   ├── topbar.tsx            # Top header with status indicators
│   │   ├── voice/waveform.tsx    # Animated audio visualizer (respects reduced motion)
│   │   └── ui/                   # Base atoms (StatusBadge, DemoBanner, StatCard)
│   ├── lib/                      # Business & API utilities
│   │   ├── conversation-api.ts   # Backend API communication & graceful fallback engine
│   │   ├── voice-engine.ts       # Web Speech API helpers & deterministic demo responder
│   │   ├── mock-data.ts          # Believable mock telemetry records
│   │   └── utils.ts              # Class name mergers & time formatters
│   ├── types/                    # TypeScript interfaces
│   │   └── index.ts              # Agent, CallRecord, Contact, VoiceSession types
│   ├── tests/                    # Automated frontend tests (Vitest)
│   │   ├── voice-session.test.ts # 32 unit tests covering session lifecycle & API integration
│   │   ├── contacts.test.ts      # 9 unit tests covering Contact CRUD, consent, & queue logic
│   │   ├── analytics.test.ts     # 6 unit tests covering Analytics KPIs, trends, CSV export
│   │   ├── settings.test.ts      # 10 unit tests covering persona config, security, voice
│   │   └── telephony.test.ts     # 9 unit tests covering dispatching, consent check, termination
│   ├── package.json              # Next 15, React 19, Lucide, Recharts, Vitest
│   ├── tsconfig.json             # Strict TypeScript configuration
│   └── tailwind.config.ts        # Custom enterprise palette theme
│
├── backend/                      # Python FastAPI asynchronous backend
│   ├── app/
│   │   ├── api/v1/               # Version 1 API routers
│   │   │   ├── endpoints/
│   │   │   │   ├── health.py     # GET /api/v1/health (probe)
│   │   │   │   ├── conversation.py# POST /api/v1/conversation & GET /status
│   │   │   │   ├── calls.py      # POST, GET, PATCH /api/v1/calls & /complete
│   │   │   │   ├── contacts.py   # POST, GET, PATCH, DELETE /api/v1/contacts
│   │   │   │   ├── analytics.py  # GET /api/v1/analytics/overview, call-trends, call-outcomes, export
│   │   │   │   ├── settings.py   # GET, PUT /api/v1/settings, /reset, /security-status
│   │   │   │   └── telephony.py  # POST, GET /api/v1/telephony/calls, /terminate, /config, /webhooks/status
│   │   │   └── router.py         # Aggregated v1 router & /api/telephony aliases
│   │   ├── core/
│   │   │   └── config.py         # Pydantic Settings, Gemini & Telephony provider config
│   │   ├── db/
│   │   │   ├── models.py         # CallSession, Transcript, Contact, SystemSettings models
│   │   │   └── session.py        # Async SQLite engine & automated migrations
│   │   ├── schemas/
│   │   │   ├── conversation.py   # Conversation validation schemas
│   │   │   ├── call.py           # Call session & transcript schemas
│   │   │   ├── contact.py        # Contact CRUD & validation schemas
│   │   │   ├── analytics.py      # Overview, Trends, Outcomes response schemas
│   │   │   ├── settings.py       # Agent persona, voice, & security schemas
│   │   │   └── telephony.py      # Outbound call initiation, response & carrier config schemas
│   │   ├── services/
│   │   │   ├── gemini_service.py # Google Gen AI SDK integration & immutable safety directives
│   │   │   ├── call_service.py   # Call persistence & pagination service
│   │   │   ├── contact_service.py# Contact CRUD & safe call preservation service
│   │   │   ├── analytics_service.py # KPI aggregations, trends, & RFC 4180 CSV export
│   │   │   ├── settings_service.py # Persona persistence, voice defaults & safe reset
│   │   │   ├── telephony_service.py # Telephony lifecycle management & lock release
│   │   │   └── telephony/        # Provider abstraction & security architecture
│   │   │       ├── base.py       # BaseTelephonyProvider ABC & custom exceptions
│   │   │       ├── security.py   # TelephonySecurityManager (Emergency block, rate limit, collision lock)
│   │   │       ├── mock_provider.py # Safe zero-cost deterministic simulation provider
│   │   │       ├── twilio_provider.py # PSTN Twilio REST integration & webhook verification
│   │   │       └── factory.py    # Provider factory selector
│   │   └── main.py               # FastAPI entry point with CORS middleware
│   ├── tests/                    # Automated backend tests (Pytest)
│   │   ├── test_health.py        # Health probe tests
│   │   ├── test_conversation.py  # Conversation & Gemini mocked tests
│   │   ├── test_calls.py         # Call session & transcript tests
│   │   ├── test_contacts.py      # Contact CRUD, validation & safe deletion tests
│   │   ├── test_analytics.py     # Analytics formulas, empty dataset, boundaries, CSV export
│   │   ├── test_settings.py      # Persona validation, persistence, reset, safety immutability
│   │   ├── test_telephony.py     # Telephony provider, security, rate limit, webhook, lock tests
│   │   └── test_production.py    # Production health probe, CORS parser, DB normalization tests
│   ├── requirements.txt          # fastapi, uvicorn, pydantic, sqlalchemy, aiosqlite, etc.
│   └── .env.example              # Placeholders only
│
├── docs/
│   └── architecture.md           # System blueprint, ERD, and telephony media streaming plan
├── .gitignore                    # Secrets, caches, logs, node_modules, and audio recordings
└── README.md                     # Documentation & startup guide
```

---

## 6. Security and Privacy Principles

1. **No Client-Side Secrets:** `GEMINI_API_KEY` is read strictly by the FastAPI backend process from environment variables. It is never transmitted to the browser, rendered in UI components, or bundled in frontend client code.
2. **Immutable Server Safety Guardrails:** Mandatory server-side safety directives (`SERVER_MANDATORY_SAFETY_RULES`) are unconditionally appended to every Gemini prompt. User-configured instructions cannot override safety controls, execute external transactions, or trigger telephone calls.
3. **Safe Settings Reset Safeguard:** Factory default resets restore persona and voice options without ever modifying or deleting historical call sessions, transcripts, audio durations, or contact records.
4. **Calling Consent Compliance:** Calling consent is never assumed by default (`PENDING_VERIFICATION`). Explicit opt-in (`CONSENT_CONFIRMED`) or revocation (`CONSENT_REVOKED`) is tracked per contact with audit status indicators.
5. **Safe Historical Call Preservation:** Deleting or modifying a contact preserves historical call sessions and conversation transcripts (`ondelete="SET NULL"`), ensuring compliance and audit trails remain permanently intact.
6. **Payload Protection:** User message payloads are bounded to 2,000 characters and conversation history to 20 turns to prevent prompt-injection buffer overflows or token denial-of-service.
7. **Telephony Safety & Legal Compliance:** Outbound telephone calls require affirmative recipient consent (`consent_confirmed`) and authorized operator test confirmation (`authorization_confirmed`). Universal emergency numbers (`911`, `112`, `100`, `999`, etc.) and premium destination prefixes are strictly blocked. Rate limiting (max 5 calls/min) and concurrent active collision locks prevent inadvertent spamming or looping. Provider auth tokens are strictly maintained on the server and never revealed to client browsers.
8. **Jurisdictional Regulatory Safeguards:** The platform adheres strictly to regional telecom mandates, enforcing mock mode by default to prevent TRAI/DoT PSTN interconnect bypass violations in India, while supporting US/Canada 10DLC A2P and STIR/SHAKEN caller verification.

---

## 7. Live Cloud Deployment Guide

Voxora is architected for a decoupled production topology:
- **Frontend:** Vercel (Edge CDN, SSL, Next.js App Router)
- **Backend:** Render / AWS ECS / Google Cloud Run (Containerized FastAPI ASGI)
- **Database:** Render PostgreSQL / Supabase / Neon / AWS RDS

### Step A: Backend & Database Deployment (Render)
1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\to$ **Blueprint** and connect the repository. Render will automatically detect `render.yaml`.
3. In the environment configuration:
   - Provide `GEMINI_API_KEY` (secret server environment variable).
   - Set `CORS_ORIGINS` to your frontend production domain (e.g. `https://voxora.vercel.app`).
   - The PostgreSQL `DATABASE_URL` is automatically linked from the managed database.
4. Render builds the service using Python 3.13 and binds to `$PORT`.
5. Verify health: `curl https://your-backend.onrender.com/health` returns `{"status":"healthy"}`.

### Step B: Frontend Deployment (Vercel)
1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New Project** and import the repository.
2. Set **Root Directory** to `frontend`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Set to your Render backend URL (e.g. `https://your-backend.onrender.com`).
   - `NEXT_PUBLIC_APP_ENV`: `production`
4. Click **Deploy**. Vercel will run `npm run build` and output the live production HTTPS URL.

