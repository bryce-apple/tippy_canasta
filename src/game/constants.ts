import { Rank } from './types';

export const CARD_POINT_VALUES: Record<string, number> = {
  '3': 5,
  '4': 5,
  '5': 5,
  '6': 5,
  '7': 5,
  '8': 5,
  '9': 10,
  '10': 10,
  'J': 10,
  'Q': 10,
  'K': 10,
  'A': 20,
  '2': 20,
  'JOKER': 50,
};

export const RED_THREE_VALUE = 100;
export const ALL_RED_THREES_BONUS = 600;
export const GOING_OUT_BONUS = 100;

export const CANASTA_BONUS_CLEAN = 500;
export const CANASTA_BONUS_DIRTY = 300;
export const CANASTA_BONUS_WILD = 1500;
export const CANASTA_BONUS_BLACK3 = 0; // no bonus beyond cards

export const CANASTA_SIZE = 7;
export const MELD_MINIMUM = 3;

export const CARDS_PER_REGULAR_HAND = 15;
export const CARDS_PER_TIPPY_HAND = 11;

export const NUM_PLAYERS = 4;
export const NUM_DECKS = 3;
export const NUM_JOKERS = 6; // 2 per deck

export const FIRST_MELD_THRESHOLD_LOW = 50;    // score < 5000
export const FIRST_MELD_THRESHOLD_MID = 90;    // score 5000-9999
export const FIRST_MELD_THRESHOLD_HIGH = 120;  // score >= 10000

export const SCORE_THRESHOLD_MID = 5000;
export const SCORE_THRESHOLD_HIGH = 10000;

export const WINNING_SCORE = 15000;

export const AI_TURN_DELAY_MS = 800;

export const NATURAL_RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const WILD_RANKS: Rank[] = ['2', 'JOKER'];
