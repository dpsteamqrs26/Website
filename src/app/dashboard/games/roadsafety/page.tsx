'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Gauge, Shield, Clock, MapPin, Zap } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, BakeShadows, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';

// ---------------------------------------------------------
// CONSTANTS & MAP GENERATION
// ---------------------------------------------------------
const TILE_SIZE = 10;
const MAP_SIZE = 20; // 20x20 grid
const MAX_SPEED = 0.4;
const ACCEL = 0.005;
const BRAKE = 0.015;
const FRICTION = 0.98;
const STEER_SPEED = 0.04;

// 0: Grass, 1: Road, 2: Building, 3: Parking
const MAP = [
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  [2,0,0,0,0,0,0,0,1,1,1,0,3,3,3,0,0,0,0,2],
  [2,0,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,0,2],
  [2,0,2,2,2,1,0,0,1,1,1,0,0,0,0,0,1,2,0,2],
  [2,0,0,0,0,1,0,0,1,1,1,0,2,2,2,0,1,0,0,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
  [2,1,1,0,0,1,1,2,2,2,2,2,2,0,0,1,1,0,0,2],
  [2,1,1,0,0,1,1,2,2,2,2,2,2,0,0,1,1,0,0,2],
  [2,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,2],
  [2,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,3,3,2],
  [2,0,0,0,0,1,1,0,0,2,2,2,2,0,0,1,1,3,3,2],
  [2,0,2,2,2,1,1,0,0,2,2,2,2,0,0,1,1,0,0,2],
  [2,0,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2],
  [2,0,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2],
  [2,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,0,1,1,1,0,2,2,2,2,2,2,2,2],
  [2,2,2,2,2,2,2,0,1,1,1,0,2,2,2,2,2,2,2,2],
  [2,0,3,3,3,0,0,0,1,1,1,0,0,0,0,0,0,0,0,2],
  [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
];

// Helper to get map tile at 3D world coords
function getTileAt(x: number, z: number) {
  const col = Math.floor(x / TILE_SIZE) + MAP_SIZE / 2;
  const row = Math.floor(z / TILE_SIZE) + MAP_SIZE / 2;
  if (row < 0 || row >= MAP_SIZE || col < 0 || col >= MAP_SIZE) return 2; // boundary is building
  return MAP[row][col];
}

// ---------------------------------------------------------
// HUD STORE (Mutable refs to avoid React re-renders taking CPU)
// ---------------------------------------------------------
const stateRef = {
  speed: 0,
  gear: 'N',
  xp: 0,
  violations: 0,
  timeRemaining: 300, // 5 minutes
  mission: 'Park in marked spots to earn XP!',
  parkTimer: 0,
};

// ---------------------------------------------------------
// CAR COMPONENT
// ---------------------------------------------------------
function Car({ onGameEnd, addXP }: { onGameEnd: () => void, addXP: (amount: number) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const { camera } = useThree();

  const carData = useRef({
    speed: 0,
    angle: Math.PI, // Facing forward (-Z)
    pos: new THREE.Vector3(0, 0, 0),
    parkedSpot: null as string | null,
  });

  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Joystick/Gamepad state
  const joyState = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (stateRef.timeRemaining <= 0) return;

    const data = carData.current;
    
    // --- Gamepad Input ---
    let gpX = 0;
    let gpY = 0;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.15) gpX = gp.axes[0]; // Left stick X
      if (gp.buttons[7]?.pressed || gp.buttons[5]?.pressed) gpY = -1; // RT/RB (Gas)
      else if (gp.buttons[6]?.pressed || gp.buttons[4]?.pressed) gpY = 1; // LT/LB (Brake/Rev)
      else if (Math.abs(gp.axes[1]) > 0.15) gpY = gp.axes[1]; // Left stick Y
    }

    // --- Inputs ---
    const goForward = keys.current['KeyW'] || keys.current['ArrowUp'] || gpY < -0.2;
    const goBackward = keys.current['KeyS'] || keys.current['ArrowDown'] || gpY > 0.2;
    const goLeft = keys.current['KeyA'] || keys.current['ArrowLeft'] || gpX < -0.2;
    const goRight = keys.current['KeyD'] || keys.current['ArrowRight'] || gpX > 0.2;
    const brake = keys.current['Space'];

    // --- Acceleration ---
    if (goForward) data.speed += ACCEL;
    else if (goBackward) data.speed -= ACCEL;
    else data.speed *= FRICTION;

    if (brake) {
      data.speed *= 0.85; // Hard brake
    }

    // Clamp speed
    data.speed = THREE.MathUtils.clamp(data.speed, -MAX_SPEED * 0.4, MAX_SPEED);
    if (Math.abs(data.speed) < 0.005) data.speed = 0;

    // --- Steering ---
    const isMoving = Math.abs(data.speed) > 0.01;
    if (isMoving) {
      const steerDir = data.speed > 0 ? 1 : -1;
      let steerAmount = 0;
      if (goLeft) steerAmount = STEER_SPEED;
      if (goRight) steerAmount = -STEER_SPEED;
      if (gpX !== 0) steerAmount = -gpX * STEER_SPEED;
      
      data.angle += steerAmount * steerDir * (Math.abs(data.speed)/MAX_SPEED);
      
      // Update wheel visuals
      wheelsRef.current[0]?.rotation.set(0, steerAmount * 10, 0); // front left
      wheelsRef.current[1]?.rotation.set(0, steerAmount * 10, 0); // front right
    }

    // --- Next Position & Collisions ---
    const dx = Math.sin(data.angle) * data.speed;
    const dz = Math.cos(data.angle) * data.speed;
    
    const nextX = data.pos.x + dx;
    const nextZ = data.pos.z + dz;
    const currentTile = getTileAt(data.pos.x, data.pos.z);
    const nextTile = getTileAt(nextX, nextZ);

    if (nextTile === 2) {
      // Hit building
      data.speed *= -0.5; // Bounce back
      if (Math.abs(data.speed) > 0.1) {
        stateRef.violations++;
        stateRef.mission = "COLLISION! Watch out!";
        setTimeout(() => { if (stateRef.mission === "COLLISION! Watch out!") stateRef.mission = "Drive safely." }, 2000);
      }
    } else {
      data.pos.x = nextX;
      data.pos.z = nextZ;
    }

    // --- Offroad friction penalty ---
    if (currentTile === 0) {
      data.speed *= 0.95; // Muddy grass
    }

    // --- Parking Logic (Tile 3) ---
    if (currentTile === 3 && Math.abs(data.speed) < 0.01) {
      const spotKey = `${Math.floor(data.pos.x/TILE_SIZE)}_${Math.floor(data.pos.z/TILE_SIZE)}`;
      if (data.parkedSpot !== spotKey) {
        stateRef.parkTimer += delta;
        if (stateRef.parkTimer > 1.5) { // 1.5 seconds to park
          data.parkedSpot = spotKey;
          stateRef.xp += 15;
          addXP(15);
          stateRef.mission = `Perfect Parking! +15 XP`;
          setTimeout(() => { stateRef.mission = "Find another parking spot!" }, 3000);
        }
      }
    } else {
      stateRef.parkTimer = 0;
    }

    // --- Update Group ---
    if (groupRef.current) {
      groupRef.current.position.copy(data.pos);
      groupRef.current.rotation.y = data.angle;
    }

    // --- Update HUD State ---
    stateRef.speed = Math.abs(data.speed) * 150; // visual km/h
    stateRef.gear = data.speed > 0.01 ? 'D' : data.speed < -0.01 ? 'R' : 'N';

    // --- Camera Follow (Smooth third person) ---
    const idealOffset = new THREE.Vector3(
      -Math.sin(data.angle) * 12,
      6,
      -Math.cos(data.angle) * 12
    );
    const idealLookAt = new THREE.Vector3(
      data.pos.x + Math.sin(data.angle) * 10,
      data.pos.y,
      data.pos.z + Math.cos(data.angle) * 10
    );
    
    camera.position.lerp(idealOffset.add(data.pos), 0.1);
    camera.lookAt(idealLookAt);

  });

  return (
    <group ref={groupRef}>
      {/* Chassis */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.1} metalness={0.9} transparent opacity={0.8} />
      </mesh>
      {/* Headlights */}
      <mesh position={[-0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      <mesh position={[0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.7, 0.5, -2.3]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.7, 0.5, -2.3]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* Wheels */}
      {[[-1.2, 0.4, 1.4], [1.2, 0.4, 1.4], [-1.2, 0.4, -1.4], [1.2, 0.4, -1.4]].map((pos, i) => (
        <group key={i} position={pos as [number,number,number]} ref={el => { if(el) wheelsRef.current[i] = el; }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.31, 8]} />
            <meshStandardMaterial color="#888" metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------
// ENVIRONMENT / MAP
// ---------------------------------------------------------
function CityEnvironment() {
  const blocks = [];
  
  for (let row = 0; row < MAP_SIZE; row++) {
    for (let col = 0; col < MAP_SIZE; col++) {
      const tile = MAP[row][col];
      const x = (col - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
      const z = (row - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;

      if (tile === 2) {
        // Building
        const height = 10 + Math.random() * 20;
        blocks.push(
          <mesh key={`${row}-${col}`} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE - 0.5, height, TILE_SIZE - 0.5]} />
            <meshStandardMaterial color={`hsl(${Math.random()*360}, 15%, 40%)`} />
          </mesh>
        );
      } else if (tile === 3) {
        // Parking Spot
        blocks.push(
          <mesh key={`park-${row}-${col}`} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE_SIZE - 1, TILE_SIZE - 1]} />
            <meshBasicMaterial color="#22c55e" opacity={0.3} transparent />
          </mesh>
        );
        // Parking borders
        blocks.push(
          <mesh key={`parkline-${row}-${col}`} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
             <ringGeometry args={[TILE_SIZE/2 - 0.5, TILE_SIZE/2 - 0.1, 4]} />
             <meshBasicMaterial color="#ffffff" />
          </mesh>
        );
      }
    }
  }

  return (
    <group>
      {blocks}
      
      {/* Ground Plane (Roads & Grass visually merged into one generic road/grass base) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>

      {/* Grass patches overlaid */}
      {MAP.map((rowArr, row) => 
        rowArr.map((tile, col) => {
          if (tile === 0 || tile === 2) { // Grass base under buildings too
            const x = (col - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
            const z = (row - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
            return (
              <mesh key={`grass-${row}-${col}`} position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                <meshStandardMaterial color="#3d6b40" roughness={1} />
              </mesh>
            );
          }
          return null;
        })
      )}
    </group>
  );
}

// ---------------------------------------------------------
// HUD OVERLAY (React Component reading from ref)
// ---------------------------------------------------------
function HUD({ onQuit }: { onQuit: () => void }) {
  const [hudData, setHudData] = useState({ speed: 0, gear: 'N', xp: 0, time: 300, violations: 0, mission: '' });

  useEffect(() => {
    const interval = setInterval(() => {
      setHudData({
        speed: stateRef.speed,
        gear: stateRef.gear,
        xp: stateRef.xp,
        time: stateRef.timeRemaining,
        violations: stateRef.violations,
        mission: stateRef.mission,
      });
      stateRef.timeRemaining--;
      if (stateRef.timeRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000); // 1 tick per sec for time. We can interpolate speed faster if we want real-time speedo, using requestAnimationFrame

    const speedLoop = () => {
      setHudData(prev => ({ ...prev, speed: stateRef.speed, gear: stateRef.gear, xp: stateRef.xp, mission: stateRef.mission }));
      if (stateRef.timeRemaining > 0) requestAnimationFrame(speedLoop);
    }
    requestAnimationFrame(speedLoop);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  if (hudData.time <= 0) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-card border border-border/50 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-3xl font-extrabold font-outfit text-foreground">Time's Up!</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-accent/50 rounded-2xl p-4">
              <p className="text-3xl font-black text-amber-500">+{hudData.xp}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold mt-1">XP Earned</p>
            </div>
            <div className="bg-accent/50 rounded-2xl p-4">
              <p className={`text-3xl font-black ${hudData.violations === 0 ? 'text-green-500' : 'text-red-400'}`}>{hudData.violations}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Collisions</p>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">XP has been saved to your account automatically.</p>

          <div className="pt-2 flex flex-col gap-3">
            <button onClick={() => window.location.reload()} className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:opacity-90">
              Play Again
            </button>
            <button onClick={onQuit} className="w-full py-4 rounded-xl font-bold border border-border text-foreground hover:bg-accent">
              Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-4 sm:p-6 flex flex-col justify-between" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <button onClick={onQuit} className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80 transition-colors shadow-lg">
          <ArrowLeft className="w-5 h-5" /> Quit
        </button>

        <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-lg min-w-[140px]">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Time Left</span>
          <span className={`text-2xl font-black ${hudData.time < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {formatTime(hudData.time)}
          </span>
        </div>
      </div>

      {/* Mission Banner */}
      <div className="self-center bg-black/70 backdrop-blur-md border border-amber-500/30 px-8 py-3 rounded-full flex items-center gap-3 shadow-2xl mt-4 max-w-lg text-center animate-fade-in">
        <Shield className="w-5 h-5 text-amber-500" />
        <span className="text-white font-bold text-sm tracking-wide">{hudData.mission}</span>
      </div>

      <div className="flex-1" />

      {/* Bottom Bar HUD */}
      <div className="flex justify-between items-end pointer-events-auto">
        
        {/* Speedometer */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex items-center gap-6 shadow-2xl min-w-[200px]">
          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 relative" style={{ borderColor: hudData.speed > 80 ? '#ef4444' : '#3b82f6' }}>
             <span className="text-3xl font-black text-white">{Math.round(hudData.speed)}</span>
             <span className="text-[10px] uppercase font-bold text-gray-400">KM/H</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className={`text-2xl font-black ${hudData.gear === 'D' ? 'text-green-400' : hudData.gear === 'R' ? 'text-red-400' : 'text-gray-400'}`}>
              {hudData.gear}
            </div>
            <div className="text-xs font-bold text-gray-400 bg-white/10 px-2 py-1 rounded">
              AUTO
            </div>
          </div>
        </div>

        {/* Control Hints (Desktop only ideally, but we show on all for simplicity) */}
        <div className="hidden md:flex bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 text-xs text-white/70 font-bold gap-4">
          <span>🎮 Gamepad Supported</span>
          <span>W/S : Gas/Brake</span>
          <span>A/D : Steer</span>
        </div>

        {/* Right Info (XP / Violations) */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-5 flex flex-col items-end gap-1 shadow-2xl min-w-[180px]">
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Zap className="w-5 h-5" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-white/50">Total XP</span>
          </div>
          <div className="text-4xl font-black text-white">{hudData.xp}</div>
          <div className={`mt-2 text-xs font-bold px-2 py-1 rounded w-full text-right ${hudData.violations > 0 ? 'bg-red-500/20 text-red-400' : 'text-gray-500'}`}>
            Collisions: {hudData.violations}
          </div>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------
export default function RoadSafety3DGame() {
  const [phase, setPhase] = useState<'lobby' | 'playing'>('lobby');

  const handleXPAdd = async (amount: number) => {
    try {
      await addGameXP(amount);
    } catch (e) {
      console.error("Failed to add XP in 3D game", e);
    }
  }

  if (phase === 'lobby') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
        <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-accent/50 px-4 py-2 rounded-full">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 text-5xl mb-2 rotate-3 transform transition-transform hover:rotate-6">
            🏎️
          </div>
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>
            City Drive 3D
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Experience realistic driving, find parking spots, and navigate the city blocks perfectly to earn XP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Objectives
            </h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">+15</span>
                <span>Find designated parking zones</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">-XP</span>
                <span>Avoid crashing into buildings</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground mt-4pt-4 border-t border-border/50">
                <Clock className="w-4 h-4" /> 5 Minute Time Limit
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-500" /> Controls
            </h3>
            <div className="space-y-4">
              <div className="bg-accent/50 rounded-xl p-3 text-sm flex justify-between items-center">
                <span className="font-bold">Keyboard</span>
                <div className="flex gap-1">
                  <kbd className="bg-background border border-border rounded px-2 py-0.5">W</kbd>
                  <kbd className="bg-background border border-border rounded px-2 py-0.5">A</kbd>
                  <kbd className="bg-background border border-border rounded px-2 py-0.5">S</kbd>
                  <kbd className="bg-background border border-border rounded px-2 py-0.5">D</kbd>
                </div>
              </div>
              <div className="bg-accent/50 rounded-xl p-3 text-sm flex justify-between items-center">
                <span className="font-bold focus:text-primary transition-colors">Brake</span>
                <kbd className="bg-background border border-border rounded px-4 py-0.5">SPACE</kbd>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground flex items-center gap-2">
                <span>🎮</span> Fully supports PlayStation/Xbox gamepads on PC!
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            // Reset global state refs for a new game
            stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
            stateRef.timeRemaining = 300; stateRef.mission = 'Find the green parking spots!';
            stateRef.parkTimer = 0;
            setPhase('playing');
          }}
          className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all"
        >
          START ENGINE
        </button>
      </div>
    );
  }

  // --- PLAYING PHASE ---
  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50">
      <Canvas shadows camera={{ position: [0, 10, 10], fov: 60 }}>
        <color attach="background" args={['#87ceeb']} />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          castShadow 
          position={[50, 50, 20]} 
          intensity={1.2} 
          shadow-mapSize={[2048, 2048]} 
        />
        <Sky sunPosition={[100, 20, 100]} turbidity={1} rayleigh={0.5} />
        <Environment preset="city" />

        <CityEnvironment />
        <Car onGameEnd={() => setPhase('lobby')} addXP={handleXPAdd} />
      </Canvas>
      <HUD onQuit={() => setPhase('lobby')} />
    </div>
  );
}