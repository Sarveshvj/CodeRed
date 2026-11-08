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
