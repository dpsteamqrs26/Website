'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Car, ShieldAlert, Zap, Clock, Target, Crosshair, ChevronRight } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, Stars } from '@react-three/drei';
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
  { id:1, name:"Sector Alpha", xp:25, time:75 },
  { id:2, name:"Sector Bravo", xp:40, time:90 },
  { id:3, name:"Sector Charlie", xp:60, time:120 },
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
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.6,4.2]}/><meshStandardMaterial color={data.color||"#0284c7"} roughness={0.2} metalness={0.8}/></mesh>
      <mesh position={[0,1.05,-0.3]} castShadow><boxGeometry args={[1.7,0.6,2]}/><meshStandardMaterial color="#000" transparent opacity={0.9}/></mesh>
      {[[-1,0.35,1.4],[1,0.35,1.4],[-1,0.35,-1.4],[1,0.35,-1.4]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.35,0.35,0.25,16]}/><meshStandardMaterial color="#111"/></mesh>
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
    stateRef.health=100; stateRef.parkProgress=0; stateRef.isLevelComplete=false; stateRef.message="Locate the green coordinate sector.";
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

    if(collision){ 
      d.speed*=-0.3; 
      if(impact>1){ 
        stateRef.health-=Math.max(5,Math.floor(impact*8)); 
        stateRef.message="COLLISION DETECTED!"; 
        setTimeout(()=>{if(stateRef.message==="COLLISION DETECTED!") stateRef.message=""},1500); 
      }
      if(stateRef.health<=0){d.isDead=true;onFail();}
    } else { d.pos.x=nx; d.pos.z=nz; }

    if(Math.random()<0.5) sendUpdate({x:d.pos.x,z:d.pos.z,angle:d.angle,speed:d.speed,name:playerName,color:d.carColor});

    const dist=Math.hypot(d.pos.x-targetSpot.x,d.pos.z-targetSpot.z);
    let ad=Math.abs((d.angle%Math.PI)-(targetSpot.angle%Math.PI)); if(ad>Math.PI/2) ad=Math.PI-ad;
    if(dist<2.5&&ad<0.25&&Math.abs(d.speed)<0.005){ stateRef.parkProgress+=delta; if(stateRef.parkProgress>=1.5){stateRef.isLevelComplete=true;onComplete();} } else stateRef.parkProgress=0;

    if(groupRef.current){groupRef.current.position.copy(d.pos);groupRef.current.rotation.y=d.angle;}
    stateRef.speed=Math.abs(d.speed)*120; stateRef.gear=d.speed>0.005?'D':d.speed<-0.005?'R':'P';
    
    // Hyper-realistic dynamic camera
    const io=new THREE.Vector3(-Math.sin(d.angle)*16,12,-Math.cos(d.angle)*16);
    camera.position.lerp(io.add(d.pos),0.1); 
    const currentLookAt = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).add(camera.position);
    currentLookAt.lerp(d.pos, 0.15);
    camera.lookAt(currentLookAt);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0,0.45,0]} castShadow><boxGeometry args={[2,0.6,4.2]}/><meshStandardMaterial color={carData.current.carColor} roughness={0.2} metalness={0.8}/></mesh>
      <mesh position={[0,1.05,-0.3]} castShadow><boxGeometry args={[1.7,0.6,2]}/><meshStandardMaterial color="#050505" metalness={1} roughness={0} transparent opacity={0.9}/></mesh>
      
      {/* Lights */}
      <mesh position={[-0.7,0.4,2.15]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <mesh position={[0.7,0.4,2.15]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffff"/></mesh>
      <pointLight position={[0, 0.5, 3]} color="#ffffff" intensity={2} distance={15} />

      <mesh position={[-0.7,0.4,-2.15]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
      <mesh position={[0.7,0.4,-2.15]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#ff0000"/></mesh>
      
      {[[-1,0.35,1.4],[1,0.35,1.4],[-1,0.35,-1.4],[1,0.35,-1.4]].map((p,i)=>(
        <mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[0.35,0.35,0.25,24]}/><meshStandardMaterial color="#111" roughness={0.9}/></mesh>
      ))}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}><planeGeometry args={[2.5, 5]} /><meshBasicMaterial color="#000" opacity={0.6} transparent /></mesh>
    </group>
  );
}

function LevelEnvironment({mapData}:{mapData:number[][]}) {
  const blocks = useMemo(() => {
    const b: React.JSX.Element[] = [];
    for(let r=0;r<MAP_SIZE;r++) for(let c=0;c<MAP_SIZE;c++){
      const t=mapData[r][c]; const x=(c-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2; const z=(r-MAP_SIZE/2)*TILE_SIZE+TILE_SIZE/2;
      if(t===2) b.push(<mesh key={`${r}-${c}`} position={[x,4,z]} castShadow receiveShadow><boxGeometry args={[TILE_SIZE-0.2,8,TILE_SIZE-0.2]}/><meshStandardMaterial color={`hsl(${210 + Math.random()*20}, 15%, ${15 + Math.random()*10}%)`} roughness={0.3} metalness={0.7}/></mesh>);
      else if(t===3) b.push(<group key={`p-${r}-${c}`} position={[x,0.02,z]}>
        <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[TILE_SIZE-.5,TILE_SIZE-.5]}/><meshBasicMaterial color="#10b981" transparent opacity={0.15}/></mesh>
        <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><ringGeometry args={[TILE_SIZE/2-.8,TILE_SIZE/2-.2,32]}/><meshBasicMaterial color="#34d399"/></mesh>
        <pointLight position={[0, 2, 0]} color="#10b981" intensity={2} distance={15} />
      </group>);
    }
    return b;
  }, [mapData]);

  return (
    <group>
      {blocks}
      <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[MAP_SIZE*TILE_SIZE,MAP_SIZE*TILE_SIZE]}/><meshStandardMaterial color="#0f0f0f" roughness={0.15} metalness={0.8}/></mesh>
      {/* Sleek Grid */}
      <gridHelper args={[MAP_SIZE*TILE_SIZE, MAP_SIZE, '#ffffff', '#ffffff']} position={[0,0.01,0]}>
        <lineBasicMaterial attach="material" color="#ffffff" opacity={0.05} transparent />
      </gridHelper>
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
  const playerName = user?.firstName||'Guest OP';
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
    sendCustomEvent({ type: 'START_1V1', payload: { levelIdx: idx, map: m, targetSpot: ts } });
    setPhase('playing');
  };

  const handleComplete = async () => { setPhase('win'); try{await addGameXP(lvl.xp);}catch{} };
  const handleFail = () => setPhase('fail');
  const fmt=(s:number)=>`${Math.floor(s/60)}:${(Math.max(0,s)%60).toString().padStart(2,'0')}`;

  if(phase==='lobby') return (
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
      <div className="absolute inset-0 z-0 bg-black">
        <img 
          src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2000&auto=format&fit=crop" 
          alt="Precision Parking Engine" 
          className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[150px] mix-blend-screen animate-pulse duration-10000" />
      </div>

      <div className="relative z-10 p-6 sm:p-10 max-w-5xl w-full flex flex-col items-start justify-center text-left h-full">
        <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
          <ArrowLeft className="w-4 h-4" /> Hub
        </Link>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-inner mt-4">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">Spatial Engine Active</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.85] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          PRECISION <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 filter drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]">PARKER</span> 
        </h1>
        
        <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-10 drop-shadow-md border-l-2 border-emerald-500 pl-4 sm:pl-6 leading-relaxed">
          Master spatial awareness in high-fidelity realistic physics environments. Secure the marked sector without compromising hull integrity.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 w-full max-w-3xl">
          {LEVEL_CONFIGS.map((c,i)=>(
            <div key={c.id} className="relative border border-white/10 bg-black/40 backdrop-blur-xl rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-emerald-500/50 hover:bg-white/5 transition-all group/level">
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent blur-2xl -z-10 group-hover/level:opacity-100 opacity-0 transition-opacity`} />
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{c.name}</h3>
                <div className="flex items-center gap-4 mt-3 mb-6">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-black uppercase tracking-widest"><Zap className="w-4 h-4"/> +{c.xp} XP</span>
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-black uppercase tracking-widest"><Clock className="w-4 h-4 text-cyan-400"/> {c.time}s</span>
                </div>
              </div>
              <button onClick={()=>handleStart(i)} className="w-full py-4 rounded-xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-[1.03] transition-all text-xs">
                DEPLOY SOLO
              </button>
            </div>
          ))}
        </div>
        
        {remotePlayers.length > 0 && (
          <div className="absolute bottom-10 right-10 pointer-events-auto animate-fade-in z-50 hidden sm:block">
            <button onClick={() => handleStart(0)} className="bg-emerald-600 border border-emerald-400/50 text-white font-black text-xs sm:text-sm tracking-widest uppercase px-6 sm:px-8 py-4 sm:py-5 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              INITIATE PVP INSTANCE ({remotePlayers.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if(phase==='win'||phase==='fail') return (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans">
      <div className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate">
        <div className={`absolute top-0 right-1/4 w-[300px] h-[300px] blur-[100px] -z-10 ${phase==='win'?'bg-emerald-600/20':'bg-red-600/20'}`} />
        <div className="text-6xl mb-6 drop-shadow-lg">{phase==='win'?'🎯':'💥'}</div>
        <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">{phase==='win'?'Sector Secured':'Failure'}</h2>
        <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8">{phase==='win'?'Flawless spatial alignment achieved.':stateRef.health<=0?'Hull integrity fully compromised.':'Time limit exceeded.'}</p>
        
        {phase==='win'&&<div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner relative overflow-hidden group mb-8">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
            <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">+{lvl.xp}</p>
            <p className="text-xs text-zinc-400 uppercase font-black tracking-widest mt-2">XP EXTRACTED</p>
        </div>}
        
        <div className="flex flex-col gap-3">
          <button onClick={()=>setPhase('lobby')} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-[1.02] transition-all overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
             SELECT SECTOR
          </button>
          <button onClick={()=>handleStart(levelIdx)} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors">
            RETRY SECTOR
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-[85vh] bg-black rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group font-sans">
      <Canvas shadows camera={{position:[0,20,20],fov:50}} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <fog attach="fog" args={['#0a0a0a', 20, 80]} />
        <color attach="background" args={['#0a0a0a']}/>
        <ambientLight intensity={0.1}/>
        <directionalLight castShadow position={[-20,50,20]} intensity={2.0} color="#b3d4ff" shadow-mapSize={[2048,2048]}/>
        <pointLight position={[0,50,0]} intensity={1} color="#34d399" distance={100} />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />
        
        <LevelEnvironment mapData={mapData}/>
        <CarController mapData={mapData} targetSpot={targetSpot} onComplete={handleComplete} onFail={handleFail} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={playerName}/>
        {remotePlayers.map(p=><RemoteCar key={p.id} data={p}/>)}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />
        
        {/* Top HUD */}
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <button onClick={()=>setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"><ArrowLeft className="w-4 h-4"/> ABORT</button>
          <div className="flex gap-4">
            <div className="hidden sm:flex bg-zinc-950/80 backdrop-blur-xl border border-emerald-500/30 text-white px-5 py-3 rounded-2xl flex-col items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] min-w-[120px]">
               <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYNC
               </span>
               <span className="text-lg font-black">{remotePlayers.length+1} OPR</span>
            </div>
            
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 w-48 flex flex-col justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex justify-between tracking-widest">Hull Integrity <span className="text-white">{Math.round(stateRef.health)}%</span></span>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] transition-all" style={{width:`${Math.max(0,stateRef.health)}%`}}/></div>
            </div>
            
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-end justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[140px]">
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">T-MINUS</span>
               <span className={`text-2xl font-black tracking-tighter ${stateRef.timeRemaining<=15?'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]':'text-white'}`}>{fmt(stateRef.timeRemaining)}</span>
            </div>
          </div>
        </div>
        
        {/* Mission Central Message */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-20">
          {stateRef.message&&<div className="bg-red-500/20 backdrop-blur-xl text-red-500 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-red-500/50 flex items-center gap-3 animate-pulse"><ShieldAlert className="w-5 h-5"/>{stateRef.message}</div>}
          {stateRef.parkProgress>0&&<div className="mt-8 bg-zinc-950/80 px-8 py-5 rounded-2xl border border-emerald-500/50 backdrop-blur-xl flex flex-col items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]"><span className="text-emerald-400 font-black text-xs uppercase tracking-widest animate-pulse">Aligning Sector Coordinates...</span><div className="w-40 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" style={{width:`${(stateRef.parkProgress/1.5)*100}%`}}/></div></div>}
        </div>
        
        {/* Bottom HUD */}
        <div className="flex justify-between items-end pointer-events-auto relative z-20">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 shadow-[0_0_40px_rgba(0,0,0,0.8)] min-w-[180px]">
            <div className="flex flex-col items-center w-20 h-20 justify-center rounded-full border-4 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
               <span className="text-2xl font-black text-white">{Math.round(stateRef.speed)}</span>
               <span className="text-[8px] uppercase font-black tracking-widest text-zinc-500">KPH</span>
            </div>
            <div className="flex items-center gap-3">
               <div className={`text-3xl font-black tracking-tighter ${stateRef.gear==='D'?'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]':stateRef.gear==='R'?'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]':'text-zinc-600'}`}>{stateRef.gear}</div>
               <div className="text-[10px] font-black tracking-widest text-zinc-950 bg-white px-2 py-1 rounded">A / T</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
