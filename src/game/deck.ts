import { Card, Rank, Suit } from './types';
import { NUM_DECKS } from './constants';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function isWild(rank: Rank): boolean {
  return rank === '2' || rank === 'JOKER';
}

function isRedThree(suit: Suit | 'joker', rank: Rank): boolean {
  return rank === '3' && (suit === 'hearts' || suit === 'diamonds');
}

function isBlackThree(suit: Suit | 'joker', rank: Rank): boolean {
  return rank === '3' && (suit === 'clubs' || suit === 'spades');
}

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (let deckIdx = 0; deckIdx < NUM_DECKS; deckIdx++) {
    // Regular cards
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `${suit}-${rank}-${deckIdx}`,
          suit,
          rank,
          isWild: isWild(rank),
          isRedThree: isRedThree(suit, rank),
          isBlackThree: isBlackThree(suit, rank),
        });
      }
    }
    // 2 Jokers per deck
    cards.push({
      id: `joker-JOKER-${deckIdx}-a`,
      suit: 'joker',
      rank: 'JOKER',
      isWild: true,
      isRedThree: false,
      isBlackThree: false,
    });
    cards.push({
      id: `joker-JOKER-${deckIdx}-b`,
      suit: 'joker',
      rank: 'JOKER',
      isWild: true,
      isRedThree: false,
      isBlackThree: false,
    });
  }

  return cards;
}

export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(
  deck: Card[],
  numPlayers: number,
  regularHandSize: number,
  tippyHandSize: number
): {
  hands: Card[][];
  tippyHands: Card[][];
  remainingDeck: Card[];
} {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const tippyHands: Card[][] = Array.from({ length: numPlayers }, () => []);
  let deckCopy = [...deck];

  for (let p = 0; p < numPlayers; p++) {
    hands[p] = deckCopy.splice(0, regularHandSize);
    tippyHands[p] = deckCopy.splice(0, tippyHandSize);
  }

  return { hands, tippyHands, remainingDeck: deckCopy };
}

export function flipStartCard(deck: Card[]): { card: Card; remainingDeck: Card[] } {
  let remaining = [...deck];
  let card = remaining.shift()!;

  // Re-flip if wild, red 3, or black 3
  while (card.isWild || card.isRedThree || card.isBlackThree) {
    remaining.push(card); // put it at the bottom
    card = remaining.shift()!;
  }

  return { card, remainingDeck: remaining };
}
