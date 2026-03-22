'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Heart, ShieldAlert, ChevronRight } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const LANE_X = [-4, 0, 4];

// AAA sci-fi/racing colors
const COLORS = [
  '#ef4444', '#0f172a', '#3b82f6', '#f59e0b', '#e2e8f0', '#10b981', '#18181b', '#ffffff'
];

type Obstacle = { id: number; lane: number; z: number; color: string; len: number };

function Highway() {
  return (
    <group>
      {/* Main road - wet asphalt */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,-200]} receiveShadow>
        <planeGeometry args={[16,600]}/>
        <meshStandardMaterial color="#050508" roughness={0.15} metalness={0.8}/>
      </mesh>
      
      {/* Glowing Lane dividers */}
      {[-2,2].map((x,xi)=>Array.from({length:40}).map((_,i)=>(
        <mesh key={`${xi}-${i}`} position={[x,0.01,-i*8+100]}>
          <boxGeometry args={[0.15,0.02,4]}/>
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2}/>
        </mesh>
      )))}
      
      {/* Concrete Cyberpunk barriers */}
      {[-8.5,8.5].map((x,i)=>(
        <group key={`b-${i}`} position={[x,0.5,-200]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1,1.5,600]}/>
            <meshStandardMaterial color="#1a1a24" roughness={0.9}/>
          </mesh>
          {/* Barrier neon trim */}
          <mesh position={[x>0?-0.52:0.52, 0.4, 0]}>
             <boxGeometry args={[0.05, 0.1, 600]}/>
             <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      ))}
      
      {/* Grass/Dirt surrounding (dark void) */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[-20,-0.02,-200]} receiveShadow><planeGeometry args={[20,600]}/><meshStandardMaterial color="#000"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[20,-0.02,-200]} receiveShadow><planeGeometry args={[20,600]}/><meshStandardMaterial color="#000"/></mesh>
    </group>
  );
}

function ObstacleCar({ o }: { o: Obstacle }) {
  return (
    <group position={[LANE_X[o.lane], 0, o.z]}>
      {/* Chassis */}
      <mesh position={[0,0.5,0]} castShadow>
        <boxGeometry args={[2.2,0.8,o.len]}/>
        <meshStandardMaterial color={o.color} roughness={0.2} metalness={0.8}/>
      </mesh>
      {/* Glass */}
      <mesh position={[0,1.1,0]}>
        <boxGeometry args={[1.6,0.55,o.len*0.6]}/>
        <meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9}/>
      </mesh>
      {/* Taillights */}
      <mesh position={[-0.8, 0.5, o.len/2 + 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
      <mesh position={[0.8, 0.5, o.len/2 + 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
      <pointLight position={[0,0.5,o.len/2 + 0.5]} color="#ff0000" distance={10} intensity={2} />
      
      {/* Headlights */}
      <mesh position={[-0.8, 0.5, -o.len/2 - 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <mesh position={[0.8, 0.5, -o.len/2 - 0.05]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <pointLight position={[0,0.5, -o.len/2 - 0.5]} color="#ffffff" distance={20} intensity={2} decay={1.5} />
      
      {/* Wheels */}
      {[[-1.1,0.35,o.len*0.3], [1.1,0.35,o.len*0.3], [-1.1,0.35,-o.len*0.3], [1.1,0.35,-o.len*0.3]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}>
          <cylinderGeometry args={[0.35,0.35,0.25,24]}/>
          <meshStandardMaterial color="#0a0a0a" roughness={0.9}/>
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, o.len+1]} /><meshBasicMaterial color="#000" opacity={0.6} transparent /></mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(()=>{if(ref.current) ref.current.position.lerp(new THREE.Vector3(data.x,0,data.z),0.3)});
  return (
    <group ref={ref}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4]}/><meshStandardMaterial color={data.color||'#3b82f6'} roughness={0.2} metalness={0.8}/></mesh>
      <mesh position={[0,1.1,0]}><boxGeometry args={[1.6,0.5,2]}/><meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9} /></mesh>
    </group>
  );
}

function GameScene({ onCrash, onTick, remotePlayers, sendUpdate, playerName, active }:
  { onCrash:()=>void; onTick:()=>void; remotePlayers:PlayerState[]; sendUpdate:any; playerName:string; active:boolean }) {
  const { camera } = useThree();
  const playerRef = useRef<THREE.Group>(null);
  const lane = useRef(1);
  const posX = useRef(0);
  const inv = useRef(false);
  const keys = useRef<Record<string,boolean>>({});
  const lastSw = useRef(0);
  const tickT = useRef(0);
  const color = useRef(`hsl(${Math.floor(Math.random()*360)},70%,55%)`);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const scrollSpeed = useRef(0.5); // Faster base speed
  const spawnTimer = useRef(0);

  useEffect(()=>{
    lane.current=1; posX.current=0; scrollSpeed.current=0.6;
    setObstacles([]);
    const kd=(e:KeyboardEvent)=>{keys.current[e.code]=true}; const ku=(e:KeyboardEvent)=>{keys.current[e.code]=false};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    return ()=>{window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku)};
  },[active]);

  useFrame((_,delta)=>{
    if(!active) return;
    const now = Date.now();
    let gpX=0; const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=gps[0];
    if(gp){if(Math.abs(gp.axes[0])>0.3)gpX=gp.axes[0]; if(gp.buttons[14]?.pressed)gpX=-1; if(gp.buttons[15]?.pressed)gpX=1;}

    if(now-lastSw.current>150){ // Faster lane switching
      if(keys.current['KeyA']||keys.current['ArrowLeft']||gpX<-0.3){lane.current=Math.max(0,lane.current-1);lastSw.current=now;}
      if(keys.current['KeyD']||keys.current['ArrowRight']||gpX>0.3){lane.current=Math.min(2,lane.current+1);lastSw.current=now;}
    }

    posX.current+=(LANE_X[lane.current]-posX.current)*0.25;

    // Scroll speed increases aggressively
    scrollSpeed.current=Math.min(2.5, scrollSpeed.current+delta*0.015);

    // Move obstacles toward player 
    setObstacles(prev=>{
      let updated = prev.map(o=>({...o, z:o.z+scrollSpeed.current*60*delta})).filter(o=>o.z<30);
      
      spawnTimer.current+=delta;
      // Spawn logic based on speed to keep density high
      const spawnRate = Math.max(0.2, 0.6 - scrollSpeed.current*0.1); 
      if(spawnTimer.current>spawnRate){
        spawnTimer.current=0;
        const occupiedLanes = updated.filter(o=>o.z<-30&&o.z>-50).map(o=>o.lane);
        const freeLanes = [0,1,2].filter(l=>!occupiedLanes.includes(l));
        if(freeLanes.length>0){
          const l = freeLanes[Math.floor(Math.random()*freeLanes.length)];
          updated.push({id:Date.now()+Math.random(),lane:l,z:-80-Math.random()*20,color:COLORS[Math.floor(Math.random()*COLORS.length)],len:3+Math.random()*3});
        }
        if(Math.random()>0.4 && freeLanes.length>1){
          const l2 = freeLanes.filter(l=>l!==updated[updated.length-1]?.lane)[0];
          if(l2!==undefined) updated.push({id:Date.now()+0.5+Math.random(),lane:l2,z:-90-Math.random()*10,color:COLORS[Math.floor(Math.random()*COLORS.length)],len:3+Math.random()*2});
        }
      }
      return updated;
    });

    // Collision Check
    if(!inv.current){
      for(const o of obstacles){
        if(Math.abs(LANE_X[o.lane]-posX.current)<1.8 && Math.abs(o.z)<o.len*0.5+2.2){
          inv.current=true; scrollSpeed.current *= 0.5; onCrash(); setTimeout(()=>{inv.current=false},1500); break;
        }
      }
    }

    tickT.current+=delta; if(tickT.current>2){tickT.current=0;onTick();}

    if(playerRef.current) playerRef.current.position.x=posX.current;
    if(Math.random()<0.3) sendUpdate({x:posX.current,z:0,angle:0,speed:scrollSpeed.current,name:playerName,color:color.current});
    
    // Dynamic Hyper-realistic Camera tracking
    // Speed adds FOV and pushes camera back slightly, shaking if invincible
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    perspectiveCamera.fov = THREE.MathUtils.lerp(perspectiveCamera.fov, 60 + scrollSpeed.current*15, 0.1);
    perspectiveCamera.updateProjectionMatrix();

    let shakeX = 0; let shakeY = 0;
    if (inv.current) { shakeX = (Math.random()-0.5)*1.5; shakeY = (Math.random()-0.5)*1.5; }
    
    const camTarget = new THREE.Vector3(posX.current*0.6 + shakeX, 6 + shakeY - scrollSpeed.current*0.5, 12 + scrollSpeed.current*2 + shakeY);
    camera.position.lerp(camTarget,0.1); 
    
    const lookTarget = new THREE.Vector3(posX.current*0.4, 0, -20);
    const currLook = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currLook.lerp(lookTarget, 0.1);
    camera.lookAt(currLook);
  });

  return (
    <>
      <Highway/>
      {obstacles.map(o=><ObstacleCar key={o.id} o={o}/>)}
      
      <group ref={playerRef}>
        <mesh position={[0,0.5,0]} castShadow>
          <boxGeometry args={[2,0.8,4.2]}/>
          <meshStandardMaterial color={color.current} roughness={0.2} metalness={0.8} emissive={inv.current?'#ff0':'#000'} emissiveIntensity={inv.current?1.0:0}/>
        </mesh>
        <mesh position={[0,1.1,-0.2]}>
          <boxGeometry args={[1.6,0.6,2]}/>
          <meshStandardMaterial color="#000" transparent opacity={0.9} roughness={0} metalness={1}/>
        </mesh>
        
        <mesh position={[-0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
        <mesh position={[0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
        <pointLight position={[0,0.5,2.5]} color="#ff0000" distance={10} intensity={2} />
        
        <mesh position={[-0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
        <mesh position={[0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
        <pointLight position={[0,1,-2.5]} color="#ffffff" distance={40} intensity={3} decay={1.5} />
        
        {/* Fake Shadow */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.5, 5]} /><meshBasicMaterial color="#000" opacity={0.6} transparent /></mesh>
      </group>
      
      {remotePlayers.map(p=><RemotePlayer key={p.id} data={p}/>)}
    </>
  );
}

export default function HighwayRacer() {
  const [phase,setPhase]=useState<'lobby'|'playing'|'gameover'>('lobby');
  const [lives,setLives]=useState(3);
  const [xp,setXp]=useState(0);
  const [dist,setDist]=useState(0);
  const {user}=useUser(); const name=user?.firstName||'Guest OPR';

  const handleCustomEvent = useCallback((data: any) => {
    if (data.type === 'START_1V1') {
      setPhase('playing');setLives(3);setXp(0);setDist(0);
    }
  }, []);
  const {remotePlayers,sendUpdate,sendCustomEvent}=useMultiplayer('highway',name,handleCustomEvent);

  const start=()=>{
    if (remotePlayers.length > 0) sendCustomEvent({ type: 'START_1V1' });
    setPhase('playing');setLives(3);setXp(0);setDist(0);
  };
  const crash=useCallback(async()=>{setLives(p=>{const n=p-1;if(n<=0)setPhase('gameover');return n}); setXp(p=>Math.max(0,p-15)); try{await addGameXP(-15)}catch{}},[]);
  const tick=useCallback(async()=>{setDist(p=>p+1);setXp(p=>p+5);try{await addGameXP(5)}catch{}},[]);

  if(phase==='lobby') return (
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
      <div className="absolute inset-0 z-0 bg-black">
        <img 
          src="https://images.unsplash.com/photo-1463620695885-b1a8f906e00c?q=80&w=2000&auto=format&fit=crop" 
          alt="Highway Simulation" 
          className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-10000" />
      </div>

      <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
        <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
          <ArrowLeft className="w-4 h-4" /> Hub 
        </Link>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-rose-500/10 border border-rose-500/20 backdrop-blur-md shadow-inner mt-4">
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-[ping_1.5s_infinite] shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
          <span className="text-[10px] font-black tracking-widest text-rose-300 uppercase">Velocity Engine Online</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.8] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          APEX <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-pink-500 filter drop-shadow-[0_0_40px_rgba(225,29,72,0.4)]">HIGHWAY</span> 
        </h1>
        
        <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-rose-500 pl-4 sm:pl-6 leading-relaxed">
          Maintain terminal velocity in a dense 3-lane matrix. Dodge aggressive volumetric traffic flows. <span className="text-emerald-400 font-black">+5 XP/2s</span> survival rate. <span className="text-red-500 font-bold">-15 XP</span> per collision.
          <strong className="text-indigo-400 flex items-center mt-4 text-xs tracking-widest uppercase"><Zap className="w-3 h-3 justify-center mr-2"/> SYNC MULTIPLAYER ENABLED</strong>
        </p>

        <button onClick={start} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
           ACCELERATE SOLO
           <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </button>

        {remotePlayers.length > 0 && (
          <div className="absolute bottom-10 right-10 pointer-events-auto animate-fade-in z-50">
            <button onClick={start} className="bg-rose-600 border border-rose-400/50 text-white font-black text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-5 rounded-2xl shadow-[0_0_40px_rgba(225,29,72,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              PVP INSTANCE ({remotePlayers.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if(phase==='gameover') return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
      <div className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-red-600/20 blur-[100px] -z-10" />
        
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 mb-6 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
           <ShieldAlert className="w-12 h-12" />
        </div>

        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">SYSTEM WRECKED</h2>
        <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8 text-balance">
          Catastrophic chassis failure. You survived {dist} operational cycles.
        </p>

        <div className="grid grid-cols-2 gap-4 my-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">+{xp}</p>
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">TOTAL XP</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-t from-rose-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            <p className="text-5xl font-black text-white drop-shadow-md">{dist}</p>
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mt-2">CYCLES PASSED</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={start} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
             DEPLOY AGAIN
          </button>
          <Link href="/dashboard/games" className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors block text-center">
             ABORT TO HUB
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group font-sans">
      <Canvas shadows camera={{position:[0,8,14],fov:60}} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#050508', 20, 150]} />
        <color attach="background" args={['#050508']}/>
        
        {/* Moody Cinematic lighting */}
        <ambientLight intensity={0.4} color="#312e81" />
        <directionalLight castShadow position={[40,50,0]} intensity={2} color="#818cf8" shadow-mapSize={[2048,2048]} shadow-camera-far={200} />
        <pointLight position={[0,10,0]} color="#f43f5e" intensity={2} distance={100} />
        
        <Stars radius={100} depth={100} count={5000} factor={6} saturation={0} fade speed={2} />
        <Environment preset="night" />
        
        <GameScene onCrash={crash} onTick={tick} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={name} active={phase==='playing'}/>
      </Canvas>

      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.7)]" />
        
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <button onClick={()=>setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4"/>ABORT
          </button>
          
          <div className="hidden sm:flex bg-zinc-950/80 backdrop-blur-xl border border-indigo-500/30 text-white px-5 py-3 rounded-2xl flex-col items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)] min-w-[120px]">
             <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> SYNC
             </span>
             <span className="text-lg font-black">{remotePlayers.length+1} OPR</span>
          </div>
        </div>
        
        <div className="flex-1"/>
        
        <div className="flex justify-between items-end pointer-events-auto relative z-20">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-start gap-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[200px]">
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 w-full text-center mb-1">PLATING</span>
            <div className="flex justify-center gap-2 w-full">
              {Array.from({length:3}).map((_,i)=>(<Heart key={i} className={`w-8 h-8 ${i<lives?'text-red-500 fill-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]':'text-zinc-800'}`}/>))}
            </div>
          </div>
          
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-end gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[200px]">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <Zap className="w-4 h-4 fill-current animate-pulse" />
              <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400/70">YIELD XP</span>
            </div>
            <div className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{xp}</div>
            
            <div className="mt-2 text-[10px] font-black tracking-widest px-3 py-1.5 rounded bg-white/10 text-zinc-300 uppercase border border-white/10 w-full text-right">
               CYCLES: {dist}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
