'use client';

import React from 'react';
import Image from "next/image";
import Link from "next/link";
import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { useGameContext, ConfirmationAction } from "@/context/GameContext";
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

// Header component extracted from ClientLayoutWrapper
export default function Header() {
  const { isGameActive, requestConfirmation, triggerSaveAndQuit } = useGameContext();
  const { userId } = useAuth();
  const router = useRouter();

  const handleHeaderLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, targetHref: string) => {
    if (isGameActive) {
      e.preventDefault(); // Prevent navigation immediately

      // Define actions based on logged-in status
      let actions: ConfirmationAction[];

      if (userId) {
        // Signed In User Actions
        actions = [
          { label: "Cancel", onClick: () => { /* Just close, handled by modal */ }, variant: 'default' },
          { label: "Quit without Saving", onClick: () => { router.push(targetHref); }, variant: 'secondary' }, // Navigate on confirm
          { label: "Save and Quit", onClick: async () => { 
            try {
              await triggerSaveAndQuit(); // Call the save handler from context
              // Navigation happens regardless of save success/failure for now.
              // A more robust solution would check save status before navigating.
            } catch (error) {
              //console.error("Error during Save and Quit from header:", error);
              // Optionally show an error message to the user
            }
            router.push(targetHref); // Navigate after attempting save
          }, variant: 'primary' 
        },
      ];
      requestConfirmation({
        title: "Leave Game?",
        message: "You have an active game. Do you want to save your progress before leaving?",
        actions: actions
      });
    } else {
      // Signed Out User Actions
      actions = [
        { label: "Cancel", onClick: () => { /* Just close */ }, variant: 'default' },
        { label: "Leave Game", onClick: () => { router.push(targetHref); }, variant: 'danger' }, // Navigate on confirm
      ];
      requestConfirmation({
        title: "Leave Game?",
        message: "Your game progress will be lost as you are not signed in. Are you sure you want to leave?",
        actions: actions
      });
    } 
   } // Closes the `if (isGameActive)` block
  }; // Closes the `handleHeaderLinkClick` function definition

  return (
    <header className="p-4 bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-900/80 shadow-md flex-shrink-0 border-b border-[rgb(var(--card-border-rgb))] dark:border-gray-700/80">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <Link 
          href="/" 
          className="flex items-center gap-4 group" 
          onClick={(e) => handleHeaderLinkClick(e, '/')}
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
        
        <div className="flex items-center gap-4">
          <SignedIn>
            <Link 
              href="/profile"
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
              onClick={(e) => handleHeaderLinkClick(e, '/profile')}
            >
              My Games
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <Link 
              href="/sign-in"
              onClick={(e) => handleHeaderLinkClick(e, '/sign-in')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
          </SignedOut>
        </div>
      </div>
    </header>
  );
} 