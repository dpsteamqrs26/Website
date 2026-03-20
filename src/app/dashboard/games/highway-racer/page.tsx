'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Heart } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { addGameXP } from '@/app/actions';
import { useUser } from '@clerk/nextjs';
import { useMultiplayer, PlayerState } from '../useMultiplayer';

const LANE_X = [-4, 0, 4];
const COLORS = ['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4'];

type Obstacle = { id: number; lane: number; z: number; color: string; len: number };

function Highway() {
  return (
    <group>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.01,-200]} receiveShadow><planeGeometry args={[16,600]}/><meshStandardMaterial color="#374151" roughness={0.9}/></mesh>
      {[-2,2].map((x,xi)=>Array.from({length:40}).map((_,i)=>(
        <mesh key={`${xi}-${i}`} position={[x,0.01,-i*8+100]}><boxGeometry args={[0.15,0.02,3]}/><meshStandardMaterial color="#fbbf24"/></mesh>
      )))}
      {[-7,7].map((x,i)=>(<mesh key={`b-${i}`} position={[x,0.5,-200]} castShadow><boxGeometry args={[0.5,1,600]}/><meshStandardMaterial color="#6b7280"/></mesh>))}
      <mesh rotation={[-Math.PI/2,0,0]} position={[-12,-0.02,-200]} receiveShadow><planeGeometry args={[10,600]}/><meshStandardMaterial color="#22543d"/></mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[12,-0.02,-200]} receiveShadow><planeGeometry args={[10,600]}/><meshStandardMaterial color="#22543d"/></mesh>
    </group>
  );
}

function ObstacleCar({ o }: { o: Obstacle }) {
  return (
    <group position={[LANE_X[o.lane], 0, o.z]}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2.2,0.8,o.len]}/><meshStandardMaterial color={o.color} roughness={0.3} metalness={0.6}/></mesh>
      <mesh position={[0,1.1,0]}><boxGeometry args={[1.6,0.55,o.len*0.5]}/><meshStandardMaterial color="#111" transparent opacity={0.7}/></mesh>
    </group>
  );
}

function RemotePlayer({ data }: { data: PlayerState }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(()=>{if(ref.current) ref.current.position.lerp(new THREE.Vector3(data.x,0,data.z),0.3)});
  return (
    <group ref={ref}>
      <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4]}/><meshStandardMaterial color={data.color||'#3b82f6'} roughness={0.3} metalness={0.6}/></mesh>
      <mesh position={[0,1.1,0]}><boxGeometry args={[1.6,0.5,2]}/><meshStandardMaterial color="#222" transparent opacity={0.7}/></mesh>
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
  const scrollSpeed = useRef(0.35);
  const spawnTimer = useRef(0);

  useEffect(()=>{
    lane.current=1; posX.current=0; scrollSpeed.current=0.35;
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

    if(now-lastSw.current>180){
      if(keys.current['KeyA']||keys.current['ArrowLeft']||gpX<-0.3){lane.current=Math.max(0,lane.current-1);lastSw.current=now;}
      if(keys.current['KeyD']||keys.current['ArrowRight']||gpX>0.3){lane.current=Math.min(2,lane.current+1);lastSw.current=now;}
    }

    posX.current+=(LANE_X[lane.current]-posX.current)*0.15;

    // Scroll speed increases over time
    scrollSpeed.current=Math.min(1.2, scrollSpeed.current+delta*0.003);

    // Move obstacles toward player & spawn new ones
    setObstacles(prev=>{
      let updated = prev.map(o=>({...o, z:o.z+scrollSpeed.current*3})).filter(o=>o.z<30);
      // Spawn
      spawnTimer.current+=delta;
      if(spawnTimer.current>0.6){
        spawnTimer.current=0;
        const occupiedLanes = updated.filter(o=>o.z<-20&&o.z>-30).map(o=>o.lane);
        const freeLanes = [0,1,2].filter(l=>!occupiedLanes.includes(l));
        if(freeLanes.length>0){
          const l = freeLanes[Math.floor(Math.random()*freeLanes.length)];
          updated.push({id:Date.now()+Math.random(),lane:l,z:-60-Math.random()*30,color:COLORS[Math.floor(Math.random()*COLORS.length)],len:3+Math.random()*2});
        }
        // Sometimes spawn 2 cars, leaving one lane free
        if(Math.random()>0.5 && freeLanes.length>1){
          const l2 = freeLanes.filter(l=>l!==updated[updated.length-1]?.lane)[0];
          if(l2!==undefined) updated.push({id:Date.now()+0.5+Math.random(),lane:l2,z:-70-Math.random()*20,color:COLORS[Math.floor(Math.random()*COLORS.length)],len:3+Math.random()*1.5});
        }
      }
      return updated;
    });

    // Collision
    if(!inv.current){
      for(const o of obstacles){
        if(Math.abs(LANE_X[o.lane]-posX.current)<2 && Math.abs(o.z)<o.len*0.5+2.5){
          inv.current=true; onCrash(); setTimeout(()=>{inv.current=false},2000); break;
        }
      }
    }

    // Tick for survival points
    tickT.current+=delta; if(tickT.current>2){tickT.current=0;onTick();}

    if(playerRef.current) playerRef.current.position.x=posX.current;
    if(Math.random()<0.3) sendUpdate({x:posX.current,z:0,angle:0,speed:scrollSpeed.current,name:playerName,color:color.current});
    camera.position.lerp(new THREE.Vector3(posX.current*0.3,8,12),0.08); camera.lookAt(posX.current*0.3,0,-10);
  });

  return (
    <>
      <Highway/>
      {obstacles.map(o=><ObstacleCar key={o.id} o={o}/>)}
      <group ref={playerRef}>
        <mesh position={[0,0.5,0]} castShadow><boxGeometry args={[2,0.8,4.2]}/><meshStandardMaterial color={color.current} roughness={0.3} metalness={0.7} emissive={inv.current?'#ff0':'#000'} emissiveIntensity={inv.current?0.5:0}/></mesh>
        <mesh position={[0,1.1,-0.2]}><boxGeometry args={[1.6,0.6,2]}/><meshStandardMaterial color="#111" transparent opacity={0.8}/></mesh>
        <mesh position={[-0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
        <mesh position={[0.7,0.4,2.1]}><boxGeometry args={[0.3,0.2,0.1]}/><meshBasicMaterial color="#ffffcc"/></mesh>
        <mesh position={[-0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
        <mesh position={[0.7,0.4,-2.1]}><boxGeometry args={[0.4,0.15,0.1]}/><meshBasicMaterial color="#f00"/></mesh>
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
  const {user}=useUser(); const name=user?.firstName||'Guest';

  const handleCustomEvent = useCallback((data: any) => {
    if (data.type === 'START_1V1') {
      setPhase('playing');setLives(3);setXp(0);setDist(0);
    }
  }, []);
  const {remotePlayers,sendUpdate,sendCustomEvent}=useMultiplayer('highway',name,handleCustomEvent);

  const start=()=>{
    if (remotePlayers.length > 0) {
      sendCustomEvent({ type: 'START_1V1' });
    }
    setPhase('playing');setLives(3);setXp(0);setDist(0);
  };
  const crash=useCallback(async()=>{setLives(p=>{const n=p-1;if(n<=0)setPhase('gameover');return n}); setXp(p=>Math.max(0,p-15)); try{await addGameXP(-15)}catch{}},[]);
  const tick=useCallback(async()=>{setDist(p=>p+1);setXp(p=>p+5);try{await addGameXP(5)}catch{}},[]);

  if(phase==='lobby') return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 animate-fade-in font-outfit">
      <Link href="/dashboard/games" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground bg-accent/50 px-4 py-2 rounded-full"><ArrowLeft className="h-4 w-4"/>Back</Link>
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-orange-600 shadow-2xl shadow-red-500/30 text-5xl">🏎️</div>
        <h1 className="text-5xl font-black">Highway Racer 3D</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">Dodge oncoming traffic on a fast 3-lane highway! Use A/D or gamepad to switch lanes. +5 XP/2s, -15 XP per crash.<strong className="text-primary block mt-2">✨ 2-PLAYER MULTIPLAYER ✨</strong></p>
      </div>
      <button onClick={start} className="w-full rounded-2xl bg-foreground text-background py-5 font-black text-xl shadow-xl hover:opacity-90 hover:scale-[1.02] transition-all">RACE SOLO</button>

      {remotePlayers.length > 0 && (
        <div className="fixed bottom-10 left-10 pointer-events-auto animate-fade-in z-50">
          <button onClick={start} className="bg-gradient-to-r from-green-500 to-emerald-600 border-[3px] border-white/20 text-white font-black text-2xl px-8 py-5 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-105 transition-transform flex items-center justify-center gap-3">
            <span className="animate-pulse">✨</span> PLAYER JOINED! PLAY 1V1 MAP <span className="animate-pulse">✨</span>
          </button>
        </div>
      )}
    </div>
  );

  if(phase==='gameover') return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in z-50 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2.5rem] p-8 border border-border/50 text-center space-y-6">
        <div className="text-7xl">💥</div><h2 className="text-4xl font-black">Wrecked!</h2>
        <p className="text-muted-foreground text-sm">Survived {dist} checkpoints.</p>
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
      <Canvas shadows camera={{position:[0,8,12],fov:60}}>
        <color attach="background" args={['#0f172a']}/>
        <ambientLight intensity={0.4}/><directionalLight castShadow position={[20,40,20]} intensity={1.2} shadow-mapSize={[2048,2048]}/>
        <Sky sunPosition={[100,5,100]} turbidity={10} rayleigh={3}/>
        <GameScene onCrash={crash} onTick={tick} remotePlayers={remotePlayers} sendUpdate={sendUpdate} playerName={name} active={phase==='playing'}/>
      </Canvas>
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <button onClick={()=>setPhase('lobby')} className="bg-black/60 backdrop-blur-md text-white border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-black/80"><ArrowLeft className="w-5 h-5"/>Quit</button>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex flex-col items-center"><span className="text-[10px] text-green-400 font-bold uppercase animate-pulse">Multiplayer</span><span className="text-sm font-black text-white">{remotePlayers.length+1} Online</span></div>
        </div>
        <div className="flex-1"/>
        <div className="flex justify-between items-end pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="flex gap-1">{Array.from({length:3}).map((_,i)=>(<Heart key={i} className={`w-6 h-6 ${i<lives?'text-red-500 fill-red-500':'text-gray-600'}`}/>))}</div>
          </div>
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500"/><span className="text-2xl font-black text-white">{xp} XP</span></div>
            <span className="text-xs text-gray-400 font-bold">{dist} Checkpoints</span>
          </div>
        </div>
      </div>
    </div>
  );
}
