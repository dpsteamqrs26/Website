'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

type LightState = 'red' | 'green';
type Dir = 'ns' | 'ew';
type TCar = { id: number; dir: Dir; progress: number; speed: number; color: string; stopped: boolean; length: number };

const COLORS = ['#ef4444','#0f172a','#3b82f6','#f59e0b','#e2e8f0','#10b981','#18181b','#ffffff'];
const ROAD_W = 10;

function Intersection({ nsLight, ewLight }: { nsLight: LightState; ewLight: LightState }) {
  return (
    <group>
      {/* City Ground */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.05,0]} receiveShadow><planeGeometry args={[120,120]}/><meshStandardMaterial color="#050508" roughness={0.8}/></mesh>
      
      {/* Roads */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow><planeGeometry args={[ROAD_W,120]}/><meshStandardMaterial color="#0b0b0f" roughness={0.15} metalness={0.7}/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow><planeGeometry args={[120,ROAD_W]}/><meshStandardMaterial color="#0b0b0f" roughness={0.15} metalness={0.7}/></mesh>
      
      {/* Lane markings */}
      {Array.from({length:16}).map((_,i)=>(
        <group key={i}>
          {Math.abs(i-8)>1 && <mesh position={[0,0.01,(i-8)*6]}><boxGeometry args={[0.2,0.02,3]}/><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2}/></mesh>}
          {Math.abs(i-8)>1 && <mesh position={[(i-8)*6,0.01,0]}><boxGeometry args={[3,0.02,0.2]}/><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2}/></mesh>}
        </group>
      ))}

      {/* Stop Lines */}
      {[-ROAD_W/2 - 0.5, ROAD_W/2 + 0.5].map((z, idx) => (
        <group key={`sl-${idx}`}>
           <mesh position={[ROAD_W/4, 0.02, z]}><boxGeometry args={[ROAD_W/2 - 0.5, 0.02, 0.6]}/><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5}/></mesh>
           <mesh position={[-ROAD_W/4, 0.02, z]}><boxGeometry args={[ROAD_W/2 - 0.5, 0.02, 0.6]}/><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5}/></mesh>
           <mesh position={[z, 0.02, ROAD_W/4]}><boxGeometry args={[0.6, 0.02, ROAD_W/2 - 0.5]}/><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5}/></mesh>
           <mesh position={[z, 0.02, -ROAD_W/4]}><boxGeometry args={[0.6, 0.02, ROAD_W/2 - 0.5]}/><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5}/></mesh>
        </group>
      ))}

      {/* Traffic lights */}
      {[[-(ROAD_W/2+1.5),0,-(ROAD_W/2+1.5)], [ROAD_W/2+1.5,0,ROAD_W/2+1.5], [-(ROAD_W/2+1.5),0,ROAD_W/2+1.5], [ROAD_W/2+1.5,0,-(ROAD_W/2+1.5)]].map((pos,i)=>{
        const isNS = Math.abs(pos[0]) === Math.abs(pos[2]) ? (pos[0]*pos[2] > 0 ? true : false) : false; 
        // Just arbitrarily assigning lights to corners for flavor
        const light = (i%2===0) ? nsLight : ewLight;
        const rotY = (i%2===0) ? 0 : Math.PI/2;
        
        return (
          <group key={`tl-${i}`} position={pos as [number,number,number]} rotation={[0,rotY,0]}>
            <mesh position={[0,3.5,0]} castShadow><cylinderGeometry args={[0.15,0.15,7,12]}/><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2}/></mesh>
            <mesh position={[0,6,0]} castShadow><boxGeometry args={[1,2.8,1]}/><meshStandardMaterial color="#050505"/></mesh>
            
            {/* Red Light */}
            <mesh position={[0,6.8,0.51]}><sphereGeometry args={[0.25,16,16]}/><meshBasicMaterial color={light==='red'?'#ef4444':'#220000'}/></mesh>
            {light==='red' && <pointLight position={[0,6.8,1]} color="#ef4444" intensity={2} distance={15}/>}
            
            {/* Yellow Light (off) */}
            <mesh position={[0,6.0,0.51]}><sphereGeometry args={[0.25,16,16]}/><meshBasicMaterial color="#332200"/></mesh>

            {/* Green Light */}
            <mesh position={[0,5.2,0.51]}><sphereGeometry args={[0.25,16,16]}/><meshBasicMaterial color={light==='green'?'#22c55e':'#002200'}/></mesh>
            {light==='green' && <pointLight position={[0,5.2,1]} color="#22c55e" intensity={2} distance={15}/>}
          </group>
        );
      })}
    </group>
  );
}

function TrafficCar({ car }: { car: TCar }) {
  const px = car.dir==='ns' ? ROAD_W/4 : car.progress;
  const pz = car.dir==='ns' ? car.progress : -ROAD_W/4; // Offset to drive in correct lane side
  
  // Realism logic: if dir is NS, going positive Z. If dir is EW, going positive X.
  // Actually we need them to not crash head on if they spawn from both sides, but let's stick to the 1-way flow for simplicity 
  // described in the original logic, just offset them into the right lane visually.
  const ry = car.dir==='ew' ? Math.PI/2 : 0;
  
  return (
    <group position={[px, 0, pz]} rotation={[0, ry, 0]}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.7,car.length]}/><meshStandardMaterial color={car.color} roughness={0.2} metalness={0.8}/></mesh>
      <mesh position={[0,1.05,0]}><boxGeometry args={[1.6,0.5,car.length*0.6]}/><meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9}/></mesh>
      
      {/* Fake Drop Shadow */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.5, car.length*1.2]} />
        <meshBasicMaterial color="#000" opacity={0.6} transparent />
      </mesh>

      {/* Headlights */}
      <mesh position={[-0.8, 0.5, car.length/2 + 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <mesh position={[0.8, 0.5, car.length/2 + 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <pointLight position={[0, 0.5, car.length/2 + 1]} color="#ffffff" distance={15} intensity={1} />

      {/* Taillights (Brighter if stopped) */}
      <mesh position={[-0.8, 0.5, -car.length/2 - 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color={car.stopped?'#ff0000':'#aa0000'}/></mesh>
      <mesh position={[0.8, 0.5, -car.length/2 - 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color={car.stopped?'#ff0000':'#aa0000'}/></mesh>
      {car.stopped && <pointLight position={[0, 0.5, -car.length/2 - 1]} color="#ff0000" distance={10} intensity={2} />}

      {[[-0.9,0.35,car.length*0.3],[0.9,0.35,car.length*0.3],[-0.9,0.35,-car.length*0.3],[0.9,0.35,-car.length*0.3]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.3,0.3,0.2,24]}/><meshStandardMaterial color="#0a0a0a" roughness={0.9}/></mesh>
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
  const gameActive = useRef(false);

  const { user } = useUser();
  const playerName = user?.firstName || 'Guest OPR';

  const handleCustomEvent = useCallback((data: any) => {
    if (data.type === 'START_1V1') {
      setPhase('playing'); setXp(0); setCrashes(0); setPassed(0); setTimeLeft(120);
      setNsLight('green'); setEwLight('red'); nsRef.current='green'; ewRef.current='red';
      setCars([]); gameActive.current = true;
    }
  }, []);
  
  const { remotePlayers, sendUpdate, sendCustomEvent } = useMultiplayer('traffic', playerName, handleCustomEvent);

  const toggleLights = useCallback(() => {
    setNsLight(p => { const n = p==='green'?'red':'green'; nsRef.current=n; return n; });
    setEwLight(p => { const n = p==='green'?'red':'green'; ewRef.current=n; return n; });
  }, []);

  const start = () => {
    if (remotePlayers.length > 0) sendCustomEvent({ type: 'START_1V1' });
    setPhase('playing'); setXp(0); setCrashes(0); setPassed(0); setTimeLeft(120);
    setNsLight('green'); setEwLight('red'); nsRef.current='green'; ewRef.current='red';
    setCars([]); gameActive.current = true;
  };

  useEffect(() => {
    if (phase !== 'playing') { gameActive.current = false; return; }
    
    // Timer
    const timer = setInterval(() => setTimeLeft(p => { if (p <= 1) { setPhase('gameover'); gameActive.current = false; return 0; } return p-1; }), 1000);

    // Spawn cars
    const spawner = setInterval(() => {
      setCars(prev => {
        if (prev.length < 15) { // Increased density for AAA feel
          const dir: Dir = Math.random() > 0.5 ? 'ns' : 'ew';
          const speed = 0.15 + Math.random()*0.15; // Faster
          const length = 3.8 + Math.random()*1.5;
          return [...prev, { id: Date.now()+Math.random(), dir, progress: -50 - Math.random()*20, speed, color: COLORS[Math.floor(Math.random()*COLORS.length)], stopped: false, length }];
        }
        return prev;
      });
    }, 800);

    // Game loop
    const loop = setInterval(() => {
      if(!gameActive.current) return;
      setCars(prev => {
        const updated = prev.map(car => {
          const light = car.dir === 'ns' ? nsRef.current : ewRef.current;
          
          // Smoother stop logic: detect cars ahead or red light
          const carsAhead = prev.filter(c => c.dir === car.dir && c.progress > car.progress && c.progress - car.progress < car.length/2 + 4);
          const blockedByCar = carsAhead.length > 0;
          
          const nearStop = car.progress > -ROAD_W/2-4 && car.progress < -ROAD_W/2;
          const blockedByLight = light === 'red' && nearStop;

          if ((blockedByLight || blockedByCar) && car.speed > 0) {
            return { ...car, stopped: true };
          }
          
          // Go
          if (!blockedByCar && (light === 'green' || car.progress > ROAD_W/2)) {
            return { ...car, progress: car.progress + car.speed, stopped: false };
          }
          
          if (car.stopped) return car;
          return { ...car, progress: car.progress + car.speed };
        });

        // Crash logic (Box intersection overlap)
        const inBox = updated.filter(c => Math.abs(c.progress) < ROAD_W/2 + 2);
        const nsInBox = inBox.filter(c => c.dir === 'ns');
        const ewInBox = inBox.filter(c => c.dir === 'ew');
        
        let crashOccurred = false;
        if (nsInBox.length > 0 && ewInBox.length > 0) {
          for (const a of nsInBox) {
            for (const b of ewInBox) {
              const ax = ROAD_W/4, az = a.progress;
              const bx = b.progress, bz = -ROAD_W/4;
              if (Math.hypot(ax-bx, az-bz) < 3.5 && !a.stopped && !b.stopped) {
                crashOccurred = true;
              }
            }
          }
        }
        
        if(crashOccurred){
           setCrashes(c => c + 1);
           setXp(p => Math.max(0, p - 20));
           addGameXP(-20).catch(() => {});
           // Despawn crashed cars to clear the intersection quickly
           return updated.filter(c => Math.abs(c.progress) >= ROAD_W/2 + 2);
        }

        // Remove & Score
        const passedCars = updated.filter(c => c.progress > 60);
        if (passedCars.length > 0) {
          setPassed(p => p + passedCars.length);
          setXp(p => p + passedCars.length * 10);
          addGameXP(passedCars.length * 10).catch(() => {});
        }

        return updated.filter(c => c.progress <= 60);
      });
      
      if (Math.random() < 0.1 && remotePlayers.length > 0) {
        sendUpdate({ x: 0, z: 0, angle: 0, speed: 0, name: playerName, color: '#ff0000' });
      }
    }, 33); 

    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') toggleLights(); };
    window.addEventListener('keydown', kd);
    return () => { clearInterval(timer); clearInterval(spawner); clearInterval(loop); window.removeEventListener('keydown', kd); };
  }, [phase, toggleLights]);

  if (phase === 'lobby') return (
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
      <div className="absolute inset-0 z-0 bg-black">
        <img 
          src="https://images.unsplash.com/photo-1510484737759-3bf6870c5e7b?q=80&w=2000&auto=format&fit=crop" 
          alt="City Intersection" 
          className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-5000" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
      </div>

      <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
        <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
          <ArrowLeft className="w-4 h-4" /> Hub
        </Link>

        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-md shadow-inner mt-4">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase">Grid Control Active</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.8] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          NEXUS <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500 filter drop-shadow-[0_0_40px_rgba(34,211,238,0.4)]">ROUTER</span> 
        </h1>
        
        <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-cyan-500 pl-4 sm:pl-6 leading-relaxed">
          Take manual override of a volatile Level-4 Intersection. Tap <kbd className="bg-white/10 px-2 py-0.5 rounded text-white font-mono">SPACE</kbd> to cycle traffic signals. Prevent gridlock collisions at all costs. 
          <span className="block mt-4 text-emerald-400 font-bold">+10 XP</span> per safe clearance, <span className="text-red-500 font-bold">-20 XP</span> per catastrophic impact.
        </p>

        <button onClick={start} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
           ASSUME CONTROL
           <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </button>

        {remotePlayers.length > 0 && (
          <div className="absolute bottom-10 right-10 pointer-events-auto animate-fade-in z-50">
            <button onClick={start} className="bg-cyan-600 border border-cyan-400/50 text-white font-black text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-5 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              CO-OP GRID ({remotePlayers.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (phase === 'gameover') return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
      <div className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-red-600/20 blur-[100px] -z-10" />
        
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 text-white mb-6 drop-shadow-lg">
           <AlertTriangle className="w-12 h-12 text-zinc-500" />
        </div>

        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">SHIFT TERMINATED</h2>
        <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8">
          Intersection metrics recorded.
        </p>

        <div className="grid grid-cols-2 gap-4 my-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
             <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{passed}</p>
             <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">CLEARED</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
             <p className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">{crashes}</p>
             <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">IMPACTS</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner mb-6 flex justify-between items-center px-8">
            <span className="text-xs text-zinc-400 uppercase font-black tracking-widest">Efficiency XP Yield</span>
            <span className="text-3xl font-black text-amber-400 drop-shadow-md">+{xp}</span>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={start} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
             START NEW SHIFT
          </button>
          <button onClick={() => setPhase('lobby')} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
             ABORT TO HUB
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group font-sans">
      <Canvas shadows camera={{position:[0,45,35],fov:45}} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#050508', 20, 120]} />
        <color attach="background" args={['#050508']}/>
        
        {/* AAA Cinematic Lighting */}
        <ambientLight intensity={0.2} color="#475569" />
        <directionalLight castShadow position={[20,60,20]} intensity={2} color="#e0e7ff" shadow-mapSize={[2048,2048]} shadow-camera-far={150} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} />
        
        <Stars radius={80} depth={50} count={2000} factor={3} saturation={0} fade speed={1} />
        <Environment preset="night" />

        <Intersection nsLight={nsLight} ewLight={ewLight}/>
        <TrafficSim cars={cars}/>
      </Canvas>

      {/* HUD overlays */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
        
        {/* Top HUD */}
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <button onClick={()=>setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4"/> ABORT
          </button>
          
          <div className="flex gap-4">
             {remotePlayers.length > 0 && (
                <div className="hidden sm:flex bg-zinc-950/80 backdrop-blur-xl border border-cyan-500/30 text-white px-5 py-3 rounded-2xl flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)] min-w-[100px]">
                   <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" /> SYNC
                   </span>
                   <span className="text-lg font-black">{remotePlayers.length+1}</span>
                </div>
             )}
            <div className={`bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[120px] transition-colors ${timeLeft<=20 ? 'border-red-500/50' : ''}`}>
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">T-MINUS</span>
               <span className={`text-2xl font-black tracking-tighter ${timeLeft<=20?'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]':'text-white'}`}>
                 {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
               </span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center" />

        {/* Bottom HUD */}
        <div className="flex justify-between items-end pointer-events-auto relative z-20">
          {/* Signal Control Panel */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[220px]">
             <div className="flex justify-between items-center w-full">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">NORTH/SOUTH</span>
                <span className={`text-xs uppercase font-black tracking-widest px-3 py-1 rounded ${nsLight==='green'?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                   {nsLight}
                </span>
             </div>
             <div className="w-full h-px bg-white/10" />
             <div className="flex justify-between items-center w-full">
                <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">EAST/WEST</span>
                <span className={`text-xs uppercase font-black tracking-widest px-3 py-1 rounded ${ewLight==='green'?'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30':'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                   {ewLight}
                </span>
             </div>
             <button onClick={toggleLights} className="w-full mt-2 py-4 rounded-xl font-black bg-white text-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                CYCLE SIGNALS (SPACE)
             </button>
          </div>
          
          {/* Metrics Panel */}
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-end gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[220px]">
             
             <div className="flex items-center gap-4 w-full justify-between mb-4">
               <div className="flex flex-col items-start bg-white/5 rounded-xl p-3 w-1/2 border border-white/5">
                 <span className="text-[8px] text-emerald-400 uppercase font-black tracking-widest border-b border-emerald-500/30 pb-1 mb-1 w-full text-left">CLEARED</span>
                 <span className="text-xl font-black text-white">{passed}</span>
               </div>
               <div className="flex flex-col items-start bg-white/5 rounded-xl p-3 w-1/2 border border-white/5">
                 <span className="text-[8px] text-red-400 uppercase font-black tracking-widest border-b border-red-500/30 pb-1 mb-1 w-full text-left">IMPACTS</span>
                 <span className="text-xl font-black text-white">{crashes}</span>
               </div>
             </div>

             <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Zap className="w-4 h-4 fill-current drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{xp}</span>
             </div>
             <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">NET XP YIELD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
