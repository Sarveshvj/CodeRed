// Put the Phaser canvas inside React.
import { useEffect } from 'react';
import { createGame } from '../game/createGame';

export default function GameCanvas() {
  useEffect(() => {
    const game = createGame();
    return () => { game.destroy(true); };
  }, []);

  return <div id="game-area" />;
}
