'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, HelpCircle, ShieldAlert, Award, AlertTriangle, Zap, Clock } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';

// ---------------------------------------------------------
// CONSTANTS & GAME DATA
// ---------------------------------------------------------
const TILE_SIZE = 8;
const MAP_SIZE = 16;
const MAX_SPEED = 0.25;      // Slower speed for parking
const ACCEL = 0.003;
const BRAKE = 0.015;
const FRICTION = 0.96;
const STEER_SPEED = 0.055;   // Tighter steering

const LEVELS = [
  {
    id: 1,
    name: "Level 1: Straight In",
    xp: 20,
    time: 60,
    startPos: { x: 0, z: -10, angle: Math.PI }, // Facing -Z
    targetSpot: { x: 0, z: 20, angle: Math.PI },
    map: [
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,2,2,1,3,1,2,2,1,1,1,0,2],
      [2,0,1,1,2,2,1,1,1,2,2,1,1,1,0,2],
      [2,0,1,1,2,2,1,1,1,2,2,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    ]
  },
  {
    id: 2,
    name: "Level 2: Parallel Park",
    xp: 40,
    time: 90,
    startPos: { x: -20, z: 0, angle: -Math.PI/2 },
    targetSpot: { x: 10, z: -20, angle: -Math.PI/2 }, // Horizontal spot
    map: [
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,0,2,2,2,2,2,2,2,2,2,2,2,2,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,2,2,2,2,1,3,1,2,2,2,2,2,0,2],
      [2,0,2,2,2,2,1,1,1,2,2,2,2,2,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,1,1,1,1,1,1,1,1,1,1,1,1,0,2],
      [2,0,2,2,2,2,2,2,2,2,2,2,2,2,0,2],
      [2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
      [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    ]
  }
];

// Helper to get map tile at 3D world coords
function getTileAt(x: number, z: number, mapData: number[][]) {
  const col = Math.floor(x / TILE_SIZE) + MAP_SIZE / 2;
  const row = Math.floor(z / TILE_SIZE) + MAP_SIZE / 2;
  if (row < 0 || row >= MAP_SIZE || col < 0 || col >= MAP_SIZE) return 2; // boundary is building/wall
  return mapData[row][col];
}

// ---------------------------------------------------------
// HUD STORE (Refs for performance)
// ---------------------------------------------------------
const stateRef = {
  speed: 0,
  gear: 'N',
  timeRemaining: 0,
  health: 100,
  message: '',
  parkProgress: 0,
  isLevelComplete: false,
};

// ---------------------------------------------------------
// CAR RIG & PHYSICS
// ---------------------------------------------------------
function CarController({
  level,
  onLevelComplete,
  onFail,
}: {
  level: typeof LEVELS[0];
  onLevelComplete: () => void;
  onFail: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group[]>([]);
  const { camera } = useThree();

  const carData = useRef({
    speed: 0,
    angle: level.startPos.angle,
    pos: new THREE.Vector3(level.startPos.x, 0, level.startPos.z),
    isDead: false,
  });

  const keys = useRef<{ [key: string]: boolean }>({});
  
  // Gamepad State
  const joyState = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Reset state for new level
    carData.current = {
      speed: 0,
      angle: level.startPos.angle,
      pos: new THREE.Vector3(level.startPos.x, 0, level.startPos.z),
      isDead: false,
    };
    stateRef.health = 100;
    stateRef.parkProgress = 0;
    stateRef.isLevelComplete = false;
    stateRef.message = "Find your spot without crashing!";

    const handleKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [level]);

  useFrame((_, delta) => {
    if (carData.current.isDead || stateRef.isLevelComplete) return;

    const data = carData.current;

    // --- Gamepad Input ---
    let gpX = 0;
    let gpY = 0;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.15) gpX = gp.axes[0]; 
      if (gp.buttons[7]?.pressed || gp.buttons[5]?.pressed) gpY = -1; // Gas
      else if (gp.buttons[6]?.pressed || gp.buttons[4]?.pressed) gpY = 1; // Brake/Rev
      else if (Math.abs(gp.axes[1]) > 0.15) gpY = gp.axes[1]; 
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

    if (brake) data.speed *= 0.8; 

    data.speed = THREE.MathUtils.clamp(data.speed, -MAX_SPEED * 0.5, MAX_SPEED);
    if (Math.abs(data.speed) < 0.002) data.speed = 0;

    // --- Steering ---
    const isMoving = Math.abs(data.speed) > 0.005;
    if (isMoving) {
      const steerDir = data.speed > 0 ? 1 : -1;
      let steerAmount = 0;
      if (goLeft) steerAmount = STEER_SPEED;
      if (goRight) steerAmount = -STEER_SPEED;
      if (gpX !== 0) steerAmount = -gpX * STEER_SPEED;
      
      // Dynamic steering ratio (tighter at very low speeds, looser at higher speeds)
      const speedRatio = Math.abs(data.speed) / MAX_SPEED;
      const turnMultiplier = THREE.MathUtils.lerp(1.5, 0.5, speedRatio); 
      data.angle += steerAmount * steerDir * turnMultiplier;

      // Rotate front wheels visually
      wheelsRef.current[0]?.rotation.set(0, steerAmount * 12, 0); 
      wheelsRef.current[1]?.rotation.set(0, steerAmount * 12, 0); 
    }

    // --- Collisions ---
    const dx = Math.sin(data.angle) * data.speed;
    const dz = Math.cos(data.angle) * data.speed;
    const nextX = data.pos.x + dx;
    const nextZ = data.pos.z + dz;
    
    // Check points representing corners of the car to avoid clipping
    const carRadius = 2.0;
    const tCenter = getTileAt(nextX, nextZ, level.map);
    const tFront  = getTileAt(nextX + Math.sin(data.angle)*carRadius, nextZ + Math.cos(data.angle)*carRadius, level.map);
    const tBack   = getTileAt(nextX - Math.sin(data.angle)*carRadius, nextZ - Math.cos(data.angle)*carRadius, level.map);
    const tLeft   = getTileAt(nextX - Math.cos(data.angle)*carRadius, nextZ + Math.sin(data.angle)*carRadius, level.map);
    const tRight  = getTileAt(nextX + Math.cos(data.angle)*carRadius, nextZ - Math.sin(data.angle)*carRadius, level.map);

    if (tCenter === 2 || tFront === 2 || tBack === 2 || tLeft === 2 || tRight === 2) {
      data.speed *= -0.3; // Rebound
      const impact = Math.abs(data.speed) * 100;
      if (impact > 1) { // Apply meaningful damage
        stateRef.health -= Math.max(5, Math.floor(impact * 8));
        stateRef.message = "CRASH! Careful!";
        setTimeout(() => { if (stateRef.message==="CRASH! Careful!") stateRef.message="" }, 1500);
      }
      
      if (stateRef.health <= 0) {
        data.isDead = true;
        onFail();
      }
    } else {
      data.pos.x = nextX;
      data.pos.z = nextZ;
    }

    // --- Parking Target Alignment Logic ---
    const distToTarget = Math.hypot(data.pos.x - level.targetSpot.x, data.pos.z - level.targetSpot.z);
    
    // Calculate smallest angle difference (accounting for 180 degree parking)
    let angleDiff = Math.abs((data.angle % Math.PI) - (level.targetSpot.angle % Math.PI));
    if (angleDiff > Math.PI / 2) angleDiff = Math.PI - angleDiff;

    if (distToTarget < 2.5 && angleDiff < 0.25 && Math.abs(data.speed) < 0.005) {
      if (!stateRef.isLevelComplete) {
        stateRef.parkProgress += delta;
        if (stateRef.parkProgress >= 1.5) {
          stateRef.isLevelComplete = true;
          onLevelComplete();
        }
      }
    } else {
      stateRef.parkProgress = 0;
    }

    // --- Apply Transforms ---
    if (groupRef.current) {
      groupRef.current.position.copy(data.pos);
      groupRef.current.rotation.y = data.angle;
    }

    stateRef.speed = Math.abs(data.speed) * 120; // kmh visual scalar
    stateRef.gear = data.speed > 0.005 ? 'D' : data.speed < -0.005 ? 'R' : 'P';

    // --- Camera (Slightly higher, tighter angle for precise parking) ---
    const idealOffset = new THREE.Vector3(
      -Math.sin(data.angle) * 16,
      12,
      -Math.cos(data.angle) * 16
    );
    const idealLookAt = new THREE.Vector3(
      data.pos.x,
      data.pos.y,
      data.pos.z
    );
    
    camera.position.lerp(idealOffset.add(data.pos), 0.1);
    camera.lookAt(idealLookAt);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[2.0, 0.6, 4.2]} />
        <meshStandardMaterial color="#0284c7" roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.05, -0.3]} castShadow>
        <boxGeometry args={[1.7, 0.6, 2.0]} />
        <meshStandardMaterial color="#111" transparent opacity={0.8} />
      </mesh>
      {/* Lights out when dead */}
      <mesh position={[-0.7, 0.4, 2.15]}>
        <boxGeometry args={[0.3, 0.2, 0.1]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      <mesh position={[0.7, 0.4, 2.15]}>
        <boxGeometry args={[0.3, 0.2, 0.1]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      <mesh position={[-0.7, 0.4, -2.15]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.7, 0.4, -2.15]}>
        <boxGeometry args={[0.4, 0.15, 0.1]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      
      {/* 4 Wheels */}
      {[[-1.0, 0.35, 1.4], [1.0, 0.35, 1.4], [-1.0, 0.35, -1.4], [1.0, 0.35, -1.4]].map((pos, i) => (
        <group key={i} position={pos as [number,number,number]} ref={el => { if(el) wheelsRef.current[i] = el; }}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
            <meshStandardMaterial color="#222" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------
// LEVEL ENVIRONMENT
// ---------------------------------------------------------
function LevelEnvironment({ level }: { level: typeof LEVELS[0] }) {
  const blocks = [];
  
  for (let row = 0; row < MAP_SIZE; row++) {
    for (let col = 0; col < MAP_SIZE; col++) {
      const tile = level.map[row][col];
      const x = (col - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;
      const z = (row - MAP_SIZE / 2) * TILE_SIZE + TILE_SIZE / 2;

      if (tile === 2) {
        // Concrete Walls
        blocks.push(
          <mesh key={`${row}-${col}`} position={[x, 2, z]} castShadow receiveShadow>
            <boxGeometry args={[TILE_SIZE, 4, TILE_SIZE]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.9} />
          </mesh>
        );
      } else if (tile === 3) {
        // Parking Spot Indicator Overlay
        blocks.push(
          <group key={`park-${row}-${col}`} position={[x, 0.02, z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[TILE_SIZE-0.5, TILE_SIZE-0.5]} />
              <meshBasicMaterial color="#10b981" transparent opacity={0.25} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <ringGeometry args={[TILE_SIZE/2 - 0.8, TILE_SIZE/2 - 0.5, 4]} />
              <meshBasicMaterial color="#10b981" />
            </mesh>
          </group>
        );
      }
    }
  }

  return (
    <group>
      {blocks}
      
      {/* Concrete / Asphalt Base Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE]} />
        <meshStandardMaterial color="#374151" roughness={0.95} />
      </mesh>
      
      {/* Subtle grid lines for parking lot feel */}
      <gridHelper args={[MAP_SIZE * TILE_SIZE, MAP_SIZE, '#4b5563', '#4b5563']} position={[0, 0.01, 0]} />
    </group>
  );
}

// ---------------------------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------------------------
export default function ParkingSimulator() {
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'win' | 'fail'>('lobby');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [hudUpdates, setHudUpdates] = useState(0);

  const level = LEVELS[currentLevelIdx];

  useEffect(() => {
    if (phase !== 'playing') return;
    
    // Setup interval to read from stateRef to update HUD
    const hudInterval = setInterval(() => {
      stateRef.timeRemaining -= 1;
      if (stateRef.timeRemaining <= 0) {
        setPhase('fail');
      }
      setHudUpdates(n => n + 1);
    }, 1000);

    const fastInterval = setInterval(() => setHudUpdates(n => n + 1), 60);

    return () => { clearInterval(hudInterval); clearInterval(fastInterval); };
  }, [phase]);

  const handleStart = (idx: number) => {
    setCurrentLevelIdx(idx);
    stateRef.timeRemaining = LEVELS[idx].time;
    setPhase('playing');
  };

  const handleLevelComplete = async () => {
    setPhase('win');
    try {
      await addGameXP(level.xp);
    } catch (e) {
      console.error("Failed to add parking XP", e);
    }
  };

  const handleFail = () => setPhase('fail');

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${(Math.max(0, secs) % 60).toString().padStart(2, '0')}`;

  // -------------------------------------------------------
  // RENDER INTERFACES
  // -------------------------------------------------------
  if (phase === 'lobby') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 animate-fade-in font-outfit space-y-8">
        <div className="flex justify-between items-center">
          <Link href="/dashboard/games" className="inline-flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5"/> Back to Games
          </Link>
          <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-1 rounded-full text-sm">
            <Car className="w-4 h-4"/> 3D Tech
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl text-6xl shadow-indigo-500/30">
            🅿️
          </div>
          <h1 className="text-5xl font-black">Parking Master 3D</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Test your precision driving without scratching the paint. Gamepads are highly recommended for precision steering!
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {LEVELS.map((lvl, index) => (
            <div key={lvl.id} className="border border-border bg-card rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <h3 className="text-2xl font-black">{lvl.name}</h3>
                <div className="flex items-center gap-4 mt-2 mb-6">
                  <span className="flex items-center gap-1 text-sm text-amber-500 font-bold"><Zap className="w-4 h-4"/> +{lvl.xp} XP</span>
                  <span className="flex items-center gap-1 text-sm text-blue-500 font-bold"><Clock className="w-4 h-4"/> {lvl.time}s Limit</span>
                </div>
              </div>
              <button
                onClick={() => handleStart(index)}
                className="w-full py-4 rounded-xl font-bold bg-foreground text-background shadow-lg hover:scale-[1.02] transition-transform"
              >
                SELECT LEVEL
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'win' || phase === 'fail') {
    return (
      <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
        <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
          <div className="text-7xl">{phase === 'win' ? '🏆' : '💥'}</div>
          <div>
            <h2 className="text-4xl font-black mb-1">{phase === 'win' ? 'Perfect Park!' : 'Failed!'}</h2>
            <p className="text-muted-foreground text-sm font-medium">
              {phase === 'win' ? 'You aligned it flawlessly in the spot.' : stateRef.health <= 0 ? 'Your car took too much damage!' : 'Time ran out!'}
            </p>
          </div>

          {phase === 'win' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-4 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-amber-500">+{level.xp}</span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500/70">XP Earned</span>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button onClick={() => setPhase('lobby')} className="w-full py-4 rounded-xl font-bold bg-foreground text-background">
              Level Select
            </button>
            <button onClick={() => handleStart(currentLevelIdx)} className="w-full py-4 rounded-xl font-bold border border-border hover:bg-accent text-foreground">
              Retry Level
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[85vh] bg-black rounded-3xl overflow-hidden border border-border/50 shadow-2xl font-outfit">
      
      {/* 3D SCENE */}
      <Canvas shadows camera={{ position: [0, 20, 20], fov: 50 }}>
        <color attach="background" args={['#1e293b']} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[-20, 50, 20]} intensity={1.5} shadow-mapSize={[2048, 2048]} />
        <LevelEnvironment level={level} />
        <CarController level={level} onLevelComplete={handleLevelComplete} onFail={handleFail} />
      </Canvas>

      {/* OVERLAY HUD */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        
        {/* Top HUD */}
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={() => setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80 transition-colors">
            <ArrowLeft className="w-5 h-5"/> Quit
          </button>
          
          <div className="flex gap-4">
             {/* Health Bar */}
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl w-40 flex flex-col justify-center">
               <span className="text-[10px] font-black uppercase text-gray-400 mb-1 flex justify-between">
                 Car Condition <span>{Math.round(stateRef.health)}%</span>
               </span>
               <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden">
                 <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${Math.max(0, stateRef.health)}%` }} />
               </div>
            </div>
            
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[120px]">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Time Left</span>
              <span className={`text-xl font-black ${stateRef.timeRemaining <= 15 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {formatTime(stateRef.timeRemaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Center Toast */}
        <div className="flex-1 flex items-center justify-center">
           {stateRef.message && (
             <div className="bg-red-500/90 backdrop-blur-sm text-white px-8 py-3 rounded-full font-black text-xl shadow-2xl border-2 border-red-300 animate-fade-in flex items-center gap-3">
               <ShieldAlert className="w-6 h-6"/> {stateRef.message}
             </div>
           )}
           {stateRef.parkProgress > 0 && (
             <div className="absolute bg-black/60 px-6 py-4 rounded-2xl border border-green-500/50 backdrop-blur-md flex flex-col items-center gap-2 shadow-2xl">
                <span className="text-green-400 font-bold">Aligning...</span>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${(stateRef.parkProgress / 1.5) * 100}%` }} />
                </div>
             </div>
           )}
        </div>

        {/* Bottom HUD */}
        <div className="flex justify-between items-end">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-4 flex items-center gap-4">
            <div className="flex flex-col items-center w-16 h-16 justify-center rounded-full border-4 border-blue-500">
               <span className="text-xl font-black text-white">{Math.round(stateRef.speed)}</span>
            </div>
            <div className={`text-4xl font-black pr-2 ${stateRef.gear === 'D' ? 'text-green-400' : stateRef.gear === 'R' ? 'text-amber-400' : 'text-gray-400'}`}>
              {stateRef.gear}
            </div>
          </div>

          <div className="hidden lg:block bg-black/40 backdrop-blur-md px-6 py-2 rounded-xl text-xs font-bold text-gray-400">
            Hold Brake (Space/LT) to stop faster. Steer precisely.
          </div>
        </div>

      </div>
    </div>
  );
}
