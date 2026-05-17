import { Card, GameState, Meld, Rank, TeamId, TeamState } from './types';
import {
  CANASTA_SIZE,
  CARD_POINT_VALUES,
  FIRST_MELD_THRESHOLD_HIGH,
  FIRST_MELD_THRESHOLD_LOW,
  FIRST_MELD_THRESHOLD_MID,
  MELD_MINIMUM,
  SCORE_THRESHOLD_HIGH,
  SCORE_THRESHOLD_MID,
} from './constants';

// ---- Card helpers ----

export function cardPointValue(card: Card): number {
  return CARD_POINT_VALUES[card.rank] ?? 5;
}

export function cardsPointValue(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + cardPointValue(c), 0);
}

export function getMinFirstMeld(teamScore: number): number {
  if (teamScore >= SCORE_THRESHOLD_HIGH) return FIRST_MELD_THRESHOLD_HIGH;
  if (teamScore >= SCORE_THRESHOLD_MID) return FIRST_MELD_THRESHOLD_MID;
  return FIRST_MELD_THRESHOLD_LOW;
}

// ---- Meld classification ----

export function classifyMeld(cards: Card[], isWildCanasta: boolean): Meld['type'] {
  if (isWildCanasta) {
    return cards.length >= CANASTA_SIZE ? 'wild' : 'incomplete';
  }
  const naturals = cards.filter((c) => !c.isWild);
  const wilds = cards.filter((c) => c.isWild);
  if (naturals.length === 0 && wilds.length > 0) {
    // wild canasta in progress
    return cards.length >= CANASTA_SIZE ? 'wild' : 'incomplete';
  }
  if (naturals[0]?.isBlackThree) return 'black3';
  if (wilds.length === 0) {
    return cards.length >= CANASTA_SIZE ? 'clean' : 'incomplete';
  }
  return cards.length >= CANASTA_SIZE ? 'dirty' : 'incomplete';
}

export function buildMeld(rank: Rank, cards: Card[], isWildCanasta: boolean): Meld {
  const type = classifyMeld(cards, isWildCanasta);
  return {
    rank,
    cards,
    isWildCanasta,
    isComplete: cards.length >= CANASTA_SIZE,
    type,
  };
}

// ---- Meld validation ----

/**
 * Validate that a set of cards can start a new meld.
 * Returns null if valid, or an error string if not.
 */
export function validateNewMeld(
  cards: Card[],
  existingTeamMelds: Meld[],
  isBlack3Canasta: boolean = false
): string | null {
  if (cards.length < MELD_MINIMUM) {
    return `Need at least ${MELD_MINIMUM} cards to meld`;
  }

  const naturals = cards.filter((c) => !c.isWild);
  const wilds = cards.filter((c) => c.isWild);

  // Wild canasta: all wilds
  if (naturals.length === 0 && wilds.length >= MELD_MINIMUM) {
    // Check no existing wild canasta meld
    const existingWild = existingTeamMelds.find((m) => m.isWildCanasta);
    if (existingWild) return 'Team already has a wild canasta meld started';
    return null;
  }

  // Must all be same natural rank (or all wilds for wild canasta)
  if (naturals.length === 0) return 'No naturals in meld';

  const targetRank = naturals[0].rank;
  for (const c of naturals) {
    if (c.rank !== targetRank) return 'All natural cards must be same rank';
  }

  // Black 3 canasta rules
  if (targetRank === '3' && naturals[0].isBlackThree) {
    if (!isBlack3Canasta) return 'Black 3 canasta only allowed when going out';
    if (wilds.length > 0) return 'No wilds in black 3 canasta';
    return null;
  }

  // Red 3s cannot be melded normally
  if (targetRank === '3' && naturals[0].isRedThree) {
    return 'Red 3s cannot be melded normally (they go to bonus area)';
  }

  // Check for existing meld of same rank
  const existing = existingTeamMelds.find((m) => m.rank === targetRank && !m.isWildCanasta);
  if (existing) return `Team already has a meld of ${targetRank}s`;

  // Wild limit: at most as many wilds as naturals (and can't exceed total)
  if (wilds.length >= naturals.length) {
    return 'Cannot have more wilds than naturals in a meld';
  }

  return null;
}

/**
 * Validate adding cards to an existing meld.
 */
export function validateAddToMeld(cards: Card[], meld: Meld): string | null {
  if (meld.isComplete) return 'Canasta is already complete (7 cards)';

  const newWilds = cards.filter((c) => c.isWild);
  const newNaturals = cards.filter((c) => !c.isWild);

  if (meld.isWildCanasta) {
    // Only wilds allowed
    if (newNaturals.length > 0) return 'Wild canasta can only receive more wilds';
    return null;
  }

  // Natural rank meld
  for (const c of newNaturals) {
    if (c.rank !== meld.rank) return `Card rank must match meld rank (${meld.rank})`;
  }

  // Check wild limit: total wilds in meld after adding <= total naturals
  const currentWilds = meld.cards.filter((c) => c.isWild).length;
  const currentNaturals = meld.cards.filter((c) => !c.isWild).length;
  const totalWilds = currentWilds + newWilds.length;
  const totalNaturals = currentNaturals + newNaturals.length;

  if (totalWilds >= totalNaturals) {
    return 'Cannot have more wilds than naturals in a meld';
  }

  return null;
}

// ---- Discard pile pickup ----

/**
 * Can a player pick up the discard pile?
 */
export function canPickUpDiscardPile(
  topDiscard: Card,
  playerHand: Card[],
  team: TeamState,
  pileIsFrozen: boolean
): { canPickUp: boolean; reason?: string } {
  if (!topDiscard) return { canPickUp: false, reason: 'No discard pile' };
  if (topDiscard.isBlackThree) return { canPickUp: false, reason: 'Pile is blocked by black 3' };

  // Need 2 matching cards in hand
  let matchingCards: Card[];
  if (topDiscard.isWild) {
    matchingCards = playerHand.filter((c) => c.isWild);
  } else {
    matchingCards = playerHand.filter((c) => c.rank === topDiscard.rank && !c.isWild);
  }

  if (matchingCards.length < 2) {
    return { canPickUp: false, reason: 'Need 2 matching cards in hand' };
  }

  // If team hasn't made first meld, check threshold with OTHER cards
  if (!team.hasFirstMeld) {
    const otherCards = playerHand.filter(
      (c) => !matchingCards.slice(0, 2).some((m) => m.id === c.id)
    );
    const threshold = getMinFirstMeld(team.totalScore);
    const meldableValue = computeBestMeldValue(otherCards);
    if (meldableValue < threshold) {
      return {
        canPickUp: false,
        reason: `Need ${threshold} pts from other cards for first meld (have ${meldableValue})`,
      };
    }
  }

  return { canPickUp: true };
}

/**
 * Compute the best meld value achievable from a hand (for first-meld threshold check).
 * Simplified: sum of best groups of 3+ same rank cards.
 */
export function computeBestMeldValue(cards: Card[]): number {
  const byRank: Record<string, Card[]> = {};
  for (const c of cards) {
    if (!c.isWild && !c.isRedThree && !c.isBlackThree) {
      if (!byRank[c.rank]) byRank[c.rank] = [];
      byRank[c.rank].push(c);
    }
  }

  let total = 0;
  for (const rank of Object.keys(byRank)) {
    const group = byRank[rank];
    if (group.length >= MELD_MINIMUM) {
      total += cardsPointValue(group);
    }
  }
  return total;
}

// ---- Going out ----

export function canGoOut(state: GameState, playerIndex: number): boolean {
  const player = state.players[playerIndex];
  const team = state.teams[player.teamId];

  const hasClean = team.melds.some((m) => m.type === 'clean');
  const hasDirty = team.melds.some((m) => m.type === 'dirty');
  const hasWild = team.melds.some((m) => m.type === 'wild');

  return hasClean && hasDirty && hasWild;
}

// ---- First meld threshold ----

/**
 * Check if a set of cards to meld meets the first-meld threshold.
 */
export function meetsFirstMeldThreshold(cards: Card[], teamScore: number): boolean {
  const threshold = getMinFirstMeld(teamScore);
  const value = cardsPointValue(cards);
  return value >= threshold;
}

// ---- Helper: find matching cards for discard pile pickup ----

export function getMatchingPairForDiscard(topDiscard: Card, hand: Card[]): Card[] {
  if (topDiscard.isWild) {
    const wilds = hand.filter((c) => c.isWild);
    return wilds.slice(0, 2);
  }
  const matches = hand.filter((c) => c.rank === topDiscard.rank && !c.isWild);
  return matches.slice(0, 2);
}

// ---- Team helpers ----

export function getTeamForPlayer(playerIndex: number): TeamId {
  return (playerIndex % 2 === 0 ? 0 : 1) as TeamId;
}

export function getPartnerIndex(playerIndex: number): number {
  return (playerIndex + 2) % 4;
}

// ---- Draw pile check ----

export function canDrawTwoCards(drawPile: Card[]): boolean {
  return drawPile.length >= 2;
}

/**
 * Compute the meld value of a proposed set of cards for first-meld check.
 * Only counts cards that form valid melds (3+ same rank, naturals only for value counting).
 */
function computeMeldValueOfCards(cards: Card[]): number {
  const byRank: Record<string, Card[]> = {};
  for (const c of cards) {
    if (!c.isWild && !c.isRedThree && !c.isBlackThree) {
      if (!byRank[c.rank]) byRank[c.rank] = [];
      byRank[c.rank].push(c);
    }
  }
  // Include wilds assigned to groups
  const wilds = cards.filter((c) => c.isWild);
  let total = 0;
  for (const rank of Object.keys(byRank)) {
    const group = byRank[rank];
    if (group.length >= 2) {
      // Can use a wild to complete to 3
      if (group.length >= MELD_MINIMUM || (group.length >= 2 && wilds.length > 0)) {
        total += cardsPointValue(group) + (wilds.length > 0 ? cardPointValue(wilds[0]) : 0);
      }
    } else if (group.length >= MELD_MINIMUM) {
      total += cardsPointValue(group);
    }
  }
  return total;
}
