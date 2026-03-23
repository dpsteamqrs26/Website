import Link from 'next/link';
import { Metadata } from "next";
import { Play, Zap, Target, PersonStanding, Car, Radar, TrafficCone, ChevronRight, Sparkles, Orbit } from 'lucide-react';

const games = [
  {
    id: 'roadsafety',
    title: 'City Drive Auto',
    category: 'Simulation',
    description: 'Next-gen open-world city driving. Experience realistic traffic logic, dynamic environments, and complex driving scenarios.',
    icon: Car,
    bgGradient: 'from-violet-900/60 via-purple-900/60 to-zinc-950',
    accentColor: 'text-violet-400',
    borderGlow: 'group-hover:border-violet-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(139,92,246,0.5)]',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop',
    xp: '50 XP',
    difficulty: 'Expert',
    engine: 'Unreal Engine 5',
    tags: ['Open World', 'Multiplayer'],
  },
  {
    id: 'parking',
    title: 'Precision Parker',
    category: 'Spatial Awareness',
    description: 'Master tight maneuvers in ultra-realistic lighting. Complete complex parking scenarios with pixel-perfect hitboxes and physics.',
    icon: Target,
    bgGradient: 'from-emerald-900/60 via-teal-900/60 to-zinc-950',
    accentColor: 'text-emerald-400',
    borderGlow: 'group-hover:border-emerald-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)]',
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
    borderGlow: 'group-hover:border-amber-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(245,158,11,0.5)]',
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
    borderGlow: 'group-hover:border-rose-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(225,29,72,0.5)]',
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
    borderGlow: 'group-hover:border-blue-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(59,130,246,0.5)]',
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
    borderGlow: 'group-hover:border-fuchsia-500/50',
    shadowGlow: 'group-hover:shadow-[0_0_50px_-10px_rgba(217,70,239,0.5)]',
    image: 'https://images.unsplash.com/photo-1616428751502-3c467a36cb00?q=80&w=800&auto=format&fit=crop',
    xp: '15 XP',
    difficulty: 'Medium',
    engine: 'Unreal Engine 5',
    tags: ['Dynamic', 'Control'],
  },
];

export const metadata: Metadata = {
  title: "Interactive Games & Simulations",
  description: "Play immersive road safety games. From city driving simulations to precision parking challenges, master your skills in high-fidelity 3D environments.",
  openGraph: {
    title: "Interactive Road Safety Games | Wayyat",
    description: "Experience AAA-quality simulations and sharpen your driving reflexes in our immersive game hub.",
  },
};

export default function GamesPage() {
  return (
    <div className="relative w-full min-h-[calc(100vh-8rem)] rounded-[2.5rem] overflow-hidden bg-zinc-950 text-zinc-50 font-sans shadow-2xl shadow-black/80 border border-zinc-800 animate-fade-in group">
      {/* Hyper-realistic Background Ambient Lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-black">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-600/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />
      </div>

      <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col mb-16 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit shadow-[0_4px_24px_-4px_rgba(255,255,255,0.05)]">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Unreal 3D Environment Active</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.9]">
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-500 drop-shadow-sm">
              Immersive
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              Simulations
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-2xl max-w-2xl font-medium leading-relaxed drop-shadow-md">
            Experience AAA-quality road safety training. High-fidelity environments, hyper-realistic physics, and high-stakes multiplayer action.
          </p>

          <div className="absolute top-0 right-10 hidden lg:block opacity-20 group-hover:opacity-40 transition-opacity duration-1000 pointer-events-none mix-blend-screen">
             <Orbit className="w-64 h-64 text-indigo-400 animate-spin-slow" strokeWidth={0.5} />
          </div>
        </div>

        {/* 3D Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/dashboard/games/${game.id}`}
              className="group/card relative flex flex-col h-[450px] rounded-[2rem] overflow-hidden transition-all duration-700 hover:scale-[1.03] hover:-translate-y-3 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-4 focus:ring-offset-zinc-950 isolate"
            >
              {/* Background Image & Volumetric Overlay Layers */}
              <div className="absolute inset-0 z-0 bg-zinc-900">
                <img 
                  src={game.image} 
                  alt={game.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover/card:scale-110 group-hover/card:rotate-1 opacity-60 mix-blend-luminosity group-hover/card:mix-blend-normal group-hover/card:opacity-100" 
                />
                {/* Dynamic Lighting Overlays */}
                <div className={`absolute inset-0 bg-gradient-to-b ${game.bgGradient} opacity-90 transition-opacity duration-700 group-hover/card:opacity-40 mix-blend-multiply`} />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent opacity-100 group-hover/card:opacity-90 transition-opacity duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent w-3/4 opacity-100 group-hover/card:opacity-60 transition-opacity duration-500" />
              </div>

              {/* Glowing Glass Border on Hover */}
              <div className={`absolute inset-0 z-20 border-2 border-white/5 rounded-[2rem] transition-colors duration-700 ${game.borderGlow} pointer-events-none`} />
              
              {/* Card Content - Top area */}
              <div className="relative z-30 p-8 flex flex-col justify-end h-full w-full">
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                  <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center gap-2 shadow-lg">
                    <game.icon className={`w-4 h-4 ${game.accentColor} drop-shadow-[0_0_8px_currentColor]`} />
                    <span className="text-[10px] font-black tracking-widest uppercase text-white drop-shadow-md">
                      {game.category}
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black text-zinc-300 uppercase tracking-widest shadow-inner">
                    {game.engine}
                  </div>
                </div>

                {/* Card Content - Bottom animated info */}
                <div className="transform transition-all duration-500 translate-y-8 group-hover/card:translate-y-0 relative z-30 w-full mb-8">
                  <h3 className="text-4xl font-black text-white mb-3 tracking-tighter drop-shadow-[0_4px_16px_rgba(0,0,0,1)] uppercase">
                    {game.title}
                  </h3>
                  
                  {/* Persistent Info that fades out on hover */}
                  <div className="absolute left-0 bottom-[-32px] w-full flex items-center justify-between transition-all duration-500 group-hover/card:opacity-0 group-hover/card:translate-y-4">
                     <div className="flex items-center gap-4">
                       <span className={`flex items-center gap-1.5 text-sm font-black uppercase tracking-wider ${game.accentColor} drop-shadow-[0_0_12px_currentColor]`}>
                         <Zap className="w-4 h-4 fill-current animate-pulse" />
                         {game.xp}
                       </span>
                       <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400">
                         {game.difficulty}
                       </span>
                     </div>
                  </div>

                  {/* Hidden info that appears on hover */}
                  <div className="opacity-0 group-hover/card:opacity-100 transition-all duration-500 delay-100 translate-y-4 group-hover/card:translate-y-0">
                    <p className="text-zinc-300 text-sm mb-6 line-clamp-2 drop-shadow-xl font-medium">
                      {game.description}
                    </p>

                    <div className="flex items-center justify-between w-full h-12">
                      <div className="flex gap-2">
                        {game.tags.map(tag => (
                          <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white/10 rounded-full border border-white/20 text-white backdrop-blur-md shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)]">
                            <Sparkles className="w-2.5 h-2.5 inline-block mr-1 text-indigo-300" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-white text-black group-hover/card:animate-pulse shadow-[0_0_30px_rgba(255,255,255,0.6)] cursor-pointer hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-1 fill-black" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ambient Glow Behind Card */}
              <div className={`absolute -inset-4 z-[-1] rounded-[3rem] opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 blur-3xl ${game.shadowGlow} pointer-events-none mix-blend-screen`} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
