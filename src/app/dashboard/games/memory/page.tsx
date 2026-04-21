'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, RotateCcw, Brain, Shield, AlertTriangle, Info,
  CheckCircle2, ChevronRight, Flame, Timer, Sparkles, Eye
} from 'lucide-react';
import { addGameXP } from '@/app/actions';

type Card = {
  id: number;
  icon: any;
  label: string;
  color: string;
  isFlipped: boolean;
  isMatched: boolean;
};

const SIGNS = [
  { icon: Shield, label: 'Safety First', color: '#10b981' },
  { icon: AlertTriangle, label: 'Danger Ahead', color: '#ef4444' },
  { icon: Info, label: 'Information', color: '#3b82f6' },
  { icon: CheckCircle2, label: 'Safe to Go', color: '#22c55e' },
  { icon: Shield, label: 'Seatbelt', color: '#f59e0b' },
  { icon: AlertTriangle, label: 'Road Work', color: '#f97316' },
  { icon: Info, label: 'Hospital', color: '#06b6d4' },
  { icon: CheckCircle2, label: 'School Zone', color: '#8b5cf6' },
];

export default function MemoryMatchGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'complete'>('lobby');
  const [xpPersisted, setXpPersisted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initGame = useCallback(() => {
    const shuffledCards: Card[] = [...SIGNS, ...SIGNS]
      .sort(() => Math.random() - 0.5)
      .map((sign, index) => ({
        ...sign,
        id: index,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setTimer(0);
    setCombo(0);
    setBestCombo(0);
    setPhase('playing');
    setXpPersisted(false);
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const handleCardClick = (id: number) => {
    if (phase !== 'playing' || flippedCards.length === 2 || cards[id].isFlipped || cards[id].isMatched) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;

      if (cards[firstId].label === cards[secondId].label) {
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstId].isMatched = true;
          matchedCards[secondId].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
          setMatches(m => m + 1);
          setCombo(c => {
            const newCombo = c + 1;
            setBestCombo(b => Math.max(b, newCombo));
            return newCombo;
          });
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstId].isFlipped = false;
          resetCards[secondId].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
          setCombo(0);
        }, 800);
      }
    }
  };

  useEffect(() => {
    if (matches === SIGNS.length && phase === 'playing') {
      setPhase('complete');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [matches, phase]);

  const xpEarned = Math.max(10, 120 - moves * 3 - timer);

  useEffect(() => {
    if (phase === 'complete' && !xpPersisted) {
      const persistXP = async () => {
        try { await addGameXP(xpEarned); setXpPersisted(true); } catch {}
      };
      persistXP();
    }
  }, [phase, xpEarned, xpPersisted]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── LOBBY ──
  if (phase === 'lobby') {
    return (
      <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black flex items-center justify-center font-sans shadow-2xl border border-white/10 group isolate p-4 py-12">
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-black to-purple-950/30" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 p-6 sm:p-10 max-w-4xl w-full flex flex-col items-start justify-center text-left h-full">
          <Link href="/dashboard/games" className="absolute top-8 left-8 inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full hover:bg-white/10 uppercase">
            <ArrowLeft className="w-4 h-4" /> Hub
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md shadow-inner mt-4">
            <Brain className="w-3 h-3 text-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">Neural Pattern Engine</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] leading-[0.85] font-black tracking-tighter mb-8 uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
            SIGNAL <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 filter drop-shadow-[0_0_40px_rgba(99,102,241,0.4)]">MATRIX</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-xl font-medium mb-12 drop-shadow-md border-l-2 border-indigo-500 pl-4 sm:pl-6 leading-relaxed">
            Decode the neural pattern grid. Match road safety signal pairs to extract maximum intelligence.
            <span className="text-indigo-400 font-black"> Combo multipliers</span> reward consecutive matches.
            <span className="block mt-3 text-zinc-500 text-sm">Up to <span className="text-amber-400 font-black">120 XP</span> based on speed and accuracy.</span>
          </p>

          <button onClick={initGame} className="group relative w-full max-w-sm py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.03] transition-all overflow-hidden flex items-center justify-center gap-3">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            INITIALIZE SCAN
            <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </button>
        </div>
      </div>
    );
  }

  // ── COMPLETE ──
  if (phase === 'complete') {
    const rating = moves <= 10 ? 'LEGENDARY' : moves <= 14 ? 'ELITE' : moves <= 18 ? 'ADVANCED' : 'STANDARD';
    const ratingColor = moves <= 10 ? 'text-amber-400' : moves <= 14 ? 'text-purple-400' : moves <= 18 ? 'text-blue-400' : 'text-zinc-400';

    return (
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 p-4 font-sans rounded-[2.5rem] overflow-hidden border border-white/10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-950/80 w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 text-center shadow-[0_0_80px_rgba(0,0,0,1)] relative overflow-hidden isolate"
        >
          <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-indigo-600/20 blur-[100px] -z-10" />

          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)]">
            <Brain className="w-12 h-12" />
          </div>

          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-1">PATTERN DECODED</h2>
          <p className={`text-sm font-black tracking-[0.2em] uppercase mb-8 ${ratingColor}`}>{rating} Performance</p>

          <div className="grid grid-cols-3 gap-3 my-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
              <p className="text-3xl font-black text-white">{moves}</p>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">Moves</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
              <p className="text-3xl font-black text-cyan-400">{formatTime(timer)}</p>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">Time</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
              <p className="text-3xl font-black text-amber-400">{bestCombo}x</p>
              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-widest mt-1">Best Combo</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner mb-6 flex justify-between items-center px-8">
            <span className="text-xs text-zinc-400 uppercase font-black tracking-widest">XP Extracted</span>
            <span className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">+{xpEarned}</span>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={initGame} className="group relative w-full py-5 rounded-2xl font-black tracking-widest text-black uppercase bg-white shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] hover:scale-[1.02] transition-all overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              RESCAN MATRIX
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
    <div className="relative w-full min-h-[85vh] rounded-[2.5rem] overflow-hidden bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-black to-purple-950/10" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-600/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />

      {/* Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] pointer-events-none z-30" />

      <div className="relative z-10 p-6 sm:p-8 flex flex-col h-full min-h-[85vh]">
        {/* Top HUD */}
        <div className="flex justify-between items-start mb-6">
          <button onClick={() => setPhase('lobby')} className="group bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex items-center gap-3 font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <ArrowLeft className="w-4 h-4" /> ABORT
          </button>

          <div className="flex gap-3">
            {/* Combo */}
            <AnimatePresence>
              {combo > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 text-amber-400 px-5 py-3 rounded-2xl flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                  <Flame className="w-4 h-4 fill-current" />
                  <span className="text-lg font-black">{combo}x</span>
                  <span className="text-[10px] font-black tracking-widest uppercase">Combo</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer */}
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[100px]">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Elapsed</span>
              <span className="text-xl font-black tracking-tighter">{formatTime(timer)}</span>
            </div>

            {/* Moves */}
            <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-white px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] min-w-[100px]">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-0.5">Scans</span>
              <span className="text-xl font-black tracking-tighter">{moves}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 px-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Decryption Progress</span>
            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">{matches}/{SIGNS.length}</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              animate={{ width: `${(matches / SIGNS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-3 sm:gap-4 max-w-xl w-full">
            {cards.map((card) => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                whileHover={!card.isFlipped && !card.isMatched ? { scale: 1.05 } : {}}
                whileTap={!card.isFlipped && !card.isMatched ? { scale: 0.95 } : {}}
                className={`aspect-square rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  card.isMatched ? 'opacity-40' : ''
                }`}
              >
                <AnimatePresence mode="wait">
                  {card.isFlipped || card.isMatched ? (
                    <motion.div
                      key="back"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: 90 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center border-2 shadow-lg"
                      style={{
                        borderColor: card.color,
                        backgroundColor: `${card.color}15`,
                        boxShadow: `0 0 30px ${card.color}30`,
                      }}
                    >
                      <card.icon className="h-8 w-8 sm:h-10 sm:w-10 mb-2" style={{ color: card.color }} />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-300 text-center px-1">{card.label}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="front"
                      initial={{ rotateY: -90 }}
                      animate={{ rotateY: 0 }}
                      exit={{ rotateY: -90 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] hover:border-white/[0.15] transition-colors cursor-pointer group"
                    >
                      <Eye className="h-6 w-6 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
