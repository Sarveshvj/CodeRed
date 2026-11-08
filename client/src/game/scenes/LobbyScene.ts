import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import type { Role } from '../data/challenges';

const desks: { role: Role; x: number; y: number; seatX: number; seatY: number }[] = [
  { role: 'frontend', x: 240, y: 230, seatX: 240, seatY: 302 },
  { role: 'backend', x: 480, y: 230, seatX: 480, seatY: 302 },
  { role: 'devops', x: 720, y: 230, seatX: 720, seatY: 302 },
];

export default class LobbyScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  arrows!: Phaser.Types.Input.Keyboard.CursorKeys;
  prompt!: Phaser.GameObjects.Text;
  selectedRole: Role | null = null;

  constructor() { super('LobbyScene'); }

  preload() {
    const base = import.meta.env.BASE_URL + 'assets/';
    for (const color of ['purple', 'white', 'yellow']) {
      this.load.image(color, base + 'characters/player_' + color + '.png');
    }
    this.load.image('purple_back', base + 'characters/player_purple_back.png');
    this.load.image('purple_side', base + 'characters/player_purple_side.png');
    for (const role of ['frontend', 'backend', 'devops']) {
      this.load.image('desk_' + role, base + 'objects/desk_' + role + '.png');
    }
    for (const item of ['server_rack', 'plant', 'calendar']) {
      this.load.image(item, base + 'objects/' + item + '.png');
    }
    this.load.image('floor', base + 'tiles/floor_tile.png');
    this.load.image('wall', base + 'tiles/wall_tile.png');
  }

  create() {
    this.add.tileSprite(480, 340, 960, 680, 'floor');
    this.add.tileSprite(480, 32, 960, 64, 'wall');
    this.add.rectangle(480, 65, 960, 5, 0x306a87);
    this.add.image(250, 110, 'calendar').setScale(0.67);
    this.add.image(685, 120, 'server_rack').setScale(0.7);
    this.add.image(765, 120, 'server_rack').setScale(0.7);
    this.add.image(845, 120, 'server_rack').setScale(0.7);
    this.add.image(905, 170, 'plant').setScale(0.57);
    this.add.image(905, 265, 'plant').setScale(0.57);
    for (const desk of desks) {
      this.add.image(desk.x, desk.y, 'desk_' + desk.role).setScale(0.70).setDepth(2);
    }
    // The other two players are local demo placeholders.
    this.add.image(335, 465, 'white').setScale(0.67).setDepth(4);
    this.add.image(640, 465, 'yellow').setScale(0.67).setDepth(4);
    this.player = this.physics.add.sprite(480, 475, 'purple');
    this.player.setScale(0.67).setDepth(5).setCollideWorldBounds(true);
    this.player.setSize(43, 21).setOffset(22, 76);
    for (const desk of desks) {
      const wall = this.add.zone(desk.x, desk.y - 28, 155, 65);
      this.physics.add.existing(wall, true);
      this.physics.add.collider(this.player, wall);
    }
    // false lets typing in the chat box use WASD normally.
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.arrows = this.input.keyboard!.createCursorKeys();
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1b3158', padding: { x: 10, y: 7 },
    }).setOrigin(0.5).setDepth(12).setVisible(false);
  }

  update() {
    if (!this.player) return;
    const el = document.activeElement;
    if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
      this.player.setVelocity(0); return;
    }
    const pressedE = Phaser.Input.Keyboard.JustDown(this.keys.E);
    if (this.selectedRole) {
      this.player.setVelocity(0);
      const desk = desks.find(d => d.role === this.selectedRole)!;
      this.prompt.setPosition(desk.x, desk.y - 92);
      this.prompt.setText(this.selectedRole.toUpperCase() + ' selected - Press E to cancel');
      this.prompt.setVisible(true);
      if (pressedE) {
        this.selectedRole = null;
        EventBus.dispatchEvent(new CustomEvent('role-changed', { detail: null }));
      }
      return;
    }
    let x = 0, y = 0;
    if (this.keys.A.isDown || this.arrows.left.isDown) x = -1;
    if (this.keys.D.isDown || this.arrows.right.isDown) x = 1;
    if (this.keys.W.isDown || this.arrows.up.isDown) y = -1;
    if (this.keys.S.isDown || this.arrows.down.isDown) y = 1;
    const length = Math.sqrt(x*x + y*y) || 1;
    this.player.setVelocity(x / length * 170, y / length * 170);
    if (y < 0) this.player.setTexture('purple_back').setFlipX(false);
    else if (x !== 0) this.player.setTexture('purple_side').setFlipX(x < 0);
    else if (y > 0) this.player.setTexture('purple').setFlipX(false);
    let nearby: (typeof desks)[number] | null = null;
    for (const desk of desks) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, desk.seatX, desk.seatY);
      if (distance < 36) { nearby = desk; break; }
    }
    if (nearby) {
      this.prompt.setPosition(nearby.x, nearby.y - 92);
      this.prompt.setText(nearby.role.toUpperCase() + ' - Press E to select');
      this.prompt.setVisible(true);
      if (pressedE) {
        this.selectedRole = nearby.role;
        this.player.setVelocity(0);
        this.player.setTexture('purple_back').setFlipX(false);
        EventBus.dispatchEvent(new CustomEvent('role-changed', { detail: nearby.role }));
      }
    } else {
      this.prompt.setVisible(false);
    }
  }
}
