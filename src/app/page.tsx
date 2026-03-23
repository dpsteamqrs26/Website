import Link from "next/link";
import { Metadata } from "next";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Shield, BookOpen, Gamepad2, Trophy, Zap, BarChart3,
  ArrowRight, Target, Star, MonitorPlay, Cpu, Orbit, Sparkles, Navigation
} from "lucide-react";

const features = [
  {
    icon: MonitorPlay,
    title: "Immersive Scenarios",
    description: "Experience hyper-realistic road environments powered by next-gen 3D physics.",
    color: "from-blue-600 to-indigo-700",
    shadow: "shadow-blue-500/30",
  },
  {
    icon: Gamepad2,
    title: "Interactive Simulations",
    description: "Navigate complex traffic logic, avoid hazards, and master vehicle control.",
    color: "from-purple-600 to-fuchsia-700",
    shadow: "shadow-purple-500/30",
  },
  {
    icon: Zap,
    title: "Real-Time XP",
    description: "Gain experience dynamically as you perform correct actions in our engine.",
    color: "from-amber-600 to-orange-700",
    shadow: "shadow-amber-500/30",
  },
  {
    icon: Trophy,
    title: "Global Leaderboards",
    description: "Compete against thousands of players worldwide in high-stakes visual trials.",
    color: "from-emerald-600 to-teal-700",
    shadow: "shadow-emerald-500/30",
  },
  {
    icon: Cpu,
    title: "Advanced AI",
    description: "React to highly unpredictable, intelligently driven AI agents simulating real drivers.",
    color: "from-rose-600 to-red-700",
    shadow: "shadow-rose-500/30",
  },
  {
    icon: Star,
    title: "Dynamic Achievements",
    description: "Unlock legendary visual badges and profile flairs as you conquer expert levels.",
    color: "from-cyan-600 to-blue-700",
    shadow: "shadow-cyan-500/30",
  },
];

const howItWorks = [
  { step: "01", title: "Initialize Profile", description: "Create your next-gen road safety ID" },
  { step: "02", title: "Enter Simulation", description: "Launch directly into AAA 3D environments" },
  { step: "03", title: "Survive & Learn", description: "React to dynamic hazards and perfect your skills" },
  { step: "04", title: "Rank Up", description: "Climb the global tiers and unlock rewards" },
];

export const metadata: Metadata = {
  title: "Home | Wayyat",
  description: "Welcome to Wayyat, the ultimate road safety education platform. Experience hyper-realistic 3D simulations, engage in interactive courses, and master traffic rules in a gamified environment.",
  openGraph: {
    title: "Home | Wayyat",
    description: "Experience AAA-quality road safety simulations and master traffic dynamics in high-fidelity 3D environments.",
    images: [
      {
        url: "/favicon.ico",
        width: 800,
        height: 600,
        alt: "Wayyat Road Safety",
      },
    ],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* ── Hyper-Realistic Hero Section ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Asset */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=2000&auto=format&fit=crop" 
            alt="Hyper-realistic night driving" 
            className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-105 animate-slow-pan" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/80 to-zinc-950 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          
          {/* Volumetric Lights */}
          <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
          <div className="absolute bottom-0 right-1/4 w-[50vw] h-[50vw] bg-rose-600/10 rounded-full blur-[150px] mix-blend-screen" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center mt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(255,255,255,0.05)] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] font-black tracking-widest text-zinc-300 uppercase">Unreal 5 Environment Enabled</span>
          </div>
          
          <h1 className="text-6xl sm:text-7xl lg:text-9xl font-black tracking-tighter mb-6 leading-[0.9] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-600 drop-shadow-lg">
              ROAD SAFETY
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 drop-shadow-[0_0_40px_rgba(168,85,247,0.4)]">
              REIMAGINED.
            </span>
          </h1>
          
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-zinc-400 sm:text-2xl font-medium drop-shadow-md animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            Immerse yourself in AAA-quality driving simulations. Master complex traffic dynamics and dynamic hazards in high-fidelity 3D environments.
          </p>
          
          <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-lg font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden isolate">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  INITIATE SIMULATION
                  <Orbit className="h-6 w-6 transition-transform group-hover:rotate-180 duration-700" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-lg font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden isolate"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                ENTER HUB
                <Orbit className="h-6 w-6 transition-transform group-hover:rotate-180 duration-700" />
              </Link>
            </SignedIn>
            <Link
              href="/dashboard/games/roadsafety"
              className="group flex h-16 items-center gap-3 rounded-full border border-white/20 bg-black/40 backdrop-blur-md px-10 text-lg font-bold text-white transition-all hover:bg-white/10 hover:border-white/40"
            >
              <MonitorPlay className="h-5 w-5 text-indigo-400 group-hover:text-pink-400 transition-colors" />
              SPECTATE MODE
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Telemetry ── */}
      <section className="relative border-y border-white/5 bg-black/50 backdrop-blur-2xl z-20 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "4K", label: "Resolution Assets", icon: MonitorPlay },
              { value: "120", label: "FPS Physics", icon: Zap },
              { value: "6", label: "AAA Simulations", icon: Gamepad2 },
              { value: "3D", label: "Spatial Audio", icon: Target },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center p-4 border border-white/5 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-default group">
                <stat.icon className="h-6 w-6 text-indigo-400 mb-3 group-hover:text-pink-400 transition-colors drop-shadow-[0_0_10px_currentColor]" />
                <div className="text-4xl font-black text-white tracking-tighter drop-shadow-lg mb-1">
                  {stat.value}
                </div>
                <div className="text-xs font-bold tracking-widest text-zinc-500 uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Next-Gen Features Grid ── */}
      <section className="py-24 sm:py-32 relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900/50 to-zinc-950 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tighter sm:text-6xl uppercase">
              Proprietary{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                Technology
              </span>
            </h2>
            <p className="mt-6 text-xl text-zinc-400 max-w-3xl mx-auto font-medium">
              We leverage cutting-edge game engine architectures to deliver unmatched realism in educational simulation. 
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.7)] isolate overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-20 blur-3xl -z-10 group-hover:opacity-40 transition-opacity duration-700`} />
                <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} ${feature.shadow} shadow-lg ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-500`}>
                  <feature.icon className="h-6 w-6 text-white drop-shadow-md" />
                </div>
                <h3 className="mb-3 text-2xl font-black text-white tracking-tight uppercase"><Sparkles className="inline-block w-4 h-4 mr-2 text-zinc-500" />{feature.title}</h3>
                <p className="text-base font-medium leading-relaxed text-zinc-400">{feature.description}</p>
                <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${feature.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Operational Protocol (How It Works) ── */}
      <section className="py-24 sm:py-32 relative bg-black border-y border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-xs font-black tracking-widest text-zinc-400 uppercase">
              <Navigation className="w-3 h-3" /> System Sequence
            </div>
            <h2 className="text-4xl font-black tracking-tighter sm:text-5xl uppercase text-white">
              Operational Protocol
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative text-center group">
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-[2px] bg-gradient-to-r from-white/20 to-transparent -z-10 group-hover:from-indigo-500/50 transition-colors" />
                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-zinc-900/80 backdrop-blur-xl text-3xl font-black text-white shadow-[0_0_30px_rgba(0,0,0,0.8)] group-hover:border-indigo-500/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] transition-all duration-500 transform group-hover:-translate-y-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-black text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-zinc-400 font-medium px-4">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tier System ── */}
      <section className="py-24 sm:py-32 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tighter sm:text-5xl text-white uppercase">
              Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Tier System</span>
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { level: "BRONZE", range: "0 – 499 SR", title: "Rookie Driver", description: "Basic simulation access. Standard hazard perception metrics active.", color: "from-amber-700 to-amber-900", border: "border-amber-900/50", glow: "shadow-amber-900/20" },
              { level: "SILVER", range: "500 – 1499 SR", title: "Pro Operator", description: "Advanced physics enabled. Wet weather conditions and complex intersections unlocked.", color: "from-zinc-400 to-zinc-600", border: "border-zinc-500/50", glow: "shadow-zinc-500/20" },
              { level: "GOLD", range: "1500+ SR", title: "Elite Navigator", description: "Full sensory overload. Expert traffic logic, zero margin for error.", color: "from-yellow-400 to-yellow-600", border: "border-yellow-500/50", glow: "shadow-yellow-500/20" },
            ].map((level) => (
              <div key={level.level} className={`relative rounded-[2rem] border ${level.border} bg-zinc-950 p-10 text-center shadow-2xl ${level.glow} transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_50px_rgba(0,0,0,1)] overflow-hidden group`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${level.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                
                <div className={`mx-auto mb-6 inline-block rounded-full bg-gradient-to-r ${level.color} px-6 py-1.5 text-xs font-black text-black uppercase tracking-widest shadow-lg`}>
                  {level.level} ELO
                </div>
                <h3 className="mb-4 text-3xl font-black text-white tracking-tighter">{level.title}</h3>
                <p className="mb-6 text-zinc-400 font-medium leading-relaxed">{level.description}</p>
                <div className="mt-auto px-4 py-3 rounded-xl bg-black/50 border border-white/5 font-mono text-sm font-bold text-zinc-300">
                  {level.range}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24 sm:py-32 border-t border-white/5 relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1463620695885-b1a8f906e00c?q=80&w=2000&auto=format&fit=crop" 
            alt="Racing background" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950 mix-blend-multiply" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-zinc-950/80 backdrop-blur-2xl p-12 text-center text-white shadow-[0_0_100px_rgba(0,0,0,1)] sm:p-20">
            <div className="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/3 -translate-y-1/3 rounded-full bg-indigo-600/20 blur-[100px]" />
            <div className="absolute bottom-0 left-0 h-[500px] w-[500px] -translate-x-1/3 translate-y-1/3 rounded-full bg-pink-600/20 blur-[100px]" />

            <div className="relative">
              <h2 className="text-5xl font-black sm:text-7xl tracking-tighter uppercase mb-6 leading-none">
                Commence <br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-500">Operation</span>
              </h2>
              <p className="mt-6 text-xl text-zinc-300 max-w-2xl mx-auto font-medium">
                The servers are online. The engines are primed. Join the most advanced road safety simulation platform today.
              </p>
              <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-xl font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      LINK PROFILE
                      <Zap className="h-6 w-6 text-black fill-current" />
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-xl font-black text-black shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    PROCEED TO HUB
                    <Zap className="h-6 w-6 text-black fill-current" />
                  </Link>
                </SignedIn>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
