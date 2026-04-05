import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { GameEngine } from './game/Engine';
import { NetworkManager } from './game/Network';
import { WEAPONS, WeaponType, GAME_SETTINGS } from './game/constants';
import { LogIn, Users, Target, Shield, Crosshair } from 'lucide-react';
import * as THREE from 'three';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('AR');
  const [gameState, setGameState] = useState<'LOGIN' | 'LOBBY' | 'PLAYING'>('LOGIN');
  const [hp, setHp] = useState(GAME_SETTINGS.INITIAL_HP);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const networkRef = useRef<NetworkManager | null>(null);
  const lastShootTime = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setGameState('LOBBY');
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const startGame = async () => {
    if (!user || !roomCode) return;
    setGameState('PLAYING');
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && containerRef.current && user) {
      const engine = new GameEngine(containerRef.current);
      const network = new NetworkManager(roomCode, user.uid);
      
      engineRef.current = engine;
      networkRef.current = network;

      const spawnPos = {
        x: Math.random() * GAME_SETTINGS.SPAWN_RANGE - GAME_SETTINGS.SPAWN_RANGE / 2,
        y: GAME_SETTINGS.PLAYER_HEIGHT,
        z: Math.random() * GAME_SETTINGS.SPAWN_RANGE - GAME_SETTINGS.SPAWN_RANGE / 2
      };

      network.joinRoom({
        pos: spawnPos,
        rot: { y: 0 },
        hp: GAME_SETTINGS.INITIAL_HP,
        weapon: selectedWeapon,
        displayName: user.displayName || 'Player'
      });

      engine.camera.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

      network.onHpChange = (newHp) => {
        setHp(newHp);
        if (newHp <= 0) {
          handleRespawn();
        }
      };

      // Handle shooting
      const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 0 && engine.controls.isLocked) {
          shoot();
        }
      };

      const shoot = () => {
        const now = Date.now();
        const stats = WEAPONS[selectedWeapon];
        if (now - lastShootTime.current < stats.fireRate) return;
        lastShootTime.current = now;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
        
        const targets = Array.from(network.remotePlayers.values()).map(p => p.mesh);
        const intersects = raycaster.intersectObjects(targets);

        if (intersects.length > 0) {
          const hit = intersects[0];
          const dist = hit.distance;
          let damage = stats.damage;
          
          if (stats.dropoff) {
            damage = Math.max(10, Math.floor(damage * (1 - dist / stats.range)));
          }

          const targetId = hit.object.userData.userId;
          network.applyDamage(targetId, damage);
        }
      };

      const handleRespawn = async () => {
        const newPos = await network.respawn();
        engine.camera.position.set(newPos.x, newPos.y, newPos.z);
      };

      window.addEventListener('mousedown', handleMouseDown);

      // Movement sync
      let frameId: number;
      const syncLoop = () => {
        if (engine.controls.isLocked) {
          const speed = 0.15;
          const direction = new THREE.Vector3();
          const rotation = engine.camera.rotation.y;
          
          // Simple movement logic (Vite/Three.js standard)
          // PointerLockControls handles camera rotation, we just need to sync it
          network.updateMyStatus(engine.camera.position, rotation);
        }
        
        // Update remote player meshes in scene
        network.remotePlayers.forEach((remote) => {
          if (!engine.scene.children.includes(remote.mesh)) {
            engine.scene.add(remote.mesh);
          }
        });

        engine.render();
        frameId = requestAnimationFrame(syncLoop);
      };
      syncLoop();

      return () => {
        cancelAnimationFrame(frameId);
        window.removeEventListener('mousedown', handleMouseDown);
        network.leaveRoom();
        engine.cleanup();
      };
    }
  }, [gameState]);

  if (gameState === 'LOGIN') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
            <Target className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">PIXEL STRIKE 3D</h1>
          <p className="text-slate-400 mb-8">Multiplayer 3D Arena Shooter</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all transform active:scale-95"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <h2 className="text-white font-bold">Welcome back,</h2>
              <p className="text-slate-400 text-sm">{user?.displayName}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (e.g. ALPHA)"
                className="w-full bg-slate-800 border border-slate-700 text-white font-mono text-xl p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm font-medium mb-4">Select Weapon</label>
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(WEAPONS) as WeaponType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedWeapon(type)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedWeapon === type
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-white font-bold mb-1">{WEAPONS[type].name}</div>
                    <div className="text-xs text-slate-400">
                      Damage: {WEAPONS[type].damage} | Rate: {WEAPONS[type].fireRate}ms
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={!roomCode}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
            >
              DEPLOY TO BATTLE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
        <div className="flex justify-between items-start">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Health</div>
              <div className="text-2xl font-black text-white">{hp}</div>
            </div>
          </div>
          
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Weapon</div>
              <div className="text-2xl font-black text-white">{WEAPONS[selectedWeapon].name}</div>
            </div>
          </div>
        </div>

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Crosshair className="w-8 h-8 text-white/50" />
        </div>

        <div className="flex justify-center">
          <div className="bg-slate-900/50 backdrop-blur-sm px-6 py-2 rounded-full text-slate-300 text-sm font-medium border border-slate-700/50">
            Room: <span className="text-white font-bold">{roomCode}</span> | Click to Lock Mouse
          </div>
        </div>
      </div>
    </div>
  );
}
