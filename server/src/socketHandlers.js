// Registers Socket.IO handlers for rooms, movement, roles, Ready, chat, and missions.
//
// This file is the "switchboard". It listens for messages from one player's browser,
// asks rooms.js to apply the rules, then tells the players in that room what changed.
// Event names and data shapes come from shared/socket-contract.md.

import { createRoom, joinRoom, leaveRoom, getRoom } from './rooms.js';
import { movePlayer } from './gameState.js';

// Called once for every player who connects.
// `io` = the whole server (can talk to everyone). `socket` = this one player's connection.
export function registerSocketHandlers(io, socket) {
  // Sends the latest room to everyone inside it.
  function sendRoomUpdate(room) {
    io.to(room.code).emit('room:update', room);
  }

  // Shared by "room:leave" and closing the tab.
  function leaveCurrentRoom() {
    const code = socket.data.roomCode;
    if (!code) return; // not in a room, nothing to do

    socket.leave(code);
    socket.data.roomCode = null;

    const room = leaveRoom(code, socket.id);
    if (room) sendRoomUpdate(room); // tell the players still inside
  }

  // ---------- room:join ----------
  // data = { name, roomCode? }. No roomCode means "create a new room for me".
  socket.on('room:join', (data, reply) => {
    // The browser might forget the reply callback or send junk. Don't crash if it does.
    if (typeof reply !== 'function') reply = () => {};
    const { name, roomCode } = data ?? {};

    // One room at a time. The player must send room:leave before joining another.
    if (socket.data.roomCode) {
      reply({ ok: false, error: 'ALREADY_IN_ROOM' });
      return;
    }

    const result = roomCode
      ? joinRoom(roomCode, socket.id, name)
      : createRoom(socket.id, name);

    if (result.error) {
      reply({ ok: false, error: result.error });
      return;
    }

    const { room } = result;
    socket.join(room.code);           // Socket.IO group, so io.to(code) reaches this player
    socket.data.roomCode = room.code; // remember which room this player is in

    reply({ ok: true, room, you: socket.id });
    sendRoomUpdate(room);
    console.log(`${name} joined room ${room.code} (${room.players.length}/3)`);
  });

  // ---------- player:move ----------
  // data = { x, y, facing, flipX }. Sent up to 15 times a second, so there's no reply.
  // Bad data is simply ignored.
  socket.on('player:move', (data) => {
    const room = getRoom(socket.data.roomCode);
    if (!room) return; // not in a room

    const move = movePlayer(room, socket.id, data);
    if (!move) return; // invalid move, ignore it

    // socket.to(...) means "everyone in the room EXCEPT me". The mover already knows where they are.
    socket.to(room.code).emit('player:moved', move);
  });

  // ---------- room:leave ----------
  socket.on('room:leave', () => {
    leaveCurrentRoom();
  });

  // ---------- disconnect ----------
  // Fires automatically when the tab closes, the page refreshes, or the internet drops.
  socket.on('disconnect', () => {
    leaveCurrentRoom();
  });
}
