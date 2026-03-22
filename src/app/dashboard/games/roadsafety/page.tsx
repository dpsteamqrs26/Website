'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Gauge, Shield, Clock, MapPin, Zap, AlertTriangle, Crosshair, ChevronRight } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, ContactShadows, Cloud, Sparkles } from '@react-three/drei';
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
  mission: 'Secure parking coordinates to extract XP.',
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
      groupRef.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3);
      const currentQuat = groupRef.current.quaternion;
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, data.angle, 0));
      currentQuat.slerp(targetQuat, 0.3);
      wheelsRef.current.forEach(w => {
        if(w) w.rotation.x -= data.speed * 2;
      });
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color={data.color || "#3b82f6"} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color="#000" roughness={0.1} metalness={0.9} transparent opacity={0.9} />
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
    carColor: `#${Math.floor(Math.random()*16777215).toString(16)}`
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
       if (dist < 3.5) {
          data.speed *= -1.2;
          data.pos.x -= Math.sin(data.angle) * 0.5;
          data.pos.z -= Math.cos(data.angle) * 0.5;
          collision = true;
          break;
       }
    }

    if (collision) {
       if (Math.abs(data.speed) > 0.1) {
         stateRef.violations++;
         stateRef.mission = "[WARNING] HULL INTEGRITY COMPROMISED: -5 XP";
         stateRef.xp = Math.max(0, stateRef.xp - 5);
         setTimeout(() => { if(stateRef.mission.includes("HULL")) stateRef.mission = "Awaiting coordinate securing." }, 2000);
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
          stateRef.mission = `[SUCCESS] Coordinates Secured: +15 XP`;
          setTimeout(() => { stateRef.mission = "Locate next target." }, 3000);
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

    if (Math.random() < 0.5) {
      sendUpdate({ x: data.pos.x, z: data.pos.z, angle: data.angle, speed: data.speed, name: playerName, color: data.carColor });
    }

    // Hyper-realistic dynamic camera pursuit
    const idealOffset = new THREE.Vector3(-Math.sin(data.angle) * 12, 6, -Math.cos(data.angle) * 12);
    const idealLookAt = new THREE.Vector3(data.pos.x + Math.sin(data.angle) * 10, data.pos.y, data.pos.z + Math.cos(data.angle) * 10);
    // Add slight speed-based FOV push for adrenaline effect
    camera.fov = THREE.MathUtils.lerp(camera.fov, 60 + (Math.abs(data.speed) * 30), 0.1);
    camera.updateProjectionMatrix();
    
    camera.position.lerp(idealOffset.add(data.pos), 0.15);
    // Smooth lookat
    const currentLookAt = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(idealLookAt, 0.15);
    camera.lookAt(currentLookAt);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2.2, 0.8, 4.5]} />
        <meshStandardMaterial color={carData.current.carColor} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, -0.2]} castShadow>
        <boxGeometry args={[1.8, 0.7, 2.2]} />
        <meshStandardMaterial color="#050505" roughness={0.0} metalness={1.0} transparent opacity={0.9} />
      </mesh>
      {/* Hyper-realistic Headlights/Taillights */}
      <mesh position={[-0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.7, 0.5, 2.3]}>
        <boxGeometry args={[0.4, 0.3, 0.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight position={[0, 0.5, 3]} color="#ffffff" intensity={2} distance={20} castShadow />

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
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow shadow-bias={-0.001}>
            <cylinderGeometry args={[0.45, 0.45, 0.35, 24]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
          {/* Wheel Rims */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[(pos[0]>0?0.18:-0.18),0,0]}>
             <cylinderGeometry args={[0.3, 0.3, 0.05, 12]} />
             <meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Dynamic Fake Shadow directly under car */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[2.5, 5]} />
        <meshBasicMaterial color="#000" opacity={0.5} transparent />
      </mesh>
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
        const height = 15 + Math.random() * 30; // Taller buildings for AAA scale
        blocks.push(
          <mesh key={`${row}-${col}`} position={[x, height / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE - 0.5, height, TILE_SIZE - 0.5]} />
            {/* Hyper-realistic dark glass building look */}
            <meshStandardMaterial color={`hsl(${220 + Math.random()*20}, 20%, ${10 + Math.random()*15}%)`} metalness={0.8} roughness={0.2} />
          </mesh>
        );
      } else if (tile === 3) {
        // Glowing Parking Spot
        blocks.push(
          <mesh key={`park-${row}-${col}`} position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[TILE_SIZE - 1, TILE_SIZE - 1]} />
            <meshBasicMaterial color="#10b981" opacity={0.2} transparent />
          </mesh>
        );
        blocks.push(
          <mesh key={`parkline-${row}-${col}`} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
             <ringGeometry args={[TILE_SIZE/2 - 0.5, TILE_SIZE/2 - 0.1, 32]} />
             <meshBasicMaterial color="#34d399" />
          </mesh>
        );
        blocks.push(
          <pointLight key={`parklight-${row}-${col}`} position={[x, 1, z]} distance={10} intensity={0.5} color="#34d399" />
        )
      }
    }
  }

  return (
    <group>
      {blocks}
      {/* Wet Road Material */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
        <meshStandardMaterial color="#111" roughness={0.1} metalness={0.5} />
      </mesh>
      {/* Grid Decals / Grass replacements with sleek dark concrete */}
      {currentMap.map((rowArr: number[], row: number) => 
        rowArr.map((tile: number, col: number) => {
          if (tile === 0 || tile === 2) { 
            const x = (col - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
            const z = (row - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
            return (
              <mesh key={`sidewalk-${row}-${col}`} position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[TILE_SIZE, TILE_SIZE]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
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
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in font-sans">
        <div className="bg-zinc-950/80 border border-white/10 rounded-[2rem] p-10 max-w-lg w-full text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-indigo-600/20 blur-[100px] -z-10" />
          <div className="text-6xl mb-6 drop-shadow-lg">🏁</div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Simulation Concluded</h2>
          
          <div className="grid grid-cols-2 gap-4 my-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
              <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">+{hudData.xp}</p>
              <p className="text-xs text-zinc-400 uppercase font-black tracking-widest mt-2">XP GAINED</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
              <p className={`text-5xl font-black ${hudData.violations === 0 ? 'text-zinc-500' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'}`}>{hudData.violations}</p>
              <p className="text-xs text-zinc-400 uppercase font-black tracking-widest mt-2">INFRACTIONS</p>
            </div>
          </div>
          
          <p className="text-sm text-zinc-500 font-medium mb-8">Data synced to main server. ELO updated.</p>
          
          <div className="flex flex-col gap-3">
            <button onClick={() => window.location.reload()} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-[1.02] transition-all overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
               RESTART SIMULATION
            </button>
            <button onClick={onQuit} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
               ABORT TO HUB
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-6 sm:p-8 flex flex-col justify-between font-sans overflow-hidden">
      {/* Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

      {/* Top HUD */}
      <div className="flex justify-between items-start pointer-events-auto relative z-20">
        <button onClick={onQuit} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <ArrowLeft className="w-4 h-4" /> ABORT
        </button>

        <div className="flex gap-4">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-indigo-500/30 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)] min-w-[120px]">
             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> SYNC
             </span>
             <span className="text-lg font-black">{connectionsCount} OPR</span>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-end justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[140px]">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">T-MINUS</span>
            <span className={`text-2xl font-black tracking-tighter ${hudData.time < 30 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-white'}`}>
              {formatTime(hudData.time)}
            </span>
          </div>
        </div>
      </div>

      {/* Mission Objective Overlay */}
      <div className="self-center bg-zinc-950/80 backdrop-blur-xl border border-emerald-500/30 px-8 py-4 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(16,185,129,0.2)] mt-6 max-w-2xl text-center animate-fade-in relative z-20 pointer-events-auto">
        <Crosshair className="w-5 h-5 text-emerald-400 animate-pulse" />
        <span className="text-white font-bold text-sm tracking-widest uppercase">{hudData.mission}</span>
      </div>

      <div className="flex-1" />

      {/* Bottom HUD */}
      <div className="flex justify-between items-end pointer-events-auto relative z-20">
        
        {/* Speedometer Telemetry */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex items-center gap-6 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[240px]">
          <div className="relative flex flex-col items-center justify-center w-24 h-24 rounded-full border-[6px]" style={{ borderColor: hudData.speed > 80 ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>
             <div className="absolute inset-0 rounded-full border-[6px] border-indigo-500 transition-all duration-300" style={{ clipPath: `inset(0 0 ${100 - (hudData.speed/150)*100}% 0)` }} />
             <span className="text-3xl font-black text-white z-10">{Math.round(hudData.speed)}</span>
             <span className="text-[9px] uppercase font-black tracking-widest text-zinc-500 z-10">KPH</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className={`text-3xl font-black tracking-tighter ${hudData.gear === 'D' ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : hudData.gear === 'R' ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]' : 'text-zinc-600'}`}>
              {hudData.gear}
            </div>
            <div className="text-[10px] font-black tracking-widest text-zinc-950 bg-white px-2 py-1 rounded">
              A / T
            </div>
          </div>
        </div>

        {/* Tactical Info */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-end gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[200px]">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Zap className="w-4 h-4 fill-current" />
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Yield XP</span>
          </div>
          <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{hudData.xp}</div>
          
          {hudData.violations > 0 && (
            <div className="mt-2 text-[10px] font-black tracking-widest px-3 py-1.5 rounded bg-red-500/20 text-red-500 uppercase border border-red-500/30 w-full text-right animate-pulse">
              DMG: {hudData.violations}
            </div>
          )}
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
  const playerName = user?.firstName || 'Guest OP';

  const handleCustomEvent = (data: any) => {
    if (data.type === 'START_1V1') {
      currentMap = data.payload.map;
      stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
      stateRef.timeRemaining = 300; stateRef.mission = 'Secure parking coordinates to extract XP.';
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
      <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate">
        {/* AAA Lobby Background */}
        <div className="absolute inset-0 z-0 bg-black">
          <img 
            src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2000&auto=format&fit=crop" 
            alt="City Engine" 
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[2px]" />
          
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-10000" />
        </div>

        <div className="relative z-10 p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
          <Link href="/dashboard/games" className="absolute top-10 left-10 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-5 py-3 rounded-full hover:bg-white/10 uppercase">
            <ArrowLeft className="h-4 w-4" /> Retreat to Hub
          </Link>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Engine Status: Nominal</span>
          </div>

          <h1 className="text-6xl sm:text-[8rem] leading-[0.8] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            CITY <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 filter drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">DRIVE</span> 3D
          </h1>
          
          <p className="text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-indigo-500 pl-6">
            Initialize the hyper-realistic simulation. Navigate volumetric city grids, secure parking parameters, and avoid collision vectors.
            <strong className="text-emerald-400 flex items-center mt-4 text-xs tracking-widest uppercase"><Zap className="w-3 h-3 justify-center mr-2"/> MULTIPLAYER SYNC ENABLED</strong>
          </p>

          <button
            onClick={() => {
              stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
              stateRef.timeRemaining = 300; stateRef.mission = 'Secure parking coordinates to extract XP.';
              stateRef.parkTimer = 0;
              currentMap = generateRandomCityMap();
              sendCustomEvent({ type: 'START_1V1', payload: { map: currentMap } });
              setPhase('playing');
            }}
            className="group relative flex h-16 w-full max-w-sm items-center justify-center gap-3 rounded-xl bg-white px-10 text-xl font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.03] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            DEPLOY PROTOCOL
            <ChevronRight className="w-6 h-6 delay-100 transition-transform group-hover:translate-x-2" />
          </button>
          
          {remotePlayers.length > 0 && (
            <div className="absolute bottom-10 right-10 pointer-events-auto animate-fade-in z-50">
              <button 
                onClick={() => {
                  stateRef.speed = 0; stateRef.gear = 'N'; stateRef.xp = 0; stateRef.violations = 0;
                  stateRef.timeRemaining = 300; stateRef.mission = 'Secure parking coordinates to extract XP.';
                  stateRef.parkTimer = 0;
                  currentMap = generateRandomCityMap();
                  sendCustomEvent({ type: 'START_1V1', payload: { map: currentMap } });
                  setPhase('playing');
                }}
                className="bg-indigo-600 border border-indigo-400/50 text-white font-black text-sm tracking-widest uppercase px-8 py-5 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3">
                <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                INITIATE PVP INSTANCE ({remotePlayers.length})
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Gameplay Phase
  return (
    <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group">
      <Canvas shadows camera={{ position: [0, 10, 10], fov: 60 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#0a0a0a', 20, 100]} />
        <color attach="background" args={['#0a0a0a']} />
        
        {/* Hyper-realistic Studio/Night Lighting */}
        <ambientLight intensity={0.1} />
        <directionalLight castShadow position={[50, 100, 20]} intensity={1.5} color="#b3d4ff" shadow-mapSize={[2048, 2048]} shadow-camera-far={200} shadow-camera-left={-50} shadow-camera-right={50} shadow-camera-top={50} shadow-camera-bottom={-50} />
        <pointLight position={[0, 50, 0]} intensity={2} color="#f9a8d4" distance={200} />
        
        {/* Dynamic night sky environment */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />

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

function Stars(props: any) {
  return <Sparkles scale={100} size={2} color="#ffffff" {...props} />
}