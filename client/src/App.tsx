import { useEffect, useRef, useState, type FormEvent } from 'react';
import GameCanvas from './components/GameCanvas';
import RoomEntry from './components/RoomEntry';
import { socket, type ChatMessage, type Facing, type Room } from './network/socket';
import CodeWorkspace from './components/CodeWorkspace';
import { EventBus } from './game/EventBus';
import { challenges, type Role } from './game/data/challenges';

export default function App() {
  // Room Entry: save the server-approved room and our player ID.
  const [joinedRoom, setJoinedRoom] = useState<Room | null>(null);
  const [myPlayerId, setMyPlayerId] = useState('');
  const [lobbyError, setLobbyError] = useState('');
  const [stage, setStage] = useState<'lobby' | 'mission'>('lobby');
  const [complete, setComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState('');
  const [now, setNow] = useState(Date.now());
  const chatInput = useRef<HTMLInputElement>(null);
  const chatHistory = useRef<HTMLDivElement>(null);
  const stageRef = useRef<'lobby' | 'mission'>('lobby');
  const [starting, setStarting] = useState(false);

  const me = joinedRoom?.players.find(player => player.id === myPlayerId);
  const role: Role | null = me?.role ?? null;
  const ready = me?.ready ?? false;

  // The server decides when the mission starts for ALL three players.
  // Listening to room:update also handles a teammate leaving mid-mission.
  const roomCode = joinedRoom?.code;
  useEffect(() => {
    function enterMission(room: Room) {
      if (stageRef.current === 'mission') return;
      const myRole = room.players.find(player => player.id === myPlayerId)?.role;
      if (!myRole) return;

      stageRef.current = 'mission';
      setStage('mission');
      setComplete(false);
      setStarting(false);
      EventBus.dispatchEvent(new CustomEvent('mission:start', { detail: myRole }));
    }

    function updateRoom(room: Room) {
      if (room.code !== roomCode) return;
      setJoinedRoom(room);

      if (room.stage === 'mission') {
        enterMission(room);
      } else if (room.stage === 'lobby' && stageRef.current === 'mission') {
        // A teammate disconnected: backend returned the room to Lobby.
        stageRef.current = 'lobby';
        setStage('lobby');
        setComplete(false);
        setStarting(false);
        EventBus.dispatchEvent(new Event('lobby:return'));
      }
    }

    function gameStarted(data: { room: Room }) {
      updateRoom(data.room);
    }

    function updateMovement(data: {
      id: string; x: number; y: number; facing: Facing; flipX: boolean;
    }) {
      EventBus.dispatchEvent(new CustomEvent('lobby:player-moved', { detail: data }));
    }

    socket.on('room:update', updateRoom);
    socket.on('game:started', gameStarted);
    socket.on('player:moved', updateMovement);
    return () => {
      socket.off('room:update', updateRoom);
      socket.off('game:started', gameStarted);
      socket.off('player:moved', updateMovement);
    };
  }, [roomCode, myPlayerId]);

  // Receive chat messages from the server, including our own messages.
  // Use only chat:message to update the history, so nobody sees duplicates.
  useEffect(() => {
    function receiveMessage(newMessage: ChatMessage) {
      setMessages(old => [...old.slice(-99), newMessage]);
    }

    socket.on('chat:message', receiveMessage);
    return () => { socket.off('chat:message', receiveMessage); };
  }, []);

  // Phaser starts asynchronously. When it is ready, send the latest room.
  // Also re-send when someone joins, leaves or changes their role.
  useEffect(() => {
    function syncScene() {
      if (!joinedRoom || !myPlayerId) return;
      EventBus.dispatchEvent(new CustomEvent('lobby:sync', {
        detail: { room: joinedRoom, playerId: myPlayerId },
      }));
    }
    EventBus.addEventListener('lobby:ready', syncScene);
    syncScene();
    return () => EventBus.removeEventListener('lobby:ready', syncScene);
  }, [joinedRoom, myPlayerId]);

  // Phaser sends local movement. React forwards it to Socket.IO.
  useEffect(() => {
    function move(event: Event) {
      const data = (event as CustomEvent<{
        x: number; y: number; facing: Facing; flipX: boolean;
      }>).detail;
      if (socket.connected) socket.emit('player:move', data);
    }
    EventBus.addEventListener('lobby:move', move);
    return () => EventBus.removeEventListener('lobby:move', move);
  }, []);

  // Press E at a desk: the backend approves or denies the role.
  useEffect(() => {
    function chooseRole(event: Event) {
      const wanted = (event as CustomEvent<{ role: Role | null }>).detail.role;
      const onReply = (err: Error | null, res?: { ok: boolean; error?: string }) => {
        const error = err ? 'Server did not respond' : res?.ok ? '' : (res?.error || 'Role request failed');
        setLobbyError(error);
        EventBus.dispatchEvent(new CustomEvent('lobby:role-result', { detail: { error } }));
      };
      if (wanted) {
        socket.timeout(5000).emit('role:select', { role: wanted }, onReply);
      } else {
        socket.timeout(5000).emit('role:cancel', {}, onReply);
      }
    }
    EventBus.addEventListener('lobby:role-request', chooseRole);
    return () => EventBus.removeEventListener('lobby:role-request', chooseRole);
  }, []);

  function changeReady() {
    socket.timeout(5000).emit('player:ready', { ready: !ready }, (err, res) => {
      if (err) setLobbyError('Server did not respond');
      else if (!res.ok) setLobbyError(res.error);
      else setLobbyError('');
    });
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (chatOpen) chatInput.current?.focus();
  }, [chatOpen]);

  useEffect(() => {
    if (chatOpen && chatHistory.current) {
      chatHistory.current.scrollTop = chatHistory.current.scrollHeight;
    }
  }, [chatOpen, messages]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && chatOpen) {
        event.preventDefault(); setChatOpen(false); chatInput.current?.blur(); return;
      }
      const focused = document.activeElement;
      const typing = focused?.tagName === 'INPUT' || focused?.tagName === 'TEXTAREA'
        || focused?.getAttribute('role') === 'textbox';
      if (typing) return;
      // Do not steal keyboard shortcuts from the Monaco editor.
      if (stage === 'mission' && document.activeElement?.closest('.code-workspace')) return;
      if (event.key.toLowerCase() === 't' && !event.repeat) {
        event.preventDefault(); setChatOpen(true);
      }
      if (stage === 'lobby' && role && event.key.toLowerCase() === 'r' && !event.repeat) {
        changeReady();
      }
    }
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [role, ready, stage, chatOpen]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    if (!socket.connected) {
      setChatError('Server disconnected. Please try again.');
      return;
    }

    // The backend sends chat:message back to everyone in this room.
    socket.emit('chat:send', { text });
    setChatError('');
    setMessage('');
    setChatOpen(false);
    chatInput.current?.blur();
  }

  // Any of the three players may start, but only when ALL are Ready.
  // We wait for game:started; an ACK alone never changes the scene.
  const allReady = joinedRoom?.stage === 'lobby' &&
    joinedRoom.players.length === 3 &&
    joinedRoom.players.every(player => player.ready && player.role !== null) &&
    new Set(joinedRoom.players.map(player => player.role)).size === 3;

  function startMission() {
    if (!allReady || starting || !socket.connected) return;
    setStarting(true);
    setLobbyError('');
    socket.timeout(5000).emit('game:start', {}, (err, res) => {
      if (err) {
        setStarting(false);
        setLobbyError('Server did not respond to Start Mission');
      } else if (!res.ok) {
        setStarting(false);
        setLobbyError('Cannot start mission: ' + res.error);
      }
      // On success, game:started (sent to everyone) changes the scene.
    });
  }

  const shown = chatOpen ? messages : messages.filter(m => now - m.time < 8000).slice(-4);
  const avatar = (name: string) => import.meta.env.BASE_URL + 'assets/characters/player_' + name + '.png';
  const title = role ? challenges[role].title : 'Launch Day';

  // The Lobby and Phaser canvas only mount after the server accepts join.
  if (!joinedRoom) {
    return <RoomEntry onJoined={(room, playerId) => {
      setJoinedRoom(room);
      setMyPlayerId(playerId);
    }} />;
  }

  return (
    <div className={'app ' + (stage === 'mission' ? 'app-mission' : 'app-lobby')}>
      <header className="top-bar">
        <div className="brand">▣ <strong>CODE <em>RED!</em></strong></div>
        <div className="stage-heading">
          {stage === 'lobby' ? 'Team Lobby' : 'Mission 01: ' + title}
          <span className="room-session-tag">
            {joinedRoom.code} · {joinedRoom.players.length}/3 · {joinedRoom.hostId === myPlayerId ? 'HOST' : 'PLAYER'}
          </span>
        </div>
        {stage === 'mission' && <div className="progress-badge">Team Progress <b>{complete ? '1 / 3' : '0 / 3'}</b></div>}
        <div className="players">
          {joinedRoom.players.map(player => (
            <div className="player-badge" key={player.id}>
              <img src={avatar(player.avatar)} alt="" />
              <div><b>{player.name}{player.id === myPlayerId ? ' (You)' : ''}</b>
              <small>{player.role || 'No role'}{player.ready ? ' · Ready' : ''}</small></div>
            </div>
          ))}
        </div>
      </header>

      <main className="game-screen">
        <div className="phaser-world"><GameCanvas /></div>

        {stage === 'lobby' ? (
          <>
            <section className="lobby-mission-card">
              <div className="eyebrow">MISSION 01</div>
              <h2>Launch Day</h2>
              <p>☐ Fix critical bugs</p><p>☐ Pass tests</p><p>☐ Deploy to production</p>
            </section>
            <div className="lobby-instructions">WASD move · E select/cancel role · R ready · T chat</div>
            {lobbyError && <div style={{ position: 'absolute', top: 14, left: '50%',
              transform: 'translateX(-50%)', zIndex: 15, background: '#4c2235',
              border: '1px solid #ef637c', borderRadius: 6,
              color: 'white', padding: '9px 15px', fontSize: 13 }}>⚠ {lobbyError}</div>}
          </>
        ) : (
          <>
            <section className="mission-card">
              <div className="mission-warning">⚠</div>
              <div>
                <div className="eyebrow">MISSION 01</div>
                <h2>{title}</h2>
                <p><span className={complete ? 'checked' : ''}>{complete ? '☑' : '☐'}</span> Fix the bug</p>
                <p><span className={complete ? 'checked' : ''}>{complete ? '☑' : '☐'}</span> Pass all tests</p>
                <p><span>☐</span> Sync with your team</p>
              </div>
            </section>
            <div className="station-sign">✦ {role?.toUpperCase()} WORKSTATION ✦</div>
            <CodeWorkspace role={role || 'frontend'} onComplete={() => setComplete(true)} />
          </>
        )}

        {(chatOpen || shown.length > 0) && (
          <section className={'game-chat ' + (chatOpen ? 'chat-open' : 'chat-closed')}>
            {chatOpen && <div className="chat-heading">◉ TEAM CHAT</div>}
            <div className="chat-history" ref={chatHistory}>
              {shown.map((line, i) => <div className="chat-line" key={i}><b>[{line.user}]</b> {line.text}</div>)}
            </div>
            {chatOpen && <form onSubmit={sendMessage}>
              <input ref={chatInput} value={message} maxLength={200} onChange={e => { setMessage(e.target.value); setChatError(''); }} placeholder="Message your team..." aria-label="Chat message" />
              <small>Enter to send · Esc to close</small>
              {chatError && <small style={{ color: '#ff8da1' }}>{chatError}</small>}
            </form>}
          </section>
        )}
      </main>

      {stage === 'lobby' && (
        <footer className="lobby-footer">
          <span>Role: <strong>{role || 'None'}</strong></span>
          <button type="button" disabled={!role} onClick={changeReady}>
            {ready ? 'Ready ✓ (R)' : 'Ready (R)'}
          </button>
          <button type="button" className="start-button"
            disabled={!allReady || starting || !socket.connected}
            onClick={startMission}>
            {starting ? 'Starting...' : '▶ Start Mission'}
          </button>
          <span className="demo-note">
            {allReady ? 'All 3 Ready · Anyone can start!' :
              'Waiting for 3 players, 3 roles and everyone Ready'}
          </span>
        </footer>
      )}
    </div>
  );
}
