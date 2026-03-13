export type Problem = {
  contestId: number;
  index: string;
  points: number;
};

export type Player = {
  handle: string;
  score: number;
};

export type Room = {
  id: string;
  problems: Problem[];
  durationMinutes: number;
  startTime: number | null;
  player1: Player | null;
  player2: Player | null;
  currentProblemIndex: number;
  status: "waiting" | "running" | "finished";
  winner: string | null;
};

const _global = global as any;
if (!_global.roomsStore) {
  _global.roomsStore = new Map<string, Room>();
}

export const roomsStore: Map<string, Room> = _global.roomsStore;
