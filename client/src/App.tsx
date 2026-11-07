// The webpage UI: player bar, Ready button, mission board, and chat.
import { useEffect, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import { EventBus } from './game/EventBus';

type Role = 'frontend' | 'backend' | 'devops';

type Message = { user: string; text: string };

const players = [
  { name: 'You', avatar: 'purple' },
  { name: 'Player 2 (demo)', avatar: 'white' },
  { name: 'Player 3 (demo)', avatar: 'yellow' },
];

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [showRole, setShowRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Phaser tells React which desk the player is near.
    function choose(event: Event) {
      const desk = (event as CustomEvent<Role>).detail;
      setShowRole(desk);
    }
    EventBus.addEventListener('choose-role', choose);
    return () => EventBus.removeEventListener('choose-role', choose);
  }, []);

  function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { user: 'You', text: input.trim() }]);
    setInput('');
  }

  return (
    <div className="app">
      <div className="top-bar">
        <span className="player-count">3 / 3 (local demo)</span>
        <div className="player-list">
          {players.map((player, i) => (
            <div className="player-card" key={player.name}>
              <img src={'/assets/characters/player_' + player.avatar + '.png'} />
              <div>
                <b>{player.name}</b>
                <small>{i === 0 ? role || 'No role' : 'Waiting for server'}</small>
                <small className={i === 0 && ready ? 'green' : ''}>
                  {i === 0 && ready ? 'Ready' : 'Not Ready'}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="game-wrapper">
        <GameCanvas />
        <div className="mission-board">
          <b>MISSION 01</b>
          <h3>Launch Day</h3>
          <p>☐ Fix critical bugs</p>
          <p>☐ Pass tests</p>
          <p>☐ Deploy to production</p>
        </div>
        <div className="chat-box">
          <h3>Team Chat</h3>
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <p key={i}><b>{msg.user}:</b> {msg.text}</p>
            ))}
          </div>
          <form onSubmit={sendMessage}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message..." />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>

      <div className="bottom-bar">
        <span>Selected role: {role || 'None'}</span>
        <button disabled={!role} onClick={() => setReady(!ready)}>
          {ready ? 'Cancel Ready' : 'Ready'}
        </button>
        <button disabled onClick={() => setStarted(true)}>Start Game (waiting for 3 real players)</button>
      </div>

      {showRole && (
        <div className="modal-background">
          <div className="role-modal">
            <h2>Choose {showRole}?</h2>
            <p>This will be your engineering role.</p>
            <button onClick={() => { setRole(showRole); setReady(false); setShowRole(null); }}>
              Choose Role
            </button>
            <button onClick={() => setShowRole(null)}>Cancel</button>
          </div>
        </div>
      )}
      {started && <div>Mission started</div>}
    </div>
  );
}
