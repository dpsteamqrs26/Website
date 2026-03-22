'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Heart, Shield, Users, Crosshair, ChevronRight, TriangleAlert } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Stars } from '@react-three/drei';
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

// Hyper-realistic car tones
const CAR_COLORS = [
  '#ef4444', // Red
  '#0f172a', // Stealth Black
  '#3b82f6', // Deep Blue
  '#f59e0b', // Amber/Yellow
  '#e2e8f0', // Silver
  '#10b981', // Emerald
  '#18181b', // Matte Dark
  '#ffffff', // White
];

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
      color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
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
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[car.length, 0.8, 2.5]} />
        <meshStandardMaterial color={car.color} roughness={0.15} metalness={0.9} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[car.length * 0.6, 0.6, 2.1]} />
        <meshStandardMaterial color="#000" roughness={0.0} metalness={1.0} transparent opacity={0.9} />
      </mesh>
      {/* Wheels */}
      {[[-car.length*0.35, 0.4, 1.3], [car.length*0.35, 0.4, 1.3], [-car.length*0.35, 0.4, -1.3], [car.length*0.35, 0.4, -1.3]].map((p, i) => (
        <group key={i} position={p as [number, number, number]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 24]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
        </group>
      ))}
      
      {/* Headlights / Taillights */}
      {car.speed > 0 ? (
        <>
           <mesh position={[car.length/2 + 0.05, 0.5, 0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ffffff"/></mesh>
           <mesh position={[car.length/2 + 0.05, 0.5, -0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ffffff"/></mesh>
           <pointLight position={[car.length/2 + 0.5, 0.5, 0]} color="#fff" intensity={1.5} distance={15} />
           <mesh position={[-car.length/2 - 0.05, 0.5, 0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ff0000"/></mesh>
           <mesh position={[-car.length/2 - 0.05, 0.5, -0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ff0000"/></mesh>
        </>
      ) : (
        <>
           <mesh position={[-car.length/2 - 0.05, 0.5, 0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ffffff"/></mesh>
           <mesh position={[-car.length/2 - 0.05, 0.5, -0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ffffff"/></mesh>
           <pointLight position={[-car.length/2 - 0.5, 0.5, 0]} color="#fff" intensity={1.5} distance={15} />
           <mesh position={[car.length/2 + 0.05, 0.5, 0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ff0000"/></mesh>
           <mesh position={[car.length/2 + 0.05, 0.5, -0.8]}><boxGeometry args={[0.1,0.2,0.4]}/><meshBasicMaterial color="#ff0000"/></mesh>
        </>
      )}

      {/* Fake Drop Shadow */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[car.length * 1.2, 3]} />
        <meshBasicMaterial color="#000" opacity={0.6} transparent />
      </mesh>
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
        <meshStandardMaterial color={data.color || '#3b82f6'} roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color={data.color || '#3b82f6'} roughness={0.3} />
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
        if (dist < car.length * 0.5 + 0.6) { // slightly larger hitbox for more tension
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

    // Dynamic AAA Camera
    const viewOffsetZ = 14;
    const viewOffsetY = 14;
    
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const camTarget = new THREE.Vector3(pos.current.x, viewOffsetY, pos.current.z + viewOffsetZ);
    perspectiveCamera.position.lerp(camTarget, 0.1);
    
    // Smooth LookAt
    const targetLookAt = new THREE.Vector3(pos.current.x, 0, pos.current.z - 6);
    const currentLookAt = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(targetLookAt, 0.1);
    camera.lookAt(currentLookAt);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
        <meshStandardMaterial 
          color={invincible.current ? '#ff0' : '#facc15'} 
          emissive={invincible.current ? '#ff0' : '#451a03'} 
          emissiveIntensity={invincible.current ? 1.0 : 0.2} 
          roughness={0.4} metalness={0.5} 
        />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#333" roughness={0.1} />
      </mesh>
      <pointLight position={[0, 2, 0]} intensity={invincible.current ? 0 : 1} color="#facc15" distance={10} />
      
      {/* Target Marker */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.6, 32]} />
        <meshBasicMaterial color={invincible.current ? '#ef4444' : '#10b981'} transparent opacity={0.5} />
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
      <mesh position={[0, 0.1, SIDEWALK_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.2, SIDEWALK_DEPTH]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.8} metalness={0.2} />
      </mesh>
      {/* End sidewalk */}
      <mesh position={[0, 0.1, -SIDEWALK_DEPTH - roadWidth - SIDEWALK_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.2, SIDEWALK_DEPTH]} />
        <meshStandardMaterial color="#1a1a24" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Wet Road / Asphalt */}
      <mesh position={[0, 0, roadZ]} receiveShadow>
        <boxGeometry args={[ROAD_LENGTH * 2, 0.05, roadWidth]} />
        <meshStandardMaterial color="#0b0b0f" roughness={0.15} metalness={0.8} />
      </mesh>
      
      {/* Cyberpunk/AAA Lane markings */}
      {Array.from({ length: NUM_LANES - 1 }).map((_, i) => (
        <group key={i}>
          {Array.from({ length: 30 }).map((_, j) => (
            <mesh key={`${i}-${j}`} position={[(j - 15) * 4, 0.04, -SIDEWALK_DEPTH - LANE_WIDTH * (i + 1)]} receiveShadow>
              <boxGeometry args={[2, 0.02, 0.15]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* Glowing Neon Crosswalk stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`cw-${i}`} position={[0, 0.04, -SIDEWALK_DEPTH + 0.3 - i * (roadWidth / 8)]} receiveShadow>
          <boxGeometry args={[4, 0.02, 0.5]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
        </mesh>
      ))}
      
      {/* Far Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#000" />
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
  const playerName = user?.firstName || 'Guest OPR';
  const handleCustomEvent = (data: any) => {
    if (data.type === 'START_1V1') {
      setPhase('playing'); setLevel(1); setScore(0); setLives(3); setXp(0);
      setTraffic(data.payload.traffic);
    }
  };
  const { remotePlayers, sendUpdate, sendCustomEvent } = useMultiplayer('crossing', playerName, handleCustomEvent);

  const startGame = () => {
    setPhase('playing');
    setLevel(1);
    setScore(0);
    setLives(3);
    setXp(0);
    const tr = generateTraffic(1);
    setTraffic(tr);
    if (remotePlayers.length > 0) sendCustomEvent({ type: 'START_1V1', payload: { traffic: tr } });
  };

  const handleCross = async () => {
    const newScore = score + 1;
    setScore(newScore);
    const earned = 20;
    setXp(prev => prev + earned);
    try { await addGameXP(earned); } catch {}

    // Speed up EVERY crossing
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
      <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
        <div className="absolute inset-0 z-0 bg-black">
          <img 
            src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=2000&auto=format&fit=crop" 
            alt="Crossing Background" 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/40 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-10000" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-5xl w-full flex flex-col items-start justify-center text-left h-full">
          <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
            <ArrowLeft className="w-4 h-4" /> Hub Base
          </Link>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md shadow-inner mt-4">
            <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-[ping_2s_infinite] shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">Survival Engine Online</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.85] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_80px_rgba(0,0,0,1)]">
            URBAN <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 filter drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]">CROSSER</span> 
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-amber-500 pl-4 sm:pl-6 leading-relaxed bg-black/20 p-4 rounded-r-2xl border-y border-r border-white/5 backdrop-blur-sm">
            Navigate dense, high-fidelity traffic logic. Use raw reflexes and situational awareness to advance. <span className="text-amber-400 font-black">+20 XP</span> per successful cross. <span className="text-red-400 font-bold">-10 XP</span> upon impact.
            <strong className="text-emerald-400 flex items-center mt-4 text-xs tracking-widest uppercase"><Zap className="w-3 h-3 justify-center mr-2"/> MULTIPLAYER SYNC ENABLED</strong>
          </p>

          <button onClick={startGame} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
             DEPLOY SOLO
             <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          {remotePlayers.length > 0 && (
            <div className="absolute top-8 right-8 pointer-events-auto animate-fade-in z-50">
              <button 
                onClick={startGame} 
                className="bg-amber-600 border border-amber-400/50 text-white font-black text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(245,158,11,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3 backdrop-blur-md">
                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                JOIN MULTIPLAYER ({remotePlayers.length})
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // GAMEOVER
  if (phase === 'gameover') {
    return (
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)]">
        <div className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] blur-[150px] -z-10 bg-red-600/30" />
          
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
             <TriangleAlert className="w-12 h-12" />
          </div>
          
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">SYSTEM FAILURE</h2>
          <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8 text-balance">
             Lethal physical impact detected. Operations terminated at Sector {level}.
          </p>
          
          <div className="grid grid-cols-2 gap-4 my-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
              <p className="text-5xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">+{xp}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">NET XP</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-t from-zinc-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
              <p className="text-5xl font-black text-white drop-shadow-md">{score}</p>
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">SURVIVED ZONES</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button onClick={startGame} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-[1.02] transition-all overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
               RESTART PROTOCOL
            </button>
            <button onClick={() => setPhase('lobby')} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
               ABORT TO HUB
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group font-sans">
      <Canvas shadows camera={{ position: [0, 14, 14], fov: 60 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#05050a', 10, 80]} />
        <color attach="background" args={['#05050a']} />
        
        {/* AAA Cinematic Lighting */}
        <ambientLight intensity={0.2} color="#4c1d95" />
        <directionalLight castShadow position={[30, 50, -20]} intensity={1.5} color="#e0e7ff" shadow-mapSize={[2048, 2048]} shadow-camera-far={150} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
        <pointLight position={[0,20,0]} intensity={2} color="#fbbf24" distance={50} />

        <Stars radius={80} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />

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

      {/* HUD overlays */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
        
        {/* Top HUD */}
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <button onClick={() => setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4" /> ABORT
          </button>
          
          <div className="flex gap-4">
            <div className="hidden sm:flex bg-zinc-950/80 backdrop-blur-xl border border-amber-500/30 text-white px-5 py-3 rounded-2xl flex-col items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)] min-w-[120px]">
               <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> SYNC
               </span>
               <span className="text-lg font-black">{remotePlayers.length + 1} OPR</span>
            </div>
            
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex flex-col items-end justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[140px]">
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">SECTOR DTH</span>
               <span className="text-2xl font-black tracking-tighter text-white drop-shadow-md">
                 LVL {level}
               </span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Bottom HUD */}
        <div className="flex justify-between items-end pointer-events-auto relative z-20">
          
          {/* Health Telemetry */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[200px]">
            <div className="flex flex-col gap-1 w-full text-center">
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 mb-2">HULL INTEGRITY</span>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} className={`w-8 h-8 ${i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'text-zinc-800'}`} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Objective Tactical Data */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-end gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[200px]">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Zap className="w-4 h-4 fill-current" />
              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Yield XP</span>
            </div>
            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{xp}</div>
            
            <div className="mt-2 text-[10px] font-black tracking-widest px-3 py-1.5 rounded bg-white/10 text-zinc-300 uppercase border border-white/10 w-full text-right">
               SUCCESS RATE: {score}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
