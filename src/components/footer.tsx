'use client';

import Link from 'next/link';
import { Github, Heart } from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const footerLinks = {
  platform: [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/learn', label: 'Courses' },
    { href: '/dashboard/games', label: 'Games' },
    { href: '/dashboard/leaderboard', label: 'Leaderboard' },
  ],
  resources: [
    { href: '/dashboard/achievements', label: 'Achievements' },
    { href: '/dashboard/learn', label: 'Traffic Signs' },
    { href: '/dashboard/learn', label: 'Road Safety Tips' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-border/30 bg-gradient-to-b from-background to-accent/10 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 group w-fit">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 transition-shadow group-hover:shadow-yellow-500/25 overflow-hidden"
              >
                <Image 
                  src="/favicon.ico" 
                  alt="Wayyat Logo" 
                  width={22} 
                  height={22}
                  className="object-contain"
                />
              </motion.div>
              <span className="text-lg font-bold">
                <span className="text-yellow-500">Way</span>
                <span className="text-foreground">yat</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Making roads safer through interactive education and gamified learning.
              Earn XP, complete courses, and become a road safety champion.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-1 w-12 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A Road Safety Initiative</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">Platform</h3>
            <ul className="space-y-2.5">
              {footerLinks.platform.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="group text-sm text-muted-foreground transition-colors hover:text-foreground flex items-center gap-2"
                  >
                    <span className="h-px w-0 bg-yellow-500 transition-all group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-foreground uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="group text-sm text-muted-foreground transition-colors hover:text-foreground flex items-center gap-2"
                  >
                    <span className="h-px w-0 bg-yellow-500 transition-all group-hover:w-3" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Wayyat. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-3.5 w-3.5 mx-0.5 text-red-500 fill-red-500 animate-pulse" /> by{' '}
            <a
              href="https://github.com/Achyut2009"
              className="font-medium text-foreground hover:text-yellow-500 transition-colors inline-flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-3.5 w-3.5" />
              Achyut Paliwal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}