'use client';

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useRef, useCallback } from 'react';

// Define the structure for confirmation actions
export interface ConfirmationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'default';
}

// Define the structure for confirmation options
export interface ConfirmationOptions {
  title: string;
  message: string;
  actions: ConfirmationAction[];
}

// Type for the functions stored in refs
type RequestConfirmationFn = (options: ConfirmationOptions) => void;
type SaveAndQuitFn = () => Promise<void>; // Assuming saveAndQuit is async

interface GameContextProps {
  isGameActive: boolean;
  setIsGameActive: Dispatch<SetStateAction<boolean>>;
  requestConfirmation: RequestConfirmationFn;
  setRequestConfirmationHandler: (handler: RequestConfirmationFn | null) => void;
  triggerSaveAndQuit: () => Promise<void>;
  setSaveAndQuitHandler: (handler: SaveAndQuitFn | null) => void;
}

const GameContext = createContext<GameContextProps | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [isGameActive, setIsGameActive] = useState(false);

  const requestConfirmationHandlerRef = useRef<RequestConfirmationFn | null>(null);
  const saveAndQuitHandlerRef = useRef<SaveAndQuitFn | null>(null);

  // --- Functions exposed to consumers --- 

  const requestConfirmation = useCallback((options: ConfirmationOptions) => {
    if (requestConfirmationHandlerRef.current) {
      requestConfirmationHandlerRef.current(options);
    } else {
      console.warn('requestConfirmation called before a handler was provided.');
      // Basic fallback if needed, e.g., window.confirm
      // if (window.confirm(options.message)) { 
      //   const confirmAction = options.actions.find(a => a.label !== 'Cancel');
      //   confirmAction?.onClick();
      // }
    }
  }, []);

  const triggerSaveAndQuit = useCallback(async () => {
    if (saveAndQuitHandlerRef.current) {
      await saveAndQuitHandlerRef.current();
    } else {
      console.warn('triggerSaveAndQuit called before a handler was provided.');
      // Cannot proceed without the handler, maybe throw error or just log
    }
  }, []);

  // --- Functions for handler providers (e.g., PlayPage) --- 

  const setRequestConfirmationHandler = useCallback((handler: RequestConfirmationFn | null) => {
    requestConfirmationHandlerRef.current = handler;
  }, []);

  const setSaveAndQuitHandler = useCallback((handler: SaveAndQuitFn | null) => {
    saveAndQuitHandlerRef.current = handler;
  }, []);

  return (
    <GameContext.Provider 
      value={{
        isGameActive, 
        setIsGameActive, 
        requestConfirmation, // exposed to consumers
        setRequestConfirmationHandler, // exposed to provider (PlayPage)
        triggerSaveAndQuit, // exposed to consumers (Header)
        setSaveAndQuitHandler // exposed to provider (PlayPage)
      }}
    >
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