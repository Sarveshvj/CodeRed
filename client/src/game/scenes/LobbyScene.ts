import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import type { Role } from '../data/challenges';
import type { Avatar, Facing, Room } from '../../network/socket';

const desks: { role: Role; x: number; y: number; seatX: number; seatY: number }[] = [
  { role: 'frontend', x: 240, y: 230, seatX: 240, seatY: 302 },
  { role: 'backend', x: 480, y: 230, seatX: 480, seatY: 302 },
  { role: 'devops', x: 720, y: 230, seatX: 720, seatY: 302 },
];

type RemotePlayer = {
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
};

type PlayerMovement = {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  flipX: boolean;
};

export default class LobbyScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  arrows!: Record<string, Phaser.Input.Keyboard.Key>;
  prompt!: Phaser.GameObjects.Text;
  selectedRole: Role | null = null;

  private myId = '';
  private myAvatar: Avatar = 'purple';
  private remotePlayers = new Map<string, RemotePlayer>();
  private rolePending = false;
  private lastMoveSent = 0;
  private lastX = 0;
  private lastY = 0;
  private facing: Facing = 'front';
  private flipX = false;
  private roleError = '';

  constructor() { super('LobbyScene'); }

  // Phaser reuses this scene object when it restarts (back from a mission),
  // so clear the per-run state. Clearing myId makes the next sync place the
  // new sprite at the server's position.
  init() {
    this.myId = '';
    this.selectedRole = null;
    this.rolePending = false;
    this.roleError = '';
    this.lastMoveSent = 0;
    this.facing = 'front';
    this.flipX = false;
  }

  preload() {
    const base = import.meta.env.BASE_URL + 'assets/';
    for (const color of ['purple', 'white', 'yellow']) {
      this.load.image(color, base + 'characters/player_' + color + '.png');
      this.load.image(color + '_back', base + 'characters/player_' + color + '_back.png');
      this.load.image(color + '_side', base + 'characters/player_' + color + '_side.png');
    }
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
    // Keep the existing pixel-art office exactly as it was.
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

    // No static white or yellow demo characters anymore.
    // The server decides which avatar belongs to this browser.
    this.player = this.physics.add.sprite(480, 475, 'purple');
    this.player.setScale(0.67).setDepth(5).setCollideWorldBounds(true).setVisible(false);
    this.player.setSize(43, 21).setOffset(22, 76);

    for (const desk of desks) {
      const wall = this.add.zone(desk.x, desk.y - 28, 155, 65);
      this.physics.add.existing(wall, true);
      this.physics.add.collider(this.player, wall);
    }

    // false allows typing W/A/S/D in chat without preventing the keystroke.
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E', false) as Record<string, Phaser.Input.Keyboard.Key>;
    // Read arrow keys without blocking typing in the editor or chat.
    this.arrows = this.input.keyboard!.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
    }, false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.prompt = this.add.text(0, 0, '', {
      fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#1b3158', padding: { x: 10, y: 7 },
    }).setOrigin(0.5).setDepth(12).setVisible(false);

    const sync = (event: Event) => {
      const data = (event as CustomEvent<{ room: Room; playerId: string }>).detail;
      this.syncPlayers(data.room, data.playerId);
    };
    const move = (event: Event) => {
      this.moveRemote((event as CustomEvent<PlayerMovement>).detail);
    };
    const roleResult = (event: Event) => {
      const result = (event as CustomEvent<{ error?: string }>).detail;
      this.rolePending = false;
      this.roleError = result.error || '';
    };

    EventBus.addEventListener('lobby:sync', sync);
    EventBus.addEventListener('lobby:player-moved', move);
    EventBus.addEventListener('lobby:role-result', roleResult);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.removeEventListener('lobby:sync', sync);
      EventBus.removeEventListener('lobby:player-moved', move);
      EventBus.removeEventListener('lobby:role-result', roleResult);
      for (const remote of this.remotePlayers.values()) {
        remote.sprite.destroy();
        remote.label.destroy();
      }
      this.remotePlayers.clear();
    });

    // Ask React for the latest server room when the Phaser scene is ready.
    EventBus.dispatchEvent(new Event('lobby:ready'));
  }

  private syncPlayers(room: Room, playerId: string) {
    const me = room.players.find(p => p.id === playerId);
    if (!me) return;

    // Only set the local position on the first sync, so room updates
    // never teleport a player backwards while they're walking.
    if (this.myId !== playerId) {
      this.myId = playerId;
      this.player.setPosition(me.x, me.y);
      this.lastX = me.x;
      this.lastY = me.y;
    }
    this.myAvatar = me.avatar;
    this.selectedRole = me.role;
    this.player.setVisible(true);
    this.setAppearance(this.player, me.avatar, this.facing, this.flipX);

    const activeIds = new Set<string>();
    for (const teammate of room.players) {
      if (teammate.id === playerId) continue;
      activeIds.add(teammate.id);
      let remote = this.remotePlayers.get(teammate.id);
      if (!remote) {
        const sprite = this.add.image(teammate.x, teammate.y, teammate.avatar)
          .setScale(0.67).setDepth(5);
        const label = this.add.text(teammate.x, teammate.y - 64, teammate.name, {
          fontFamily: 'Arial', fontSize: '13px', color: '#ffffff',
          backgroundColor: '#1b3158', padding: { x: 5, y: 3 },
        }).setOrigin(0.5).setDepth(8);
        remote = { sprite, label, targetX: teammate.x, targetY: teammate.y };
        this.remotePlayers.set(teammate.id, remote);
      }
      remote.targetX = teammate.x;
      remote.targetY = teammate.y;
      remote.label.setText(teammate.name);
      // Do not change the direction on an ordinary room update.
      const key = remote.sprite.texture.key;
      const direction: Facing = key.endsWith('_back') ? 'back' : key.endsWith('_side') ? 'side' : 'front';
      this.setAppearance(remote.sprite, teammate.avatar, direction, remote.sprite.flipX);
    }

    // A disconnected teammate disappears immediately.
    for (const [id, remote] of this.remotePlayers) {
      if (!activeIds.has(id)) {
        remote.sprite.destroy();
        remote.label.destroy();
        this.remotePlayers.delete(id);
      }
    }
  }

  private setAppearance(
    sprite: Phaser.GameObjects.Image | Phaser.Physics.Arcade.Sprite,
    avatar: Avatar,
    facing: Facing,
    flipX: boolean
  ) {
    const texture = avatar + (facing === 'front' ? '' : '_' + facing);
    if (sprite.texture.key !== texture) sprite.setTexture(texture);
    sprite.setFlipX(flipX);
  }

  private moveRemote(data: PlayerMovement) {
    const remote = this.remotePlayers.get(data.id);
    if (!remote) return;
    remote.targetX = data.x;
    remote.targetY = data.y;
    const avatar = remote.sprite.texture.key.split('_')[0] as Avatar;
    this.setAppearance(remote.sprite, avatar, data.facing, data.flipX);
  }

  private sendMovement(time: number) {
    if (!this.myId || time - this.lastMoveSent < 67) return;
    const x = Math.round(this.player.x * 10) / 10;
    const y = Math.round(this.player.y * 10) / 10;
    if (x === this.lastX && y === this.lastY) return;

    this.lastMoveSent = time;
    this.lastX = x;
    this.lastY = y;
    EventBus.dispatchEvent(new CustomEvent('lobby:move', {
      detail: { x, y, facing: this.facing, flipX: this.flipX },
    }));
  }

  update(time: number, delta: number) {
    // Smooth the two remote players between the 15-per-second updates.
    const blend = Math.min(1, delta / 90);
    for (const remote of this.remotePlayers.values()) {
      remote.sprite.x = Phaser.Math.Linear(remote.sprite.x, remote.targetX, blend);
      remote.sprite.y = Phaser.Math.Linear(remote.sprite.y, remote.targetY, blend);
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - 64);
    }

    if (!this.player || !this.myId) return;
    const el = document.activeElement;
    if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
      this.player.setVelocity(0);
      this.sendMovement(time);
      return;
    }

    const pressedE = Phaser.Input.Keyboard.JustDown(this.keys.E);

    // The server decides when the role has been selected or cancelled.
    if (this.selectedRole) {
      this.player.setVelocity(0);
      const desk = desks.find(d => d.role === this.selectedRole)!;
      this.prompt.setPosition(desk.x, desk.y - 92);
      this.prompt.setText(this.selectedRole.toUpperCase() + ' selected - Press E to cancel');
      this.prompt.setVisible(true);
      this.facing = 'back';
      this.flipX = false;
      this.setAppearance(this.player, this.myAvatar, this.facing, this.flipX);
      if (pressedE && !this.rolePending) {
        this.rolePending = true;
        EventBus.dispatchEvent(new CustomEvent('lobby:role-request', { detail: { role: null } }));
      }
      this.sendMovement(time);
      return;
    }

    let x = 0, y = 0;
    if (this.keys.A.isDown || this.arrows.left.isDown) x = -1;
    if (this.keys.D.isDown || this.arrows.right.isDown) x = 1;
    if (this.keys.W.isDown || this.arrows.up.isDown) y = -1;
    if (this.keys.S.isDown || this.arrows.down.isDown) y = 1;
    const length = Math.sqrt(x * x + y * y) || 1;
    this.player.setVelocity(x / length * 170, y / length * 170);

    if (y < 0) { this.facing = 'back'; this.flipX = false; }
    else if (x !== 0) { this.facing = 'side'; this.flipX = x < 0; }
    else if (y > 0) { this.facing = 'front'; this.flipX = false; }
    this.setAppearance(this.player, this.myAvatar, this.facing, this.flipX);

    let nearby: (typeof desks)[number] | null = null;
    for (const desk of desks) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, desk.seatX, desk.seatY);
      if (distance < 36) { nearby = desk; break; }
    }
    if (nearby) {
      this.prompt.setPosition(nearby.x, nearby.y - 92);
      this.prompt.setText(this.roleError || (nearby.role.toUpperCase() + ' - Press E to select'));
      this.prompt.setVisible(true);
      if (pressedE && !this.rolePending) {
        this.rolePending = true;
        this.roleError = '';
        this.player.setVelocity(0);
        EventBus.dispatchEvent(new CustomEvent('lobby:role-request', { detail: { role: nearby.role } }));
      }
    } else {
      this.roleError = '';
      this.prompt.setVisible(false);
    }
    this.sendMovement(time);
  }
}
