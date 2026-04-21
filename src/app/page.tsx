'use client';

import { useRef, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import {
  Shield, BookOpen, Gamepad2, Trophy, Zap, BarChart3,
  ArrowRight, Target, Star, MonitorPlay, Cpu, Orbit, Sparkles, Navigation,
  ChevronDown, Play, Users, Award, TrendingUp
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PARTICLE HIGHWAY — Thousands of particles forming a road
   stretching into infinity with perspective depth
   ═══════════════════════════════════════════════════════════════ */
function ParticleHighway({ count = 3000 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Create a highway shape — particles in lane formation
      const lane = (Math.random() - 0.5) * 8;
      const depth = Math.random() * 60 - 30;
      const height = (Math.random() - 0.5) * 0.5;

      positions[i * 3] = lane;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = depth;

      // Color: mix of cyan, amber, white creating traffic light effect
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        // Amber/yellow — headlights
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 0.2;
      } else if (colorChoice < 0.5) {
        // Red — taillights
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.15;
        colors[i * 3 + 2] = 0.1;
      } else if (colorChoice < 0.7) {
        // White — street lights
        colors[i * 3] = 0.9;
        colors[i * 3 + 1] = 0.95;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Cyan / blue accent
        colors[i * 3] = 0.3;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 1.0;
      }

      sizes[i] = Math.random() * 3 + 0.5;
      speeds[i] = Math.random() * 0.5 + 0.2;
    }

    return { positions, colors, sizes, speeds };
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;
    const positions = mesh.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      // Move particles towards camera (z-axis)
      positions[i * 3 + 2] += particles.speeds[i] * 0.15;

      // Reset particles that pass camera
      if (positions[i * 3 + 2] > 30) {
        positions[i * 3 + 2] = -30;
        positions[i * 3] = (Math.random() - 0.5) * 8;
      }

      // Subtle wave motion
      positions[i * 3 + 1] = Math.sin(time * 0.5 + i * 0.01) * 0.15;
    }

    mesh.current.geometry.attributes.position.needsUpdate = true;
    mesh.current.rotation.y = Math.sin(time * 0.1) * 0.02;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FLOATING SHIELD — Glowing, rotating shield emblem
   ═══════════════════════════════════════════════════════════════ */
function FloatingShield() {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.3;
      groupRef.current.position.y = Math.sin(t * 0.6) * 0.3;
    }
    if (ringRef1.current) {
      ringRef1.current.rotation.x = t * 0.5;
      ringRef1.current.rotation.z = t * 0.3;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.x = -t * 0.4;
      ringRef2.current.rotation.y = t * 0.6;
    }
    if (coreRef.current) {
      const pulse = Math.sin(t * 2) * 0.1 + 1;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <group ref={groupRef}>
        {/* Core sphere — glowing */}
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[0.8, 2]} />
          <meshStandardMaterial
            color="#facc15"
            emissive="#facc15"
            emissiveIntensity={2}
            roughness={0}
            metalness={1}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Inner glow sphere */}
        <mesh>
          <sphereGeometry args={[1.0, 32, 32]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#f59e0b"
            emissiveIntensity={0.5}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Orbital ring 1 */}
        <mesh ref={ringRef1}>
          <torusGeometry args={[1.5, 0.02, 16, 100]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#818cf8"
            emissiveIntensity={3}
            transparent
            opacity={0.8}
          />
        </mesh>

        {/* Orbital ring 2 */}
        <mesh ref={ringRef2}>
          <torusGeometry args={[1.8, 0.015, 16, 100]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={3}
            transparent
            opacity={0.6}
          />
        </mesh>

        {/* Orbital ring 3 — larger, more subtle */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[2.2, 0.01, 16, 100]} />
          <meshStandardMaterial
            color="#f472b6"
            emissive="#f472b6"
            emissiveIntensity={2}
            transparent
            opacity={0.4}
          />
        </mesh>

        {/* Small orbiting satellites */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <OrbitingSatellite key={i} index={i} />
        ))}

        {/* Point lights for volumetric glow */}
        <pointLight color="#facc15" intensity={5} distance={8} />
        <pointLight color="#818cf8" intensity={3} distance={6} position={[2, 0, 0]} />
        <pointLight color="#06b6d4" intensity={3} distance={6} position={[-2, 0, 0]} />
      </group>
    </Float>
  );
}

function OrbitingSatellite({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const angle = (index / 6) * Math.PI * 2;
  const radius = 1.2 + index * 0.2;
  const speed = 0.8 + index * 0.15;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime * speed + angle;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 2) * 0.3;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.04, 8, 8]} />
      <meshStandardMaterial
        color={index % 2 === 0 ? '#facc15' : '#818cf8'}
        emissive={index % 2 === 0 ? '#facc15' : '#818cf8'}
        emissiveIntensity={5}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AMBIENT DUST — Floating volumetric particles
   ═══════════════════════════════════════════════════════════════ */
function AmbientDust({ count = 500 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[particles, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#ffffff"
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN 3D SCENE — Full cinematic composition
   ═══════════════════════════════════════════════════════════════ */
function CinematicScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 8], fov: 60, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.5 }}
      style={{ pointerEvents: 'none' }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 8, 35]} />

      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#fef3c7" />

      <Suspense fallback={null}>
        <ParticleHighway count={4000} />
        <FloatingShield />
        <AmbientDust count={600} />
        <Stars radius={50} depth={50} count={2000} factor={3} saturation={0.5} fade speed={0.5} />
      </Suspense>

      {/* Post-processing */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0005, 0.0005)}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KINETIC TEXT — Character-by-character reveal
   ═══════════════════════════════════════════════════════════════ */
function KineticText({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 40, rotateX: -90 }}
          animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
          transition={{
            duration: 0.5,
            delay: delay + i * 0.03,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="inline-block"
          style={{ transformOrigin: 'bottom' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REVEAL SECTION — Scroll-driven entrance
   ═══════════════════════════════════════════════════════════════ */
function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAT COUNTER
   ═══════════════════════════════════════════════════════════════ */
function AnimatedStat({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -6, scale: 1.04 }}
      className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-xl overflow-hidden cursor-default"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Icon className="h-5 w-5 text-amber-400 mb-3 group-hover:text-cyan-400 transition-colors duration-500 drop-shadow-[0_0_12px_currentColor]" />
      <div className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-lg mb-1">{value}</div>
      <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">{label}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */
const features = [
  {
    icon: MonitorPlay,
    title: "Immersive 3D Worlds",
    description: "Step into hyper-realistic road environments with dynamic lighting, weather, and volumetric effects.",
    gradient: "from-blue-500 via-indigo-500 to-violet-600",
    glow: "group-hover:shadow-[0_0_60px_rgba(99,102,241,0.3)]",
  },
  {
    icon: Gamepad2,
    title: "AAA Game Mechanics",
    description: "Navigate complex traffic with real physics. Every collision, every near-miss, every save — felt.",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    glow: "group-hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]",
  },
  {
    icon: Zap,
    title: "Real-Time XP Engine",
    description: "Dynamic experience tracking that rewards precision, reaction speed, and road awareness.",
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "group-hover:shadow-[0_0_60px_rgba(245,158,11,0.3)]",
  },
  {
    icon: Trophy,
    title: "Global Leaderboards",
    description: "Compete against thousands worldwide. Climb tiers from Bronze to Legendary Elite status.",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    glow: "group-hover:shadow-[0_0_60px_rgba(20,184,166,0.3)]",
  },
  {
    icon: Cpu,
    title: "Adaptive AI Traffic",
    description: "AI-driven vehicles that learn, react, and create unpredictable scenarios every session.",
    gradient: "from-rose-500 via-red-500 to-orange-500",
    glow: "group-hover:shadow-[0_0_60px_rgba(244,63,94,0.3)]",
  },
  {
    icon: Award,
    title: "Achievement System",
    description: "Unlock legendary badges, profile flairs, and exclusive content as you master each discipline.",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    glow: "group-hover:shadow-[0_0_60px_rgba(6,182,212,0.3)]",
  },
];

const steps = [
  { num: "01", title: "Create Profile", desc: "Build your driver identity" },
  { num: "02", title: "Enter Simulation", desc: "Launch into 3D worlds" },
  { num: "03", title: "Master Skills", desc: "React, learn, and survive" },
  { num: "04", title: "Climb Ranks", desc: "Dominate the leaderboard" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Home() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050510] text-zinc-50 font-sans selection:bg-amber-500/30 overflow-hidden">

      {/* ═══════════ HERO SECTION ═══════════ */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* 3D Scene — Full viewport */}
        <div className="absolute inset-0 z-0">
          <CinematicScene />
        </div>

        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#050510] via-transparent to-[#050510]/40 pointer-events-none" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#050510]/60 via-transparent to-[#050510]/60 pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-10 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-2xl"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.25em] text-zinc-300 uppercase">Simulation Engine v3.0 Online</span>
          </motion.div>

          {/* Main Title — Kinetic */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <h1 className="text-6xl sm:text-8xl lg:text-[9rem] font-black tracking-[-0.06em] leading-[0.85] mb-6">
              <span className="block bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-200 to-zinc-700 pb-2">
                <KineticText text="ROAD" delay={0.6} />
              </span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500 drop-shadow-[0_0_60px_rgba(250,204,21,0.4)]">
                <KineticText text="SAFETY" delay={0.9} />
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="max-w-2xl text-lg sm:text-xl text-zinc-400 font-medium leading-relaxed mb-12"
          >
            Experience the future of road safety education through
            <span className="text-white font-bold"> cinematic 3D simulations</span>,
            <span className="text-amber-400 font-bold"> AAA-quality games</span>, and
            <span className="text-cyan-400 font-bold"> adaptive AI challenges</span>.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <SignedOut>
              <SignInButton mode="modal">
                <button className="group relative flex h-14 items-center gap-3 rounded-full bg-white px-8 text-base font-black text-black overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <Play className="h-5 w-5 fill-current" />
                  <span className="relative">START SIMULATION</span>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="group relative flex h-14 items-center gap-3 rounded-full bg-white px-8 text-base font-black text-black overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Play className="h-5 w-5 fill-current" />
                <span className="relative">ENTER HUB</span>
              </Link>
            </SignedIn>
            <Link
              href="/dashboard/games"
              className="group flex h-14 items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl px-8 text-base font-bold text-white transition-all duration-500 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              <Gamepad2 className="h-5 w-5 text-amber-400 group-hover:text-cyan-400 transition-colors duration-500" />
              PLAY GAMES
            </Link>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3"
        >
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase">Explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-5 w-5 text-zinc-600" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══════════ STATS TELEMETRY BAR ═══════════ */}
      <RevealSection className="relative z-20 border-y border-white/[0.04] bg-[#050510]/80 backdrop-blur-3xl">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AnimatedStat value="12+" label="3D Games" icon={Gamepad2} />
            <AnimatedStat value="10K+" label="Players" icon={Users} />
            <AnimatedStat value="50+" label="Achievements" icon={Award} />
            <AnimatedStat value="∞" label="Replayability" icon={TrendingUp} />
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <RevealSection className="py-28 sm:py-36 relative z-10">
        {/* Background accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-900/[0.06] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold tracking-[0.25em] text-zinc-400 uppercase"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Core Systems
            </motion.div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] text-white">
              Next-Gen{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-500">
                Technology
              </span>
            </h2>
            <p className="mt-6 text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
              Cutting-edge game engine architectures deliver unmatched realism in educational simulation.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                whileHover={{ y: -8 }}
                className={`group relative rounded-3xl border border-white/[0.05] bg-white/[0.02] p-8 transition-all duration-500 hover:bg-white/[0.04] hover:border-white/[0.12] ${feature.glow} overflow-hidden`}
              >
                {/* Gradient accent */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-700`} />

                {/* Icon */}
                <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg ring-1 ring-white/10 group-hover:scale-110 group-hover:ring-white/20 transition-all duration-500`}>
                  <feature.icon className="h-5 w-5 text-white" />
                </div>

                <h3 className="mb-3 text-xl font-bold text-white tracking-tight">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors">{feature.description}</p>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left`} />
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <RevealSection className="py-28 sm:py-36 relative bg-black/30 border-y border-white/[0.04] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-amber-900/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold tracking-[0.25em] text-zinc-400 uppercase"
            >
              <Navigation className="w-3.5 h-3.5" /> Protocol Sequence
            </motion.div>
            <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.04em] text-white">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                className="relative text-center group"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}

                <motion.div
                  whileHover={{ y: -8, scale: 1.05 }}
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl text-3xl font-black group-hover:border-amber-500/30 group-hover:shadow-[0_0_40px_rgba(250,204,21,0.15)] transition-all duration-500"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-b from-amber-300 to-amber-600">
                    {step.num}
                  </span>
                </motion.div>
                <h3 className="mb-2 text-lg font-bold text-white">{step.title}</h3>
                <p className="text-sm text-zinc-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ TIER SYSTEM ═══════════ */}
      <RevealSection className="py-28 sm:py-36 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-6xl font-black tracking-[-0.04em] text-white">
              Global <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500">Tier System</span>
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { level: "BRONZE", range: "0 – 499 SR", title: "Rookie Driver", desc: "Basic simulation access. Standard hazard perception.", gradient: "from-amber-700 to-amber-900", border: "hover:border-amber-700/40", glow: "hover:shadow-[0_0_50px_rgba(180,83,9,0.2)]" },
              { level: "SILVER", range: "500 – 1499 SR", title: "Pro Operator", desc: "Advanced physics. Wet weather and complex intersections.", gradient: "from-zinc-300 to-zinc-500", border: "hover:border-zinc-400/40", glow: "hover:shadow-[0_0_50px_rgba(161,161,170,0.2)]" },
              { level: "GOLD", range: "1500+ SR", title: "Elite Navigator", desc: "Full sensory overload. Expert traffic logic, zero margin.", gradient: "from-yellow-300 to-yellow-500", border: "hover:border-yellow-500/40", glow: "hover:shadow-[0_0_50px_rgba(234,179,8,0.2)]" },
            ].map((tier, i) => (
              <motion.div
                key={tier.level}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                whileHover={{ y: -12 }}
                className={`group relative rounded-3xl border border-white/[0.05] bg-white/[0.02] p-10 text-center transition-all duration-500 ${tier.border} ${tier.glow} overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${tier.gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700`} />

                <div className={`mx-auto mb-6 inline-block rounded-full bg-gradient-to-r ${tier.gradient} px-6 py-1.5 text-xs font-black text-black uppercase tracking-[0.2em] shadow-lg`}>
                  {tier.level}
                </div>
                <h3 className="mb-3 text-2xl font-black text-white tracking-tight">{tier.title}</h3>
                <p className="mb-6 text-sm text-zinc-500 leading-relaxed">{tier.desc}</p>
                <div className="px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.05] font-mono text-sm font-bold text-zinc-400">
                  {tier.range}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <RevealSection className="py-28 sm:py-36 border-t border-white/[0.04] relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-1/4 w-[50vw] h-[50vw] bg-amber-600/[0.05] rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[50vw] h-[50vw] bg-indigo-600/[0.05] rounded-full blur-[150px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl p-14 sm:p-20 text-center overflow-hidden"
          >
            {/* Accent glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] translate-x-1/3 -translate-y-1/3 rounded-full bg-amber-500/10 blur-[100px]" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] -translate-x-1/3 translate-y-1/3 rounded-full bg-indigo-500/10 blur-[100px]" />

            <div className="relative">
              <h2 className="text-5xl sm:text-7xl font-black tracking-[-0.05em] text-white leading-[0.9] mb-6">
                Ready to{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-500">
                  Begin?
                </span>
              </h2>
              <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-medium">
                The simulation is live. The roads await. Join the most advanced road safety platform on the planet.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-lg font-black text-black overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <Zap className="h-5 w-5 fill-current relative" />
                      <span className="relative">JOIN NOW</span>
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="group relative flex h-16 items-center gap-3 rounded-full bg-white px-10 text-lg font-black text-black overflow-hidden transition-all duration-500 hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Zap className="h-5 w-5 fill-current relative" />
                    <span className="relative">ENTER DASHBOARD</span>
                  </Link>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        </div>
      </RevealSection>
    </div>
  );
}
