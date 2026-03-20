'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, Gauge } from 'lucide-react';
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
const STEER_SPEED = 0.045;

type SpeedZone = { z: number; limit: number; passed: boolean };
type RoadObstacle = { z: number; x: number; type: 'cone' | 'barrier' | 'parked_car' };

function generateZones(count: number): SpeedZone[] {
  const zones: SpeedZone[] = [];
  const limits = [30, 40, 50, 60, 80];
  for (let i = 0; i < count; i++) {
    zones.push({ z: -(i + 1) * 50, limit: limits[Math.floor(Math.random() * limits.length)], passed: false });
  }
  return zones;
}

function generateObstacles(zones: SpeedZone[]): RoadObstacle[] {
  const obs: RoadObstacle[] = [];
  for (const zone of zones) {
    // 2-4 obstacles per zone
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const types: RoadObstacle['type'][] = ['cone', 'barrier', 'parked_car'];
      obs.push({
        z: zone.z + 5 + Math.random() * 35,
        x: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2.5),
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
  }
  return obs;
}

function Road() {
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,-400]} receiveShadow><planeGeometry args={[14,1000]}/><meshStandardMaterial color="#374151" roughness={0.9}/></mesh>
      {[-6,6].map((x,i)=>(<mesh key={i} position={[x,0.3,-400]} castShadow><boxGeometry args={[0.3,0.6,1000]}/><meshStandardMaterial color="#6b7280"/></mesh>))}
      {Array.from({length:120}).map((_,i)=>(<mesh key={`m-${i}`} position={[0,0.01,-i*8]}><boxGeometry args={[0.15,0.02,4]}/><meshStandardMaterial color="#fbbf24"/></mesh>))}
      <mesh rotation={[-Math.PI/2,0,0]} position={[-11,-0.02,-400]} receiveShadow><planeGeometry args={[8,1000]}/><meshStandardMaterial color="#22543d"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[11,-0.02,-400]} receiveShadow><planeGeometry args={[8,1000]}/><meshStandardMaterial color="#22543d"/></mesh>
    </group>
  );
}

function SpeedSign({ zone }: { zone: SpeedZone }) {
  return (
    <group position={[-7, 0, zone.z]}>
      <mesh position={[0,2,0]}><cylinderGeometry args={[0.1,0.1,4,8]}/><meshStandardMaterial color="#888"/></mesh>
      <mesh position={[0,4,0]}><boxGeometry args={[2.5,2.5,0.2]}/><meshStandardMaterial color={zone.passed?'#22c55e':'#fff'}/></mesh>
      <mesh position={[0,4,0.11]}><ringGeometry args={[0.9,1.1,32]}/><meshBasicMaterial color="#ef4444"/></mesh>
    </group>
  );
}

function Obstacle({ obs }: { obs: RoadObstacle }) {
  if (obs.type === 'cone') return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[0,0.4,0]}><coneGeometry args={[0.2,0.8,8]}/><meshStandardMaterial color="#f97316"/></mesh>
      <mesh position={[0,0.02,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[0.3,8]}/><meshStandardMaterial color="#f97316"/></mesh>
    </group>
  );
  if (obs.type === 'barrier') return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[-0.3,0.3,0]}><cylinderGeometry args={[0.06,0.06,0.6,8]}/><meshStandardMaterial color="#888"/></mesh>
      <mesh position={[0.3,0.3,0]}><cylinderGeometry args={[0.06,0.06,0.6,8]}/><meshStandardMaterial color="#888"/></mesh>
      <mesh position={[0,0.5,0]}><boxGeometry args={[1,0.15,0.1]}/><meshStandardMaterial color="#ef4444"/></mesh>
      <mesh position={[0,0.35,0]}><boxGeometry args={[1,0.15,0.1]}/><meshStandardMaterial color="#fff"/></mesh>
    </group>
  );
  // parked_car
  return (
    <group position={[obs.x, 0, obs.z]}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.7,4]}/><meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.5}/></mesh>
      <mesh position={[0,1,0]}><boxGeometry args={[1.6,0.5,2]}/><meshStandardMaterial color="#111" transparent opacity={0.7}/></mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) { ref.current.position.lerp(new THREE.Vector3(data.x, 0, data.z), 0.3); ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, data.angle, 0.3); } });
  return (
    <group ref={ref}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4]}/><meshStandardMaterial color={data.color||'#3b82f6'} roughness={0.3} metalness={0.6}/></mesh>
      <mesh position={[0,1.1,0]}><boxGeometry args={[1.6,0.5,2]}/><meshStandardMaterial color="#222" transparent opacity={0.7}/></mesh>
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

  useEffect(() => {
    speed.current=0; posX.current=0; posZ.current=0; angle.current=0; hitObs.current=new Set();
    const kd=(e:KeyboardEvent)=>{keys.current[e.code]=true}; const ku=(e:KeyboardEvent)=>{keys.current[e.code]=false};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    return ()=>{window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku)};
  },[]);

  useFrame(()=>{
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

    // Steering
    if(Math.abs(speed.current)>0.005){
      let sa=0;
      if(lft) sa=STEER_SPEED; if(rgt) sa=-STEER_SPEED; if(gpX!==0) sa=-gpX*STEER_SPEED;
      angle.current+=sa*0.7;
    }

    posX.current+=Math.sin(angle.current)*speed.current;
    posZ.current-=Math.cos(angle.current)*speed.current;

    // Clamp to road
    posX.current=THREE.MathUtils.clamp(posX.current,-5,5);

    // Check speed zones
    const kmh = speed.current * 200;
    for (const zone of zones.current) {
      if (!zone.passed && posZ.current < zone.z + 3 && posZ.current > zone.z - 3) {
        zone.passed = true;
        onZonePass(kmh <= zone.limit + 5);
      }
    }

    // Check obstacle collisions
    if (!inv.current) {
      for (let i = 0; i < obstacles.length; i++) {
        if (hitObs.current.has(i)) continue;
        const o = obstacles[i];
        if (Math.abs(posX.current - o.x) < 1.5 && Math.abs(posZ.current - o.z) < 2.5) {
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

    camera.position.lerp(new THREE.Vector3(posX.current-Math.sin(angle.current)*8,6,posZ.current+Math.cos(angle.current)*8+4),0.08);
    camera.lookAt(posX.current,0,posZ.current-5);
  });

  return (
    <group ref={ref}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4.2]}/><meshStandardMaterial color={color.current} roughness={0.3} metalness={0.7} emissive={inv.current?'#f00':'#000'} emissiveIntensity={inv.current?0.5:0}/></mesh>
      <mesh position={[0,1.1,-0.2]}><boxGeometry args={[1.6,0.6,2]}/><meshStandardMaterial color="#111" transparent opacity={0.8}/></mesh>
      <mesh position={[-0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
      <mesh position={[0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
      <mesh position={[-0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
      <mesh position={[0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
    </group>
  );
}

export default function SpeedTrap() {
  const [phase,setPhase]=useState<'lobby'|'playing'|'gameover'>('lobby');
  const [xp,setXp]=useState(0);
  const [zonesPassed,setZonesPassed]=useState(0);
  const [violations,setViolations]=useState(0);
  const [obstacleHits,setObstacleHits]=useState(0);
  const [currentLimit,setCurrentLimit]=useState(50);
  const [currentSpeed,setCurrentSpeed]=useState(0);
  const zonesRef=useRef<SpeedZone[]>([]);
  const [roadObstacles,setRoadObstacles]=useState<RoadObstacle[]>([]);

  const {user}=useUser(); const name=user?.firstName||'Guest';
  const handleMapSync = (data: any) => {
    if (data?.zones) {
      zonesRef.current = data.zones;
      setRoadObstacles(data.obstacles);
      setCurrentLimit(data.zones[0]?.limit||50);
    }
  };
  const {remotePlayers,sendUpdate,isHost,setSharedData}=useMultiplayer('speedtrap',name,handleMapSync);

  useEffect(()=>{
    if(phase!=='playing') return;
    const iv=setInterval(()=>{
      const upcoming=zonesRef.current.filter(z=>!z.passed).sort((a,b)=>b.z-a.z);
      if(upcoming.length>0) setCurrentLimit(upcoming[0].limit);
      if(zonesRef.current.every(z=>z.passed)) setPhase('gameover');
    },200);
    return ()=>clearInterval(iv);
  },[phase]);

  const start=()=>{
    setPhase('playing'); setXp(0); setZonesPassed(0); setViolations(0); setObstacleHits(0);
    if (isHost || remotePlayers.length === 0 || zonesRef.current.length === 0) {
      const z=generateZones(15);
      zonesRef.current=z;
      const obs = generateObstacles(z);
      setRoadObstacles(obs);
      setSharedData({ zones: z, obstacles: obs });
      setCurrentLimit(z[0]?.limit||50);
    } else {
      zonesRef.current.forEach(z => z.passed = false);
      setCurrentLimit(zonesRef.current[0]?.limit||50);
    }
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
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4"/>Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-2xl shadow-blue-500/30 text-5xl">🚗</div>
        <h1 className="text-5xl font-black">Speed Trap 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Drive through 15 speed zones with **cones, barriers, and parked cars** blocking the road! Obey speed limits and dodge obstacles. Use WASD + steering. <strong className="text-primary block mt-2">✨ 2-PLAYER RACE ✨</strong>
        </p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">START DRIVING</button>
    </div>
  );

  if(phase==='gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">{violations===0&&obstacleHits===0?'🏆':'🚗'}</div>
        <h2 className="text-4xl font-black">{violations===0&&obstacleHits===0?'Perfect Drive!':'Route Complete!'}</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent/50 rounded-2xl p-3"><p className="text-2xl font-black text-green-500">{zonesPassed-violations}</p><p className="text-[10px] text-muted-foreground uppercase font-bold">Clean</p></div>
          <div className="bg-accent/50 rounded-2xl p-3"><p className="text-2xl font-black text-red-500">{violations}</p><p className="text-[10px] text-muted-foreground uppercase font-bold">Speeding</p></div>
          <div className="bg-accent/50 rounded-2xl p-3"><p className="text-2xl font-black text-amber-500">{obstacleHits}</p><p className="text-[10px] text-muted-foreground uppercase font-bold">Hits</p></div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-4 flex flex-col items-center"><span className="text-4xl font-black text-amber-500">+{xp}</span><span className="text-xs font-bold uppercase text-amber-500/70">Net XP</span></div>
        <div className="flex flex-col gap-3 pt-2">
          <button onClick={start} className="w-full py-4 rounded-xl font-bold bg-foreground text-background">Play Again (New Route)</button>
          <Link href="/dashboard/games" className="w-full py-4 rounded-xl font-bold border border-border hover:bg-accent text-foreground text-center block">Back</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] rounded-3xl overflow-hidden bg-black shadow-2xl border border-border/50 font-outfit">
      <Canvas shadows camera={{position:[0,6,12],fov:60}}>
        <color attach="background" args={['#87ceeb']}/>
        <ambientLight intensity={0.5}/><directionalLight castShadow position={[20,40,20]} intensity={1.2} shadow-mapSize={[2048,2048]}/>
        <Sky sunPosition={[100,20,100]} turbidity={1} rayleigh={0.5}/>
        <Road/>
        {zonesRef.current.map((z,i)=><SpeedSign key={i} zone={z}/>)}
        {roadObstacles.map((o,i)=><Obstacle key={i} obs={o}/>)}
        <PlayerCar zones={zonesRef} obstacles={roadObstacles} onZonePass={handleZonePass} onObstacleHit={handleObstacleHit} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={name} active={phase==='playing'}/>
        {remotePlayers.map(p=><RemotePlayer key={p.id} data={p}/>)}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={()=>setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5"/>Quit</button>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Race</span><span className="text-sm font-black text-white">{remotePlayers.length+1} Players</span></div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-gray-400 font-bold uppercase">Limit</span><span className="text-2xl font-black text-white">{currentLimit}</span></div>
          </div>
        </div>
        <div className="flex-1"/>
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-bold">Zones: {zonesPassed}/{zonesRef.current.length}</span>
            <span className={`text-xs font-bold ${violations>0?'text-red-400':'text-green-400'}`}>Violations: {violations} · Hits: {obstacleHits}</span>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500"/><span className="text-2xl font-black text-white">{xp} XP</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
