'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, RotateCcw, Timer, ChevronRight, Gauge, Target, AlertTriangle } from 'lucide-react';
import { addGameXP } from '@/app/actions';

type Phase = 'lobby' | 'waiting' | 'go' | 'result' | 'complete';

export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>('lobby');
  const [reactionTime, setReactionTime] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [lightColor, setLightColor] = useState<'red' | 'yellow' | 'green'>('red');
  const [tooEarly, setTooEarly] = useState(false);
  const [xpPersisted, setXpPersisted] = useState(false);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const totalRounds = 5;

  const startRound = useCallback(() => {
    setTooEarly(false);
    setLightColor('red');

    const delay = 2000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setLightColor('yellow');
      setTimeout(() => {
        setLightColor('green');
        setPhase('go');
        startTimeRef.current = performance.now();
      }, 500);
    }, delay);

    setPhase('waiting');
  }, []);

  const startGame = () => {
    setResults([]);
    setRound(1);
    setXpPersisted(false);
    startRound();
  };

  const handleClick = () => {
    if (phase === 'waiting') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTooEarly(true);
      setPhase('result');
      return;
    }

    if (phase === 'go') {
      const time = Math.round(performance.now() - startTimeRef.current);
      setReactionTime(time);
      setResults(prev => [...prev, time]);
      setPhase('result');
      return;
    }

    if (phase === 'result') {
      if (round >= totalRounds) {
        setPhase('complete');
      } else {
        setRound(prev => prev + 1);
        startRound();
      }
    }
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const averageTime = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
  const bestTime = results.length > 0 ? Math.min(...results) : 0;
  const xpEarned = results.length > 0 ? Math.max(5, 50 - Math.floor(averageTime / 20)) : 0;

  useEffect(() => {
    if (phase === 'complete' && !xpPersisted) {
      const persist = async () => { try { await addGameXP(xpEarned); setXpPersisted(true); } catch {} };
      persist();
    }
  }, [phase, xpEarned, xpPersisted]);

  const getRating = (ms: number) => {
    if (ms < 200) return { label: 'INHUMAN', color: '#f59e0b', icon: '⚡' };
    if (ms < 300) return { label: 'ELITE', color: '#8b5cf6', icon: '🔥' };
    if (ms < 400) return { label: 'SHARP', color: '#3b82f6', icon: '🎯' };
    if (ms < 500) return { label: 'AVERAGE', color: '#10b981', icon: '👍' };
    return { label: 'SLOW', color: '#ef4444', icon: '🐢' };
  };

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-black to-cyan-950/20" />
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
          <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md shadow-inner mt-4">
            <Gauge className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">Neural Reflex Calibrator</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.85] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            REFLEX <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-400 to-cyan-500 filter drop-shadow-[0_0_40px_rgba(16,185,129,0.4)]">PROTOCOL</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-emerald-500 pl-4 sm:pl-6 leading-relaxed">
            Calibrate your neural response latency across <span className="text-white font-bold">{totalRounds} rounds</span>. React to signal state transitions with maximum precision.
            <span className="block mt-3 text-zinc-500 text-sm">Up to <span className="text-amber-400 font-black">50 XP</span> based on average response time.</span>
          </p>

          <button onClick={startGame} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            BEGIN CALIBRATION
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETE ──
  if (phase === 'complete') {
    const rating = getRating(averageTime);

    return (
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate"
        >
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-emerald-600/20 blur-[100px] -z-10" />

          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <Gauge className="w-12 h-12" />
          </div>

          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-1">CALIBRATION COMPLETE</h2>
          <p className="text-sm font-black tracking-[0.2em] uppercase mb-6" style={{ color: rating.color }}>{rating.icon} {rating.label} Reflexes</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner mb-6">
            <p className="text-6xl font-black text-white tracking-tighter drop-shadow-lg mb-1">{averageTime}<span className="text-xl text-zinc-500">ms</span></p>
            <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Average Response Latency</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
              <p className="text-2xl font-black text-emerald-400">{bestTime}<span className="text-xs text-zinc-500">ms</span></p>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">Best Time</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
              <p className="text-2xl font-black text-amber-400">+{xpEarned}</p>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">XP Extracted</p>
            </div>
          </div>

          {/* Round breakdown */}
          <div className="flex justify-center gap-2 flex-wrap mb-8">
            {results.map((r, i) => {
              const rt = getRating(r);
              return (
                <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-black border" style={{ color: rt.color, borderColor: `${rt.color}30`, backgroundColor: `${rt.color}10` }}>
                  R{i + 1}: {r}ms
                </span>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={startGame} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              RECALIBRATE
            </button>
            <Link href="/dashboard/games" className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 hover:bg-white/5 transition-colors block text-center">
              ABORT TO HUB
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── PLAYING ──
  return (
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 font-sans flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/10 via-black to-black" />
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none z-30" />

      {/* Dynamic glow based on light color */}
      <AnimatePresence>
        {lightColor === 'green' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/5 pointer-events-none z-0"
          />
        )}
        {lightColor === 'red' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Top HUD */}
      <div className="relative z-10 p-6 sm:p-8 flex justify-between items-start">
        <button onClick={() => setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <ArrowLeft className="w-4 h-4" /> ABORT
        </button>

        <div className="flex gap-3">
          <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[120px]">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Round</span>
            <span className="text-xl font-black tracking-tighter">{round}/{totalRounds}</span>
          </div>
          {results.length > 0 && (
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[120px]">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Last</span>
              <span className="text-xl font-black tracking-tighter">{results[results.length - 1]}ms</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Area — Clickable */}
      <div
        className="relative z-10 flex-1 flex flex-col items-center justify-center cursor-pointer select-none px-6"
        onClick={handleClick}
      >
        {/* Traffic Light */}
        <motion.div
          animate={{
            scale: lightColor === 'green' ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 rounded-[2rem] bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 shadow-[0_0_60px_rgba(0,0,0,0.8)] mb-10"
        >
          <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full transition-all duration-300 ${
            lightColor === 'red'
              ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.6),0_0_80px_rgba(239,68,68,0.3)]'
              : 'bg-red-950/40'
          }`} />
          <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full transition-all duration-300 ${
            lightColor === 'yellow'
              ? 'bg-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.6),0_0_80px_rgba(250,204,21,0.3)]'
              : 'bg-yellow-950/40'
          }`} />
          <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full transition-all duration-300 ${
            lightColor === 'green'
              ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.6),0_0_80px_rgba(16,185,129,0.3)]'
              : 'bg-emerald-950/40'
          }`} />
        </motion.div>

        {/* State Text */}
        <AnimatePresence mode="wait">
          {phase === 'waiting' && (
            <motion.div key="wait" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
              <p className="text-2xl sm:text-3xl font-black text-red-500 uppercase tracking-tight animate-pulse">Wait for GREEN...</p>
              <p className="text-sm text-zinc-600 mt-2 font-bold uppercase tracking-widest">Do not click yet</p>
            </motion.div>
          )}
          {phase === 'go' && (
            <motion.div key="go" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <p className="text-4xl sm:text-5xl font-black text-emerald-400 uppercase tracking-tight">CLICK NOW!</p>
              <p className="text-sm text-emerald-400/60 mt-2 font-bold uppercase tracking-widest animate-pulse">React immediately</p>
            </motion.div>
          )}
          {phase === 'result' && !tooEarly && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <p className="text-6xl sm:text-7xl font-black text-white tracking-tighter drop-shadow-lg">{reactionTime}<span className="text-2xl text-zinc-500">ms</span></p>
              <p className="text-sm font-black uppercase tracking-widest mt-2" style={{ color: getRating(reactionTime).color }}>
                {getRating(reactionTime).icon} {getRating(reactionTime).label}
              </p>
              <p className="text-xs text-zinc-600 mt-4 font-bold uppercase tracking-widest">Click to {round >= totalRounds ? 'finish' : 'continue'}</p>
            </motion.div>
          )}
          {phase === 'result' && tooEarly && (
            <motion.div key="early" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-3xl font-black text-red-500 uppercase tracking-tight">TOO EARLY</p>
              <p className="text-sm text-zinc-500 mt-2 font-bold uppercase tracking-widest">Wait for the green signal</p>
              <p className="text-xs text-zinc-600 mt-4 font-bold uppercase tracking-widest">Click to retry</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom progress dots */}
      <div className="relative z-10 flex justify-center gap-3 pb-8">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded-full transition-all duration-500 ${
              i < results.length
                ? 'w-8 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                : i === results.length
                ? 'w-8 bg-white/30 animate-pulse'
                : 'w-2.5 bg-zinc-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
