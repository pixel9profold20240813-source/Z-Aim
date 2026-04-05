import * as THREE from 'three';
import { ref, set, onValue, update, onChildAdded, onChildRemoved, onChildChanged, remove } from 'firebase/database';
import { db } from '../firebase';
import { WeaponType, GAME_SETTINGS } from './constants';

export interface PlayerData {
  pos: { x: number; y: number; z: number };
  rot: { y: number };
  hp: number;
  weapon: WeaponType;
  displayName: string;
}

export class NetworkManager {
  roomId: string;
  userId: string;
  remotePlayers: Map<string, { mesh: THREE.Mesh; hp: number }> = new Map();
  onHpChange?: (hp: number) => void;
  onKill?: (victim: string, killer: string) => void;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  async joinRoom(data: PlayerData) {
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.userId}`);
    await set(playerRef, data);

    // Listen for players joining
    onChildAdded(ref(db, `rooms/${this.roomId}/players`), (snapshot) => {
      if (snapshot.key === this.userId) return;
      this.addRemotePlayer(snapshot.key!, snapshot.val());
    });

    // Listen for players leaving
    onChildRemoved(ref(db, `rooms/${this.roomId}/players`), (snapshot) => {
      this.removeRemotePlayer(snapshot.key!);
    });

    // Listen for player updates
    onChildChanged(ref(db, `rooms/${this.roomId}/players`), (snapshot) => {
      const id = snapshot.key!;
      const data = snapshot.val() as PlayerData;
      
      if (id === this.userId) {
        if (this.onHpChange) this.onHpChange(data.hp);
        return;
      }

      const remote = this.remotePlayers.get(id);
      if (remote) {
        remote.mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
        remote.mesh.rotation.y = data.rot.y;
        remote.hp = data.hp;
      }
    });
  }

  private addRemotePlayer(id: string, data: PlayerData) {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff4444 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.pos.x, data.pos.y, data.pos.z);
    mesh.userData.userId = id;
    
    // Add a simple "head"
    const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.2;
    mesh.add(head);

    this.remotePlayers.set(id, { mesh, hp: data.hp });
    return mesh;
  }

  private removeRemotePlayer(id: string) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      this.remotePlayers.delete(id);
      return remote.mesh;
    }
    return null;
  }

  updateMyStatus(pos: THREE.Vector3, rotY: number) {
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.userId}`);
    update(playerRef, {
      pos: { x: pos.x, y: pos.y, z: pos.z },
      rot: { y: rotY }
    });
  }

  applyDamage(targetId: string, damage: number) {
    const remote = this.remotePlayers.get(targetId);
    if (!remote) return;

    const newHp = Math.max(0, remote.hp - damage);
    const playerRef = ref(db, `rooms/${this.roomId}/players/${targetId}`);
    update(playerRef, { hp: newHp });
    
    if (newHp === 0) {
      // Handle kill log or something
    }
  }

  async respawn() {
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.userId}`);
    const spawnPos = {
      x: Math.random() * GAME_SETTINGS.SPAWN_RANGE - GAME_SETTINGS.SPAWN_RANGE / 2,
      y: GAME_SETTINGS.PLAYER_HEIGHT,
      z: Math.random() * GAME_SETTINGS.SPAWN_RANGE - GAME_SETTINGS.SPAWN_RANGE / 2
    };
    await update(playerRef, {
      hp: GAME_SETTINGS.INITIAL_HP,
      pos: spawnPos
    });
    return spawnPos;
  }

  leaveRoom() {
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.userId}`);
    remove(playerRef);
  }
}
