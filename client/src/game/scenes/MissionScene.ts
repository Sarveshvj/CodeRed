import Phaser from 'phaser';
import type { Role } from '../data/challenges';

// Mission 01: the player sits at the selected workstation.
// No movement controls in this scene.
export default class MissionScene extends Phaser.Scene {
  role: Role = 'frontend';

  constructor() {
    super('MissionScene');
  }

  init(data: { role?: Role }) {
    this.role = data.role || 'frontend';
  }

  preload() {
    const base = import.meta.env.BASE_URL + 'assets/';

    for (const role of ['frontend', 'backend', 'devops']) {
      this.load.image('mission_' + role,
        base + 'mission/workstation_' + role + '.png');
    }

    this.load.image('mission_floor', base + 'tiles/floor_tile.png');
    this.load.image('mission_wall', base + 'tiles/wall_tile.png');
    this.load.image('mission_plant', base + 'objects/plant.png');
    this.load.image('mission_player',
      base + 'characters/player_purple_back.png');
  }

  create() {
    // Dark office background using the existing floor and wall textures.
    this.add.tileSprite(480, 280, 960, 560, 'mission_floor')
      .setTint(0x745184);
    this.add.tileSprite(480, 104, 960, 208, 'mission_wall')
      .setTint(0x49335a);

    // Make the back wall and floor look darker.
    this.add.rectangle(480, 105, 960, 210, 0x1a142c, 0.48);
    this.add.rectangle(480, 375, 960, 330, 0x141129, 0.37);
    this.add.rectangle(480, 210, 960, 5, 0xb82b51, 0.75);

    // Red office window on the left, drawn with Phaser shapes.
    // No new image files are needed.
    const window = this.add.graphics();
    window.fillStyle(0x0c142b, 1);
    window.fillRect(0, 16, 105, 215);
    window.fillStyle(0x7c173b, 0.67);
    window.fillRect(7, 24, 90, 198);

    // Simple buildings behind the glass.
    window.fillStyle(0x2d1027, 0.8);
    window.fillRect(14, 142, 18, 78);
    window.fillRect(36, 118, 25, 102);
    window.fillRect(67, 160, 19, 60);
    window.lineStyle(5, 0x101425, 1);
    window.strokeRect(5, 20, 94, 210);
    window.lineBetween(52, 20, 52, 230);
    window.lineBetween(5, 119, 99, 119);
    window.lineStyle(2, 0xff5b73, 0.8);
    window.lineBetween(7, 24, 94, 24);

    // A few wall lights.
    this.add.rectangle(104, 18, 38, 5, 0xff4267, 0.9);
    this.add.rectangle(436, 128, 38, 5, 0xff4267, 0.8);

    // Use the same existing plant image from the lobby.
    this.add.image(116, 238, 'mission_plant').setScale(0.67);

    const others = (['frontend', 'backend', 'devops'] as Role[])
      .filter(role => role !== this.role);

    // Small desks in the background, just like the reference layout.
    // Left desk is near the window. Right desk is partly behind the editor.
    this.add.image(65, 372, 'mission_' + others[0])
      .setDisplaySize(148, 138)
      .setAlpha(0.77);

    this.add.image(454, 322, 'mission_' + others[1])
      .setDisplaySize(142, 132)
      .setAlpha(0.74);

    // Main workstation: much smaller than the previous 380px version.
    // The glow is already included in the transparent PNG.
    this.add.ellipse(270, 384, 235, 60, 0xffa332, 0.12);
    this.add.image(270, 312, 'mission_' + this.role)
      .setDisplaySize(205, 192)
      .setDepth(2);

    // The character is seated in front of the computer (no WASD).
    this.add.image(270, 345, 'mission_player')
      .setScale(0.58)
      .setDepth(3);

    // Small glowing role label directly above the main monitor.
    // Replaces the huge FRONTEND WORKSTATION text.
    const label = this.add.graphics().setDepth(4);
    label.fillStyle(0x14162b, 0.94);
    label.fillRoundedRect(185, 181, 170, 49, 10);
    label.lineStyle(2, 0xffbc65, 1);
    label.strokeRoundedRect(185, 181, 170, 49, 10);

    const name = this.role.charAt(0).toUpperCase() + this.role.slice(1);
    const symbol = this.role === 'frontend' ? '</>' :
      this.role === 'backend' ? 'DB' : '↑';

    this.add.text(215, 190, symbol, {
      fontFamily: '"Squada One", sans-serif', fontSize: '24px', fontStyle: 'bold',
      color: '#47dfff'
    }).setDepth(5);

    this.add.text(255, 187, name, {
      fontFamily: '"Squada One", sans-serif', fontSize: '21px', fontStyle: 'bold',
      color: '#ffffff'
    }).setDepth(5);

    this.add.text(255, 208, 'Your Role Station', {
      fontFamily: '"Squada One", sans-serif', fontSize: '13px',
      color: '#d8e1ee'
    }).setDepth(5);
  }
}
