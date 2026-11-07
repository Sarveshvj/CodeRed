
import Phaser from 'phaser';
import { EventBus } from '../EventBus';

type Role = 'frontend' | 'backend' | 'devops';

// Desk and chair positions
const desks: {
  role: Role;
  x: number;
  y: number;
  seatX: number;
  seatY: number;
}[] = [
  { role: 'frontend', x: 240, y: 228, seatX: 240, seatY: 300 },
  { role: 'backend', x: 480, y: 228, seatX: 480, seatY: 300 },
  { role: 'devops', x: 720, y: 228, seatX: 720, seatY: 300 }
];

export default class LobbyScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: { [key: string]: Phaser.Input.Keyboard.Key };
  arrows!: Phaser.Types.Input.Keyboard.CursorKeys;
  deskPrompt!: Phaser.GameObjects.Text;

  selectedRole: Role | null = null;

  constructor() {
    super('LobbyScene');
  }

  preload() {
    const base = '/assets/';

    // Player images
    for (const color of ['purple', 'white', 'yellow']) {
      this.load.image(
        color,
        base + 'characters/player_' + color + '.png'
      );
    }

    this.load.image(
      'purple_back',
      base + 'characters/player_purple_back.png'
    );

    this.load.image(
      'purple_side',
      base + 'characters/player_purple_side.png'
    );

    // Work desks
    for (const role of ['frontend', 'backend', 'devops']) {
      this.load.image(
        'desk_' + role,
        base + 'objects/desk_' + role + '.png'
      );
    }

    // Office decorations
    for (const item of ['server_rack', 'plant', 'calendar']) {
      this.load.image(
        item,
        base + 'objects/' + item + '.png'
      );
    }

    this.load.image('floor', base + 'tiles/floor_tile.png');
    this.load.image('wall', base + 'tiles/wall_tile.png');
  }

  create() {
    // Office floor and wall
    this.add.tileSprite(480, 300, 960, 480, 'floor');
    this.add.tileSprite(480, 32, 960, 64, 'wall');
    this.add.rectangle(480, 64, 960, 5, 0x306a87);

    // One calendar
    this.add.image(260, 94, 'calendar').setScale(0.65);

    // Servers
    this.add.image(688, 96, 'server_rack').setScale(0.65);
    this.add.image(758, 96, 'server_rack').setScale(0.65);
    this.add.image(828, 96, 'server_rack').setScale(0.65);

    // Plants on the upper-right side
    this.add.image(900, 130, 'plant').setScale(0.58);
    this.add.image(900, 210, 'plant').setScale(0.58);

    // Work desks
    for (const desk of desks) {
      this.add.image(
        desk.x,
        desk.y,
        'desk_' + desk.role
      ).setScale(0.70).setDepth(2);
    }

    // Temporary teammates
    this.add.image(340, 395, 'white')
      .setScale(0.65).setDepth(4);

    this.add.image(630, 395, 'yellow')
      .setScale(0.65).setDepth(4);

    // Local player
    this.player = this.physics.add.sprite(480, 400, 'purple');
    this.player.setScale(0.65);
    this.player.setDepth(5);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(43, 21);
    this.player.setOffset(22, 76);

    // Desk collision
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

    // Keyboard
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,E',
      false
    ) as typeof this.keys;

    this.arrows = this.input.keyboard!.createCursorKeys();

    // Text above the computer
    this.deskPrompt = this.add.text(0, 0, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
      backgroundColor: '#172849',
      padding: { x: 12, y: 7 },
      align: 'center'
    });

    this.deskPrompt.setOrigin(0.5);
    this.deskPrompt.setDepth(20);
    this.deskPrompt.setVisible(false);
  }

  // Show text directly above the selected computer
  showPrompt(
    desk: (typeof desks)[number],
    message: string
  ) {
    this.deskPrompt.setPosition(
      desk.x,
      desk.y - 90
    );

    this.deskPrompt.setText(message);
    this.deskPrompt.setVisible(true);
  }

  update() {
    if (!this.player) return;

    // Disable movement while typing in chat
    const element = document.activeElement;

    if (
      element?.tagName === 'INPUT' ||
      element?.tagName === 'TEXTAREA'
    ) {
      this.player.setVelocity(0);
      return;
    }

    const pressedE = Phaser.Input.Keyboard.JustDown(
      this.keys.E
    );

    // Role already selected
    if (this.selectedRole) {
      this.player.setVelocity(0);

      const desk = desks.find(
        d => d.role === this.selectedRole
      );

      if (desk) {
        const name =
          desk.role.charAt(0).toUpperCase() +
          desk.role.slice(1);

        this.showPrompt(
          desk,
          name + ' selected - Press E to cancel'
        );
      }

      // Press E again to cancel
      if (pressedE) {
        this.selectedRole = null;

        EventBus.dispatchEvent(
          new CustomEvent('role-changed', {
            detail: null
          })
        );
      }

      return;
    }

    // Normal movement
    let x = 0;
    let y = 0;

    if (this.keys.A.isDown || this.arrows.left.isDown) x = -1;
    if (this.keys.D.isDown || this.arrows.right.isDown) x = 1;
    if (this.keys.W.isDown || this.arrows.up.isDown) y = -1;
    if (this.keys.S.isDown || this.arrows.down.isDown) y = 1;

    const length = Math.sqrt(x * x + y * y) || 1;

    this.player.setVelocity(
      x / length * 170,
      y / length * 170
    );

    // Player direction
    if (y < 0) {
      this.player.setTexture('purple_back');
      this.player.setFlipX(false);
    } else if (x !== 0) {
      this.player.setTexture('purple_side');
      this.player.setFlipX(x < 0);
    } else if (y > 0) {
      this.player.setTexture('purple');
      this.player.setFlipX(false);
    }

    // Find a nearby chair
    let closeDesk: (typeof desks)[number] | null = null;

    for (const desk of desks) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        desk.seatX,
        desk.seatY
      );

      if (distance < 32) {
        closeDesk = desk;
        break;
      }
    }

    if (closeDesk) {
      const name =
        closeDesk.role.charAt(0).toUpperCase() +
        closeDesk.role.slice(1);

      this.showPrompt(
        closeDesk,
        name + ' - Press E to select'
      );

      // Press E to select role
      if (pressedE) {
        this.selectedRole = closeDesk.role;
        this.player.setVelocity(0);
        this.player.setTexture('purple');
        this.player.setFlipX(false);

        EventBus.dispatchEvent(
          new CustomEvent('role-changed', {
            detail: this.selectedRole
          })
        );
      }
    } else {
      this.deskPrompt.setVisible(false);
    }
  }
}
