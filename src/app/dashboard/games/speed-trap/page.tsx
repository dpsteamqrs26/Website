'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Gauge, AlertTriangle } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const MAX_SPEED = 0.5;
const ACCEL = 0.004;
const BRAKE_FORCE = 0.012;
const FRICTION = 0.995;

type SpeedZone = { z: number; limit: number; passed: boolean };

function generateZones(): SpeedZone[] {
  const zones: SpeedZone[] = [];
  for (let i = 0; i < 12; i++) {
    const limits = [30, 40, 50, 60, 80];
    zones.push({ z: -(i + 1) * 50, limit: limits[Math.floor(Math.random() * limits.length)], passed: false });
  }
  return zones;
}

function Road() {
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,-300]} receiveShadow>
        <planeGeometry args={[12,800]}/><meshStandardMaterial color="#374151" roughness={0.9}/>
      </mesh>
      {[-5,5].map((x,i)=>(<mesh key={i} position={[x,0.3,-300]} castShadow><boxGeometry args={[0.3,0.6,800]}/><meshStandardMaterial color="#6b7280"/></mesh>))}
      {Array.from({length:100}).map((_,i)=>(<mesh key={`m-${i}`} position={[0,0.01,-i*8]}><boxGeometry args={[0.15,0.02,4]}/><meshStandardMaterial color="#fbbf24"/></mesh>))}
      <mesh rotation={[-Math.PI/2,0,0]} position={[-10,-0.02,-300]} receiveShadow><planeGeometry args={[8,800]}/><meshStandardMaterial color="#22543d"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[10,-0.02,-300]} receiveShadow><planeGeometry args={[8,800]}/><meshStandardMaterial color="#22543d"/></mesh>
    </group>
  );
}

function SpeedSign({ zone }: { zone: SpeedZone }) {
  return (
    <group position={[-6, 0, zone.z]}>
      <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.1, 0.1, 4, 8]} /><meshStandardMaterial color="#888" /></mesh>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[2.5, 2.5, 0.2]} />
        <meshStandardMaterial color={zone.passed ? '#22c55e' : '#fff'} />
      </mesh>
      <mesh position={[0, 4, 0.11]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3); });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[2, 0.8, 4]} /><meshStandardMaterial color={data.color || '#3b82f6'} roughness={0.3} metalness={0.6} /></mesh>
      <mesh position={[0, 1.1, 0]}><boxGeometry args={[1.6, 0.5, 2]} /><meshStandardMaterial color="#222" transparent opacity={0.7} /></mesh>
    </group>
  );
}

function PlayerCar({ zones, onZonePass, onSpeeding, remotePlayers, sendUpdate, playerName, active }:
  { zones: React.MutableRefObject<SpeedZone[]>; onZonePass: (bonus: boolean) => void; onSpeeding: () => void; remotePlayers: PlayerState[]; sendUpdate: any; playerName: string; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const speed = useRef(0);
  const posZ = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const color = useRef(`hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`);

  useEffect(() => {
    speed.current = 0; posZ.current = 0;
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  useFrame(() => {
    if (!active) return;
    let gpY = 0;
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gps[0];
    if (gp) { if (gp.buttons[7]?.pressed) gpY = -1; else if (gp.buttons[6]?.pressed) gpY = 1; else if (Math.abs(gp.axes[1]) > 0.15) gpY = gp.axes[1]; }

    const fwd = keys.current['KeyW'] || keys.current['ArrowUp'] || gpY < -0.2;
    const brk = keys.current['KeyS'] || keys.current['ArrowDown'] || keys.current['Space'] || gpY > 0.2;

    if (fwd) speed.current += ACCEL;
    else speed.current *= FRICTION;
    if (brk) speed.current -= BRAKE_FORCE;
    speed.current = THREE.MathUtils.clamp(speed.current, 0, MAX_SPEED);
    if (speed.current < 0.001) speed.current = 0;

    posZ.current -= speed.current;

    // Check zones
    const kmh = speed.current * 200; // Visual speed
    for (const zone of zones.current) {
      if (!zone.passed && posZ.current < zone.z + 3 && posZ.current > zone.z - 3) {
        zone.passed = true;
        if (kmh <= zone.limit + 5) { onZonePass(true); }
        else { onZonePass(false); onSpeeding(); }
      }
    }

    if (ref.current) { ref.current.position.z = posZ.current; }
    if (Math.random() < 0.3) sendUpdate({ x: 0, z: posZ.current, angle: 0, speed: speed.current, name: playerName, color: color.current });

    camera.position.lerp(new THREE.Vector3(0, 6, posZ.current + 12), 0.08);
    camera.lookAt(0, 0, posZ.current - 10);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[2, 0.8, 4.2]} /><meshStandardMaterial color={color.current} roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0, 1.1, -0.2]}><boxGeometry args={[1.6, 0.6, 2]} /><meshStandardMaterial color="#111" transparent opacity={0.8} /></mesh>
      <mesh position={[-0.7, 0.4, 2.1]}><boxGeometry args={[0.3, 0.2, 0.1]} /><meshBasicMaterial color="#ffffcc" /></mesh>
      <mesh position={[0.7, 0.4, 2.1]}><boxGeometry args={[0.3, 0.2, 0.1]} /><meshBasicMaterial color="#ffffcc" /></mesh>
      <mesh position={[-0.7, 0.4, -2.1]}><boxGeometry args={[0.4, 0.15, 0.1]} /><meshBasicMaterial color="#f00" /></mesh>
      <mesh position={[0.7, 0.4, -2.1]}><boxGeometry args={[0.4, 0.15, 0.1]} /><meshBasicMaterial color="#f00" /></mesh>
    </group>
  );
}

export default function SpeedTrap() {
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [xp, setXp] = useState(0);
  const [zonesPassed, setZonesPassed] = useState(0);
  const [violations, setViolations] = useState(0);
  const [currentLimit, setCurrentLimit] = useState(50);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const zonesRef = useRef<SpeedZone[]>([]);

  const { user } = useUser();
  const playerName = user?.firstName || 'Guest';
  const { remotePlayers, sendUpdate } = useMultiplayer('speedtrap', playerName);

  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      // Find next upcoming zone
      const upcoming = zonesRef.current.filter(z => !z.passed).sort((a, b) => b.z - a.z);
      if (upcoming.length > 0) setCurrentLimit(upcoming[0].limit);
      if (zonesRef.current.every(z => z.passed)) setPhase('gameover');
    }, 200);
    return () => clearInterval(interval);
  }, [phase]);

  const start = () => {
    setPhase('playing'); setXp(0); setZonesPassed(0); setViolations(0);
    zonesRef.current = generateZones();
    setCurrentLimit(zonesRef.current[0]?.limit || 50);
  };

  const handleZonePass = async (correct: boolean) => {
    setZonesPassed(p => p + 1);
    if (correct) { setXp(p => p + 15); try { await addGameXP(15); } catch {} }
    else { setXp(p => Math.max(0, p - 10)); try { await addGameXP(-10); } catch {} }
  };

  const handleSpeeding = () => setViolations(p => p + 1);

  if (phase === 'lobby') return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-2xl shadow-blue-500/30 text-5xl">🚗</div>
        <h1 className="text-5xl font-black">Speed Trap 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Drive through speed limit zones at the correct speed! Use W to accelerate, S/Space to brake. +15 XP for correct speed, -10 XP for speeding through zones. Obey every sign!
          <strong className="text-primary block mt-2">✨ MULTIPLAYER ENABLED ✨</strong>
        </p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">START DRIVING</button>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">{violations === 0 ? '🏆' : '🚗'}</div>
        <h2 className="text-4xl font-black">{violations === 0 ? 'Perfect Drive!' : 'Route Complete!'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent/50 rounded-2xl p-4"><p className="text-3xl font-black text-green-500">{zonesPassed - violations}</p><p className="text-xs text-muted-foreground uppercase font-bold">Clean Zones</p></div>
          <div className="bg-accent/50 rounded-2xl p-4"><p className="text-3xl font-black text-red-500">{violations}</p><p className="text-xs text-muted-foreground uppercase font-bold">Violations</p></div>
        </div>
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
      <Canvas shadows camera={{ position: [0, 6, 12], fov: 60 }}>
        <color attach="background" args={['#87ceeb']} />
        <ambientLight intensity={0.5} /><directionalLight castShadow position={[20, 40, 20]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <Sky sunPosition={[100, 20, 100]} turbidity={1} rayleigh={0.5} />
        <Road />
        {zonesRef.current.map((z, i) => <SpeedSign key={i} zone={z} />)}
        <PlayerCar zones={zonesRef} onZonePass={handleZonePass} onSpeeding={handleSpeeding} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={playerName} active={phase === 'playing'} />
        {remotePlayers.map(p => <RemotePlayer key={p.id} data={p} />)}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={() => setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5" /> Quit</button>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Multiplayer</span><span className="text-sm font-black text-white">{remotePlayers.length + 1} Online</span></div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-gray-400 font-bold uppercase">Speed Limit</span><span className="text-2xl font-black text-white">{currentLimit} km/h</span></div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-bold">Zones: {zonesPassed}/{zonesRef.current.length}</span>
            <span className={`text-xs font-bold ${violations > 0 ? 'text-red-400' : 'text-green-400'}`}>Violations: {violations}</span>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><span className="text-2xl font-black text-white">{xp} XP</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
