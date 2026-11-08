<!-- Documents agreed Socket.IO event names, payloads, and responses for the whole team. -->

# CODE RED! — Socket Contract (v0.1 draft)

This is the agreement between the **frontend** (React + Phaser) and the **backend** (Node + Socket.IO).
Every message the two sides send each other is listed here. If it is not in this file, neither side should send it.

**Status:** Draft. Frontend and backend must both agree before we build against it.
**To change it:** edit this file in a PR and ask the other side to review.

---

## 1. Basics

| Thing | Value |
|---|---|
| Server address (dev) | `http://localhost:3001` |
| Frontend address (dev) | `http://localhost:5173` |
| Players per room | Exactly 3 |
| Roles | `"frontend"`, `"backend"`, `"devops"` (same strings as `Role` in `client/src/game/data/challenges.ts`) |
| Avatars | `"purple"`, `"white"`, `"yellow"`, given out by the server in join order |
| Event naming | `thing:action`, lowercase, e.g. `room:join`, `chat:send` |

### Rules everyone follows

1. **The server is the referee.** The frontend *asks* for changes ("I want the Backend role"). The server decides and tells everyone the result. The frontend never assumes a request worked.
2. **`room:update` is the truth.** Whenever anything in the lobby changes, the server sends the whole room to all 3 players. The frontend redraws from it. (Movement is the one exception; see `player:move`.)
3. **Requests get a reply.** Events marked **(ack)** use Socket.IO acknowledgements. The frontend passes a callback, and the server calls it with either:
   ```js
   { ok: true }                                  // it worked
   { ok: false, error: "ROLE_TAKEN" }            // it didn't, and why
   ```
   Example on the frontend:
   ```js
   socket.emit('role:select', { role: 'backend' }, (res) => {
     if (!res.ok) showError(res.error);
   });
   ```

---

## 2. Shared data shapes

### `Player`
```ts
{
  id: string;              // socket.id, unique per connection
  name: string;            // 1–16 characters
  avatar: 'purple' | 'white' | 'yellow';
  role: 'frontend' | 'backend' | 'devops' | null;
  ready: boolean;
  x: number;               // lobby position (Phaser world pixels)
  y: number;
}
```

### `Room`
```ts
{
  code: string;            // 4 capital letters, e.g. "KQZD"
  hostId: string;          // id of the player who can press Start
  stage: 'lobby' | 'mission' | 'complete';
  players: Player[];       // 0–3 players
  progress: {              // which roles have passed their challenge
    frontend: boolean;
    backend: boolean;
    devops: boolean;
  };
}
```

### `ChatMessage`
Same shape as `Message` in `client/src/App.tsx`, plus the sender's id.
```ts
{
  playerId: string;
  user: string;            // sender's name
  text: string;            // 1–200 characters
  time: number;            // Date.now() on the server
}
```

---

## 3. Events

**Direction key:** ➡️ player → server · ⬅️ server → player(s)

### 3.1 Joining a room

| Event | Dir | Data | Notes |
|---|---|---|---|
| `room:join` **(ack)** | ➡️ | `{ name: string, roomCode?: string }` | No `roomCode` → server creates a new room and makes you host. With `roomCode` → join that room. Success reply: `{ ok: true, room: Room, you: string }`, where `you` is your player id. |
| `room:leave` | ➡️ | `{}` | Leave on purpose. Closing the tab counts as leaving too. |
| `room:update` | ⬅️ all in room | `Room` | Sent after **any** lobby change: join, leave, role, ready, host change. |

**Possible errors:** `ROOM_NOT_FOUND`, `ROOM_FULL`, `GAME_ALREADY_STARTED`, `INVALID_NAME`

**If the host leaves**, the server makes the next player the host and sends `room:update`.

### 3.2 Movement (lobby only)

| Event | Dir | Data | Notes |
|---|---|---|---|
| `player:move` | ➡️ | `{ x: number, y: number, facing: 'front' \| 'back' \| 'side', flipX: boolean }` | Send **only when the position changes**, at most **15 times per second**. No ack. |
| `player:moved` | ⬅️ others in room | `{ id: string, x, y, facing, flipX }` | Sent to the *other two* players, not back to the sender. |

`facing` + `flipX` match the sprite choice in `LobbyScene.ts`: `front` → `player_<avatar>.png`, `back` → `_back`, `side` → `_side` (mirrored when `flipX` is true).

### 3.3 Roles (pressing E at a desk)

| Event | Dir | Data | Notes |
|---|---|---|---|
| `role:select` **(ack)** | ➡️ | `{ role: 'frontend' \| 'backend' \| 'devops' }` | Only works if nobody else has that role. |
| `role:cancel` **(ack)** | ➡️ | `{}` | Gives up your role. |

The server answers by sending `room:update` to everyone. **Changing or cancelling a role sets your `ready` back to `false`**, which matches what `App.tsx` already does.

**Possible errors:** `ROLE_TAKEN`, `INVALID_ROLE`, `NOT_IN_LOBBY`

### 3.4 Ready (pressing R)

| Event | Dir | Data | Notes |
|---|---|---|---|
| `player:ready` **(ack)** | ➡️ | `{ ready: boolean }` | You must have a role first. |

The server answers with `room:update` to everyone.

**Possible errors:** `NO_ROLE`, `NOT_IN_LOBBY`

### 3.5 Starting the mission

| Event | Dir | Data | Notes |
|---|---|---|---|
| `game:start` **(ack)** | ➡️ host only | `{}` | Host presses **Start Mission**. |
| `game:started` | ⬅️ all in room | `{ room: Room }` | Everyone switches to `MissionScene` with their own role. `room.stage` is now `'mission'`. |

**The server only starts the game when all of these are true:**
- the sender is the host
- there are exactly 3 players
- all 3 roles are taken (one each)
- all 3 players are ready

**Possible errors:** `NOT_HOST`, `NOT_ENOUGH_PLAYERS`, `NOT_ALL_READY`

> The frontend should disable the Start button unless the player is the host **and** everything above is true, but the server checks again anyway.

### 3.6 Team chat (pressing T)

| Event | Dir | Data | Notes |
|---|---|---|---|
| `chat:send` | ➡️ | `{ text: string }` | Works in lobby and mission. Empty or >200 chars is ignored. |
| `chat:message` | ⬅️ all in room | `ChatMessage` | Sent to **everyone, including the sender**. The frontend shows only messages from this event, so all 3 players see the same chat in the same order. |

### 3.7 Challenges (pressing Run Tests)

| Event | Dir | Data | Notes |
|---|---|---|---|
| `challenge:submit` **(ack)** | ➡️ | `{ code: string }` | Your current editor code. The server knows your role, so you don't send it. Max 10,000 chars. |
| *(ack reply)* | ⬅️ sender | `{ ok: true, passed: boolean, terminal: string }` | `terminal` = text for the terminal panel (PASS/FAIL + hint). |
| `mission:progress` | ⬅️ all in room | `{ progress: Room['progress'], completed: number }` | Sent when someone passes. `completed` drives the "Team Progress 1 / 3" badge. |
| `mission:complete` | ⬅️ all in room | `{ room: Room }` | Sent when all 3 roles have passed. `room.stage` is now `'complete'` → show the results screen. |

**Possible errors:** `NOT_IN_MISSION`, `CODE_TOO_LONG`

> The checking logic in `checkDemoCode()` (`client/src/game/data/challenges.ts`) moves to `server/src/challenges.js`, so players can't fake a pass from the browser. The challenge *text* (description, starting code, hints) stays on the frontend.

### 3.8 Errors

Every error code, in one place:

| Code | Meaning |
|---|---|
| `ROOM_NOT_FOUND` | No room with that code |
| `ROOM_FULL` | Room already has 3 players |
| `GAME_ALREADY_STARTED` | Can't join a room that is mid-mission |
| `INVALID_NAME` | Name empty or longer than 16 characters |
| `INVALID_ROLE` | Not one of the three roles |
| `ROLE_TAKEN` | Another player already has that role |
| `NO_ROLE` | Must pick a role before being ready |
| `NOT_IN_ROOM` | Sent an event before joining a room |
| `NOT_IN_LOBBY` | Tried a lobby action during the mission |
| `NOT_IN_MISSION` | Tried a mission action outside the mission |
| `NOT_HOST` | Only the host can start |
| `NOT_ENOUGH_PLAYERS` | Need exactly 3 players |
| `NOT_ALL_READY` | Not everyone has a role and is ready |
| `CODE_TOO_LONG` | Submitted code is over 10,000 characters |

---

## 4. A full game, step by step

```
Alice                     Server                         Bob, Cara
  │── room:join {name} ────▶│ creates room "KQZD"
  │◀─ ack {ok, room, you} ──│
  │                          │◀── room:join {name, "KQZD"} ──│  (Bob, then Cara)
  │◀──────── room:update ────┼──────── room:update ─────────▶│
  │── player:move ──────────▶│──────── player:moved ────────▶│
  │── role:select backend ──▶│
  │◀──────── room:update ────┼──────── room:update ─────────▶│
  │── player:ready true ────▶│          (all 3 do this)
  │◀──────── room:update ────┼──────── room:update ─────────▶│
  │── game:start (host) ────▶│ checks 3 players, 3 roles, all ready
  │◀──────── game:started ───┼──────── game:started ────────▶│
  │── challenge:submit ─────▶│ checks code
  │◀─ ack {passed, terminal}─│
  │◀──── mission:progress ───┼──── mission:progress ────────▶│
  │                          │   ...once all 3 pass...
  │◀──── mission:complete ───┼──── mission:complete ────────▶│
```

---

## 5. Build order

Each step works on its own and can be tested with 3 browser tabs before moving on.

1. `room:join`, `room:leave`, `room:update`, disconnect handling
2. `player:move` / `player:moved`
3. `role:select` / `role:cancel`
4. `player:ready`
5. `chat:send` / `chat:message`
6. `game:start` / `game:started`
7. `challenge:submit`, `mission:progress`, `mission:complete`

---

## 6. Open questions for the team

- [ ] **Room code screen:** the frontend needs a small screen before the lobby with a name field plus **Create room** and **Join with code** buttons. Who builds it?
- [ ] **Disconnect mid-mission:** if a player closes the tab during the mission, do we end the game, or wait 30 seconds for them to rejoin? (Proposal for v0.1: end the game and send everyone back to the lobby.)
- [ ] **Mission timer:** do we want a countdown (e.g. 10 minutes) with a loss condition? If yes, we add `mission:timer` and `mission:failed` events in v0.2.
- [ ] **Play again:** after `mission:complete`, does the same team go back to the lobby? (Would add a `game:restart` event.)
