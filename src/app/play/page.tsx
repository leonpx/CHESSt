'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Chessboard from '@/components/Chessboard';
import { useGameContext } from '@/context/GameContext';

export default function PlayPage() {
  const { isGameActive, setIsGameActive } = useGameContext();
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);

  const handleStartGame = () => {
    setIsGameActive(true);
  };

  const handleEndGame = () => {
    setIsGameActive(false);
  };

  useEffect(() => {
    return () => {
      setIsGameActive(false);
    };
  }, [setIsGameActive]);

  if (!isGameActive) {
    return (
      <main className="flex flex-grow flex-col items-center justify-center p-4 sm:p-6 gap-6">
        <div className="bg-[rgb(var(--card-bg-rgb))] dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col gap-4 items-center w-full max-w-xs sm:max-w-sm border border-[rgb(var(--card-border-rgb))] dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-2 text-[rgb(var(--foreground-rgb))]">Game Setup</h2>
          <div className="flex items-center gap-2 self-start">
            <input
              type="checkbox"
              id="timer-enable"
              checked={isTimerEnabled}
              onChange={(e) => setIsTimerEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="timer-enable" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Enable Timer?</label>
          </div>
          {isTimerEnabled && (
            <div className="flex items-center gap-2 self-start w-full justify-between">
              <label htmlFor="timer-minutes" className="text-md sm:text-lg text-[rgb(var(--foreground-rgb))]">Time (min):</label>
              <input 
                type="number"
                id="timer-minutes"
                min="1"
                max="60" 
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(parseInt(e.target.value, 10) || 1)}
                className="w-16 sm:w-20 p-1 sm:p-2 rounded bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-400 dark:border-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          <button
            onClick={handleStartGame}
            className="mt-4 px-5 py-2 sm:px-6 sm:py-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-gray-100 rounded-lg text-md sm:text-lg font-semibold transition-colors duration-200 transform hover:scale-105 w-full shadow-md"
          >
            Start Game
          </button>
          <Link
            href="/"
            className="mt-2 text-center w-full px-5 py-2 bg-gray-500 dark:bg-gray-600 hover:bg-gray-600 dark:hover:bg-gray-700 text-white dark:text-gray-200 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105"
          >
             Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-grow flex-col items-center justify-center p-2 sm:p-4 md:p-6 gap-4">
      <Chessboard 
        isTimerEnabled={isTimerEnabled} 
        initialTimeSeconds={timerMinutes * 60} 
      />
      <button
        onClick={handleEndGame}
        className="mt-2 sm:mt-4 px-5 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 text-white dark:text-gray-100 rounded-lg text-md font-semibold transition-colors duration-200 transform hover:scale-105 shadow-md"
      >
        End Game
      </button>
    </main>
  );
} 