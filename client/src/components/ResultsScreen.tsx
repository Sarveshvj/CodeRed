// Displays mission outcome, completed tasks, and feedback on practiced skills.
import type { Role, Room } from '../network/socket';

type Props = {
  room: Room;
  durationMs: number;
  myPlayerId: string;
  onLeave: () => void;
};

// What each role practiced in Mission 01 (see shared/mission01.md).
const SKILLS: Record<Role, { task: string; skill: string }> = {
  frontend: { task: 'Fixed the counter in Counter.tsx', skill: 'React state updates' },
  backend: { task: 'Stopped negative stock in inventory.js', skill: 'Input validation' },
  devops: { task: 'Pointed nginx at port 8080', skill: 'Reverse proxy config' },
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function ResultsScreen({ room, durationMs, myPlayerId, onLeave }: Props) {
  const avatar = (name: string) => import.meta.env.BASE_URL + 'assets/characters/player_' + name + '.png';

  return (
    <section className="results-screen" aria-labelledby="results-title">
      <div className="eyebrow">MISSION 01 · LAUNCH DAY</div>
      <h2 id="results-title">🚀 Deployed to Production!</h2>
      <p className="results-time">
        Your team shipped in <b>{formatDuration(durationMs)}</b>
      </p>

      <div className="results-team">
        {room.players.map(player => {
          const info = player.role ? SKILLS[player.role] : null;
          const done = player.role ? room.progress[player.role] : false;
          return (
            <div className="results-player" key={player.id}>
              <img src={avatar(player.avatar)} alt="" />
              <div>
                <b>{player.name}{player.id === myPlayerId ? ' (You)' : ''}</b>
                <small>{player.role ? player.role.toUpperCase() : 'No role'}</small>
                {info && <p>{done ? '✅' : '☐'} {info.task}</p>}
                {info && <p className="results-skill">Practiced: {info.skill}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="results-leave" onClick={onLeave}>
        Back to Room Entry
      </button>
      <small className="demo-note">To play again, create or join a new room.</small>
    </section>
  );
}
