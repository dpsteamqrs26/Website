'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Heart, Shield, Users } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

// ---------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------
const LANE_WIDTH = 4;
const NUM_LANES = 6;
const ROAD_LENGTH = 60;
const PLAYER_SPEED = 0.18;
const SIDEWALK_DEPTH = 6;

type TrafficCar = {
  id: number;
  lane: number;
  x: number;
  speed: number;
  color: string;
  length: number;
};

const CAR_COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#64748b'];

function generateTraffic(lap: number): TrafficCar[] {
  const cars: TrafficCar[] = [];
  const count = Math.min(4 + lap * 2, 24); // More cars each lap, cap at 24
  const speedMultiplier = 1 + (lap - 1) * 0.35; // +35% speed per lap — gets brutal fast
  for (let i = 0; i < count; i++) {
    const lane = i % NUM_LANES;
    const dir = lane < NUM_LANES / 2 ? 1 : -1;
    cars.push({
      id: i,
      lane,
      x: (Math.random() - 0.5) * ROAD_LENGTH * 1.5,
      speed: (0.05 + Math.random() * 0.04) * speedMultiplier * dir,
      color: CAR_COLORS[i % CAR_COLORS.length],
      length: 3 + Math.random() * 2,
    });
  }
  return cars;
}

// ---------------------------------------------------------
// 3D Traffic car mesh
// ---------------------------------------------------------
function TrafficCarMesh({ car }: { car: TrafficCar }) {
  const ref = useRef<THREE.Group>(null);
  const zPos = -SIDEWALK_DEPTH - LANE_WIDTH * 0.5 - car.lane * LANE_WIDTH;

  useFrame(() => {
    if (!ref.current) return;
    car.x += car.speed;
    if (car.speed > 0 && car.x > ROAD_LENGTH) car.x = -ROAD_LENGTH;
    if (car.speed < 0 && car.x < -ROAD_LENGTH) car.x = ROAD_LENGTH;
    ref.current.position.x = car.x;
  });

  return (
    <group ref={ref} position={[car.x, 0, zPos]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[car.length, 0.8, 2.5]} />
        <meshStandardMaterial color={car.color} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[car.length * 0.6, 0.6, 2]} />
        <meshStandardMaterial color="#111" transparent opacity={0.7} />
      </mesh>
      {[[-1, 0.4, 1.3], [1, 0.4, 1.3], [-1, 0.4, -1.3], [1, 0.4, -1.3]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 12]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------
// Remote Player
// ---------------------------------------------------------
function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.25);
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color={data.color || '#3b82f6'} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={data.color || '#3b82f6'} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------
// Player Controller
// ---------------------------------------------------------
function PlayerController({
  traffic,
  onCross,
  onHit,
  level,
  remotePlayers,
  sendUpdate,
  playerName,
  gameActive,
}: {
  traffic: TrafficCar[];
  onCross: () => void;
  onHit: () => void;
  level: number;
  remotePlayers: PlayerState[];
  sendUpdate: (s: any) => void;
  playerName: string;
  gameActive: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(0, 0, 0));
  const keys = useRef<Record<string, boolean>>({});
  const invincible = useRef(false);
  const playerColor = useRef(`hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`);
  const targetZ = -SIDEWALK_DEPTH - (NUM_LANES * LANE_WIDTH) - SIDEWALK_DEPTH;

  useEffect(() => {
    pos.current.set(0, 0, 0);
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [level]);

  useFrame(() => {
    if (!gameActive) return;
    const k = keys.current;

    // Gamepad
    let gpX = 0, gpY = 0;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps[0];
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.2) gpX = gp.axes[0];
      if (Math.abs(gp.axes[1]) > 0.2) gpY = gp.axes[1];
      if (gp.buttons[12]?.pressed) gpY = -1;
      if (gp.buttons[13]?.pressed) gpY = 1;
      if (gp.buttons[14]?.pressed) gpX = -1;
      if (gp.buttons[15]?.pressed) gpX = 1;
    }

    let dx = 0, dz = 0;
    if (k['KeyW'] || k['ArrowUp'] || gpY < -0.2) dz = -PLAYER_SPEED;
    if (k['KeyS'] || k['ArrowDown'] || gpY > 0.2) dz = PLAYER_SPEED;
    if (k['KeyA'] || k['ArrowLeft'] || gpX < -0.2) dx = -PLAYER_SPEED;
    if (k['KeyD'] || k['ArrowRight'] || gpX > 0.2) dx = PLAYER_SPEED;

    pos.current.x = THREE.MathUtils.clamp(pos.current.x + dx, -ROAD_LENGTH * 0.4, ROAD_LENGTH * 0.4);
    pos.current.z += dz;

    // Crossed!
    if (pos.current.z < targetZ) {
      onCross();
      pos.current.set(0, 0, 0);
    }
    // Retreated too far
    if (pos.current.z > SIDEWALK_DEPTH) pos.current.z = SIDEWALK_DEPTH;

    // Collision with traffic
    if (!invincible.current) {
      for (const car of traffic) {
        const cz = -SIDEWALK_DEPTH - LANE_WIDTH * 0.5 - car.lane * LANE_WIDTH;
        const dist = Math.hypot(pos.current.x - car.x, pos.current.z - cz);
        if (dist < car.length * 0.5 + 0.5) {
          invincible.current = true;
          onHit();
          pos.current.set(0, 0, 0);
          setTimeout(() => { invincible.current = false; }, 1500);
          break;
        }
      }
    }

    if (ref.current) {
      ref.current.position.copy(pos.current);
    }

    // Sync multiplayer
    if (Math.random() < 0.4) {
      sendUpdate({ x: pos.current.x, z: pos.current.z, angle: 0, speed: 0, name: playerName, color: playerColor.current });
    }

    // Camera
    const camTarget = new THREE.Vector3(pos.current.x, 14, pos.current.z + 12);
    camera.position.lerp(camTarget, 0.08);
    camera.lookAt(pos.current.x, 0, pos.current.z - 5);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial color={invincible.current ? '#ff0' : '#22c55e'} emissive={invincible.current ? '#ff0' : '#000'} emissiveIntensity={invincible.current ? 0.5 : 0} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------
// Road Environment
// ---------------------------------------------------------
function RoadScene() {
  const roadZ = -SIDEWALK_DEPTH - (NUM_LANES * LANE_WIDTH) / 2;
  const roadWidth = NUM_LANES * LANE_WIDTH;

  return (
    <group>
      {/* Start sidewalk */}
      <mesh position={[0, 0.05, SIDEWALK_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.1, SIDEWALK_DEPTH]} />
        <meshStandardMaterial color="#4ade80" roughness={0.9} />
      </mesh>
      {/* End sidewalk */}
      <mesh position={[0, 0.05, -SIDEWALK_DEPTH - roadWidth - SIDEWALK_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.1, SIDEWALK_DEPTH]} />
        <meshStandardMaterial color="#4ade80" roughness={0.9} />
      </mesh>
      {/* Road */}
      <mesh position={[0, 0, roadZ]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.05, roadWidth]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>
      {/* Lane markings */}
      {Array.from({ length: NUM_LANES - 1 }).map((_, i) => (
        <group key={i}>
          {Array.from({ length: 30 }).map((_, j) => (
            <mesh key={`${i}-${j}`} position={[(j - 15) * 4, 0.06, -SIDEWALK_DEPTH - LANE_WIDTH * (i + 1)]} receiveShadow>
              <boxGeometry args={[2, 0.02, 0.15]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Crosswalk stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`cw-${i}`} position={[0, 0.06, -SIDEWALK_DEPTH + 0.3 - i * (roadWidth / 8)]} receiveShadow>
          <boxGeometry args={[3, 0.02, 0.4]} />
          <meshStandardMaterial color="#fff" />
        </mesh>
      ))}
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------
export default function CrossingGame3D() {
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [xp, setXp] = useState(0);
  const [traffic, setTraffic] = useState<TrafficCar[]>([]);

  const { user } = useUser();
  const playerName = user?.firstName || 'Guest';
  const { remotePlayers, sendUpdate } = useMultiplayer('crossing', playerName);

  const startGame = () => {
    setPhase('playing');
    setLevel(1);
    setScore(0);
    setLives(3);
    setXp(0);
    setTraffic(generateTraffic(1));
  };

  const handleCross = async () => {
    const newScore = score + 1;
    setScore(newScore);
    const earned = 20;
    setXp(prev => prev + earned);
    try { await addGameXP(earned); } catch {}

    // Speed up EVERY crossing — level = crossing count
    const nextLevel = newScore + 1;
    setLevel(nextLevel);
    setTraffic(generateTraffic(nextLevel));
  };

  const handleHit = async () => {
    setLives(prev => {
      const next = prev - 1;
      if (next <= 0) setPhase('gameover');
      return next;
    });
    const penalty = 10;
    setXp(prev => Math.max(0, prev - penalty));
    try { await addGameXP(-penalty); } catch {}
  };

  // LOBBY
  if (phase === 'lobby') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
        <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/30 text-5xl">🚶</div>
          <h1 className="text-5xl font-black">Road Crossing 3D</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Cross busy lanes of 3D traffic safely! Use WASD or your gamepad to navigate. Earn +20 XP per safe crossing, but lose -10 XP if you get hit!
            <strong className="text-primary block mt-2">✨ MULTIPLAYER ENABLED ✨</strong>
          </p>
        </div>
        <button onClick={startGame} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">
          START CROSSING
        </button>
      </div>
    );
  }

  // GAMEOVER
  if (phase === 'gameover') {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
        <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
          <div className="text-7xl">💥</div>
          <h2 className="text-4xl font-black">Game Over!</h2>
          <p className="text-muted-foreground text-sm">You crossed {score} roads and reached Level {level}.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/50 rounded-2xl p-4">
              <p className="text-3xl font-black text-amber-500">+{xp}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Net XP</p>
            </div>
            <div className="bg-accent/50 rounded-2xl p-4">
              <p className="text-3xl font-black text-green-500">{score}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Crossings</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button onClick={startGame} className="w-full py-4 rounded-xl font-bold bg-foreground text-background">Play Again</button>
            <Link href="/dashboard/games" className="w-full py-4 rounded-xl font-bold border border-border hover:bg-accent text-foreground text-center block">Back to Games</Link>
          </div>
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50 font-outfit">
      <Canvas shadows camera={{ position: [0, 14, 12], fov: 55 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.4} />
        <directionalLight castShadow position={[30, 40, 20]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <Sky sunPosition={[100, 10, 100]} turbidity={8} rayleigh={2} />

        <RoadScene />
        {traffic.map(car => <TrafficCarMesh key={car.id} car={car} />)}
        <PlayerController
          traffic={traffic}
          onCross={handleCross}
          onHit={handleHit}
          level={level}
          remotePlayers={remotePlayers}
          sendUpdate={sendUpdate}
          playerName={playerName}
          gameActive={phase === 'playing'}
        />
        {remotePlayers.map(p => <RemotePlayer key={p.id} data={p} />)}
      </Canvas>

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={() => setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80">
            <ArrowLeft className="w-5 h-5" /> Quit
          </button>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Multiplayer</span>
              <span className="text-sm font-black text-white">{remotePlayers.length + 1} Online</span>
            </div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Level</span>
              <span className="text-xl font-black text-white">{level}</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart key={i} className={`w-6 h-6 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
              ))}
            </div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-2xl font-black text-white">{xp} XP</span>
            </div>
            <span className="text-xs text-gray-400 font-bold">{score} Crossings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
