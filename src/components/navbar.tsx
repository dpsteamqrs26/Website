'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser, useClerk } from '@clerk/nextjs';
import { 
  Menu, X, Shield, Home, BookOpen, Gamepad2, 
  Trophy, Award, ClipboardList, Image as ImageIcon, 
  LayoutDashboard, LogOut 
} from 'lucide-react';
import { toast } from "sonner";

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
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20 transition-transform group-hover:scale-110">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-green-500">Way</span>
            <span className="text-foreground">yat</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-full bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-green-500/40 hover:scale-105 active:scale-95">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          
          <SignedIn>
            <UserProfileDropdown />
          </SignedIn>

          {/* Mobile menu button */}
          <button
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
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
                  avatarBox: 'h-9 w-9 ring-2 ring-green-500/30 transition-all group-hover:ring-green-500/60',
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
            <ImageIcon className="h-4 w-4 text-green-500" />
            <span>{isUploading ? "Uploading..." : "Upload Picture"}</span>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className="cursor-pointer gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4 text-green-500" />
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