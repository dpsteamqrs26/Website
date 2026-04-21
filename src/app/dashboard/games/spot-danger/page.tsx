'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, AlertTriangle, CheckCircle2, Zap, RotateCcw, Timer, ChevronRight, Sparkles, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Scenario = {
  id: number;
  title: string;
  description: string;
  dangers: { id: number; label: string; x: number; y: number }[];
  background: string;
  image: string;
};

const scenarios: Scenario[] = [
  {
    id: 1,
    title: 'School Zone',
    description: 'Find 3 dangerous behaviors in this school zone scene',
    dangers: [
      { id: 1, label: 'Child running into road', x: 30, y: 60 },
      { id: 2, label: 'Car speeding past school', x: 70, y: 45 },
      { id: 3, label: 'Missing crossing guard', x: 50, y: 70 },
    ],
    background: 'from-blue-950/80 to-sky-950/80',
    image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Busy Intersection',
    description: 'Spot 3 unsafe behaviors at this intersection',
    dangers: [
      { id: 1, label: 'Pedestrian jaywalking', x: 25, y: 55 },
      { id: 2, label: 'Driver running red light', x: 65, y: 35 },
      { id: 3, label: 'Cyclist without helmet', x: 80, y: 60 },
    ],
    background: 'from-amber-950/80 to-orange-950/80',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 3,
    title: 'Residential Street',
    description: 'Find 3 hazards on this residential street',
    dangers: [
      { id: 1, label: 'Kids playing near parked cars', x: 20, y: 65 },
      { id: 2, label: 'Obstructed stop sign', x: 75, y: 25 },
      { id: 3, label: 'Car parked on sidewalk', x: 55, y: 50 },
    ],
    background: 'from-green-950/80 to-emerald-950/80',
    image: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?q=80&w=1200&auto=format&fit=crop',
  },
];

export default function SpotDangerGame() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'complete' | 'gameover'>('ready');
  const [totalScore, setTotalScore] = useState(0);
  const [clickFeedback, setClickFeedback] = useState<{ x: number; y: number; correct: boolean } | null>(null);

  const scenario = scenarios[scenarioIndex];

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('gameover');
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const hitDanger = scenario.dangers.find(
      d => !found.has(d.id) && Math.abs(d.x - x) < 12 && Math.abs(d.y - y) < 12
    );

    if (hitDanger) {
      const newFound = new Set(found);
      newFound.add(hitDanger.id);
      setFound(newFound);
      setTotalScore(prev => prev + 1);
      setClickFeedback({ x, y, correct: true });

      if (newFound.size === scenario.dangers.length) {
        if (scenarioIndex < scenarios.length - 1) {
          setTimeout(() => {
            setScenarioIndex(prev => prev + 1);
            setFound(new Set());
            setTimeLeft(30);
          }, 1000);
        } else {
          setTimeout(() => setGameState('complete'), 1000);
        }
      }
    } else {
      setClickFeedback({ x, y, correct: false });
    }

    setTimeout(() => setClickFeedback(null), 800);
  };

  const start = () => {
    setGameState('playing');
    setTimeLeft(30);
    setFound(new Set());
    setTotalScore(0);
    setScenarioIndex(0);
  };

  /* ── LOBBY ── */
  if (gameState === 'ready') {
    return (
      <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
        <div className="absolute inset-0 z-0 bg-black">
          <img
            src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=2000&auto=format&fit=crop"
            alt="Road Scene"
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
          <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-amber-500/10 border border-amber-500/20 backdrop-blur-md shadow-inner mt-4">
            <Crosshair className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">Perception Engine Active</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.8] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            HAZARD <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 filter drop-shadow-[0_0_40px_rgba(245,158,11,0.4)]">SCANNER</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-amber-500 pl-4 sm:pl-6 leading-relaxed">
            Identify hidden dangers in high-pressure road scenes. Tap to mark hazardous behaviors before the timer expires.
            <span className="block mt-4 text-amber-400 font-bold">+25 XP</span> per successful scan completion.
          </p>

          <button onClick={start} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            BEGIN SCAN
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  /* ── RESULTS ── */
  if (gameState === 'complete' || gameState === 'gameover') {
    const xp = totalScore * 5;
    return (
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate"
        >
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-amber-600/20 blur-[100px] -z-10" />

          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-zinc-900 border border-zinc-800 text-white mb-6 drop-shadow-lg">
            {gameState === 'complete' ? (
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-zinc-500" />
            )}
          </div>

          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
            {gameState === 'complete' ? 'ALL CLEAR' : 'TIME EXPIRED'}
          </h2>
          <p className="text-zinc-400 uppercase font-black tracking-widest text-xs mb-8">
            Scan metrics recorded.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner mb-6">
            <p className="text-5xl font-black text-white mb-2">{totalScore}/{scenarios.reduce((s, sc) => s + sc.dangers.length, 0)}</p>
            <p className="text-zinc-400 text-xs uppercase font-black tracking-widest mb-4">Dangers Spotted</p>
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold">
              <Zap className="h-5 w-5 fill-current drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              <span className="text-3xl font-black text-white">+{xp}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={start} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              RESCAN
            </button>
            <Link href="/dashboard/games" className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors block text-center">
              ABORT TO HUB
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── GAMEPLAY ── */
  return (
    <div className="relative w-full h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 font-sans">
      {/* HUD overlays */}
      <div className="absolute inset-0 pointer-events-none p-6 sm:p-8 flex flex-col justify-between z-20">
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]" />

        {/* Top HUD */}
        <div className="flex justify-between items-start pointer-events-auto relative z-20">
          <Link href="/dashboard/games" className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4" /> ABORT
          </Link>

          <div className="flex gap-4">
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Scene</span>
              <span className="text-lg font-black">{scenarioIndex + 1}/{scenarios.length}</span>
            </div>
            <div className={`bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-6 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[100px] transition-colors ${timeLeft <= 10 ? 'border-red-500/50' : ''}`}>
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Timer</span>
              <span className={`text-2xl font-black tracking-tighter ${timeLeft <= 10 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scene Area */}
      <div
        className="absolute inset-0 cursor-crosshair z-10"
        onClick={handleClick}
      >
        <img 
          src={scenario.image} 
          alt={scenario.title}
          className="w-full h-full object-cover opacity-70"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${scenario.background}`} />

        {/* Found danger markers */}
        {scenario.dangers.map(d => (
          <AnimatePresence key={d.id}>
            {found.has(d.id) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute"
                style={{ left: `${d.x}%`, top: `${d.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-400/20 backdrop-blur-sm flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                  </div>
                  <span className="mt-1.5 rounded-full bg-black/80 backdrop-blur-xl px-3 py-1 text-xs font-bold text-white whitespace-nowrap border border-white/20 shadow-lg">{d.label}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ))}

        {/* Click feedback */}
        <AnimatePresence>
          {clickFeedback && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute pointer-events-none"
              style={{ left: `${clickFeedback.x}%`, top: `${clickFeedback.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {clickFeedback.correct ? (
                <CheckCircle2 className="h-12 w-12 text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.3)]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
          <div className="rounded-full bg-black/60 backdrop-blur-xl px-6 py-2.5 text-xs font-bold text-white border border-white/10 flex items-center gap-3 shadow-lg">
            <Eye className="h-4 w-4 text-amber-400" />
            <span>Click on unsafe behaviors</span>
            <span className="h-4 w-px bg-white/20" />
            <span className="text-amber-400">{found.size}/{scenario.dangers.length} found</span>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-6 right-8 z-30 flex gap-2">
          {scenario.dangers.map(d => (
            <div key={d.id} className={`h-3 w-3 rounded-full transition-all duration-300 ${found.has(d.id) ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-white/20 border border-white/30'}`} />
          ))}
        </div>
      </div>

      {/* Scan line overlay */}
      <div className="absolute inset-0 game-scanline pointer-events-none z-20" />
    </div>
  );
}
