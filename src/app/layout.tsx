import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Outfit } from "next/font/google";
import Navbar from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import Footer from "@/components/footer";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Wayyat — Road Safety Education Platform",
    template: "%s | Wayyat"
  },
  description: "Learn road safety through gamified courses, quizzes, and interactive games. Earn XP, climb leaderboards, and become a road safety champion.",
  keywords: ["road safety", "traffic education", "gamified learning", "driving safety", "traffic signs", "Wayyat", "UAE road safety"],
  authors: [{ name: "Wayyat Team" }],
  creator: "Wayyat",
  publisher: "Wayyat",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://wayyat.vercel.app", // Assuming .ae or similar, but using a generic one if unsure
    siteName: "Wayyat",
    title: "Wayyat — Road Safety Education Platform",
    description: "Master road safety through immersive 3D simulations and gamified learning.",
    images: [
      {
        url: "/favicon.ico", // Using favicon as requested
        width: 1200,
        height: 630,
        alt: "Wayyat Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayyat — Road Safety Education Platform",
    description: "Master road safety through immersive 3D simulations and gamified learning.",
    images: ["/favicon.ico"],
    creator: "@wayyat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="google-site-verification" content="kz9qG_gWY04lmyENNHTFL-uaq5bSIPtNkO2IV6ce70I" />
        </head>
        <body
          className={`${inter.variable} ${outfit.variable} antialiased`}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Navbar />
            {children}
            <Footer />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
