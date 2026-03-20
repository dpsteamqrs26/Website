'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';

type LightState = 'red' | 'green';
type Direction = 'ns' | 'ew';
type TrafficCar = { id: number; dir: Direction; pos: number; speed: number; color: string; waiting: boolean };

const CAR_COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899'];

function IntersectionScene({ nsLight, ewLight, cars }: { nsLight: LightState; ewLight: LightState; cars: TrafficCar[] }) {
  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,0]} receiveShadow>
        <planeGeometry args={[80,80]} /><meshStandardMaterial color="#22543d" roughness={0.9} />
      </mesh>
      {/* NS Road */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[8,80]} /><meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      {/* EW Road */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[80,8]} /><meshStandardMaterial color="#374151" roughness={0.9} />
      </mesh>
      {/* Lane markings */}
      {Array.from({length:20}).map((_,i)=>(
        <group key={i}>
          <mesh position={[0,0.01,(i-10)*4]}><boxGeometry args={[0.15,0.02,2]}/><meshStandardMaterial color="#fbbf24"/></mesh>
          <mesh position={[(i-10)*4,0.01,0]}><boxGeometry args={[2,0.02,0.15]}/><meshStandardMaterial color="#fbbf24"/></mesh>
        </group>
      ))}
      {/* Traffic lights */}
      <group position={[-5,0,-5]}>
        <mesh position={[0,3,0]}><boxGeometry args={[1,3,1]}/><meshStandardMaterial color="#333"/></mesh>
        <mesh position={[0,4,0.51]}><sphereGeometry args={[0.3,16,16]}/><meshBasicMaterial color={nsLight==='red'?'#ef4444':'#333'}/></mesh>
        <mesh position={[0,3,0.51]}><sphereGeometry args={[0.3,16,16]}/><meshBasicMaterial color={nsLight==='green'?'#22c55e':'#333'}/></mesh>
      </group>
      <group position={[5,0,5]}>
        <mesh position={[0,3,0]}><boxGeometry args={[1,3,1]}/><meshStandardMaterial color="#333"/></mesh>
        <mesh position={[0,4,0.51]}><sphereGeometry args={[0.3,16,16]}/><meshBasicMaterial color={ewLight==='red'?'#ef4444':'#333'}/></mesh>
        <mesh position={[0,3,0.51]}><sphereGeometry args={[0.3,16,16]}/><meshBasicMaterial color={ewLight==='green'?'#22c55e':'#333'}/></mesh>
      </group>
      {/* Cars */}
      {cars.map(car => {
        const px = car.dir==='ns'? 2 : car.pos;
        const pz = car.dir==='ns'? car.pos : -2;
        return (
          <mesh key={car.id} position={[px,0.5,pz]} rotation={[0,car.dir==='ew'?Math.PI/2:0,0]} castShadow>
            <boxGeometry args={[2,0.8,3.5]}/><meshStandardMaterial color={car.color} roughness={0.3} metalness={0.6}/>
          </mesh>
        );
      })}
    </group>
  );
}

export default function TrafficController() {
  const [phase, setPhase] = useState<'lobby'|'playing'|'gameover'>('lobby');
  const [nsLight, setNsLight] = useState<LightState>('green');
  const [ewLight, setEwLight] = useState<LightState>('red');
  const [cars, setCars] = useState<TrafficCar[]>([]);
  const [xp, setXp] = useState(0);
  const [crashes, setCrashes] = useState(0);
  const [passed, setPassed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const carsRef = useRef<TrafficCar[]>([]);

  const toggleLights = () => {
    setNsLight(prev => prev === 'green' ? 'red' : 'green');
    setEwLight(prev => prev === 'green' ? 'red' : 'green');
  };

  const start = () => {
    setPhase('playing'); setXp(0); setCrashes(0); setPassed(0); setTimeLeft(120);
    setNsLight('green'); setEwLight('red');
    const initial: TrafficCar[] = [];
    for (let i = 0; i < 6; i++) {
      const dir: Direction = i % 2 === 0 ? 'ns' : 'ew';
      initial.push({ id: i, dir, pos: -30 - i * 8, speed: 0.08 + Math.random() * 0.06, color: CAR_COLORS[i % CAR_COLORS.length], waiting: false });
    }
    setCars(initial); carsRef.current = initial;
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { setPhase('gameover'); return 0; } return prev - 1; });
    }, 1000);

    const gameLoop = setInterval(() => {
      setCars(prev => {
        const updated = prev.map(car => {
          const light = car.dir === 'ns' ? nsLight : ewLight;
          const nearIntersection = Math.abs(car.pos) < 6;
          if (light === 'red' && car.pos < -4 && car.pos > -8) {
            return { ...car, waiting: true };
          }
          return { ...car, pos: car.pos + car.speed * 3, waiting: false };
        });
        // Check if cars passed through safely
        const passedCars = updated.filter(c => c.pos > 35);
        if (passedCars.length > 0) {
          setPassed(p => p + passedCars.length);
          setXp(p => p + passedCars.length * 10);
          addGameXP(passedCars.length * 10).catch(() => {});
        }
        // Check for crashes (NS and EW car in intersection at same time)
        const inIntersection = updated.filter(c => Math.abs(c.pos) < 5);
        const nsInInt = inIntersection.filter(c => c.dir === 'ns');
        const ewInInt = inIntersection.filter(c => c.dir === 'ew');
        if (nsInInt.length > 0 && ewInInt.length > 0) {
          setCrashes(c => c + 1);
          setXp(p => Math.max(0, p - 20));
          addGameXP(-20).catch(() => {});
        }
        // Recycle and spawn
        let recycled = updated.filter(c => c.pos <= 35);
        if (recycled.length < 8 && Math.random() > 0.7) {
          const dir: Direction = Math.random() > 0.5 ? 'ns' : 'ew';
          recycled.push({ id: Date.now(), dir, pos: -35, speed: 0.08 + Math.random() * 0.06, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], waiting: false });
        }
        carsRef.current = recycled;
        return recycled;
      });
    }, 50);

    // Keyboard
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') toggleLights(); };
    window.addEventListener('keydown', kd);
    return () => { clearInterval(timer); clearInterval(gameLoop); window.removeEventListener('keydown', kd); };
  }, [phase, nsLight, ewLight]);

  if (phase === 'lobby') return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-500 to-red-600 shadow-2xl shadow-yellow-500/30 text-5xl">🚦</div>
        <h1 className="text-5xl font-black">Traffic Controller 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Manage traffic lights at a busy 3D intersection! Press SPACE or click to toggle lights. +10 XP per car that passes safely, -20 XP per collision you cause. Keep the flow moving!
        </p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">START CONTROLLING</button>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">🚦</div>
        <h2 className="text-4xl font-black">Shift Over!</h2>
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
      <Canvas shadows camera={{ position: [0, 35, 25], fov: 50 }}>
        <color attach="background" args={['#0f172a']} />
        <ambientLight intensity={0.5} /><directionalLight castShadow position={[20, 40, 20]} intensity={1.2} shadow-mapSize={[2048, 2048]} />
        <IntersectionScene nsLight={nsLight} ewLight={ewLight} cars={cars} />
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={() => setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5" /> Quit</button>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center min-w-[100px]"><span className="text-[10px] text-gray-400 font-bold uppercase">Time</span><span className={`text-xl font-black ${timeLeft<=20?'text-red-500 animate-pulse':'text-white'}`}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center pointer-events-auto">
          <button onClick={toggleLights} className="bg-gradient-to-r from-amber-500 to-red-500 text-white px-12 py-5 rounded-2xl font-black text-2xl shadow-2xl hover:scale-105 transition-transform border-2 border-white/20">
            🔄 SWITCH LIGHTS (Space)
          </button>
        </div>
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-bold">NS: <span className={nsLight==='green'?'text-green-400':'text-red-400'}>{nsLight.toUpperCase()}</span></span>
            <span className="text-xs text-gray-400 font-bold">EW: <span className={ewLight==='green'?'text-green-400':'text-red-400'}>{ewLight.toUpperCase()}</span></span>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /><span className="text-2xl font-black text-white">{xp} XP</span></div>
            <span className="text-xs text-gray-400 font-bold">{passed} Passed · {crashes} Crashes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
