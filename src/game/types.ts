export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'JOKER';

export interface Card {
  id: string; // unique identifier e.g. "hearts-A-0"
  suit: Suit | 'joker';
  rank: Rank;
  isWild: boolean;
  isRedThree: boolean;
  isBlackThree: boolean;
}

export type MeldType = 'natural' | 'wild' | 'black3';

export interface Meld {
  rank: Rank; // the rank this meld is for (or 'JOKER' for wild canasta, '3' for black3)
  cards: Card[];
  isWildCanasta: boolean; // started as wild meld
  isComplete: boolean; // has 7 cards
  type: 'clean' | 'dirty' | 'wild' | 'incomplete' | 'black3';
}

export type TeamId = 0 | 1; // Team 0: players 0&2, Team 1: players 1&3

export interface TeamState {
  id: TeamId;
  melds: Meld[];
  redThreesLaidDown: number;
  hasFirstMeld: boolean;
  totalScore: number; // cumulative across rounds
}

export type PlayerIndex = 0 | 1 | 2 | 3;

export interface Player {
  index: PlayerIndex;
  teamId: TeamId;
  hand: Card[];
  tippyHand: Card[];
  hasTippyHand: boolean; // has not yet picked up tippy hand
  isHuman: boolean;
  hasCompletedCanasta: boolean; // this round, triggered tippy pickup
}

export type GamePhase =
  | 'draw'        // player must draw or pick up pile
  | 'meld'        // player is melding (main action phase)
  | 'discard'     // player must discard to end turn
  | 'roundEnd'    // round is over
  | 'gameOver';   // game is over

export interface GameState {
  players: Player[];
  teams: TeamState[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: PlayerIndex;
  phase: GamePhase;
  roundNumber: number;
  pileIsFrozen: boolean; // black 3 was just discarded
  roundScores: Array<{ team0: number; team1: number }>; // per round
  winner?: TeamId;
  // UI state for selection
  selectedCardIds: Set<string>;
  selectedMeldRank?: Rank;
  message: string; // feedback message for human player
  pendingGoOutQuery?: {
    askingPlayerIndex: PlayerIndex;
    partnerIndex: PlayerIndex;
  };
}

export type GameAction =
  | { type: 'DRAW_FROM_PILE' }
  | { type: 'PICK_UP_DISCARD_PILE' }
  | { type: 'MELD_CARDS'; cardIds: string[]; targetRank?: Rank }
  | { type: 'ADD_TO_MELD'; cardIds: string[]; meldRank: Rank }
  | { type: 'DISCARD_CARD'; cardId: string }
  | { type: 'SELECT_CARD'; cardId: string }
  | { type: 'DESELECT_CARD'; cardId: string }
  | { type: 'SELECT_MELD_RANK'; rank: Rank }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'ASK_GO_OUT' }
  | { type: 'ANSWER_GO_OUT'; answer: boolean }
  | { type: 'NEXT_ROUND' }
  | { type: 'NEW_GAME' };
