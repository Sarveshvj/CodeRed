
import Phaser from 'phaser';
import { EventBus } from '../EventBus';

// Three engineering roles
type Role = 'frontend' | 'backend' | 'devops';

// Desk positions and chair positions
const desks: {
  role: Role;
  x: number;
  y: number;
  seatX: number;
  seatY: number;
}[] = [
  {
    role: 'frontend',
    x: 240,
    y: 228,
    seatX: 240,
    seatY: 300
  },
  {
    role: 'backend',
    x: 480,
    y: 228,
    seatX: 480,
    seatY: 300
  },
  {
    role: 'devops',
    x: 720,
    y: 228,
    seatX: 720,
    seatY: 300
  }
];

export default class LobbyScene extends Phaser.Scene {

  player!: Phaser.Physics.Arcade.Sprite;
  keys!: { [key: string]: Phaser.Input.Keyboard.Key };
  arrows!: Phaser.Types.Input.Keyboard.CursorKeys;
  prompt!: Phaser.GameObjects.Text;

  constructor() {
    super('LobbyScene');
  }

  preload() {

    // Load game images
    const base = '/assets/';

    // Player images
    for (const color of ['purple', 'white', 'yellow']) {
      this.load.image(
        color,
        base + 'characters/player_' + color + '.png'
      );
    }

    // Purple player directions
    this.load.image(
      'purple_back',
      base + 'characters/player_purple_back.png'
    );

    this.load.image(
      'purple_side',
      base + 'characters/player_purple_side.png'
    );

    // Three work desks
    for (const role of ['frontend', 'backend', 'devops']) {
      this.load.image(
        'desk_' + role,
        base + 'objects/desk_' + role + '.png'
      );
    }

    // Office decorations (no boxes)
    for (const item of [
      'server_rack',
      'plant',
      'calendar'
    ]) {
      this.load.image(
        item,
        base + 'objects/' + item + '.png'
      );
    }

    // Floor and wall
    this.load.image(
      'floor',
      base + 'tiles/floor_tile.png'
    );

    this.load.image(
      'wall',
      base + 'tiles/wall_tile.png'
    );
  }

  create() {

    // Create office floor
    this.add.tileSprite(
      480, 300, 960, 480, 'floor'
    );

    // Create office wall
    this.add.tileSprite(
      480, 32, 960, 64, 'wall'
    );

    // Wall border
    this.add.rectangle(
      480, 64, 960, 5, 0x306a87
    );

    // One calendar on the wall
    this.add.image(
      260, 94, 'calendar'
    ).setScale(0.65);

    // Server racks
    this.add.image(
      688, 96, 'server_rack'
    ).setScale(0.65);

    this.add.image(
      758, 96, 'server_rack'
    ).setScale(0.65);

    this.add.image(
      828, 96, 'server_rack'
    ).setScale(0.65);

    // Plants
    // Move plants away from the UI panels
    this.add.image(
      120, 430, 'plant'
    ).setScale(0.58);

    this.add.image(
      900, 130, 'plant'
    ).setScale(0.58);

    // Create the three work desks
    for (const desk of desks) {

      this.add.image(
        desk.x,
        desk.y,
        'desk_' + desk.role
      )
      .setScale(0.70)
      .setDepth(2);
    }

    // Temporary teammates
    // These will be replaced by real multiplayer later
    this.add.image(
      340, 395, 'white'
    )
    .setScale(0.65)
    .setDepth(4);

    this.add.image(
      630, 395, 'yellow'
    )
    .setScale(0.65)
    .setDepth(4);

    // Create the controllable player
    this.player = this.physics.add.sprite(
      480, 400, 'purple'
    );

    this.player.setScale(0.65);
    this.player.setDepth(5);
    this.player.setCollideWorldBounds(true);

    // Player collision size
    this.player.setSize(43, 21);
    this.player.setOffset(22, 76);

    // Desk collision
    // Players cannot walk through the tables
    for (const desk of desks) {

      const wall = this.add.zone(
        desk.x,
        desk.y - 27,
        155,
        67
      );

      this.physics.add.existing(wall, true);
      this.physics.add.collider(this.player, wall);
    }

    // Keyboard controls
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,E'
    ) as typeof this.keys;

    this.arrows =
      this.input.keyboard!.createCursorKeys();

    // Instructions
    this.prompt = this.add.text(
      480,
      493,
      'WASD to move | Go to a chair and press E',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#1b3158',
        padding: {
          x: 12,
          y: 8
        }
      }
    );

    this.prompt.setOrigin(0.5);
    this.prompt.setScrollFactor(0);
    this.prompt.setDepth(10);
  }

  update() {

    if (!this.player) return;

    // Stop player movement while typing in chat
    const element = document.activeElement;

    if (
      element?.tagName === 'INPUT' ||
      element?.tagName === 'TEXTAREA'
    ) {
      this.player.setVelocity(0);
      return;
    }

    let x = 0;
    let y = 0;

    // WASD and arrow keys
    if (this.keys.A.isDown || this.arrows.left.isDown) {
      x = -1;
    }

    if (this.keys.D.isDown || this.arrows.right.isDown) {
      x = 1;
    }

    if (this.keys.W.isDown || this.arrows.up.isDown) {
      y = -1;
    }

    if (this.keys.S.isDown || this.arrows.down.isDown) {
      y = 1;
    }

    // Keep diagonal movement at the same speed
    const length = Math.sqrt(x * x + y * y) || 1;

    this.player.setVelocity(
      x / length * 170,
      y / length * 170
    );

    // Change character direction
    if (y < 0) {

      this.player.setTexture('purple_back');

    } else if (x !== 0) {

      this.player.setTexture('purple_side');
      this.player.setFlipX(x < 0);

    } else if (y > 0) {

      this.player.setTexture('purple');
      this.player.setFlipX(false);
    }

    // Check if the player is near a chair
    let close: Role | null = null;

    for (const desk of desks) {

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        desk.seatX,
        desk.seatY
      );

      // Only allow interaction close to the chair
      if (distance < 32) {
        close = desk.role;
      }
    }

    // Show interaction message
    if (close) {

      this.prompt.setText(
        'Press E to choose ' + close
      );

    } else {

      this.prompt.setText(
        'Move to a chair and press E'
      );
    }

    // Press E to select a role
    if (
      close &&
      Phaser.Input.Keyboard.JustDown(this.keys.E)
    ) {

      EventBus.dispatchEvent(
        new CustomEvent('choose-role', {
          detail: close
        })
      );
    }
  }
}
