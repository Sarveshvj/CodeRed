import { useEffect, useRef, useState, type FormEvent } from 'react';
import GameCanvas from './components/GameCanvas';
import CodeWorkspace from './components/CodeWorkspace';
import { EventBus } from './game/EventBus';
import { challenges, type Role } from './game/data/challenges';

type Message = { text: string; time: number; user: string };

const demoPlayers = [
  { name: 'You', image: 'purple' },
  { name: 'Player 2 (demo)', image: 'white' },
  { name: 'Player 3 (demo)', image: 'yellow' },
];

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<'lobby' | 'mission'>('lobby');
  const [complete, setComplete] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [now, setNow] = useState(Date.now());
  const chatInput = useRef<HTMLInputElement>(null);
  const chatHistory = useRef<HTMLDivElement>(null);

  // Existing LobbyScene emits this event when E selects/cancels a role.
  useEffect(() => {
    function roleChanged(event: Event) {
      setRole((event as CustomEvent<Role | null>).detail);
      setReady(false);
    }
    EventBus.addEventListener('role-changed', roleChanged);
    return () => EventBus.removeEventListener('role-changed', roleChanged);
  }, []);

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
        setReady(value => !value);
      }
    }
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [role, stage, chatOpen]);

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (message.trim()) {
      setMessages(old => [...old, { text: message.trim(), user: 'You', time: Date.now() }]);
    }
    setMessage(''); setChatOpen(false); chatInput.current?.blur();
  }

  function startDemo() {
    if (!role || !ready) return;
    setStage('mission'); setComplete(false);
    EventBus.dispatchEvent(new CustomEvent('mission:start', { detail: role }));
  }

  const shown = chatOpen ? messages : messages.filter(m => now - m.time < 8000).slice(-4);
  const avatar = (name: string) => import.meta.env.BASE_URL + 'assets/characters/player_' + name + '.png';
  const title = role ? challenges[role].title : 'Launch Day';

  return (
    <div className={'app ' + (stage === 'mission' ? 'app-mission' : 'app-lobby')}>
      <header className="top-bar">
        <div className="brand">▣ <strong>CODE <em>RED!</em></strong></div>
        <div className="stage-heading">{stage === 'lobby' ? 'Team Lobby' : 'Mission 01: ' + title}</div>
        {stage === 'mission' && <div className="progress-badge">Team Progress <b>{complete ? '1 / 3' : '0 / 3'}</b></div>}
        <div className="players">
          {demoPlayers.map((player, i) => (
            <div className="player-badge" key={player.name}>
              <img src={avatar(player.image)} alt="" />
              <div><b>{i === 0 ? 'You' : 'Teammate ' + i}</b>
              <small>{i === 0 ? (role || 'No role') : 'Demo'}</small></div>
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
              <input ref={chatInput} value={message} onChange={e => setMessage(e.target.value)} placeholder="Message your team..." aria-label="Chat message" />
              <small>Enter to send · Esc to close</small>
            </form>}
          </section>
        )}
      </main>

      {stage === 'lobby' && (
        <footer className="lobby-footer">
          <span>Role: <strong>{role || 'None'}</strong></span>
          <button type="button" disabled={!role} onClick={() => setReady(!ready)}>
            {ready ? 'Ready ✓ (R)' : 'Ready (R)'}
          </button>
          <button type="button" className="start-button" disabled={!role || !ready} onClick={startDemo}>
            ▶ Start Mission (Local Demo)
          </button>
          <span className="demo-note">Multiplayer will connect to the backend later</span>
        </footer>
      )}
    </div>
  );
}
