'use client';

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google"; // Keep font variables if used here
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { GameProvider, useGameContext } from "@/context/GameContext";
import { useRouter } from 'next/navigation';

// Keep font definitions if needed, or pass variables as props
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Header component definition moved here
function Header() {
  const { isGameActive } = useGameContext();
  const router = useRouter();

  const handleHeaderLinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isGameActive) {
      if (!window.confirm("Are you sure you want to leave the game? Your progress might be lost.")) {
        e.preventDefault();
      }
    }
  };

  return (
    <header className="p-4 bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-900/80 shadow-md flex-shrink-0 border-b border-[rgb(var(--card-border-rgb))] dark:border-gray-700/80">
      <div className="container mx-auto flex items-center justify-center gap-4">
        <Link 
          href="/" 
          className="flex items-center gap-4 group" 
          onClick={handleHeaderLinkClick}
        >
          <Image 
            src="/logo.png"
            alt="CHESSt Logo"
            width={40}
            height={40}
            className="group-hover:scale-110 transition-transform duration-200"
          />
          <h1 className="text-3xl font-mono font-bold text-[rgb(var(--foreground-rgb))] group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors duration-200">
            CHESSt
          </h1>
        </Link>
      </div>
    </header>
  );
}

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      disableTransitionOnChange
    >
      <GameProvider>
        {/* Apply font variables here */}
        <div className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen bg-[rgb(var(--background-start-rgb))] text-[rgb(var(--foreground-rgb))]`}>
          <Header />
          
          <div className="flex-grow">
              {children}
          </div>

          <footer className="p-4 mt-auto flex justify-center">
              <ThemeSwitcher />
          </footer>
        </div>
      </GameProvider>
    </ThemeProvider>
  );
} 