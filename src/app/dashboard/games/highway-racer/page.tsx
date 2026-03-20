'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Heart, Shield } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const LANE_POSITIONS = [-4, 0, 4];
const CAR_COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4'];
const SCROLL_SPEED_BASE = 0.3;

type Obstacle = { id: number; lane: number; z: number; color: string; length: number };

function generateObstacles(count: number, startZ: number): Obstacle[] {
  const obs: Obstacle[] = [];
  for (let i = 0; i < count; i++) {
    obs.push({
      id: Date.now() + i,
      lane: LANE_POSITIONS[Math.floor(Math.random() * 3)],
      z: startZ - i * (12 + Math.random() * 15),
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      length: 3 + Math.random() * 2,
    });
  }
  return obs;
}

function ObstacleCar({ obs }: { obs: Obstacle }) {
  return (
    <group position={[obs.lane, 0, obs.z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, obs.length]} />
        <meshStandardMaterial color={obs.color} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.8, 0.6, obs.length * 0.5]} />
        <meshStandardMaterial color="#111" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3); });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 0.8, 4]} />
        <meshStandardMaterial color={data.color || '#3b82f6'} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.6, 0.5, 2]} />
        <meshStandardMaterial color="#222" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function PlayerCar({ obstacles, onCrash, onTick, remotePlayers, sendUpdate, playerName, active }:
  { obstacles: React.MutableRefObject<Obstacle[]>; onCrash: () => void; onTick: () => void; remotePlayers: PlayerState[]; sendUpdate: any; playerName: string; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const lane = useRef(0);
  const posX = useRef(0);
  const invincible = useRef(false);
  const keys = useRef<Record<string, boolean>>({});
  const lastSwitch = useRef(0);
  const tickRef = useRef(0);
  const color = useRef(`hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`);

  useEffect(() => {
    lane.current = 0; posX.current = 0;
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useFrame((_, delta) => {
    if (!active) return;
    const now = Date.now();
    let gpX = 0;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps[0];
    if (gp) { if (Math.abs(gp.axes[0]) > 0.3) gpX = gp.axes[0]; if (gp.buttons[14]?.pressed) gpX = -1; if (gp.buttons[15]?.pressed) gpX = 1; }

    if (now - lastSwitch.current > 200) {
      if (keys.current['KeyA'] || keys.current['ArrowLeft'] || gpX < -0.3) { lane.current = Math.max(0, lane.current - 1); lastSwitch.current = now; }
      if (keys.current['KeyD'] || keys.current['ArrowRight'] || gpX > 0.3) { lane.current = Math.min(2, lane.current + 1); lastSwitch.current = now; }
    }

    const targetX = LANE_POSITIONS[lane.current];
    posX.current += (targetX - posX.current) * 0.15;

    // Move obstacles toward player
    for (const o of obstacles.current) { o.z += SCROLL_SPEED_BASE + delta * 2; }
    // Recycle obstacles
    obstacles.current = obstacles.current.filter(o => o.z < 30);

    // Collision
    if (!invincible.current) {
      for (const o of obstacles.current) {
        if (Math.abs(o.lane - posX.current) < 2 && Math.abs(o.z) < o.length * 0.5 + 2) {
          invincible.current = true;
          onCrash();
          setTimeout(() => { invincible.current = false; }, 2000);
          break;
        }
      }
    }

    // Tick for survival points
    tickRef.current += delta;
    if (tickRef.current > 2) { tickRef.current = 0; onTick(); }

    if (ref.current) { ref.current.position.x = posX.current; }
    if (Math.random() < 0.3) sendUpdate({ x: posX.current, z: 0, angle: 0, speed: 1, name: playerName, color: color.current });

    camera.position.lerp(new THREE.Vector3(posX.current * 0.3, 8, 12), 0.08);
    camera.lookAt(posX.current * 0.3, 0, -10);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 0.8, 4.2]} />
        <meshStandardMaterial color={color.current} roughness={0.3} metalness={0.7} emissive={invincible.current ? '#ff0' : '#000'} emissiveIntensity={invincible.current ? 0.5 : 0} />
      </mesh>
      <mesh position={[0, 1.1, -0.2]}>
        <boxGeometry args={[1.6, 0.6, 2]} />
        <meshStandardMaterial color="#111" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.7, 0.4, 2.1]}><boxGeometry args={[0.3, 0.2, 0.1]} /><meshBasicMaterial color="#ffffcc" /></mesh>
      <mesh position={[0.7, 0.4, 2.1]}><boxGeometry args={[0.3, 0.2, 0.1]} /><meshBasicMaterial color="#ffffcc" /></mesh>
      <mesh position={[-0.7, 0.4, -2.1]}><boxGeometry args={[0.4, 0.15, 0.1]} /><meshBasicMaterial color="#f00" /></mesh>
      <mesh position={[0.7, 0.4, -2.1]}><boxGeometry args={[0.4, 0.15, 0.1]} /><meshBasicMaterial color="#f00" /></mesh>
    </group>
  );
}

function Highway() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -50]} receiveShadow>
        <planeGeometry args={[16, 200]} />
        <meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      {/* Lane dividers */}
      {[-2, 2].map((x, xi) => Array.from({ length: 30 }).map((_, i) => (
        <mesh key={`${xi}-${i}`} position={[x, 0.01, -i * 7 + 50]} receiveShadow>
          <boxGeometry args={[0.15, 0.02, 3]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      )))}
      {/* Barriers */}
      {[-7, 7].map((x, i) => (
        <mesh key={`b-${i}`} position={[x, 0.5, -50]} castShadow>
          <boxGeometry args={[0.5, 1, 200]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, -0.02, -50]} receiveShadow>
        <planeGeometry args={[10, 200]} />
        <meshStandardMaterial color="#22543d" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, -0.02, -50]} receiveShadow>
        <planeGeometry args={[10, 200]} />
        <meshStandardMaterial color="#22543d" />
      </mesh>
    </group>
  );
}

function ObstacleSpawner({ obstacles }: { obstacles: React.MutableRefObject<Obstacle[]> }) {
  useFrame(() => {
    if (obstacles.current.length < 15) {
      const furthest = obstacles.current.reduce((min, o) => Math.min(min, o.z), 0);
      obstacles.current.push(...generateObstacles(5, furthest - 20));
    }
  });
  return <>{obstacles.current.map(o => <ObstacleCar key={o.id} obs={o} />)}</>;
}

export default function HighwayRacer() {
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [lives, setLives] = useState(3);
  const [xp, setXp] = useState(0);
  const [distance, setDistance] = useState(0);
  const obstaclesRef = useRef<Obstacle[]>([]);

  const { user } = useUser();
  const playerName = user?.firstName || 'Guest';
  const { remotePlayers, sendUpdate } = useMultiplayer('highway', playerName);

  const start = () => {
    setPhase('playing'); setLives(3); setXp(0); setDistance(0);
    obstaclesRef.current = generateObstacles(10, -30);
  };

  const handleCrash = async () => {
    setLives(prev => { const n = prev - 1; if (n <= 0) setPhase('gameover'); return n; });
    setXp(prev => Math.max(0, prev - 15));
    try { await addGameXP(-15); } catch {}
  };

  const handleTick = async () => {
    setDistance(prev => prev + 1);
    setXp(prev => prev + 5);
    try { await addGameXP(5); } catch {}
  };

  if (phase === 'lobby') return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 shadow-2xl shadow-red-500/30 text-5xl">🏎️</div>
        <h1 className="text-5xl font-black">Highway Racer 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">Dodge oncoming traffic on a fast highway! Use A/D or gamepad to switch lanes. +5 XP every 2 seconds, -15 XP per crash.
          <strong className="text-primary block mt-2">✨ MULTIPLAYER ENABLED ✨</strong></p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">RACE!</button>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">💥</div>
        <h2 className="text-4xl font-black">Game Over!</h2>
        <p className="text-muted-foreground text-sm">You survived {distance} ticks on the highway.</p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-4 flex flex-col items-center"><span className="text-4xl font-black text-amber-500">+{xp}</span><span className="text-xs font-bold uppercase text-amber-500/70">Net XP</span></div>
        <div className="flex flex-col gap-3 pt-2">
          <button onClick={start} className="w-full py-4 rounded-xl font-bold bg-foreground text-background">Play Again</button>
          <Link href="/dashboard/games" className="w-full py-4 rounded-xl font-bold border border-border hover:bg-accent text-foreground text-center block">Back</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50 font-outfit">
      <Canvas shadows camera={{ position: [0, 8, 12], fov: 60 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.4} /><directionalLight castShadow position={[20, 40, 20]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <Sky sunPosition={[100, 5, 100]} turbidity={10} rayleigh={3} />
        <Highway />
        <ObstacleSpawner obstacles={obstaclesRef} />
        <PlayerCar obstacles={obstaclesRef} onCrash={handleCrash} onTick={handleTick} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={playerName} active={phase === 'playing'} />
        {remotePlayers.map(p => <RemotePlayer key={p.id} data={p} />)}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={() => setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5" /> Quit</button>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Multiplayer</span><span className="text-sm font-black text-white">{remotePlayers.length + 1} Online</span></div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => (<Heart key={i} className={`w-6 h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />))}</div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><span className="text-2xl font-black text-white">{xp} XP</span></div>
            <span className="text-xs text-gray-400 font-bold">{distance} Distance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
