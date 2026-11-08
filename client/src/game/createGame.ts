// Phaser holds both the lobby scene and the mission scene.
import Phaser from 'phaser';
import LobbyScene from './scenes/LobbyScene';
import MissionScene from './scenes/MissionScene';

export function createGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-area',
    width: 960,
    height: 540,
    backgroundColor: '#111629',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [LobbyScene, MissionScene],
  });
}
