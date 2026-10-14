export type OutChallengePayload = {
  verb: 'challenge';
  metaGame: string;
  variants: string[];
  clockStart: number;
  clockInc: number;
  clockMax: number;
  challengers: string[];
};

export type OutMovePayload = {
  verb: 'move';
  metaGame: string;
  variants: string[];
  gameid: string;
  clockCurr: number;
  numPlayers: number;
  moves: string[][];
  context?: Record<string, unknown>[];
};

export type MoveWorkPayload = OutMovePayload;
