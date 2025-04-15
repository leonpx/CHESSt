'use client'

import * as React from "react"
import { useTheme } from "next-themes";
import { useState, useEffect } from 'react';
import { SunIcon } from "@/components/icons/SunIcon";
import { MoonIcon } from "@/components/icons/MoonIcon";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[76px] h-[32px] bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
        aria-label="Toggle Dark Mode"
        type="button"
        className={`
          relative inline-flex items-center h-8 w-[76px] rounded-full transition-colors duration-300 ease-in-out 
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800
          ${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-yellow-400'}
        `}
        onClick={toggleTheme}
      >
        <span className="sr-only">Toggle Dark Mode</span>
        {/* The actual switch circle */}
        <span
          className={`
            absolute left-1 top-1 inline-block w-6 h-6 rounded-full bg-white dark:bg-gray-300 
            transform transition-transform duration-300 ease-in-out 
            ${resolvedTheme === 'dark' ? 'translate-x-[44px]' : 'translate-x-0'}
          `}
        />
        {/* Icons positioned absolutely within the button */}
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-500">
            <SunIcon className="w-4 h-4"/>
        </span>
         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-900">
            <MoonIcon className="w-4 h-4"/>
        </span>
      </button>
  );
} 