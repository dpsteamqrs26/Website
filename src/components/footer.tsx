import Link from 'next/link';
import { Shield, Github, Heart } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 border border-white/20 shadow-lg transition-transform group-hover:scale-110 overflow-hidden">
                <Image 
                  src="/favicon.ico" 
                  alt="Wayyat Logo" 
                  width={20} 
                  height={20}
                  className="object-contain"
                />
              </div>
              <span className="text-lg font-bold">
                <span className="text-yellow-500">Way</span>
                <span className="text-foreground">yat</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              Making roads safer through interactive education and gamified learning.
              Earn XP, complete courses, and become a road safety champion.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Platform</h3>
            <ul className="space-y-2">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/dashboard/learn', label: 'Courses' },
                { href: '/dashboard/games', label: 'Games' },
                { href: '/dashboard/leaderboard', label: 'Leaderboard' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Resources</h3>
            <ul className="space-y-2">
              {[
                { href: '/dashboard/achievements', label: 'Achievements' },
                { href: '/dashboard/learn', label: 'Traffic Signs' },
                { href: '/dashboard/learn', label: 'Road Safety Tips' },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 Wayyat. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Made with <Heart className="h-3.5 w-3.5 mx-0.5 text-red-500 fill-red-500" /> by{' '}
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