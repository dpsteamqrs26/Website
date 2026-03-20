'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';

type LightState = 'red' | 'green';
type Dir = 'ns' | 'ew';
type TCar = { id: number; dir: Dir; progress: number; speed: number; color: string; stopped: boolean };

const COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4'];
const ROAD_W = 8;

function Intersection({ nsLight, ewLight }: { nsLight: LightState; ewLight: LightState }) {
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow><planeGeometry args={[80,80]}/><meshStandardMaterial color="#22543d" roughness={0.9}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow><planeGeometry args={[ROAD_W,80]}/><meshStandardMaterial color="#374151" roughness={0.9}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow><planeGeometry args={[80,ROAD_W]}/><meshStandardMaterial color="#374151" roughness={0.9}/></mesh>
      {Array.from({length:12}).map((_,i)=>(
        <group key={i}>
          <mesh position={[0,0.01,(i-6)*5]}><boxGeometry args={[0.15,0.02,2.5]}/><meshStandardMaterial color="#fbbf24"/></mesh>
          <mesh position={[(i-6)*5,0.01,0]}><boxGeometry args={[2.5,0.02,0.15]}/><meshStandardMaterial color="#fbbf24"/></mesh>
        </group>
      ))}
      {/* Crosswalk */}
      {Array.from({length:5}).map((_,i)=>(
        <group key={`cw-${i}`}>
          <mesh position={[-ROAD_W/2+1+i*1.5,0.02,ROAD_W/2+0.5]}><boxGeometry args={[1,0.02,0.3]}/><meshStandardMaterial color="#fff"/></mesh>
          <mesh position={[-ROAD_W/2+1+i*1.5,0.02,-ROAD_W/2-0.5]}><boxGeometry args={[1,0.02,0.3]}/><meshStandardMaterial color="#fff"/></mesh>
          <mesh position={[ROAD_W/2+0.5,0.02,-ROAD_W/2+1+i*1.5]}><boxGeometry args={[0.3,0.02,1]}/><meshStandardMaterial color="#fff"/></mesh>
          <mesh position={[-ROAD_W/2-0.5,0.02,-ROAD_W/2+1+i*1.5]}><boxGeometry args={[0.3,0.02,1]}/><meshStandardMaterial color="#fff"/></mesh>
        </group>
      ))}
      {/* Traffic lights */}
      {[[-6,0,-6],[6,0,6]].map((pos,i)=>{
        const light = i===0?nsLight:ewLight;
        return (
          <group key={`tl-${i}`} position={pos as [number,number,number]}>
            <mesh position={[0,2.5,0]}><cylinderGeometry args={[0.12,0.12,5,8]}/><meshStandardMaterial color="#555"/></mesh>
            <mesh position={[0,4.5,0]}><boxGeometry args={[0.8,2.2,0.8]}/><meshStandardMaterial color="#222"/></mesh>
            <mesh position={[0,5.2,0.41]}><sphereGeometry args={[0.22,16,16]}/><meshBasicMaterial color={light==='red'?'#ef4444':'#550000'}/></mesh>
            <mesh position={[0,4.6,0.41]}><sphereGeometry args={[0.22,16,16]}/><meshBasicMaterial color={light==='green'?'#22c55e':'#003300'}/></mesh>
          </group>
        );
      })}
    </group>
  );
}

function TrafficCar({ car }: { car: TCar }) {
  const px = car.dir==='ns' ? 2 : car.progress;
  const pz = car.dir==='ns' ? car.progress : -2;
  const ry = car.dir==='ew' ? Math.PI/2 : 0;
  return (
    <group position={[px, 0, pz]} rotation={[0, ry, 0]}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.7,3.8]}/><meshStandardMaterial color={car.color} roughness={0.3} metalness={0.6}/></mesh>
      <mesh position={[0,1,0]}><boxGeometry args={[1.6,0.5,1.8]}/><meshStandardMaterial color="#111" transparent opacity={0.7}/></mesh>
      {[[-0.9,0.35,1.6],[0.9,0.35,1.6],[-0.9,0.35,-1.6],[0.9,0.35,-1.6]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.28,0.28,0.18,12]}/><meshStandardMaterial color="#222"/></mesh>
      ))}
    </group>
  );
}

function TrafficSim({ cars }: { cars: TCar[] }) {
  return <>{cars.map(c=><TrafficCar key={c.id} car={c}/>)}</>;
}

export default function TrafficController() {
  const [phase, setPhase] = useState<'lobby'|'playing'|'gameover'>('lobby');
  const [nsLight, setNsLight] = useState<LightState>('green');
  const [ewLight, setEwLight] = useState<LightState>('red');
  const [cars, setCars] = useState<TCar[]>([]);
  const [xp, setXp] = useState(0);
  const [crashes, setCrashes] = useState(0);
  const [passed, setPassed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const nsRef = useRef<LightState>('green');
  const ewRef = useRef<LightState>('red');

  const toggleLights = useCallback(() => {
    setNsLight(p => { const n = p==='green'?'red':'green'; nsRef.current=n; return n; });
    setEwLight(p => { const n = p==='green'?'red':'green'; ewRef.current=n; return n; });
  }, []);

  const start = () => {
    setPhase('playing'); setXp(0); setCrashes(0); setPassed(0); setTimeLeft(120);
    setNsLight('green'); setEwLight('red'); nsRef.current='green'; ewRef.current='red';
    setCars([]);
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    // Timer
    const timer = setInterval(() => setTimeLeft(p => { if (p <= 1) { setPhase('gameover'); return 0; } return p-1; }), 1000);

    // Spawn cars
    const spawner = setInterval(() => {
      setCars(prev => {
        if (prev.length < 10) {
          const dir: Dir = Math.random() > 0.5 ? 'ns' : 'ew';
          return [...prev, { id: Date.now()+Math.random(), dir, progress: -35 - Math.random()*10, speed: 0.12 + Math.random()*0.08, color: COLORS[Math.floor(Math.random()*COLORS.length)], stopped: false }];
        }
        return prev;
      });
    }, 1200);

    // Game loop
    const loop = setInterval(() => {
      setCars(prev => {
        const updated = prev.map(car => {
          const light = car.dir === 'ns' ? nsRef.current : ewRef.current;
          const nearStop = car.progress > -ROAD_W/2-3 && car.progress < -ROAD_W/2;

          // Stop at red light before intersection
          if (light === 'red' && nearStop && car.speed > 0) {
            return { ...car, stopped: true };
          }
          // Green light or past intersection: go
          if (light === 'green' || car.progress > ROAD_W/2) {
            return { ...car, progress: car.progress + car.speed, stopped: false };
          }
          // Already stopped
          if (car.stopped) return car;
          // Default: move
          return { ...car, progress: car.progress + car.speed };
        });

        // Check for crashes: NS and EW car BOTH inside intersection box
        const inBox = updated.filter(c => Math.abs(c.progress) < ROAD_W/2 + 1);
        const nsInBox = inBox.filter(c => c.dir === 'ns');
        const ewInBox = inBox.filter(c => c.dir === 'ew');
        if (nsInBox.length > 0 && ewInBox.length > 0) {
          // Check actual proximity between pairs
          for (const a of nsInBox) {
            for (const b of ewInBox) {
              const ax = 2, az = a.progress;
              const bx = b.progress, bz = -2;
              if (Math.hypot(ax-bx, az-bz) < 3.5) {
                setCrashes(c => c + 1);
                setXp(p => Math.max(0, p - 20));
                addGameXP(-20).catch(() => {});
              }
            }
          }
        }

        // Remove cars that passed through & score them
        const passedCars = updated.filter(c => c.progress > 38);
        if (passedCars.length > 0) {
          setPassed(p => p + passedCars.length);
          setXp(p => p + passedCars.length * 10);
          addGameXP(passedCars.length * 10).catch(() => {});
        }

        return updated.filter(c => c.progress <= 38);
      });
    }, 33); // ~30 fps

    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') toggleLights(); };
    window.addEventListener('keydown', kd);
    return () => { clearInterval(timer); clearInterval(spawner); clearInterval(loop); window.removeEventListener('keydown', kd); };
  }, [phase, toggleLights]);

  if (phase === 'lobby') return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4"/>Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-500 to-red-600 shadow-2xl shadow-yellow-500/30 text-5xl">🚦</div>
        <h1 className="text-5xl font-black">Traffic Controller 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">Manage traffic at a busy 3D intersection! Press SPACE or click the button to toggle lights. Cars stop correctly at reds and go on green. +10 XP per safe pass, -20 XP per collision.</p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">START</button>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">🚦</div><h2 className="text-4xl font-black">Shift Over!</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent/50 rounded-2xl p-4"><p className="text-3xl font-black text-green-500">{passed}</p><p className="text-xs text-muted-foreground uppercase font-bold">Safe Passes</p></div>
          <div className="bg-accent/50 rounded-2xl p-4"><p className="text-3xl font-black text-red-500">{crashes}</p><p className="text-xs text-muted-foreground uppercase font-bold">Crashes</p></div>
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
      <Canvas shadows camera={{position:[0,35,25],fov:50}}>
        <color attach="background" args={['#0f172a']}/>
        <ambientLight intensity={0.5}/><directionalLight castShadow position={[20,40,20]} intensity={1.2} shadow-mapSize={[2048,2048]}/>
        <Intersection nsLight={nsLight} ewLight={ewLight}/>
        <TrafficSim cars={cars}/>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={()=>setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5"/>Quit</button>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center min-w-[100px]"><span className="text-[10px] text-gray-400 font-bold uppercase">Time</span><span className={`text-xl font-black ${timeLeft<=20?'text-red-500 animate-pulse':'text-white'}`}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span></div>
        </div>
        <div className="flex items-center justify-center pointer-events-auto">
          <button onClick={toggleLights} className="bg-gradient-to-r from-amber-500 to-red-500 text-white px-12 py-5 rounded-2xl font-black text-2xl shadow-2xl hover:scale-105 transition-transform border-2 border-white/20">🔄 SWITCH LIGHTS (Space)</button>
        </div>
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-bold">NS: <span className={nsLight==='green'?'text-green-400':'text-red-400'}>{nsLight.toUpperCase()}</span></span>
            <span className="text-xs text-gray-400 font-bold">EW: <span className={ewLight==='green'?'text-green-400':'text-red-400'}>{ewLight.toUpperCase()}</span></span>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500"/><span className="text-2xl font-black text-white">{xp} XP</span></div>
            <span className="text-xs text-gray-400 font-bold">{passed} Passed · {crashes} Crashes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
