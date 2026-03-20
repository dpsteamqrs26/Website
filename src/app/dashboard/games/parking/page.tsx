'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, ShieldAlert, Zap, Clock } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const TILE_SIZE = 8;
const MAP_SIZE = 16;
const MAX_SPEED = 0.25;
const ACCEL = 0.003;
const BRAKE = 0.015;
const FRICTION = 0.96;
const STEER_SPEED = 0.055;

function generateParkingMap(): number[][] {
  const map: number[][] = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(1));
  for (let i = 0; i < MAP_SIZE; i++) { map[0][i]=2; map[MAP_SIZE-1][i]=2; map[i][0]=2; map[i][MAP_SIZE-1]=2; }
  for (let i = 0; i < MAP_SIZE; i++) { if(map[1][i]===1) map[1][i]=0; if(map[MAP_SIZE-2][i]===1) map[MAP_SIZE-2][i]=0; if(map[i][1]===1) map[i][1]=0; if(map[i][MAP_SIZE-2]===1) map[i][MAP_SIZE-2]=0; }
  const numClusters = 3 + Math.floor(Math.random() * 4);
  for (let c = 0; c < numClusters; c++) {
    const cr = 3 + Math.floor(Math.random()*(MAP_SIZE-6));
    const cc = 3 + Math.floor(Math.random()*(MAP_SIZE-6));
    const sz = 1 + Math.floor(Math.random()*2);
    for (let dr=0; dr<sz; dr++) for (let dc=0; dc<sz; dc++) {
      if (cr+dr<MAP_SIZE-1 && cc+dc<MAP_SIZE-1) map[cr+dr][cc+dc]=2;
    }
  }
  let placed = false;
  for (let r=3; r<MAP_SIZE-3 && !placed; r++) for (let c=3; c<MAP_SIZE-3 && !placed; c++) {
    if (map[r][c]===1 && map[r-1][c]===1 && map[r+1][c]===1 && Math.random()>0.85) { map[r][c]=3; placed=true; }
  }
  if (!placed) map[MAP_SIZE-4][MAP_SIZE-4]=3;
  return map;
}

function findSpot(map: number[][]): {x:number;z:number;angle:number} {
  for (let r=0;r<MAP_SIZE;r++) for (let c=0;c<MAP_SIZE;c++) if(map[r][c]===3) return {x:(c-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2, z:(r-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2, angle:Math.PI};
  return {x:0,z:0,angle:Math.PI};
}

const LEVEL_CONFIGS = [
  { id:1, name:"Random Lot 1", xp:25, time:75 },
  { id:2, name:"Random Lot 2", xp:40, time:90 },
  { id:3, name:"Random Lot 3", xp:60, time:120 },
];

function getTileAt(x:number, z:number, mapData:number[][]) {
  const col=Math.floor(x/TILE_SIZE)+MAP_SIZE/2;
  const row=Math.floor(z/TILE_SIZE)+MAP_SIZE/2;
  if(row<0||row>=MAP_SIZE||col<0||col>=MAP_SIZE) return 2;
  return mapData[row][col];
}

const stateRef = { speed:0, gear:'N', timeRemaining:0, health:100, message:'', parkProgress:0, isLevelComplete:false };

function RemoteCar({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if(ref.current) {
      ref.current.position.lerp(new THREE.Vector3(data.x,0,data.z),0.3);
      ref.current.quaternion.slerp(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,data.angle,0)),0.3);
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.6,4.2]}/><meshStandardMaterial color={data.color||"#0284c7"} roughness={0.3} metalness={0.7}/></mesh>
      <mesh position={[0,1.05,-0.3]} castShadow><boxGeometry args={[1.7,0.6,2]}/><meshStandardMaterial color="#111" transparent opacity={0.6}/></mesh>
      {[[-1,0.35,1.4],[1,0.35,1.4],[-1,0.35,-1.4],[1,0.35,-1.4]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35,0.35,0.25,16]}/><meshStandardMaterial color="#222"/></mesh>
      ))}
    </group>
  );
}

function CarController({ mapData, targetSpot, onComplete, onFail, remotePlayers, sendUpdate, playerName }:
  { mapData:number[][]; targetSpot:{x:number;z:number;angle:number}; onComplete:()=>void; onFail:()=>void; remotePlayers:PlayerState[]; sendUpdate:any; playerName:string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const carData = useRef({ speed:0, angle:Math.PI, pos:new THREE.Vector3(0,0,-20), isDead:false, carColor:`hsl(${Math.floor(Math.random()*360)},70%,55%)` });
  const keys = useRef<Record<string,boolean>>({});

  useEffect(() => {
    carData.current = { speed:0, angle:Math.PI, pos:new THREE.Vector3(0,0,-20), isDead:false, carColor:carData.current.carColor };
    stateRef.health=100; stateRef.parkProgress=0; stateRef.isLevelComplete=false; stateRef.message="Find the green spot!";
    const kd=(e:KeyboardEvent)=>{keys.current[e.code]=true}; const ku=(e:KeyboardEvent)=>{keys.current[e.code]=false};
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku);
    return ()=>{window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku)};
  }, [mapData]);

  useFrame((_,delta) => {
    if(carData.current.isDead||stateRef.isLevelComplete) return;
    const d = carData.current;
    let gpX=0,gpY=0; const gps=navigator.getGamepads?navigator.getGamepads():[]; const gp=gps[0];
    if(gp){ if(Math.abs(gp.axes[0])>0.15) gpX=gp.axes[0]; if(gp.buttons[7]?.pressed) gpY=-1; else if(gp.buttons[6]?.pressed) gpY=1; else if(Math.abs(gp.axes[1])>0.15) gpY=gp.axes[1]; }

    const fwd=keys.current['KeyW']||keys.current['ArrowUp']||gpY<-0.2;
    const bwd=keys.current['KeyS']||keys.current['ArrowDown']||gpY>0.2;
    const lft=keys.current['KeyA']||keys.current['ArrowLeft']||gpX<-0.2;
    const rgt=keys.current['KeyD']||keys.current['ArrowRight']||gpX>0.2;
    const brk=keys.current['Space'];

    if(fwd) d.speed+=ACCEL; else if(bwd) d.speed-=ACCEL; else d.speed*=FRICTION;
    if(brk) d.speed*=0.8;
    d.speed=THREE.MathUtils.clamp(d.speed,-MAX_SPEED*0.5,MAX_SPEED);
    if(Math.abs(d.speed)<0.002) d.speed=0;

    if(Math.abs(d.speed)>0.005){
      const sd=d.speed>0?1:-1; let sa=0;
      if(lft) sa=STEER_SPEED; if(rgt) sa=-STEER_SPEED; if(gpX!==0) sa=-gpX*STEER_SPEED;
      d.angle+=sa*sd*THREE.MathUtils.lerp(1.5,0.5,Math.abs(d.speed)/MAX_SPEED);
    }

    const nx=d.pos.x+Math.sin(d.angle)*d.speed, nz=d.pos.z+Math.cos(d.angle)*d.speed;
    const cr=2.0;
    const wallHit = [getTileAt(nx,nz,mapData), getTileAt(nx+Math.sin(d.angle)*cr,nz+Math.cos(d.angle)*cr,mapData),
      getTileAt(nx-Math.sin(d.angle)*cr,nz-Math.cos(d.angle)*cr,mapData)].some(t=>t===2);
    let collision=false, impact=0;
    if(wallHit){ impact=Math.abs(d.speed)*100; collision=true; }
    for(const rp of remotePlayers){ if(Math.hypot(d.pos.x-rp.x,d.pos.z-rp.z)<3.2){ impact=Math.abs(d.speed)*150+20; collision=true; break; } }

    if(collision){ d.speed*=-0.3; if(impact>1){ stateRef.health-=Math.max(5,Math.floor(impact*8)); stateRef.message="CRASH!"; setTimeout(()=>{if(stateRef.message==="CRASH!") stateRef.message=""},1500); }
      if(stateRef.health<=0){d.isDead=true;onFail();}
    } else { d.pos.x=nx; d.pos.z=nz; }

    if(Math.random()<0.5) sendUpdate({x:d.pos.x,z:d.pos.z,angle:d.angle,speed:d.speed,name:playerName,color:d.carColor});

    const dist=Math.hypot(d.pos.x-targetSpot.x,d.pos.z-targetSpot.z);
    let ad=Math.abs((d.angle%Math.PI)-(targetSpot.angle%Math.PI)); if(ad>Math.PI/2) ad=Math.PI-ad;
    if(dist<2.5&&ad<0.25&&Math.abs(d.speed)<0.005){ stateRef.parkProgress+=delta; if(stateRef.parkProgress>=1.5){stateRef.isLevelComplete=true;onComplete();} } else stateRef.parkProgress=0;

    if(groupRef.current){groupRef.current.position.copy(d.pos);groupRef.current.rotation.y=d.angle;}
    stateRef.speed=Math.abs(d.speed)*120; stateRef.gear=d.speed>0.005?'D':d.speed<-0.005?'R':'P';
    const io=new THREE.Vector3(-Math.sin(d.angle)*16,12,-Math.cos(d.angle)*16);
    camera.position.lerp(io.add(d.pos),0.1); camera.lookAt(d.pos);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.6,4.2]}/><meshStandardMaterial color={carData.current.carColor} roughness={0.3} metalness={0.7}/></mesh>
      <mesh position={[0,1.05,-0.3]} castShadow><boxGeometry args={[1.7,0.6,2]}/><meshStandardMaterial color="#111" transparent opacity={0.8}/></mesh>
      <mesh position={[-0.7,0.4,2.15]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
      <mesh position={[0.7,0.4,2.15]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
      <mesh position={[-0.7,0.4,-2.15]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
      <mesh position={[0.7,0.4,-2.15]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
      {[[-1,0.35,1.4],[1,0.35,1.4],[-1,0.35,-1.4],[1,0.35,-1.4]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.35,0.35,0.25,16]}/><meshStandardMaterial color="#222" roughness={0.9}/></mesh>
      ))}
    </group>
  );
}

function LevelEnvironment({mapData}:{mapData:number[][]}) {
  const blocks = useMemo(() => {
    const b: React.JSX.Element[] = [];
    for(let r=0;r<MAP_SIZE;r++) for(let c=0;c<MAP_SIZE;c++){
      const t=mapData[r][c]; const x=(c-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2; const z=(r-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2;
      if(t===2) b.push(<mesh key={`${r}-${c}`} position={[x,2,z]} castShadow receiveShadow><boxGeometry args={[TILE_SIZE,4,TILE_SIZE]}/><meshStandardMaterial color="#9ca3af" roughness={0.9}/></mesh>);
      else if(t===3) b.push(<group key={`p-${r}-${c}`} position={[x,0.02,z]}><mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[TILE_SIZE-.5,TILE_SIZE-.5]}/><meshBasicMaterial color="#10b981" transparent opacity={0.25}/></mesh><mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><ringGeometry args={[TILE_SIZE/2-.8,TILE_SIZE/2-.5,4]}/><meshBasicMaterial color="#10b981"/></mesh></group>);
    }
    return b;
  }, [mapData]);

  return (
    <group>
      {blocks}
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[MAP_SIZE*TILE_SIZE,MAP_SIZE*TILE_SIZE]}/><meshStandardMaterial color="#374151" roughness={0.95}/></mesh>
      <gridHelper args={[MAP_SIZE*TILE_SIZE,MAP_SIZE,'#4b5563','#4b5563']} position={[0,0.01,0]}/>
    </group>
  );
}

export default function ParkingSimulator() {
  const [phase, setPhase] = useState<'lobby'|'playing'|'win'|'fail'>('lobby');
  const [levelIdx, setLevelIdx] = useState(0);
  const [mapData, setMapData] = useState<number[][]>([]);
  const [targetSpot, setTargetSpot] = useState({x:0,z:0,angle:Math.PI});
  const [hudTick, setHudTick] = useState(0);

  const { user } = useUser();
  const playerName = user?.firstName||'Guest';
  const handleCustomEvent = (data: any) => {
    if (data.type === 'START_1V1') {
      const idx = data.payload.levelIdx;
      setMapData(data.payload.map);
      setTargetSpot(data.payload.targetSpot);
      setLevelIdx(idx);
      stateRef.timeRemaining = LEVEL_CONFIGS[idx].time;
      setPhase('playing');
    }
  };
  const { remotePlayers, sendUpdate, isHost, sendCustomEvent } = useMultiplayer('parking', playerName, handleCustomEvent);
  const lvl = LEVEL_CONFIGS[levelIdx];

  useEffect(() => {
    if(phase!=='playing') return;
    const hi=setInterval(()=>{stateRef.timeRemaining-=1; if(stateRef.timeRemaining<=0) setPhase('fail'); setHudTick(n=>n+1);},1000);
    const fi=setInterval(()=>setHudTick(n=>n+1),60);
    return ()=>{clearInterval(hi);clearInterval(fi)};
  },[phase]);

  const handleStart = (idx:number) => {
    setLevelIdx(idx);
    const m = generateParkingMap();
    const ts = findSpot(m);
    setMapData(m);
    setTargetSpot(ts);
    stateRef.timeRemaining = LEVEL_CONFIGS[idx].time;
    // Notify opponent
    sendCustomEvent({ type: 'START_1V1', payload: { levelIdx: idx, map: m, targetSpot: ts } });
    setPhase('playing');
  };

  const handleComplete = async () => { setPhase('win'); try{await addGameXP(lvl.xp);}catch{} };
  const handleFail = () => setPhase('fail');
  const fmt=(s:number)=>`${Math.floor(s/60)}:${(Math.max(0,s)%60).toString().padStart(2,'0')}`;

  if(phase==='lobby') return (
    <div className="max-w-3xl mx-auto py-12 px-6 animate-fade-in font-outfit space-y-8">
      <div className="flex justify-between items-center">
        <Link href="/dashboard/games" className="inline-flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5"/> Back</Link>
        <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-1 rounded-full text-sm"><Car className="w-4 h-4"/> 3D</div>
      </div>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl text-6xl shadow-indigo-500/30">🅿️</div>
        <h1 className="text-5xl font-black">Parking Master 3D</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">Random parking lots every time! Find the green spot and park precisely.
          <strong className="text-primary block mt-2">✨ MULTIPLAYER + RANDOM MAPS ✨</strong></p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {LEVEL_CONFIGS.map((c,i)=>(
          <div key={c.id} className="border border-border bg-card rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div>
              <h3 className="text-2xl font-black">{c.name}</h3>
              <div className="flex items-center gap-4 mt-2 mb-6">
                <span className="flex items-center gap-1 text-sm text-amber-500 font-bold"><Zap className="w-4 h-4"/> +{c.xp} XP</span>
                <span className="flex items-center gap-1 text-sm text-blue-500 font-bold"><Clock className="w-4 h-4"/> {c.time}s</span>
              </div>
            </div>
            <button onClick={()=>handleStart(i)} className="w-full py-4 rounded-xl font-bold bg-foreground text-background shadow-lg hover:scale-[1.02] transition-transform text-sm">PLAY SOLO</button>
          </div>
        ))}
      </div>
      {remotePlayers.length > 0 && (
        <div className="fixed bottom-10 left-10 pointer-events-auto animate-fade-in">
          <button onClick={() => handleStart(0)} className="bg-gradient-to-r from-green-500 to-emerald-600 border-[3px] border-white/20 text-white font-black text-2xl px-8 py-5 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-3">
            <span className="animate-pulse">✨</span> PLAYER JOINED! PLAY 1V1 MAP <span className="animate-pulse">✨</span>
          </button>
        </div>
      )}
    </div>
  );

  if(phase==='win'||phase==='fail') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">{phase==='win'?'🏆':'💥'}</div>
        <h2 className="text-4xl font-black mb-1">{phase==='win'?'Perfect Park!':'Failed!'}</h2>
        <p className="text-muted-foreground text-sm">{phase==='win'?'Flawless alignment!':stateRef.health<=0?'Too much damage!':'Time ran out!'}</p>
        {phase==='win'&&<div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl py-4 flex flex-col items-center"><span className="text-4xl font-black text-amber-500">+{lvl.xp}</span><span className="text-xs font-bold uppercase text-amber-500/70">XP Earned</span></div>}
        <div className="flex flex-col gap-3 pt-4">
          <button onClick={()=>setPhase('lobby')} className="w-full py-4 rounded-xl font-bold bg-foreground text-background">Level Select</button>
          <button onClick={()=>handleStart(levelIdx)} className="w-full py-4 rounded-xl font-bold border border-border hover:bg-accent text-foreground">Retry (New Map)</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] bg-black rounded-3xl overflow-hidden border border-border/50 shadow-2xl font-outfit">
      <Canvas shadows camera={{position:[0,20,20],fov:50}}>
        <color attach="background" args={['#1e293b']}/>
        <ambientLight intensity={0.5}/><directionalLight castShadow position={[-20,50,20]} intensity={1.5} shadow-mapSize={[2048,2048]}/>
        <LevelEnvironment mapData={mapData}/>
        <CarController mapData={mapData} targetSpot={targetSpot} onComplete={handleComplete} onFail={handleFail} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={playerName}/>
        {remotePlayers.map(p=><RemoteCar key={p.id} data={p}/>)}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={()=>setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5"/> Quit</button>
          <div className="flex gap-4">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white px-4 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Multiplayer</span><span className="text-sm font-black">{remotePlayers.length+1} Online</span></div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl w-40 flex flex-col justify-center"><span className="text-[10px] font-black uppercase text-gray-400 mb-1 flex justify-between">Health <span>{Math.round(stateRef.health)}%</span></span><div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{width:`${Math.max(0,stateRef.health)}%`}}/></div></div>
            <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex flex-col items-center min-w-[120px]"><span className="text-[10px] text-gray-400 font-bold uppercase">Time</span><span className={`text-xl font-black ${stateRef.timeRemaining<=15?'text-red-500 animate-pulse':'text-white'}`}>{fmt(stateRef.timeRemaining)}</span></div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {stateRef.message&&<div className="bg-red-500/90 backdrop-blur-sm text-white px-8 py-3 rounded-full font-black text-xl shadow-2xl border-2 border-red-300 flex items-center gap-3"><ShieldAlert className="w-6 h-6"/>{stateRef.message}</div>}
          {stateRef.parkProgress>0&&<div className="absolute bg-black/60 px-6 py-4 rounded-2xl border border-green-500/50 backdrop-blur-md flex flex-col items-center gap-2"><span className="text-green-400 font-bold">Aligning...</span><div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{width:`${(stateRef.parkProgress/1.5)*100}%`}}/></div></div>}
        </div>
        <div className="flex justify-between items-end">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-4 flex items-center gap-4">
            <div className="flex flex-col items-center w-16 h-16 justify-center rounded-full border-4 border-blue-500"><span className="text-xl font-black text-white">{Math.round(stateRef.speed)}</span></div>
            <div className={`text-4xl font-black pr-2 ${stateRef.gear==='D'?'text-green-400':stateRef.gear==='R'?'text-amber-400':'text-gray-400'}`}>{stateRef.gear}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
