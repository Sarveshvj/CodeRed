// Create the Phaser game inside the React page.
import Phaser from 'phaser';
import LobbyScene from './scenes/LobbyScene';

export function createGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-area',
    width: 960,
    height: 540,
    backgroundColor: '#74bedb',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [LobbyScene],
  });
}
