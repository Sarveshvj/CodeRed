import { useEffect } from 'react';
import { createGame } from '../game/createGame';
import { EventBus } from '../game/EventBus';
import type { Role } from '../game/data/challenges';

// Keep the Phaser canvas mounted while React changes the overlay.
export default function GameCanvas() {
  useEffect(() => {
    const game = createGame();

    function startMission(event: Event) {
      const role = (event as CustomEvent<Role>).detail;
      game.scene.start('MissionScene', { role });
    }

    EventBus.addEventListener('mission:start', startMission);
    return () => {
      EventBus.removeEventListener('mission:start', startMission);
      game.destroy(true);
    };
  }, []);

  return <div id="game-area" />;
}
