'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Gauge, Shield, Clock, MapPin, Zap } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

// ---------------------------------------------------------
// CONSTANTS & MAP GENERATION
// ---------------------------------------------------------
const TILE_SIZE = 10;
const MAP_SIZE = 20; 
const MAX_SPEED = 0.4;
const ACCEL = 0.005;
const BRAKE = 0.015;
const FRICTION = 0.98;
const STEER_SPEED = 0.04;

function generateRandomCityMap(): number[][] {
  const map: number[][] = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(0));
  // Walls on boundaries
  for (let i = 0; i < MAP_SIZE; i++) { map[0][i] = 2; map[MAP_SIZE-1][i] = 2; map[i][0] = 2; map[i][MAP_SIZE-1] = 2; }
  // Carve main road arteries (2-wide roads)
  const hRoads = [5, 6, 10, 11, 14, 15]; // horizontal road rows
  const vRoads = [5, 6, 10, 11, 14, 15]; // vertical road columns
  for (let r = 1; r < MAP_SIZE - 1; r++) {
    for (let c = 1; c < MAP_SIZE - 1; c++) {
      if (hRoads.includes(r) || vRoads.includes(c)) map[r][c] = 1;
    }
  }
  // Random side streets
  for (let i = 0; i < 6; i++) {
    const isH = Math.random() > 0.5;
    const pos = 2 + Math.floor(Math.random() * (MAP_SIZE - 4));
    for (let j = 1; j < MAP_SIZE - 1; j++) {
      if (isH) { if (map[pos][j] === 0) map[pos][j] = Math.random() > 0.4 ? 1 : 0; }
      else { if (map[j][pos] === 0) map[j][pos] = Math.random() > 0.4 ? 1 : 0; }
    }
  }
  // Fill remaining empty spaces with buildings or grass
  for (let r = 1; r < MAP_SIZE - 1; r++) {
    for (let c = 1; c < MAP_SIZE - 1; c++) {
      if (map[r][c] === 0) map[r][c] = Math.random() > 0.35 ? 2 : 0;
    }
  }
  // Place 4-8 parking spots on road-adjacent empty/grass tiles
  let parkCount = 0;
  for (let r = 2; r < MAP_SIZE - 2 && parkCount < 8; r++) {
    for (let c = 2; c < MAP_SIZE - 2 && parkCount < 8; c++) {
      if (map[r][c] === 0 && (map[r-1][c] === 1 || map[r+1][c] === 1 || map[r][c-1] === 1 || map[r][c+1] === 1)) {
        if (Math.random() > 0.7) { map[r][c] = 3; parkCount++; }
      }
    }
  }
  if (parkCount === 0) { map[2][3] = 3; map[MAP_SIZE-3][MAP_SIZE-4] = 3; }
  return map;
}

let currentMap = generateRandomCityMap();

function getTileAt(x: number, z: number) {
  const col = Math.floor(x / TILE_SIZE) + MAP_SIZE / 2;
  const row = Math.floor(z / TILE_SIZE) + MAP_SIZE / 2;
  if (row < 0 || row >= MAP_SIZE || col < 0 || col >= MAP_SIZE) return 2; 
  return currentMap[row][col];
}

const stateRef = {
  speed: 0,
  gear: 'N',
  xp: 0,
  violations: 0,
  timeRemaining: 300,
  mission: 'Park in marked spots to earn XP!',
  parkTimer: 0,
};

// ---------------------------------------------------------
// REMOTE CAR COMPONENT (MULTIPLAYER)
// ---------------------------------------------------------
function RemoteCar({ data }: { data: PlayerState }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);

  useFrame(() => {
    if (groupRef.current) {
      // Interpolate for smooth multiplayer rendering
      groupRef.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3);
      
      // Slerp rotation
      const currentQuat = groupRef.current.quaternion;
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, data.angle, 0));
      currentQuat.slerp(targetQuat, 0.3);

      // Spin wheels based on speed
      wheelsRef.current.forEach(w => {
        if(w) w.rotation.x -= data.speed * 2;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {/* Name Tag */}
      <mesh position={[0, 4, 0]}>
         {/* Since we can't easily use pure HTML without causing layout thrash sometimes, we'll just color code or keep it simple */}
         {/* but a small sphere indicator for another player works */}
      </mesh>
      
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color={data.color || "#3b82f6"} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.1} metalness={0.9} transparent opacity={0.8} />
      </mesh>
      
      {/* Wheels */}
      {[[-1.2, 0.4, 1.4], [1.2, 0.4, 1.4], [-1.2, 0.4, -1.4], [1.2, 0.4, -1.4]].map((pos, i) => (
        <group key={i} position={pos as [number,number,number]} ref={el => { if(el) wheelsRef.current[i] = el; }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------
// LOCAL CAR COMPONENT
// ---------------------------------------------------------
function Car({ onGameEnd, addXP, playerName, remotePlayers, sendUpdate }: 
  { onGameEnd: () => void, addXP: (amount: number) => void, playerName: string, remotePlayers: PlayerState[], sendUpdate: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const { camera } = useThree();

  const carData = useRef({
    speed: 0,
    angle: Math.PI, 
    pos: new THREE.Vector3(0, 0, 0),
    parkedSpot: null as string | null,
    carColor: `#${Math.floor(Math.random()*16777215).toString(16)}` // Random color for this session
  });

  const keys = useRef<{ [key: string]: boolean }>({});
  
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
    
    // Gamepad
    let gpX = 0; let gpY = 0;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.15) gpX = gp.axes[0]; 
      if (gp.buttons[7]?.pressed || gp.buttons[5]?.pressed) gpY = -1; 
      else if (gp.buttons[6]?.pressed || gp.buttons[4]?.pressed) gpY = 1; 
      else if (Math.abs(gp.axes[1]) > 0.15) gpY = gp.axes[1]; 
    }

    const goForward = keys.current['KeyW'] || keys.current['ArrowUp'] || gpY < -0.2;
    const goBackward = keys.current['KeyS'] || keys.current['ArrowDown'] || gpY > 0.2;
    const goLeft = keys.current['KeyA'] || keys.current['ArrowLeft'] || gpX < -0.2;
    const goRight = keys.current['KeyD'] || keys.current['ArrowRight'] || gpX > 0.2;
    const brake = keys.current['Space'];

    if (goForward) data.speed += ACCEL;
    else if (goBackward) data.speed -= ACCEL;
    else data.speed *= FRICTION;
    if (brake) data.speed *= 0.85; 

    data.speed = THREE.MathUtils.clamp(data.speed, -MAX_SPEED * 0.4, MAX_SPEED);
    if (Math.abs(data.speed) < 0.005) data.speed = 0;

    const isMoving = Math.abs(data.speed) > 0.01;
    if (isMoving) {
      const steerDir = data.speed > 0 ? 1 : -1;
      let steerAmount = 0;
      if (goLeft) steerAmount = STEER_SPEED;
      if (goRight) steerAmount = -STEER_SPEED;
      if (gpX !== 0) steerAmount = -gpX * STEER_SPEED;
      
      data.angle += steerAmount * steerDir * (Math.abs(data.speed)/MAX_SPEED);
      wheelsRef.current[0]?.rotation.set(0, steerAmount * 10, 0); 
      wheelsRef.current[1]?.rotation.set(0, steerAmount * 10, 0); 
    }

    const nextX = data.pos.x + Math.sin(data.angle) * data.speed;
    const nextZ = data.pos.z + Math.cos(data.angle) * data.speed;
    const currentTile = getTileAt(data.pos.x, data.pos.z);
    let collision = false;

    // Building Collision
    if (getTileAt(nextX, nextZ) === 2) {
      data.speed *= -0.5; 
      collision = true;
    } else {
      data.pos.x = nextX;
      data.pos.z = nextZ;
    }

    // MULTIPLAYER CAR COLLISION
    for (const rp of remotePlayers) {
       const dist = Math.hypot(data.pos.x - rp.x, data.pos.z - rp.z);
       if (dist < 3.5) { // Crash!
          data.speed *= -1.2; // Bounce back hard
          data.pos.x -= Math.sin(data.angle) * 0.5;
          data.pos.z -= Math.cos(data.angle) * 0.5;
          collision = true;
          break;
       }
    }

    if (collision) {
       if (Math.abs(data.speed) > 0.1) {
         stateRef.violations++;
         stateRef.mission = "CRASH! -XP Penalty!";
         stateRef.xp = Math.max(0, stateRef.xp - 5);
         setTimeout(() => { if(stateRef.mission.includes("CRASH")) stateRef.mission = "Drive carefully." }, 2000);
       }
    }

    if (currentTile === 0) data.speed *= 0.95; 

    // Parking Logic
    if (currentTile === 3 && Math.abs(data.speed) < 0.01) {
      const spotKey = `${Math.floor(data.pos.x/TILE_SIZE)}_${Math.floor(data.pos.z/TILE_SIZE)}`;
      if (data.parkedSpot !== spotKey) {
        stateRef.parkTimer += delta;
        if (stateRef.parkTimer > 1.5) { 
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

    if (groupRef.current) {
      groupRef.current.position.copy(data.pos);
      groupRef.current.rotation.y = data.angle;
    }

    stateRef.speed = Math.abs(data.speed) * 150; 
    stateRef.gear = data.speed > 0.01 ? 'D' : data.speed < -0.01 ? 'R' : 'N';

    // MULTIPLAYER SEND SYNC
    // Send 10 times a second max to avoid flooding
    if (Math.random() < 0.5) {
      sendUpdate({ x: data.pos.x, z: data.pos.z, angle: data.angle, speed: data.speed, name: playerName, color: data.carColor });
    }

    const idealOffset = new THREE.Vector3(-Math.sin(data.angle) * 12, 6, -Math.cos(data.angle) * 12);
    const idealLookAt = new THREE.Vector3(data.pos.x + Math.sin(data.angle) * 10, data.pos.y, data.pos.z + Math.cos(data.angle) * 10);
    camera.position.lerp(idealOffset.add(data.pos), 0.1);
    camera.lookAt(idealLookAt);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color={carData.current.carColor} roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.1} metalness={0.9} transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      <mesh position={[0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffee" />
      </mesh>
      <mesh position={[-0.7, 0.5, -2.3]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.7, 0.5, -2.3]}>
        <boxGeometry args={[0.5, 0.2, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {[[-1.2, 0.4, 1.4], [1.2, 0.4, 1.4], [-1.2, 0.4, -1.4], [1.2, 0.4, -1.4]].map((pos, i) => (
        <group key={i} position={pos as [number,number,number]} ref={el => { if(el) wheelsRef.current[i] = el; }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
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
      const tile = currentMap[row][col];
      const x = (col - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
      const z = (row - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;

      if (tile === 2) {
        const height = 10 + Math.random() * 20;
        blocks.push(
          <mesh key={`${row}-${col}`} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE - 0.5, height, TILE_SIZE - 0.5]} />
            <meshStandardMaterial color={`hsl(${Math.random()*360}, 15%, 40%)`} />
          </mesh>
        );
      } else if (tile === 3) {
        blocks.push(
          <mesh key={`park-${row}-${col}`} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE_SIZE - 1, TILE_SIZE - 1]} />
            <meshBasicMaterial color="#22c55e" opacity={0.3} transparent />
          </mesh>
        );
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
      </mesh>
      {currentMap.map((rowArr: number[], row: number) => 
        rowArr.map((tile: number, col: number) => {
          if (tile === 0 || tile === 2) { 
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
// HUD OVERLAY
// ---------------------------------------------------------
function HUD({ onQuit, connectionsCount }: { onQuit: () => void, connectionsCount: number }) {
  const [hudData, setHudData] = useState({ speed: 0, gear: 'N', xp: 0, time: 300, violations: 0, mission: '' });

  useEffect(() => {
    const interval = setInterval(() => {
      setHudData({ speed: stateRef.speed, gear: stateRef.gear, xp: stateRef.xp, time: stateRef.timeRemaining, violations: stateRef.violations, mission: stateRef.mission });
      stateRef.timeRemaining--;
      if (stateRef.timeRemaining <= 0) clearInterval(interval);
    }, 1000);

    const speedLoop = () => {
      setHudData(prev => ({ ...prev, speed: stateRef.speed, gear: stateRef.gear, xp: stateRef.xp, mission: stateRef.mission, violations: stateRef.violations }));
      if (stateRef.timeRemaining > 0) requestAnimationFrame(speedLoop);
    }
    requestAnimationFrame(speedLoop);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(Math.max(0,secs) % 60).toString().padStart(2, '0')}`;

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
      <div className="flex justify-between items-start pointer-events-auto">
        <button onClick={onQuit} className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80 transition-colors shadow-lg">
          <ArrowLeft className="w-5 h-5" /> Quit
        </button>

        <div className="flex gap-4">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-3 rounded-2xl flex flex-col items-center justify-center shadow-lg">
             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5 animate-pulse text-green-400">Multiplayer</span>
             <span className="text-sm font-black">{connectionsCount} Online</span>
          </div>

          <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-lg min-w-[140px]">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Time Left</span>
            <span className={`text-2xl font-black ${hudData.time < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(hudData.time)}
            </span>
          </div>
        </div>
      </div>

      <div className="self-center bg-black/70 backdrop-blur-md border border-amber-500/30 px-8 py-3 rounded-full flex items-center gap-3 shadow-2xl mt-4 max-w-lg text-center animate-fade-in">
        <Shield className="w-5 h-5 text-amber-500" />
        <span className="text-white font-bold text-sm tracking-wide">{hudData.mission}</span>
      </div>

      <div className="flex-1" />

      <div className="flex justify-between items-end pointer-events-auto">
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
  const { user } = useUser();
  const playerName = user?.firstName || 'Guest';

  const handleCustomEvent = (data: any) => {
    if (data.type === 'START_1V1') {
      currentMap = data.payload.map;
      stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
      stateRef.timeRemaining = 300; stateRef.mission = 'Find the green parking spots!';
      stateRef.parkTimer = 0;
      setPhase('playing');
    }
  };
  const { remotePlayers, sendUpdate, isHost, sendCustomEvent } = useMultiplayer('roadsafety', playerName, handleCustomEvent);

  const handleXPAdd = async (amount: number) => {
    try { await addGameXP(amount); } catch (e) { console.error("Failed to add XP in 3D game", e); }
  }

  if (phase === 'lobby') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
        <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors bg-accent/50 px-4 py-2 rounded-full">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 text-5xl mb-2">
            🏎️
          </div>
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: 'var(--font-outfit)' }}>City Drive 3D</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Experience realistic driving, find parking spots, and navigate the city blocks perfectly to earn XP. 
            <strong className="text-primary block mt-2">✨ MULTIPLAYER ENABLED ✨</strong>
          </p>
        </div>
        <button
          onClick={() => {
            stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
            stateRef.timeRemaining = 300; stateRef.mission = 'Find the green parking spots!';
            stateRef.parkTimer = 0;
            currentMap = generateRandomCityMap();
            sendCustomEvent({ type: 'START_1V1', payload: { map: currentMap } });
            setPhase('playing');
          }}
          className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all"
        >
          START ENGINE SOLO
        </button>
        {remotePlayers.length > 0 && (
          <div className="fixed bottom-10 left-10 pointer-events-auto animate-fade-in z-50">
            <button 
              onClick={() => {
                stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
                stateRef.timeRemaining = 300; stateRef.mission = 'Find the green parking spots!';
                stateRef.parkTimer = 0;
                currentMap = generateRandomCityMap();
                sendCustomEvent({ type: 'START_1V1', payload: { map: currentMap } });
                setPhase('playing');
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 border-[3px] border-white/20 text-white font-black text-2xl px-8 py-5 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-3">
              <span className="animate-pulse">✨</span> PLAYER JOINED! PLAY 1V1 MAP <span className="animate-pulse">✨</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50">
      <Canvas shadows camera={{ position: [0, 10, 10], fov: 60 }}>
        <color attach="background" args={['#87ceeb']} />
        <ambientLight intensity={0.4} />
        <directionalLight castShadow position={[50, 50, 20]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <Sky sunPosition={[100, 20, 100]} turbidity={1} rayleigh={0.5} />
        <Environment preset="city" />

        <CityEnvironment />
        
        {/* Render Local Player */}
        <Car onGameEnd={() => setPhase('lobby')} addXP={handleXPAdd} playerName={playerName} remotePlayers={remotePlayers} sendUpdate={sendUpdate} />
        
        {/* Render Remote Players */}
        {remotePlayers.map(p => <RemoteCar key={p.id} data={p} />)}
      </Canvas>
      <HUD onQuit={() => setPhase('lobby')} connectionsCount={remotePlayers.length + 1} />
    </div>
  );
}