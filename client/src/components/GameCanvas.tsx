import { useEffect } from 'react';
import { createGame } from '../game/createGame';
import { EventBus } from '../game/EventBus';
import type { Role } from '../game/data/challenges';

// Keep the Phaser canvas mounted while React changes the overlay.
export default function GameCanvas() {
  useEffect(() => {
    const game = createGame();

    // Only one scene runs at a time, so the lobby stops reading WASD/E
    // (and sending movement) while the mission is on screen.
    function startMission(event: Event) {
      const role = (event as CustomEvent<Role>).detail;
      game.scene.stop('LobbyScene');
      game.scene.start('MissionScene', { role });
    }

    // The server reset the room to Lobby (a teammate left, or we reconnected).
    // LobbyScene sends lobby:ready from create(), so App re-syncs the players.
    function returnToLobby() {
      game.scene.stop('MissionScene');
      game.scene.start('LobbyScene');
    }

    EventBus.addEventListener('mission:start', startMission);
    EventBus.addEventListener('lobby:return', returnToLobby);
    return () => {
      EventBus.removeEventListener('mission:start', startMission);
      EventBus.removeEventListener('lobby:return', returnToLobby);
      game.destroy(true);
    };
  }, []);

  return <div id="game-area" />;
}
