# 🎯 AI Mock Interview Platform

A professional AI-powered mock interview platform built with React, Node.js, MongoDB, and Google's Gemini AI. Practice interviews tailored to your role, get real-time feedback, and track your progress.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.2-61DAFB)
![Node](https://img.shields.io/badge/Node-18.x-339933)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248)

## ✨ Features

- **🤖 AI-Powered Questions** - Smart question generation based on your role, experience, and job description
- **🎤 Voice Recognition** - Practice speaking answers with real-time transcription
- **📊 Detailed Analytics** - Performance tracking with charts and metrics
- **💡 Instant Feedback** - AI analyzes your answers and provides actionable suggestions
- **🔐 Secure Auth** - Authentication powered by Clerk
- **Live voice interviews** - Optional hands-free conversations with spoken questions, interruptions, captions, and transcript-based feedback
- **📱 Responsive Design** - Works seamlessly on desktop and mobile
- **🎨 Modern UI** - Beautiful interface built with Tailwind CSS and shadcn/ui

## 🚀 Quick Start

### Prerequisites

- Node.js 22.12+ (22.x) or 24+; verified with Node 24
- MongoDB Atlas account (or local MongoDB)
- Clerk account (for authentication)
- Google Gemini API key

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-mock-interview

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### 2. Environment Variables

#### Client (`client/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_KEY
```

#### Server (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ai-mock-interview
GEMINI_API_KEY=your_gemini_api_key
CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET
```

### 3. Run the Application

#### Option 1: Start both together (Recommended)
From the project root:
```bash
npm run dev
```

#### Option 2: Start individually
```bash
# Terminal 1 - Start the server
npm run server
# or: cd server && npm run dev

# Terminal 2 - Start the client
npm run client
# or: cd client && npm run dev
```

The app will be available at:
- Client: http://localhost:5173
- Server: http://localhost:5000

## 🏗️ Project Structure

```
ai-mock-interview/
├── client/                     # React + Vite frontend
│   ├── public/
│   │   └── logo.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/            # Reusable UI components (shadcn-style)
│   │   │   ├── Navbar.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── CreateInterview.jsx
│   │   │   ├── InterviewScreen.jsx
│   │   │   ├── Feedback.jsx
│   │   │   └── SignIn.jsx
│   │   ├── lib/
│   │   │   ├── api.js         # Axios API client
│   │   │   ├── utils.js       # Utility functions
│   │   │   └── constants.js   # App constants
│   │   ├── App.jsx            # Router & layout
│   │   ├── main.jsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── .env.example
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── server/                     # Express + MongoDB backend
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # Authentication middleware
│   ├── models/
│   │   └── Interview.js       # MongoDB schema
│   ├── routes/
│   │   └── interviews.js      # API routes
│   ├── services/
│   │   └── gemini.js          # AI question & feedback generation
│   ├── index.js               # Express server entry
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Recharts** - Charts & analytics
- **React Router** - Navigation
- **Clerk** - Authentication
- **Axios** - HTTP client
- **Lucide Icons** - Icon library

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB + Mongoose** - Database
- **Google Gemini AI** - Question & feedback generation
- **Clerk API** - User management

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interviews` | Get all user interviews |
| POST | `/api/interviews` | Create new interview |
| GET | `/api/interviews/:id` | Get single interview |
| GET | `/api/interviews/:id/questions` | Get interview questions |
| POST | `/api/interviews/:id/generate` | Generate AI questions |
| POST | `/api/interviews/:id/submit` | Submit answers & get feedback |
| GET | `/api/interviews/:id/feedback` | Get interview feedback |
| DELETE | `/api/interviews/:id` | Delete interview |
| GET | `/api/health` | Health check |

## 🌐 Deployment

### Live voice interview setup

Choose **Live voice interview** when creating an interview. Existing interviews and the
question-by-question experience remain available. Select an interviewer voice, click
**Start live interview**, and allow microphone access. The interviewer greets you and
asks one question at a time. Speak naturally, mute when needed, and select
**End interview & get feedback** after the final answer (or to finish early).
The question count is a conversational target, not a strict turn counter; clarification
and follow-up exchanges may add turns. Sessions are limited to 30 minutes per connection.

Use a current browser with AudioWorklet support on **HTTPS or localhost**. Headphones
reduce echo. Microphone audio streams as 16kHz PCM through the Express server to Gemini;
returned PCM audio is queued for playback and cleared on interruptions. Raw recordings
are not stored. Server-produced transcripts are saved periodically and after each turn.
Feedback uses these transcripts, not vocal tone. Reconnect after a connection failure
to continue with saved context; audio or transcription still in flight may be lost.

Install dependencies from the root with `npm run install:all`. In `server/.env`, set:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_LIVE_MODEL=gemini-3.8-live
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=sk_test_YOUR_CLERK_SECRET_KEY
```

Set `VITE_CLERK_PUBLISHABLE_KEY` in `client/.env` and set `VITE_API_URL` to your
backend API URL (local default: `http://localhost:5000/api`). Restart after changing
environment variables. The configured Gemini project must have Live API access and
available quota. The Live API uses `@google/genai`; the existing text question and
feedback service still uses `@google/generative-ai`. Model configuration follows the
[official Gemini Live SDK guide](https://ai.google.dev/gemini-api/docs/live-api/get-started-sdk).

New endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/interviews/:id/live-session` | Clerk-protected, ownership-checked, one-use ticket (60s expiry) |
| WebSocket | `/api/live` | First message authenticates with the ticket; relays audio and captions |
| POST | `/api/interviews/:id/live-finish` | Evaluates the stored transcript after the socket has saved and closed |

Gemini keys never enter browser code. Connection tickets are sent in the first WebSocket
message, not query strings or application logs. A session rechecks ownership before
connecting to Gemini. Completion cannot race an active session, and repeated finish
requests reuse completed feedback. Non-live submit/generate routes reject live records.

Deploy the backend on a service supporting **long-lived WebSockets**; proxy `/api/live`
with WebSocket upgrade headers and a timeout suitable for a 30-minute connection. An
HTTPS frontend must use an HTTPS API URL (which maps to WSS). This implementation uses
in-memory one-use tickets and session locks: run **one backend process/replica**. For
horizontal scaling, move ticket consumption, session ownership and transcript writes
to a shared transactional store first. MongoDB is recommended for persistence; local
JSON storage now serializes mutations and atomically replaces the file within one
process, but still does not migrate or reconcile records when switching storage modes.

Validation: `npm --prefix server test`, `npm --prefix client test`, and `npm run build:client`. Tests mock Gemini;
they do not prove provider availability, microphone hardware behavior, or Clerk setup.
For a live smoke test, sign in, create a live interview, allow the microphone, verify
spoken questions/captions, interrupt the interviewer, mute/unmute, end after an answer,
and verify feedback in history. Also reconnect after a disconnect and verify context.
If text-model evaluation fails, the existing word-count heuristic is used and the
feedback screen explicitly labels it as a practice estimate rather than an AI assessment.

The voice transport/audio design was adapted from the user-supplied
`gemini-live-voice-chat.zip`; its standalone unauthenticated demo server was not copied
into the application's authentication flow.

### Frontend (Vercel/Netlify)
1. Build: `cd client && npm run build`
2. Set environment variables in deployment platform
3. Deploy the `dist` folder

### Backend (Railway/Render)
1. Set environment variables in deployment platform
2. Build command: `npm install`
3. Start command: `npm start`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

