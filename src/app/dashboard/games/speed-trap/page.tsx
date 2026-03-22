'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, Gauge, Crosshair, ChevronRight } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const MAX_SPEED = 0.6;
const ACCEL = 0.005;
const BRAKE_FORCE = 0.015;
const FRICTION = 0.995;
const STEER_SPEED = 0.05;

type SpeedZone = { z: number; limit: number; passed: boolean };
type RoadObstacle = { z: number; x: number; type: 'cone' | 'barrier' | 'parked_car' };

function generateZones(count: number): SpeedZone[] {
  const zones: SpeedZone[] = [];
  const limits = [30, 40, 50, 60, 80];
  for (let i = 0; i < count; i++) {
    zones.push({ z: -(i + 1) * 60, limit: limits[Math.floor(Math.random() * limits.length)], passed: false });
  }
  return zones;
}

function generateObstacles(zones: SpeedZone[]): RoadObstacle[] {
  const obs: RoadObstacle[] = [];
  for (const zone of zones) {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const types: RoadObstacle['type'][] = ['cone', 'barrier', 'parked_car'];
      obs.push({
        z: zone.z + 10 + Math.random() * 40,
        x: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3),
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
  }
  return obs;
}

function Road() {
  return (
    <group>
      {/* Wet Asphalt */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,-400]} receiveShadow><planeGeometry args={[16,1000]}/><meshStandardMaterial color="#050508" roughness={0.15} metalness={0.8}/></mesh>
      
      {/* Concrete Walls */}
      {[-8.5,8.5].map((x,i)=>(
        <mesh key={i} position={[x,0.4,-400]} castShadow receiveShadow>
          <boxGeometry args={[0.6,0.8,1000]}/>
          <meshStandardMaterial color="#1a1a24" roughness={0.9}/>
        </mesh>
      ))}
      
      {/* Striped Lane Dividers */}
      {Array.from({length:120}).map((_,i)=>(
        <mesh key={`m-${i}`} position={[0,0.01,-i*8]}>
          <boxGeometry args={[0.2,0.02,4]}/>
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2}/>
        </mesh>
      ))}
      
      {/* Off-road Void */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[-20,-0.02,-400]} receiveShadow><planeGeometry args={[20,1000]}/><meshStandardMaterial color="#000"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[20,-0.02,-400]} receiveShadow><planeGeometry args={[20,1000]}/><meshStandardMaterial color="#000"/></mesh>
    </group>
  );
}

function SpeedSign({ zone }: { zone: SpeedZone }) {
  return (
    <group position={[-9, 0, zone.z]}>
      <mesh position={[0,2.5,0]} castShadow><cylinderGeometry args={[0.1,0.1,5,8]}/><meshStandardMaterial color="#111" metalness={0.8} roughness={0.2}/></mesh>
      <mesh position={[0,4.5,0]} castShadow><boxGeometry args={[3,3,0.3]}/><meshStandardMaterial color={zone.passed?'#064e3b':'#fff'} emissive={zone.passed?'#10b981':'#000'} emissiveIntensity={zone.passed?0.5:0}/></mesh>
      <mesh position={[0,4.5,0.16]}><ringGeometry args={[1.1,1.3,32]}/><meshBasicMaterial color={zone.passed?'#34d399':'#ef4444'}/></mesh>
      {/* Speed Text (approximated with a block for purely 3D primitives, but could use Text from drei if added) */}
      <mesh position={[0,4.5,0.16]}><circleGeometry args={[1.0,32]}/><meshBasicMaterial color="#fff" /></mesh>
      {/* Flash module */}
      {zone.passed && <pointLight position={[0,4.5,1]} color="#ffffff" distance={50} intensity={5} decay={2} />}
    </group>
  );
}

function Obstacle({ obs }: { obs: RoadObstacle }) {
  if (obs.type === 'cone') return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[0,0.4,0]} castShadow><coneGeometry args={[0.25,0.8,16]}/><meshStandardMaterial color="#f97316" roughness={0.5}/></mesh>
      <mesh position={[0,0.02,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[0.4,16]}/><meshStandardMaterial color="#ea580c"/></mesh>
      <mesh position={[0,0.6,0]}><cylinderGeometry args={[0.15,0.18,0.15,16]}/><meshBasicMaterial color="#fff"/></mesh>
    </group>
  );
  if (obs.type === 'barrier') return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[-0.4,0.4,0]} castShadow><cylinderGeometry args={[0.08,0.08,0.8,8]}/><meshStandardMaterial color="#333" metalness={0.8}/></mesh>
      <mesh position={[0.4,0.4,0]} castShadow><cylinderGeometry args={[0.08,0.08,0.8,8]}/><meshStandardMaterial color="#333" metalness={0.8}/></mesh>
      <mesh position={[0,0.6,0]} castShadow><boxGeometry args={[1.2,0.2,0.1]}/><meshStandardMaterial color="#ef4444"/></mesh>
      <mesh position={[0,0.4,0]} castShadow><boxGeometry args={[1.2,0.2,0.1]}/><meshStandardMaterial color="#fff"/></mesh>
    </group>
  );
  // parked_car
  return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.7,4.5]}/><meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.8}/></mesh>
      <mesh position={[0,1.05,0]}><boxGeometry args={[1.6,0.5,2.2]}/><meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9}/></mesh>
      <mesh position={[0,0.05,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.5,5]}/><meshBasicMaterial color="#000" opacity={0.8} transparent/></mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) { ref.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3); ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, data.angle, 0.3); } });
  return (
    <group ref={ref}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4]}/><meshStandardMaterial color={data.color||'#3b82f6'} roughness={0.2} metalness={0.8}/></mesh>
      <mesh position={[0,1.1,0]}><boxGeometry args={[1.6,0.5,2]}/><meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9}/></mesh>
    </group>
  );
}

function PlayerCar({ zones, obstacles, onZonePass, onObstacleHit, remotePlayers, sendUpdate, playerName, active }:
  { zones: React.MutableRefObject<SpeedZone[]>; obstacles: RoadObstacle[]; onZonePass:(ok:boolean)=>void; onObstacleHit:()=>void; remotePlayers:PlayerState[]; sendUpdate:any; playerName:string; active:boolean }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const speed = useRef(0);
  const posX = useRef(0);
  const posZ = useRef(0);
  const angle = useRef(0);
  const keys = useRef<Record<string,boolean>>({});
  const color = useRef(`hsl(${Math.floor(Math.random()*360)},70%,55%)`);
  const inv = useRef(false);
  const hitObs = useRef(new Set<number>());
  const flashAlpha = useRef(0); // For camera flash effect

  useEffect(() => {
    speed.current=0; posX.current=0; posZ.current=0; angle.current=0; hitObs.current=new Set();
    const kd=(e:KeyboardEvent)=>{keys.current[e.code]=true}; const ku=(e:KeyboardEvent)=>{keys.current[e.code]=false};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    return ()=>{window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku)};
  },[]);

  useFrame((_, delta)=>{
    if(!active) return;
    let gpX=0, gpY=0; const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=gps[0];
    if(gp){ if(Math.abs(gp.axes[0])>0.15) gpX=gp.axes[0]; if(gp.buttons[7]?.pressed) gpY=-1; else if(gp.buttons[6]?.pressed) gpY=1; else if(Math.abs(gp.axes[1])>0.15) gpY=gp.axes[1]; }

    const fwd=keys.current['KeyW']||keys.current['ArrowUp']||gpY<-0.2;
    const brk=keys.current['KeyS']||keys.current['ArrowDown']||keys.current['Space']||gpY>0.2;
    const lft=keys.current['KeyA']||keys.current['ArrowLeft']||gpX<-0.2;
    const rgt=keys.current['KeyD']||keys.current['ArrowRight']||gpX>0.2;

    if(fwd) speed.current+=ACCEL; else speed.current*=FRICTION;
    if(brk) speed.current-=BRAKE_FORCE;
    speed.current=THREE.MathUtils.clamp(speed.current,0,MAX_SPEED);
    if(speed.current<0.001) speed.current=0;

    if(Math.abs(speed.current)>0.005){
      let sa=0;
      if(lft) sa=STEER_SPEED; if(rgt) sa=-STEER_SPEED; if(gpX!==0) sa=-gpX*STEER_SPEED;
      angle.current+=sa*0.8;
    }

    posX.current+=Math.sin(angle.current)*speed.current;
    posZ.current-=Math.cos(angle.current)*speed.current;

    posX.current=THREE.MathUtils.clamp(posX.current,-6,6);

    const kmh = speed.current * 250;
    for (const zone of zones.current) {
      if (!zone.passed && posZ.current < zone.z + 2 && posZ.current > zone.z - 4) {
        zone.passed = true;
        flashAlpha.current = 1.0; // Flash effect!
        onZonePass(kmh <= zone.limit + 5);
      }
    }

    if (!inv.current) {
      for (let i = 0; i < obstacles.length; i++) {
        if (hitObs.current.has(i)) continue;
        const o = obstacles[i];
        if (Math.abs(posX.current - o.x) < 1.8 && Math.abs(posZ.current - o.z) < 2.8) {
          hitObs.current.add(i);
          inv.current = true;
          onObstacleHit();
          speed.current *= 0.3;
          setTimeout(() => { inv.current = false; }, 1500);
          break;
        }
      }
    }

    if(ref.current){ref.current.position.set(posX.current,0,posZ.current); ref.current.rotation.y=angle.current;}
    if(Math.random()<0.3) sendUpdate({x:posX.current,z:posZ.current,angle:angle.current,speed:speed.current,name:playerName,color:color.current});

    // AAA Dynamic Camera
    camera.fov = THREE.MathUtils.lerp(camera.fov, 60 + speed.current*30, 0.1);
    camera.updateProjectionMatrix();

    let shakeX = 0; let shakeY = 0;
    if(inv.current){ shakeX = (Math.random()-0.5)*1.0; shakeY = (Math.random()-0.5)*1.0; }

    const camTarget = new THREE.Vector3(posX.current-Math.sin(angle.current)*10 + shakeX, 5 - speed.current*2 + shakeY, posZ.current+Math.cos(angle.current)*10+3);
    camera.position.lerp(camTarget,0.1);
    
    const lookTarget = new THREE.Vector3(posX.current, 0, posZ.current-10);
    const currLook = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currLook.lerp(lookTarget, 0.15);
    camera.lookAt(currLook);

    // Flash decay
    if (flashAlpha.current > 0) flashAlpha.current -= delta * 2;
  });

  return (
    <>
      {flashAlpha.current > 0 && (
         <mesh position={[0,0,-15]} scale={[100,100,1]}>
           <planeGeometry />
           <meshBasicMaterial color="#ffffff" transparent opacity={flashAlpha.current} />
         </mesh>
      )}
      <group ref={ref}>
        <mesh position={[0,0.5,0]} castShadow>
          <boxGeometry args={[2,0.8,4.5]}/>
          <meshStandardMaterial color={color.current} roughness={0.2} metalness={0.8} emissive={inv.current?'#f00':'#000'} emissiveIntensity={inv.current?1.0:0}/>
        </mesh>
        <mesh position={[0,1.1,-0.2]}>
          <boxGeometry args={[1.6,0.6,2.2]}/>
          <meshStandardMaterial color="#000" metalness={1} roughness={0} transparent opacity={0.9}/>
        </mesh>
        
        {/* Taillights */}
        <mesh position={[-0.8,0.5,2.25]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
        <mesh position={[0.8,0.5,2.25]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
        <pointLight position={[0,0.5,3.5]} color="#ff0000" distance={15} intensity={2} />
        
        {/* Headlights */}
        <mesh position={[-0.8,0.5,-2.25]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
        <mesh position={[0.8,0.5,-2.25]}><boxGeometry args={[0.4,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
        <pointLight position={[0,1,-3.5]} color="#ffffff" distance={40} intensity={3} decay={1.5} />
        
        {/* Fake Shadow */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.5, 5]} /><meshBasicMaterial color="#000" opacity={0.6} transparent /></mesh>
      </group>
    </>
  );
}

export default function SpeedTrap() {
  const [phase,setPhase]=useState<'lobby'|'playing'|'gameover'>('lobby');
  const [xp,setXp]=useState(0);
  const [zonesPassed,setZonesPassed]=useState(0);
  const [violations,setViolations]=useState(0);
  const [obstacleHits,setObstacleHits]=useState(0);
  const [currentLimit,setCurrentLimit]=useState(50);
  const zonesRef=useRef<SpeedZone[]>([]);
  const [roadObstacles,setRoadObstacles]=useState<RoadObstacle[]>([]);

  const {user}=useUser(); const name=user?.firstName||'Guest OPR';
  const handleCustomEvent = (data: any) => {
    if (data.type === 'START_1V1') {
      zonesRef.current = data.payload.zones;
      setRoadObstacles(data.payload.obstacles);
      setCurrentLimit(data.payload.zones[0]?.limit||50);
      setPhase('playing'); setXp(0); setZonesPassed(0); setViolations(0); setObstacleHits(0);
    }
  };
  const {remotePlayers,sendUpdate,sendCustomEvent}=useMultiplayer('speedtrap',name,handleCustomEvent);

  useEffect(()=>{
    if(phase!=='playing') return;
    const iv=setInterval(()=>{
      const upcoming=zonesRef.current.filter(z=>!z.passed).sort((a,b)=>b.z-a.z);
      if(upcoming.length>0) setCurrentLimit(upcoming[0].limit);
      if(zonesRef.current.every(z=>z.passed)) setTimeout(()=>setPhase('gameover'), 2000);
    },200);
    return ()=>clearInterval(iv);
  },[phase]);

  const start=()=>{
    setPhase('playing'); setXp(0); setZonesPassed(0); setViolations(0); setObstacleHits(0);
    const z=generateZones(15);
    const obs=generateObstacles(z);
    zonesRef.current=z;
    setRoadObstacles(obs);
    setCurrentLimit(z[0]?.limit||50);
    sendCustomEvent({ type: 'START_1V1', payload: { zones: z, obstacles: obs } });
  };

  const handleZonePass=async(ok:boolean)=>{
    setZonesPassed(p=>p+1);
    if(ok){setXp(p=>p+15);try{await addGameXP(15)}catch{}}
    else{setViolations(p=>p+1);setXp(p=>Math.max(0,p-10));try{await addGameXP(-10)}catch{}}
  };

  const handleObstacleHit=async()=>{
    setObstacleHits(p=>p+1); setXp(p=>Math.max(0,p-5)); try{await addGameXP(-5)}catch{}
  };

  if(phase==='lobby') return (
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
      <div className="absolute inset-0 z-0 bg-black">
        <img 
          src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2000&auto=format&fit=crop" 
          alt="Desert Highway" 
          className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000 grayscale-[30%]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-5000" />
      </div>

      <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
        <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
          <ArrowLeft className="w-4 h-4" /> Hub 
        </Link>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-sky-500/10 border border-sky-500/20 backdrop-blur-md shadow-inner mt-4">
          <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-[ping_1.5s_infinite] shadow-[0_0_8px_rgba(14,165,233,0.8)]" />
          <span className="text-[10px] font-black tracking-widest text-sky-300 uppercase">Enforcement Protocol Live</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.8] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          SPEED <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-500 filter drop-shadow-[0_0_40px_rgba(14,165,233,0.4)]">PROXY</span> 
        </h1>
        
        <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-sky-500 pl-4 sm:pl-6 leading-relaxed">
          Traverse 15 dynamic enforcement zones. Maintain precise telemetry to evade radar traps while avoiding volumetric obstacles. <span className="text-emerald-400 font-bold">+15 XP</span> per clean zone, <span className="text-red-500 font-bold">-10 XP</span> for violations.
          <strong className="text-indigo-400 flex items-center mt-4 text-xs tracking-widest uppercase"><Crosshair className="w-3 h-3 justify-center mr-2"/> SYNC MULTIPLAYER CAPABLE</strong>
        </p>

        <button onClick={start} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
           INITIATE RUN
           <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
        </button>

        {remotePlayers.length > 0 && (
          <div className="absolute bottom-10 right-10 pointer-events-auto animate-fade-in z-50">
            <button onClick={start} className="bg-sky-600 border border-sky-400/50 text-white font-black text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-5 rounded-2xl shadow-[0_0_40px_rgba(14,165,233,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              PVP CHASE ({remotePlayers.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if(phase==='gameover') return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
      <div className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
        <div className={`absolute top-0 right-1/4 w-[300px] h-[300px] ${violations===0&&obstacleHits===0?'bg-emerald-600/20':'bg-sky-600/20'} blur-[100px] -z-10`} />
        
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${violations===0&&obstacleHits===0?'bg-emerald-500/10 border-emerald-500/20 text-emerald-500':'bg-sky-500/10 border-sky-500/20 text-sky-500'} mb-6 drop-shadow-lg`}>
           <Gauge className="w-12 h-12" />
        </div>

        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{violations===0&&obstacleHits===0?'FLAWLESS RUN':'ROUTE COMPLETE'}</h2>
        <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8">
          Telemetry Data Extracted.
        </p>

        <div className="grid grid-cols-3 gap-3 my-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <p className="text-2xl font-black text-emerald-400">{zonesPassed-violations}</p>
            <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">CLEAN</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <p className="text-2xl font-black text-red-500">{violations}</p>
            <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">VIOLATIONS</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <p className="text-2xl font-black text-amber-500">{obstacleHits}</p>
            <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">IMPACTS</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner mb-6 flex justify-between items-center px-8">
            <span className="text-xs text-zinc-400 uppercase font-black tracking-widest">NET XP YIELD</span>
            <span className="text-3xl font-black text-amber-400 drop-shadow-md">+{xp}</span>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={start} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
             NEW RUN PROTOCOL
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
      <Canvas shadows camera={{position:[0,6,12],fov:60}} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#080a10', 20, 200]} />
        <color attach="background" args={['#080a10']}/>
        
        {/* AAA Cinematic Lighting */}
        <ambientLight intensity={0.2} color="#475569" />
        <directionalLight castShadow position={[20,40,-20]} intensity={1.5} color="#e0e7ff" shadow-mapSize={[2048,2048]} shadow-camera-far={200} />
        <pointLight position={[0,10,0]} color="#38bdf8" intensity={2} distance={100} />
        
        <Sparkles scale={150} size={1} color="#cbd5e1" radius={80} depth={100} count={3000} factor={4} saturation={0} fade speed={2} />
        <Environment preset="night" />

        <Road/>
        {zonesRef.current.map((z,i)=><SpeedSign key={i} zone={z}/>)}
        {roadObstacles.map((o,i)=><Obstacle key={i} obs={o}/>)}
        <PlayerCar zones={zonesRef} obstacles={roadObstacles} onZonePass={handleZonePass} onObstacleHit={handleObstacleHit} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={name} active={phase==='playing'}/>
        {remotePlayers.map(p=><RemotePlayer key={p.id} data={p}/>)}
      </Canvas>

      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
        
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <button onClick={()=>setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4"/> ABORT
          </button>
          <div className="flex gap-4">
             {remotePlayers.length > 0 && (
                <div className="hidden sm:flex bg-zinc-950/80 backdrop-blur-xl border border-emerald-500/30 text-white px-5 py-3 rounded-2xl flex-col items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] min-w-[100px]">
                   <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYNC
                   </span>
                   <span className="text-lg font-black">{remotePlayers.length+1}</span>
                </div>
             )}
            <div className={`bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[140px]`}>
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">ENFORCED LIMIT</span>
               <span className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                 {currentLimit}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1"/>
        
        <div className="flex justify-between items-end pointer-events-auto relative z-20">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[220px]">
            <div className="flex justify-between w-full items-center">
               <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">ZONES PASSED</span>
               <span className="text-lg font-black text-white">{zonesPassed}/{zonesRef.current.length}</span>
            </div>
            <div className="w-full h-px bg-white/10" />
            <div className="flex justify-between w-full items-center">
               <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">VIOLATIONS</span>
               <span className={`text-sm font-black ${violations>0?'text-red-500':'text-emerald-500'}`}>{violations}</span>
            </div>
            <div className="flex justify-between w-full items-center">
               <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">IMPACTS</span>
               <span className={`text-sm font-black ${obstacleHits>0?'text-amber-500':'text-emerald-500'}`}>{obstacleHits}</span>
            </div>
          </div>
          
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-end gap-2 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[220px]">
             <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Zap className="w-4 h-4 fill-current drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">{xp}</span>
             </div>
             <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500">NET XP YIELD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
