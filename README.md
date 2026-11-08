# CODE RED!

**A three-player cooperative coding game built for Hack the Change YYC 2026.**

It's launch day, and three things just broke. The frontend counter is wrong, the inventory system accepts orders it can't fulfill, and the reverse proxy points to the wrong port. Each player takes on a different engineering role, fixes their part of the app, and coordinates with the team.

We built **CODE RED!** for **Prompt 2** to help students practice debugging, communication, and teamwork in a simulated software launch.

---

## Features

- **Real-time multiplayer.** Create a room, share the four-letter code, and play with two teammates in separate browsers.
- **Pixel-art office lobby.** Walk around, see your teammates move live, and claim a workstation to pick your role.
- **Three engineering roles.** Frontend, Backend, and DevOps each get their own bug, file, and workstation.
- **In-browser code editor.** A VS Code-style workspace built on Monaco, with a file explorer, a read-only test file, and a terminal panel.
- **AI code review.** **Run Tests** sends your code to the server, where Google Gemini decides PASS or FAIL and gives a hint without revealing the answer.
- **Shared team progress.** Everyone sees the team scoreboard update as each role passes.
- **Deploy to production.** At 3/3 the host deploys, and the whole team sees the results screen with the time it took and the skills each player practiced.
- **Team chat.** Talk to your team in the lobby and during the mission.
- **Leave anytime.** Click the ▣ icon in the top bar to leave the room and return to Room Entry.
- **Reconnect handling.** If your connection drops, the game rejoins your room automatically.

---

## How to Play

1. Open the game in three browser tabs or windows (or on three computers).
2. One player enters a name and selects **Create New Room**, then shares the four-letter room code. The other two enter the code and select **Join Team**.
3. Walk to a workstation and press **E** to claim it. Each player must choose a different role: **Frontend**, **Backend**, or **DevOps**.
4. Press **R** to mark yourself Ready. When all three players are ready, the host selects **Start Mission** to begin **Mission 01: Launch Day**.
5. Read the bug in your file, fix it in the editor, and select **Run Tests**. The AI reviewer replies with PASS or FAIL and a hint.
6. When Team Progress reaches **3 / 3**, the host selects **🚀 Deploy to Production** and the team sees the results.

To play again, select **Back to Room Entry** and create a new room.

You can leave a room at any time by clicking the **▣** icon next to the **CODE RED!** logo in the top bar. If someone leaves during a mission, the rest of the team returns to the lobby and must press Ready again.

### Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Move around the lobby |
| `E` | Select or cancel a role at a workstation |
| `R` | Toggle Ready |
| `T` | Open team chat |
| `Enter` | Send a chat message |
| `Esc` | Close team chat |
| Click **▣** (top left) | Leave the room and return to Room Entry |

---

## Mission 01: Launch Day

| Role | File | The bug | Skill practiced |
| --- | --- | --- | --- |
| **Frontend** | `Counter.tsx` | Clicking **Increase** should add 2, but `setCount(count + 1)` is called twice with the same stale value, so it only adds 1. | React state updates |
| **Backend** | `inventory.js` | `purchase()` subtracts the quantity from stock without checking it, so stock can go negative. | Input validation |
| **DevOps** | `nginx.conf` | The backend listens on port 8080, but the reverse proxy sends `/api/` traffic to port 3000, causing 502 Bad Gateway. | Reverse proxy config |

The three challenges are independent, so the team can work on them at the same time. Full details, starter code, and acceptance criteria are in [shared/mission01.md](shared/mission01.md).

---

## How It Works

```
 Browser (x3)                                   Server
┌──────────────────────────────┐   Socket.IO   ┌──────────────────────────────┐
│ React UI (rooms, chat, HUD)  │ ◄───────────► │ Express + Socket.IO          │
│ Phaser (lobby + mission)     │               │ rooms.js      who is in room │
│ Monaco editor (code)         │               │ gameState.js  game rules     │
└──────────────────────────────┘               │ challenges.js mission tasks  │
                                               │ aiReview.js ──► Gemini API   │
                                               └──────────────────────────────┘
```

- **The server is the source of truth.** Rooms, roles, ready states, progress, the mission stage, and deployment are all decided on the server. The browser only sends requests, so players can't mark their own challenge as passed.
- **Code is reviewed, not run.** Player code is sent to Gemini together with the task and acceptance criteria. Gemini replies in a fixed JSON format (`passed`, `explanation`, `hint`). Player code is treated as untrusted input, so instructions hidden inside it are ignored.
- **The API key stays on the server.** The Gemini key is only read by `server/src/aiReview.js` and is never sent to the browser.
- **Rooms live in memory.** There is no database. Restarting the server clears all active rooms.

The full list of Socket.IO events and data shapes is in [shared/socket-contract.md](shared/socket-contract.md).

---

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6 |
| Game | Phaser 3 |
| Code editor | Monaco Editor (`@monaco-editor/react`) |
| Realtime | Socket.IO 4 |
| Backend | Node.js 22.9+, Express 5 |
| AI review | Google Gemini (`@google/genai`) |
| Font | [Squada One](https://fonts.google.com/specimen/Squada+One) (Google Fonts) |

---

## Project Structure

```
CodeRed/
├── client/                    Frontend (React + Phaser + Monaco)
│   ├── public/assets/         Pixel-art characters, desks, tiles, workstations
│   ├── src/
│   │   ├── App.tsx            Main screen: lobby, mission, results, chat
│   │   ├── components/        RoomEntry, CodeWorkspace, ResultsScreen, GameCanvas
│   │   ├── game/
│   │   │   ├── scenes/        LobbyScene (office) and MissionScene (workstation)
│   │   │   └── data/          Challenge text and starter code shown to players
│   │   ├── network/socket.ts  Socket.IO connection and shared types
│   │   └── index.css          Site styles
│   └── vite.config.ts
├── server/                    Backend (Node.js + Socket.IO)
│   ├── src/
│   │   ├── index.js           Starts the HTTP and Socket.IO server
│   │   ├── socketHandlers.js  Listens for player events and broadcasts updates
│   │   ├── rooms.js           Create, join, and leave rooms
│   │   ├── gameState.js       Roles, Ready, start, progress, deploy, chat rules
│   │   ├── challenges.js      Mission 01 tasks and terminal output
│   │   └── aiReview.js        Gemini code review
│   └── .env.example           Environment variables template
└── shared/
    ├── mission01.md           Mission design and acceptance criteria
    └── socket-contract.md     Multiplayer protocol
```

---

## Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) **22.9 or newer**
- A free **Gemini API key** from [Google AI Studio](https://aistudio.google.com) (needed for **Run Tests**)

### 1. Start the server

```bash
cd server
npm install
```

Copy `server/.env.example` to `server/.env` and add your key:

```env
GEMINI_API_KEY=your-key-here
```

Then start the server:

```bash
npm run dev
```

The server runs on `http://localhost:3001`. You can check it at `http://localhost:3001/health`.

### 2. Start the client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173` in three browser tabs to play.

### Environment Variables

**Server** (`server/.env`):

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Port the server listens on |
| `CLIENT_ORIGIN` | `http://localhost:5173` | The frontend URL allowed to connect. Must match the deployed frontend URL exactly. |
| `GEMINI_API_KEY` | *(none)* | Required for Run Tests. Never commit this. |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Gemini model used for code review |

**Client** (`client/.env`, read at build time):

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_SOCKET_URL` | `http://localhost:3001` | URL of the server. Set this before building for production. |

### Scripts

| Folder | Command | What it does |
| --- | --- | --- |
| `server` | `npm run dev` | Start the server and restart it on file changes |
| `server` | `npm start` | Start the server |
| `client` | `npm run dev` | Start the Vite dev server |
| `client` | `npm run build` | Type-check and build the production site into `client/dist` |
| `client` | `npm run preview` | Preview the production build locally |

---

## Deployment

The client and server are deployed separately.

1. **Server:** deploy the `server/` folder to any Node.js host. Set `GEMINI_API_KEY` and set `CLIENT_ORIGIN` to the URL of the deployed frontend. Most hosts set `PORT` automatically.
2. **Client:** set `VITE_SOCKET_URL` to the URL of the deployed server, run `npm run build` in `client/`, and host the `client/dist` folder on any static host. The site is built to be served from the root of its domain (`base: '/'` in `vite.config.ts`).

---

## Known Limitations

- Rooms are stored in memory, so restarting the server ends every game.
- A mission needs exactly three players. If someone leaves mid-mission, the team returns to the lobby.
- After a reconnect, players get a new seat and must choose their role and press Ready again.
- Code is reviewed by AI, not executed, so results can occasionally be wrong.

---
