export interface SavedGameData {
    id: string;
    name: string | null; 
    fen: string;
    moves: string[];
    isGameOver: boolean; 
    whiteTime: number | null;
    blackTime: number | null;
    isTimerEnabled: boolean;
    updatedAt: string; // ISO string date
  } 