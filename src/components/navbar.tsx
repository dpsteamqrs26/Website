'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useClerk } from '@clerk/nextjs';
import { 
  Menu, X, Shield, Home, BookOpen, Gamepad2, 
  Trophy, Award, ClipboardList, Image as ImageIcon, 
  LayoutDashboard, LogOut 
} from 'lucide-react';
import Image from 'next/image';
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';

// Shadcn UI Components (Ensure these are installed/available)
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: Shield },
    { href: '/dashboard/learn', label: 'Learn', icon: BookOpen },
    { href: '/dashboard/quizzes', label: 'Quizzes', icon: ClipboardList },
    { href: '/dashboard/games', label: 'Games', icon: Gamepad2 },
    { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: Trophy },
    { href: '/dashboard/achievements', label: 'Achievements', icon: Award },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-border/60 bg-background/90 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.08)]'
          : 'border-b border-transparent bg-background/60 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/20 to-amber-500/20 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 transition-shadow group-hover:shadow-yellow-500/25 overflow-hidden"
          >
            <Image 
              src="/favicon.ico" 
              alt="Wayyat Logo" 
              width={24} 
              height={24}
              className="object-contain"
            />
          </motion.div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-yellow-500">Way</span>
            <span className="text-foreground">yat</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || 
              (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <link.icon className={`h-4 w-4 transition-colors ${isActive ? 'text-yellow-500' : ''}`} />
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Auth + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-yellow-500/25 transition-shadow hover:shadow-yellow-500/40"
              >
                Sign In
              </motion.button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <UserProfileDropdown />
          </SignedIn>

          {/* Mobile menu button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="border-t border-border/50 bg-background/95 backdrop-blur-2xl md:hidden overflow-hidden"
          >
            <div className="space-y-1 px-4 py-3">
              {navLinks.map((link, i) => {
                const isActive = pathname === link.href;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <link.icon className={`h-4 w-4 ${isActive ? 'text-yellow-500' : ''}`} />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

function UserProfileDropdown() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      await user.setProfileImage({ file });
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error("Failed to update profile picture");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Custom trigger wrapping UserButton */}
          <button className="relative rounded-full transition-all hover:scale-105 active:scale-95 outline-none">
            <UserButton
              appearance={{
                elements: {
                  rootBox: "h-9 w-9",
                  avatarBox: 'h-9 w-9 ring-2 ring-yellow-500/30 transition-all group-hover:ring-yellow-500/60',
                  userButtonTrigger: "pointer-events-none", // Disables Clerk's own menu
                },
              }}
            />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent
          align="end"
          className="w-56 mt-2 bg-background/95 backdrop-blur-md border-border/50 shadow-xl"
        >
          <div className="flex flex-col px-2 py-1.5 border-b border-border/50 mb-1">
            <span className="text-sm font-semibold truncate text-foreground">
              {user?.fullName || 'User'}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
          </div>

          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="cursor-pointer gap-2"
          >
              <ImageIcon className="h-4 w-4 text-yellow-500" />
              <span>{isUploading ? "Uploading..." : "Upload Picture"}</span>
            </DropdownMenuItem>
  
            <DropdownMenuItem asChild className="cursor-pointer gap-2">
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 text-yellow-500" />
                <span>Go to Dashboard</span>
              </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}