'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Zap, Target, PersonStanding, Car, Radar, TrafficCone, ChevronRight, Sparkles, Orbit, Brain, Eye, Timer, Crosshair } from 'lucide-react';
import GameCard3D from '@/components/game-card-3d';

const games = [
  {
    id: 'roadsafety',
    title: 'City Drive Auto',
    category: 'Simulation',
    description: 'Next-gen open-world city driving. Experience realistic traffic logic, dynamic environments, and complex driving scenarios.',
    icon: Car,
    bgGradient: 'from-violet-900/60 via-purple-900/60 to-zinc-950',
    accentColor: 'text-violet-400',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop',
    xp: '50 XP',
    difficulty: 'Expert',
    engine: 'Unreal Engine 5',
    tags: ['Open World', 'Multiplayer'],
    featured: true,
  },
  {
    id: 'parking',
    title: 'Precision Parker',
    category: 'Spatial Awareness',
    description: 'Master tight maneuvers in ultra-realistic lighting. Complete complex parking scenarios with pixel-perfect hitboxes and physics.',
    icon: Target,
    bgGradient: 'from-emerald-900/60 via-teal-900/60 to-zinc-950',
    accentColor: 'text-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=800&auto=format&fit=crop',
    xp: '60 XP',
    difficulty: 'Hard',
    engine: 'Unity HDRP',
    tags: ['Physics', 'Real-time'],
  },
  {
    id: 'crossing',
    title: 'Urban Crosser',
    category: 'Reflex Simulation',
    description: 'Immersive pedestrian survival simulation. Dodge high-fidelity AI vehicles in dense, atmospheric and perilous city streets.',
    icon: PersonStanding,
    bgGradient: 'from-amber-900/60 via-orange-900/60 to-zinc-950',
    accentColor: 'text-amber-400',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    image: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800&auto=format&fit=crop',
    xp: '20 XP',
    difficulty: 'Medium',
    engine: 'Unreal Engine 5',
    tags: ['AI Agents', 'Atmosphere'],
  },
  {
    id: 'highway-racer',
    title: 'Apex Highway',
    category: 'High-Speed Reflexes',
    description: 'Experience blistering speeds, motion blur, and cinematic close calls in this hyper-realistic endless highway racing trial.',
    icon: Zap,
    bgGradient: 'from-rose-900/60 via-red-900/60 to-zinc-950',
    accentColor: 'text-rose-400',
    glowColor: 'rgba(225, 29, 72, 0.4)',
    image: 'https://images.unsplash.com/photo-1463620695885-b1a8f906e00c?q=80&w=800&auto=format&fit=crop',
    xp: 'Bonus/sec',
    difficulty: 'Expert',
    engine: 'Custom 3D',
    tags: ['Velocity', 'Cinematic'],
  },
  {
    id: 'traffic-controller',
    title: 'Gridlock Warden',
    category: 'Strategic Flow',
    description: 'Command volumetric-lit intersections. Use strategic traffic management to prevent catastrophic hyper-realistic collisions.',
    icon: TrafficCone,
    bgGradient: 'from-blue-900/60 via-cyan-900/60 to-zinc-950',
    accentColor: 'text-blue-400',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=800&auto=format&fit=crop',
    xp: '10 XP',
    difficulty: 'Hard',
    engine: 'Unity HDRP',
    tags: ['Simulation', 'Strategic'],
  },
  {
    id: 'speed-trap',
    title: 'Velocity Limit',
    category: 'Environmental Awareness',
    description: 'Navigate dynamically shifting speed zones. A visually stunning test of your observation and precise vehicular control.',
    icon: Radar,
    bgGradient: 'from-fuchsia-900/60 via-pink-900/60 to-zinc-950',
    accentColor: 'text-fuchsia-400',
    glowColor: 'rgba(217, 70, 239, 0.4)',
    image: 'https://images.unsplash.com/photo-1616428751502-3c467a36cb00?q=80&w=800&auto=format&fit=crop',
    xp: '15 XP',
    difficulty: 'Medium',
    engine: 'Unreal Engine 5',
    tags: ['Dynamic', 'Control'],
  },
  {
    id: 'spot-danger',
    title: 'Hazard Scanner',
    category: 'Perception Training',
    description: 'Identify hidden dangers in high-pressure road scenes. Train your visual perception to detect hazards instantly.',
    icon: Eye,
    bgGradient: 'from-orange-900/60 via-amber-900/60 to-zinc-950',
    accentColor: 'text-orange-400',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=800&auto=format&fit=crop',
    xp: '25 XP',
    difficulty: 'Medium',
    engine: 'AI Vision',
    tags: ['Observation', 'Timed'],
  },
  {
    id: 'memory',
    title: 'Signal Matrix',
    category: 'Cognitive Training',
    description: 'Decode neural pattern grids. Match road safety signal pairs with combo multipliers for maximum intelligence extraction.',
    icon: Brain,
    bgGradient: 'from-indigo-900/60 via-violet-900/60 to-zinc-950',
    accentColor: 'text-indigo-400',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop',
    xp: '20 XP',
    difficulty: 'Easy',
    engine: 'Neural',
    tags: ['Memory', 'Signs'],
  },
  {
    id: 'reaction',
    title: 'Reflex Protocol',
    category: 'Reaction Testing',
    description: 'Calibrate neural response latency across 5 rounds. React to traffic signal state transitions with surgical precision.',
    icon: Timer,
    bgGradient: 'from-cyan-900/60 via-teal-900/60 to-zinc-950',
    accentColor: 'text-cyan-400',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop',
    xp: '15 XP',
    difficulty: 'Easy',
    engine: 'Reflex',
    tags: ['Speed', 'Precision'],
  },
  {
    id: 'quiz',
    title: 'Road IQ',
    category: 'Cognitive Training',
    description: 'Test your road safety knowledge against dynamic scenario-based questions. Visual quizzes with progressive difficulty.',
    icon: Crosshair,
    bgGradient: 'from-yellow-900/60 via-amber-900/60 to-zinc-950',
    accentColor: 'text-yellow-400',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop',
    xp: '30 XP',
    difficulty: 'Medium',
    engine: 'AI Quiz',
    tags: ['Knowledge', 'Adaptive'],
  },
];

const categories = ['All', 'Simulation', 'Reflexes', 'Cognitive'];

function getDifficultyColor(d: string) {
  if (d === 'Expert') return 'text-red-400';
  if (d === 'Hard') return 'text-amber-400';
  return 'text-emerald-400';
}

export default function GamesPage() {
  const [filter, setFilter] = useState('All');

  const filteredGames = filter === 'All' ? games : games.filter(g => {
    if (filter === 'Simulation') return ['Simulation', 'Spatial Awareness', 'Strategic Flow', 'Environmental Awareness'].includes(g.category);
    if (filter === 'Reflexes') return ['Reflex Simulation', 'High-Speed Reflexes', 'Reaction Testing', 'Perception Training'].includes(g.category);
    if (filter === 'Cognitive') return ['Cognitive Training'].includes(g.category);
    return true;
  });

  const featured = games.find(g => g.featured);
  const rest = filteredGames.filter(g => !g.featured || filter !== 'All');

  return (
    <div className="relative w-full min-h-[calc(100vh-8rem)] rounded-[2.5rem] overflow-hidden bg-zinc-950 text-zinc-50 font-sans shadow-2xl shadow-black/80 border border-zinc-800 group">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[150px] mix-blend-screen animate-hero-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/8 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] bg-yellow-600/5 rounded-full blur-[100px] mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />
      </div>

      <div className="relative z-10 p-6 md:p-10 lg:p-14 flex flex-col h-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col mb-12 relative"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_4px_24px_-4px_rgba(255,255,255,0.05)]">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">10 Simulations Available</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-4 leading-[0.9]">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500">
              Immersive
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 drop-shadow-[0_0_40px_rgba(250,204,21,0.3)]">
              Simulations
            </span>
          </h1>
          
          <p className="text-zinc-400 text-base md:text-lg max-w-2xl font-medium leading-relaxed">
            Experience AAA-quality road safety training. High-fidelity environments, hyper-realistic physics, and multiplayer action.
          </p>

          {/* Category Filter */}
          <div className="flex gap-2 mt-8 flex-wrap">
            {categories.map(cat => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-black tracking-widest uppercase transition-all border ${
                  filter === cat
                    ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Featured Game (Only in "All" view) */}
        {filter === 'All' && featured && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-10"
          >
            <Link href={`/dashboard/games/${featured.id}`} className="group/featured block">
              <GameCard3D glowColor={featured.glowColor} className="rounded-[2rem] overflow-hidden">
                <div className="relative h-[280px] md:h-[360px] overflow-hidden rounded-[2rem] border border-white/10">
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover/featured:scale-110 opacity-60 group-hover/featured:opacity-80"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${featured.bgGradient} opacity-70 group-hover/featured:opacity-40 transition-opacity`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  
                  {/* Featured badge */}
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <div className="px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/40 backdrop-blur-md">
                      <span className="text-[10px] font-black tracking-widest text-yellow-300 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> Featured
                      </span>
                    </div>
                    <div className="px-3 py-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                      <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">{featured.engine}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-xs font-black tracking-widest uppercase mb-2 ${featured.accentColor}`}>
                          {featured.category}
                        </p>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-3">
                          {featured.title}
                        </h2>
                        <p className="text-zinc-300 text-sm max-w-lg font-medium line-clamp-2">{featured.description}</p>
                        <div className="flex gap-2 mt-4">
                          {featured.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full border border-white/20 text-white backdrop-blur-md">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.5)] group-hover/featured:scale-110 transition-transform">
                        <Play className="w-6 h-6 ml-1 fill-black" />
                      </div>
                    </div>
                  </div>

                  {/* Scan line overlay */}
                  <div className="absolute inset-0 game-scanline pointer-events-none rounded-[2rem]" />
                </div>
              </GameCard3D>
            </Link>
          </motion.div>
        )}

        {/* Game Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-8"
          >
            {(filter === 'All' ? rest : filteredGames).map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              >
                <Link href={`/dashboard/games/${game.id}`} className="group/card block">
                  <GameCard3D glowColor={game.glowColor} className="rounded-[2rem] overflow-hidden">
                    <div className="relative flex flex-col h-[400px] rounded-[2rem] overflow-hidden border border-white/5 hover:border-white/20 transition-colors duration-500">
                      {/* Background Image */}
                      <div className="absolute inset-0 z-0">
                        <img 
                          src={game.image} 
                          alt={game.title} 
                          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover/card:scale-110 opacity-50 mix-blend-luminosity group-hover/card:mix-blend-normal group-hover/card:opacity-90" 
                        />
                        <div className={`absolute inset-0 bg-gradient-to-b ${game.bgGradient} opacity-80 transition-opacity duration-700 group-hover/card:opacity-40`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                      </div>

                      {/* Top badges */}
                      <div className="relative z-10 p-6 flex justify-between items-start">
                        <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center gap-2">
                          <game.icon className={`w-3.5 h-3.5 ${game.accentColor}`} />
                          <span className="text-[9px] font-black tracking-widest uppercase text-white">{game.category}</span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black text-zinc-300 uppercase tracking-widest">
                          {game.engine}
                        </div>
                      </div>

                      {/* Bottom content */}
                      <div className="relative z-10 mt-auto p-6 flex flex-col">
                        <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">
                          {game.title}
                        </h3>
                        
                        {/* Default info */}
                        <div className="flex items-center gap-4 transition-all duration-300 group-hover/card:opacity-0 group-hover/card:translate-y-2">
                          <span className={`flex items-center gap-1.5 text-sm font-black uppercase tracking-wider ${game.accentColor}`}>
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            {game.xp}
                          </span>
                          <span className={`text-xs font-bold uppercase tracking-wider ${getDifficultyColor(game.difficulty)}`}>
                            {game.difficulty}
                          </span>
                        </div>

                        {/* Hover info */}
                        <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-y-4 group-hover/card:translate-y-0">
                          <p className="text-zinc-200 text-xs mb-4 line-clamp-2 font-medium">{game.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                              {game.tags.map(tag => (
                                <span key={tag} className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/10 rounded-full border border-white/15 text-white">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.5)]">
                              <Play className="w-4 h-4 ml-0.5 fill-black" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scan line effect */}
                      <div className="absolute inset-0 game-scanline pointer-events-none" />
                    </div>
                  </GameCard3D>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
