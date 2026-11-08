import { useEffect, useState, type FormEvent } from 'react';
import {
  connectSocket,
  socket,
  type ErrorCode,
  type JoinAck,
  type Room,
} from '../network/socket';
import './RoomEntry.css';

type Props = {
  onJoined: (room: Room, playerId: string) => void;
};

const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  INVALID_NAME: 'Please enter a name between 1 and 16 characters.',
  INVALID_ROOM_CODE: 'Room codes must contain exactly four letters.',
  ROOM_NOT_FOUND: 'Room not found. Double-check the four-letter code.',
  ROOM_FULL: 'This room already has three players.',
  GAME_ALREADY_STARTED: 'This team has already started its mission.',
  ALREADY_IN_ROOM: 'You are already in a room. Refresh to start over.',
};

// Connect only when the user presses Create or Join.
// Keep the socket alive after this screen closes.
function waitForConnection(): Promise<void> {
  if (socket.connected) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Could not connect to the server. Is Backend running on port 3001?'));
    }, 7000);

    function cleanup() {
      window.clearTimeout(timer);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    }

    function onConnect() {
      cleanup();
      resolve();
    }

    function onError(error: Error) {
      cleanup();
      reject(new Error('Connection failed: ' + error.message));
    }

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
    connectSocket();
  });
}

export default function RoomEntry({ onJoined }: Props) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [connected, setConnected] = useState(socket.connected);
  const [error, setError] = useState('');

  useEffect(() => {
    const update = () => setConnected(socket.connected);
    socket.on('connect', update);
    socket.on('disconnect', update);
    return () => {
      socket.off('connect', update);
      socket.off('disconnect', update);
    };
  }, []);

  async function enterRoom(mode: 'create' | 'join') {
    if (busy) return;

    const cleanName = name.trim();
    if (cleanName.length < 1 || cleanName.length > 16) {
      setError('Enter a player name (1–16 characters).');
      return;
    }
    if (mode === 'join' && !/^[A-Z]{4}$/.test(roomCode)) {
      setError('Enter a valid four-letter room code.');
      return;
    }

    setError('');
    setBusy(mode);

    try {
      await waitForConnection();

      const reply = await new Promise<JoinAck>((resolve, reject) => {
        const data = mode === 'create'
          ? { name: cleanName }
          : { name: cleanName, roomCode };

        socket.timeout(7000).emit('room:join', data, (err, response) => {
          if (err) {
            reject(new Error('The server did not respond. Please try again.'));
          } else {
            resolve(response);
          }
        });
      });

      if (!reply.ok) {
        setError(ERROR_MESSAGES[reply.error] || 'Server rejected request: ' + reply.error);
        return;
      }

      // The backend assigned our id and sent the real room state.
      onJoined(reply.room, reply.you);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect.');
    } finally {
      setBusy(null);
    }
  }

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void enterRoom('create');
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void enterRoom('join');
  }

  return (
    <div className="room-entry">
      <main className="room-entry-content">
        {/* Keep the original CODE RED! logo. */}
        <div className="room-entry-logo" aria-label="CODE RED!">
          <span className="room-entry-logo-mark">▣</span>
          <strong>CODE <em>RED!</em></strong>
        </div>

        <section className="room-entry-panel" aria-labelledby="room-entry-title">
          <div className="room-entry-kicker">TEAM ASSEMBLY</div>
          <h1 id="room-entry-title">Enter the war room.</h1>

          {/* First row: name, room code, and Join Team. */}
          <form className="room-entry-join-form" onSubmit={joinRoom}>
            <div className="room-entry-field">
              <label className="room-entry-label" htmlFor="room-player-name">
                PLAYER NAME
              </label>
              <input
                id="room-player-name"
                className="room-entry-input"
                type="text"
                placeholder="Your callsign..."
                maxLength={16}
                value={name}
                onChange={event => {
                  setName(event.target.value);
                  setError('');
                }}
                autoComplete="nickname"
                disabled={busy !== null}
              />
            </div>

            <div className="room-entry-field">
              <label className="room-entry-label" htmlFor="room-code">
                ROOM CODE
              </label>
              <input
                id="room-code"
                className="room-entry-input room-entry-code"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="ABCD"
                maxLength={4}
                value={roomCode}
                onChange={event => {
                  setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4));
                  setError('');
                }}
                disabled={busy !== null}
              />
            </div>

            <button
              className="room-entry-join"
              type="submit"
              disabled={busy !== null || !name.trim() || roomCode.length !== 4}
            >
              {busy === 'join' ? 'JOINING...' : 'JOIN TEAM →'}
            </button>
          </form>

          {/* Second row: full-width Create New Room button. */}
          <form className="room-entry-create-form" onSubmit={createRoom}>
            <button
              className="room-entry-create"
              type="submit"
              disabled={busy !== null || !name.trim()}
            >
              {busy === 'create' ? 'CONNECTING...' : 'CREATE NEW ROOM ↗'}
            </button>
          </form>

          {error && <div className="room-entry-error" role="alert">⚠ {error}</div>}
          {busy && (
            <div className="room-entry-status" role="status">
              {connected ? 'Connected. Joining room...' : 'Connecting to server...'}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
