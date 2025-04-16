'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from "next/font/google"; // Keep font variables if used here
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { GameProvider } from "@/context/GameContext";
import Header from './Header'; // Import the extracted Header component

// Keep font definitions if needed, or pass variables as props
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
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
    </ClerkProvider>
  );
}