// Manages authoritative shared room state, mission timers, and win/loss conditions.
//
// rooms.js decides WHO is in a room. This file decides WHAT those players are allowed
// to do once they're inside: move, pick roles, get ready, start, and finish the mission.
// Like rooms.js, it never talks to Socket.IO directly.

// ---------- lobby movement ----------

// The lobby world size agreed with the frontend (see shared/socket-contract.md, 3.2).
const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const FACINGS = ['front', 'back', 'side'];

// Checks a player:move request and, if it's valid, saves the new position.
// Returns the movement to send to the other players, or null if it should be ignored.
export function movePlayer(room, playerId, data) {
  // Players can only walk around in the lobby.
  if (room.stage !== 'lobby') return null;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  const { x, y, facing, flipX } = data ?? {};

  // Number.isFinite rejects text, NaN and Infinity, so only real numbers get through.
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Must be inside the game world. Stops someone teleporting off the map.
  if (x < 0 || x > WORLD_WIDTH || y < 0 || y > WORLD_HEIGHT) return null;
  if (!FACINGS.includes(facing)) return null;
  if (typeof flipX !== 'boolean') return null;

  // Save it, so anyone who joins later sees this player in the right spot.
  player.x = x;
  player.y = y;

  return { id: playerId, x, y, facing, flipX };
}

// ---------- roles and ready ----------
// Each function below returns { room } if the request is allowed, or { error } if not.
// (Same pattern as rooms.js.)

const ROLES = ['frontend', 'backend', 'devops'];

// role:select — pressing E at a desk.
export function selectRole(room, playerId, role) {
  if (room.stage !== 'lobby') return { error: 'NOT_IN_LOBBY' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'NOT_IN_ROOM' };

  if (!ROLES.includes(role)) return { error: 'INVALID_ROLE' };

  // Is somebody ELSE already sitting at this desk? (Picking your own role again is fine.)
  const owner = room.players.find(p => p.role === role && p.id !== playerId);
  if (owner) return { error: 'ROLE_TAKEN' };

  // Switching from another role simply replaces it, so the old desk becomes free.
  player.role = role;
  // Changing role always un-readies you, so nobody starts with a surprise role.
  player.ready = false;
  return { room };
}

// role:cancel — pressing E again to stand up from the desk.
export function cancelRole(room, playerId) {
  if (room.stage !== 'lobby') return { error: 'NOT_IN_LOBBY' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'NOT_IN_ROOM' };

  player.role = null;
  player.ready = false;
  return { room };
}

// player:ready — pressing R.
export function setReady(room, playerId, ready) {
  if (room.stage !== 'lobby') return { error: 'NOT_IN_LOBBY' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'NOT_IN_ROOM' };

  // Only a real `true` counts as ready. Anything else (false, "yes", missing) counts as not ready.
  const wantsReady = ready === true;

  // You can't be ready without a role. (Becoming NOT ready is always allowed.)
  if (wantsReady && !player.role) return { error: 'NO_ROLE' };

  player.ready = wantsReady;
  return { room };
}

// ---------- team chat ----------

const MAX_CHAT_LENGTH = 200;

// chat:send — pressing T, typing, and pressing Enter.
// Returns the finished message to send to everyone, or null if it should be ignored.
export function createChatMessage(room, playerId, text) {
  // Chat works in the lobby and during the mission (not on the results screen).
  if (room.stage !== 'lobby' && room.stage !== 'mission') return null;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  if (typeof text !== 'string') return null;
  const trimmed = text.trim(); // "  hi  " becomes "hi"
  if (trimmed.length < 1 || trimmed.length > MAX_CHAT_LENGTH) return null;

  // The server fills in WHO sent it and WHEN. The browser only sends the text,
  // so nobody can pretend to be someone else or fake the time.
  return {
    playerId,
    user: player.name,
    text: trimmed,
    time: Date.now(),
  };
}
