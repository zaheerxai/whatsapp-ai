# WhatsApp Group AI Agent 🤖

An intelligent WhatsApp group agent powered by **Groq LLM** and **Supabase**, capable of responding to messages, managing group context, and executing custom commands.

## Features

- 🧠 **AI-Powered Responses** — Uses Groq's fast LLM inference to generate smart, context-aware replies
- 💾 **Persistent Memory** — Stores conversation history and group context in Supabase
- ⚡ **Command System** — Extensible slash-command architecture for custom group actions
- 🔒 **Secure QR Auth** — Protected QR code endpoint for WhatsApp Web session initialization
- 🌐 **Express API** — REST server for managing the agent remotely

## Tech Stack

| Layer | Technology |
|---|---|
| WhatsApp Client | [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) |
| LLM | [Groq API](https://groq.com) via `openai` SDK |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Server | Express.js |
| Runtime | Node.js ≥ 18 |

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/zaheerxai/whatsapp-ai.git
cd whatsapp-ai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TARGET_GROUP_ID=your_whatsapp_group_id
QR_SECRET=change-me
PORT=3000
```

### 4. Set up Supabase

Run the SQL migrations found in the `sql/` directory against your Supabase project.

### 5. Start the agent

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 6. Authenticate WhatsApp

Once the server is running, navigate to `http://localhost:3000/qr?secret=<QR_SECRET>` in your browser to scan the QR code with WhatsApp.

## Project Structure

```
whatsapp-ai/
├── src/
│   ├── commands/      # Custom slash commands
│   ├── config.js      # App configuration
│   ├── db/            # Supabase database helpers
│   ├── llm/           # Groq LLM integration
│   ├── server/        # Express API routes
│   ├── utils/         # Shared utilities
│   └── whatsapp/      # WhatsApp client & event handlers
├── sql/               # Supabase SQL migrations
├── index.js           # Entry point
├── .env.example       # Environment variable template
└── package.json
```

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) |
| `TARGET_GROUP_ID` | WhatsApp group ID the agent monitors |
| `QR_SECRET` | Secret token to protect the `/qr` endpoint |
| `PORT` | HTTP server port (default: `3000`) |

## License

MIT
