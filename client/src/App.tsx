
import { useEffect, useRef, useState, type FormEvent } from 'react';
import GameCanvas from './components/GameCanvas';
import { EventBus } from './game/EventBus';

type Role = 'frontend' | 'backend' | 'devops';

type Message = {
  user: string;
  text: string;
  time: number;
};

const players = [
  { name: 'You', avatar: 'purple' },
  { name: 'Player 2 (demo)', avatar: 'white' },
  { name: 'Player 3 (demo)', avatar: 'yellow' }
];

export default function App() {
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [now, setNow] = useState(Date.now());

  const chatInput = useRef<HTMLInputElement>(null);
  const chatHistory = useRef<HTMLDivElement>(null);

  // Get the selected role from Phaser
  useEffect(() => {
    function roleChanged(event: Event) {
      const newRole =
        (event as CustomEvent<Role | null>).detail;

      setRole(newRole);
      setReady(false);
    }

    EventBus.addEventListener('role-changed', roleChanged);

    return () => {
      EventBus.removeEventListener('role-changed', roleChanged);
    };
  }, []);

  // Timer for hiding old chat messages
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(timer);
  }, []);

  // Focus the input after pressing T
  useEffect(() => {
    if (chatOpen) {
      chatInput.current?.focus();
    }
  }, [chatOpen]);

  // Scroll to newest message
  useEffect(() => {
    if (chatOpen && chatHistory.current) {
      chatHistory.current.scrollTop =
        chatHistory.current.scrollHeight;
    }
  }, [chatOpen, messages]);

  // Keyboard controls
  useEffect(() => {
    function keyPressed(event: KeyboardEvent) {
      if (event.key === 'Escape' && chatOpen) {
        event.preventDefault();
        setChatOpen(false);
        chatInput.current?.blur();
        return;
      }

      const element = document.activeElement;

      const typing =
        element?.tagName === 'INPUT' ||
        element?.tagName === 'TEXTAREA';

      if (typing) return;

      // Open chat
      if (event.key.toLowerCase() === 't' && !event.repeat) {
        event.preventDefault();
        setChatOpen(true);
      }

      // Toggle Ready
      if (
        event.key.toLowerCase() === 'r' &&
        role &&
        !event.repeat
      ) {
        setReady(old => !old);
      }
    }

    window.addEventListener('keydown', keyPressed);

    return () => {
      window.removeEventListener('keydown', keyPressed);
    };
  }, [role, chatOpen]);

  // Send message with Enter
  function sendMessage(event: FormEvent) {
    event.preventDefault();

    const text = input.trim();

    if (text) {
      setMessages(old => [
        ...old,
        {
          user: 'You',
          text: text,
          time: Date.now()
        }
      ]);
    }

    setInput('');
    setChatOpen(false);
    chatInput.current?.blur();
  }

  // Show all history when open, recent messages when closed
  const visibleMessages = chatOpen
    ? messages
    : messages.filter(
        msg => now - msg.time < 8000
      ).slice(-4);

  return (
    <div className="app">

      {/* Top player bar */}
      <div className="top-bar">
        <span className="player-count">
          3 / 3 (local demo)
        </span>

        <div className="player-list">
          {players.map((player, i) => (
            <div className="player-card" key={player.name}>
              <img
                src={
                  '/assets/characters/player_' +
                  player.avatar + '.png'
                }
                alt={player.name}
              />

              <div>
                <b>{player.name}</b>

                <small>
                  {i === 0
                    ? role || 'No role'
                    : 'Waiting for server'}
                </small>

                <small className={
                  i === 0 && ready ? 'green' : ''
                }>
                  {i === 0 && ready ? 'Ready' : 'Not Ready'}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game map */}
      <div className="game-wrapper">
        <GameCanvas />

        {/* Mission board */}
        <div className="mission-board">
          <b>MISSION 01</b>
          <h3>Launch Day</h3>
          <p>☐ Fix critical bugs</p>
          <p>☐ Pass tests</p>
          <p>☐ Deploy to production</p>
        </div>

        {/* Transparent chat */}
        {(chatOpen || visibleMessages.length > 0) && (
          <div className={
            chatOpen
              ? 'valorant-chat valorant-chat-open'
              : 'valorant-chat valorant-chat-closed'
          }>

            {chatOpen && (
              <div className="valorant-title">
                TEAM CHAT
              </div>
            )}

            <div
              className="valorant-history"
              ref={chatHistory}
            >
              {visibleMessages.map((msg, i) => {
                const age = now - msg.time;

                const opacity =
                  chatOpen || age < 6500 ? 1 : 0;

                return (
                  <div
                    className="valorant-line"
                    key={i}
                    style={{ opacity }}
                  >
                    <span className="valorant-name">
                      [{msg.user}]
                    </span>
                    {' '}{msg.text}
                  </div>
                );
              })}
            </div>

            {chatOpen && (
              <form onSubmit={sendMessage}>
                <input
                  ref={chatInput}
                  className="valorant-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Send a message..."
                />

                <div className="valorant-hint">
                  ENTER to send | ESC to close
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <span>Role: {role || 'None'}</span>

        <button
          disabled={!role}
          onClick={() => setReady(old => !old)}
        >
          {ready ? 'Cancel Ready (R)' : 'Ready (R)'}
        </button>

        <button disabled>
          Start Game (waiting for 3 real players)
        </button>
      </div>
    </div>
  );
}
