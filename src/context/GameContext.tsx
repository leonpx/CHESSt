'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

interface GameContextProps {
  isGameActive: boolean;
  setIsGameActive: Dispatch<SetStateAction<boolean>>;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [isGameActive, setIsGameActive] = useState(false);

  return (
    <GameContext.Provider value={{ isGameActive, setIsGameActive }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}; 