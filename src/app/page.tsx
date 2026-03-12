import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Shield, BookOpen, Gamepad2, Trophy, Zap, BarChart3,
  ArrowRight, CheckCircle2, Users, Target, Star
} from "lucide-react";

function TrafficLight() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-800 p-3 shadow-2xl">
      <div className="h-10 w-10 rounded-full bg-red-500 animate-traffic-blink shadow-lg shadow-red-500/50" style={{ animationDelay: '0s' }} />
      <div className="h-10 w-10 rounded-full bg-yellow-400 animate-traffic-blink shadow-lg shadow-yellow-400/50" style={{ animationDelay: '0.5s' }} />
      <div className="h-10 w-10 rounded-full bg-green-500 animate-traffic-blink shadow-lg shadow-green-500/50" style={{ animationDelay: '1s' }} />
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Road */}
      <div className="relative h-64 flex items-end justify-center">
        {/* Traffic signals */}
        <div className="absolute top-0 left-8 animate-float" style={{ animationDelay: '0s' }}>
          <TrafficLight />
        </div>
        <div className="absolute top-4 right-12 animate-float" style={{ animationDelay: '1s' }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30 text-white text-2xl font-bold">
            🚸
          </div>
        </div>
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-float" style={{ animationDelay: '0.5s' }}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl shadow-green-500/30">
            <Shield className="h-10 w-10 text-white" />
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute bottom-8 right-4 animate-float" style={{ animationDelay: '1.5s' }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg text-white text-lg">
            ⚠️
          </div>
        </div>
        <div className="absolute top-12 left-1/2 animate-float" style={{ animationDelay: '2s' }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-red-500 shadow-lg text-white text-sm">
            🛑
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: BookOpen,
    title: "Safety Courses",
    description: "Structured learning modules on traffic signs, pedestrian safety, cycling, and more.",
    color: "from-blue-500 to-blue-600",
    shadow: "shadow-blue-500/20",
  },
  {
    icon: Gamepad2,
    title: "Mini Games",
    description: "Test your knowledge with fun quizzes, reaction games, and road crossing simulators.",
    color: "from-purple-500 to-purple-600",
    shadow: "shadow-purple-500/20",
  },
  {
    icon: Zap,
    title: "Earn XP",
    description: "Complete lessons and quizzes to earn experience points and level up your safety profile.",
    color: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-500/20",
  },
  {
    icon: Trophy,
    title: "Leaderboards",
    description: "Compete with other learners and climb the rankings to become a road safety champion.",
    color: "from-green-500 to-emerald-600",
    shadow: "shadow-green-500/20",
  },
  {
    icon: Target,
    title: "Track Progress",
    description: "Monitor your learning journey with detailed progress tracking and streak counters.",
    color: "from-rose-500 to-pink-600",
    shadow: "shadow-rose-500/20",
  },
  {
    icon: Star,
    title: "Achievements",
    description: "Unlock badges and achievements as you master different road safety topics.",
    color: "from-cyan-500 to-teal-600",
    shadow: "shadow-cyan-500/20",
  },
];

const howItWorks = [
  { step: "1", title: "Sign Up", description: "Create your free account in seconds" },
  { step: "2", title: "Learn", description: "Take interactive courses on road safety" },
  { step: "3", title: "Practice", description: "Test knowledge with games and quizzes" },
  { step: "4", title: "Level Up", description: "Earn XP and climb the leaderboard" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50/50 to-cyan-50 dark:from-green-950/20 dark:via-background dark:to-cyan-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-200/30 via-transparent to-transparent dark:from-green-800/10" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <div className="text-center lg:text-left animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-400">
                <Shield className="h-4 w-4" />
                Road Safety Education Platform
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl" style={{ fontFamily: 'var(--font-outfit)' }}>
                Learn Road Safety.{" "}
                <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  Save Lives.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl mx-auto lg:mx-0">
                Master traffic rules, earn XP through gamified learning, and become a road safety champion.
                Fun, interactive, and designed for young learners.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start justify-center">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="group flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-8 text-base font-semibold text-white shadow-xl shadow-green-500/25 transition-all hover:shadow-green-500/40 hover:scale-105">
                      Start Learning Road Safety
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="group flex h-13 items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-8 text-base font-semibold text-white shadow-xl shadow-green-500/25 transition-all hover:shadow-green-500/40 hover:scale-105"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </SignedIn>
                <Link
                  href="/dashboard/learn"
                  className="flex h-13 items-center gap-2 rounded-full border border-border px-8 text-base font-semibold transition-all hover:bg-accent"
                >
                  Browse Courses
                </Link>
              </div>
            </div>

            {/* Illustration */}
            <div className="hidden lg:block">
              <HeroIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative border-y border-border/50 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 stagger-children">
            {[
              { value: "10+", label: "Safety Courses", icon: BookOpen },
              { value: "50+", label: "Quiz Questions", icon: Target },
              { value: "4", label: "Mini Games", icon: Gamepad2 },
              { value: "3", label: "Skill Levels", icon: BarChart3 },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-3xl font-extrabold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: 'var(--font-outfit)' }}>
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                Stay Safe
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform combining education, gamification, and community to make road safety fun and engaging.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/50 bg-card p-6 transition-all card-hover"
              >
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} ${feature.shadow} shadow-lg transition-transform group-hover:scale-110`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-transparent via-accent/30 to-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: 'var(--font-outfit)' }}>
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {howItWorks.map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-xl font-bold text-white shadow-lg shadow-green-500/25">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Level System ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: 'var(--font-outfit)' }}>
              Level Up Your Safety Knowledge
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Progress through three traffic-light levels as you learn and earn XP
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 stagger-children">
            {[
              { level: "RED", range: "0 – 499 XP", icon: "🔴", title: "Beginner", description: "Start your road safety journey. Learn the basics of traffic signs and pedestrian rules.", color: "from-red-500 to-rose-600", border: "border-red-200 dark:border-red-800" },
              { level: "YELLOW", range: "500 – 1499 XP", icon: "🟡", title: "Intermediate", description: "Dive deeper into cycling safety, driving basics, and hazard awareness.", color: "from-amber-500 to-yellow-500", border: "border-amber-200 dark:border-amber-800" },
              { level: "GREEN", range: "1500+ XP", icon: "🟢", title: "Expert", description: "Master advanced topics, ace all quizzes, and dominate the leaderboard.", color: "from-green-500 to-emerald-600", border: "border-green-200 dark:border-green-800" },
            ].map((level) => (
              <div key={level.level} className={`rounded-2xl border ${level.border} bg-card p-8 text-center card-hover`}>
                <div className="mx-auto mb-4 text-5xl">{level.icon}</div>
                <div className={`mx-auto mb-3 inline-block rounded-full bg-gradient-to-r ${level.color} px-4 py-1 text-xs font-bold text-white uppercase tracking-wider`}>
                  {level.level} Level
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{level.title}</h3>
                <p className="mb-3 text-sm text-muted-foreground">{level.description}</p>
                <p className="text-xs font-semibold text-muted-foreground">{level.range}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 p-10 text-center text-white shadow-2xl shadow-green-500/20 sm:p-16">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-extrabold sm:text-4xl" style={{ fontFamily: 'var(--font-outfit)' }}>
                Ready to Make Roads Safer?
              </h2>
              <p className="mt-4 text-lg text-green-50 max-w-xl mx-auto">
                Join Wayyat today and start your road safety journey. It&apos;s fun, free, and could save lives.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="group flex h-13 items-center gap-2 rounded-full bg-white px-8 text-base font-bold text-green-600 shadow-xl transition-all hover:bg-green-50 hover:scale-105">
                      Get Started Free
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="group flex h-13 items-center gap-2 rounded-full bg-white px-8 text-base font-bold text-green-600 shadow-xl transition-all hover:bg-green-50 hover:scale-105"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
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
