import { Card, GameAction, GameState, Meld, PlayerIndex, Rank } from './types';
import {
  buildMeld,
  canGoOut,
  canPickUpDiscardPile,
  cardsPointValue,
  classifyMeld,
  getPartnerIndex,
  validateAddToMeld,
  validateNewMeld,
} from './rules';
import { CANASTA_SIZE, MELD_MINIMUM } from './constants';
import { getAIDrawAction } from './gameEngine';

// ---- AI decision making ----

export type AIMeldPlan =
  | { type: 'new_meld'; cardIds: string[]; rank: Rank }
  | { type: 'add_to_meld'; cardIds: string[]; rank: Rank };

/**
 * Compute all actions the AI wants to take this turn.
 * Returns a list of meld actions and a discard action.
 */
export function computeAITurn(state: GameState): GameAction[] {
  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];
  const actions: GameAction[] = [];

  let workingHand = [...player.hand];

  // Try to form melds and add to existing melds
  let madeProgress = true;
  let iterations = 0;

  while (madeProgress && iterations < 20) {
    madeProgress = false;
    iterations++;

    // 1. Add to existing melds first (prioritize completing canastas)
    for (const meld of team.melds) {
      if (meld.isComplete) continue;

      if (meld.isWildCanasta) {
        const wilds = workingHand.filter((c) => c.isWild);
        if (wilds.length > 0) {
          const cardsToAdd = wilds.slice(0, CANASTA_SIZE - meld.cards.length);
          if (cardsToAdd.length > 0) {
            const err = validateAddToMeld(cardsToAdd, meld);
            if (!err) {
              actions.push({ type: 'ADD_TO_MELD', cardIds: cardsToAdd.map((c) => c.id), meldRank: 'JOKER' });
              workingHand = workingHand.filter((c) => !cardsToAdd.some((x) => x.id === c.id));
              madeProgress = true;
            }
          }
        }
      } else {
        // Add natural cards to rank meld
        const naturals = workingHand.filter((c) => c.rank === meld.rank && !c.isWild);
        const currentWilds = meld.cards.filter((c) => c.isWild).length;
        const currentNaturals = meld.cards.filter((c) => !c.isWild).length;

        let cardsToAdd: Card[] = [...naturals];

        // Can we add wilds without exceeding ratio?
        const wilds = workingHand.filter((c) => c.isWild);
        const afterNaturals = currentNaturals + naturals.length;
        const maxNewWilds = afterNaturals - currentWilds - 1; // Keep wilds < naturals
        if (maxNewWilds > 0 && wilds.length > 0 && cardsToAdd.length > 0) {
          cardsToAdd = [...cardsToAdd, ...wilds.slice(0, maxNewWilds)];
        }

        if (cardsToAdd.length > 0) {
          const err = validateAddToMeld(cardsToAdd, meld);
          if (!err) {
            actions.push({ type: 'ADD_TO_MELD', cardIds: cardsToAdd.map((c) => c.id), meldRank: meld.rank });
            workingHand = workingHand.filter((c) => !cardsToAdd.some((x) => x.id === c.id));
            madeProgress = true;
          }
        }
      }
    }

    // 2. Start new melds
    // Group cards by rank
    const byRank: Record<string, Card[]> = {};
    for (const c of workingHand) {
      if (!c.isWild && !c.isRedThree && !c.isBlackThree) {
        if (!byRank[c.rank]) byRank[c.rank] = [];
        byRank[c.rank].push(c);
      }
    }

    // Sort ranks by group size (descending) then by card value
    const ranksToTry = Object.entries(byRank)
      .filter(([, cards]) => cards.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    for (const [rank, rankCards] of ranksToTry) {
      if (rankCards.length < MELD_MINIMUM) {
        // Try adding a wild
        const wilds = workingHand.filter((c) => c.isWild);
        if (wilds.length > 0 && rankCards.length >= 2) {
          const attemptCards = [...rankCards, wilds[0]];
          const existingMelds = [...team.melds, ...actions.reduce<Meld[]>((acc, a) => acc, [])];
          const updatedTeamMelds = simulateTeamMelds(team.melds, actions);
          const err = validateNewMeld(attemptCards, updatedTeamMelds);
          if (!err) {
            if (!team.hasFirstMeld) {
              // Check threshold
              if (cardsPointValue(attemptCards) < getMinThreshold(team.totalScore)) continue;
            }
            const meldRank = rank as Rank;
            actions.push({ type: 'MELD_CARDS', cardIds: attemptCards.map((c) => c.id), targetRank: meldRank });
            workingHand = workingHand.filter((c) => !attemptCards.some((x) => x.id === c.id));
            madeProgress = true;
            break;
          }
        }
        continue;
      }

      const updatedTeamMelds = simulateTeamMelds(team.melds, actions);
      const err = validateNewMeld(rankCards, updatedTeamMelds);
      if (!err) {
        if (!team.hasFirstMeld) {
          if (cardsPointValue(rankCards) < getMinThreshold(team.totalScore)) continue;
        }
        const meldRank = rank as Rank;
        actions.push({ type: 'MELD_CARDS', cardIds: rankCards.map((c) => c.id), targetRank: meldRank });
        workingHand = workingHand.filter((c) => !rankCards.some((x) => x.id === c.id));
        madeProgress = true;
        break;
      }
    }

    // 3. Try wild canasta if we have 3+ wilds and no existing wild canasta
    const updatedTeamMelds = simulateTeamMelds(team.melds, actions);
    const hasWildCanasta = updatedTeamMelds.some((m) => m.isWildCanasta);
    if (!hasWildCanasta) {
      const wilds = workingHand.filter((c) => c.isWild);
      if (wilds.length >= MELD_MINIMUM) {
        const err = validateNewMeld(wilds, updatedTeamMelds);
        if (!err) {
          actions.push({ type: 'MELD_CARDS', cardIds: wilds.map((c) => c.id), targetRank: 'JOKER' });
          workingHand = workingHand.filter((c) => !wilds.some((x) => x.id === c.id));
          madeProgress = true;
        }
      }
    }
  }

  // Decide discard
  const discardCard = chooseDiscard(workingHand, state, team.melds);
  if (discardCard) {
    actions.push({ type: 'DISCARD_CARD', cardId: discardCard.id });
  } else if (workingHand.length > 0) {
    // Fallback: discard first card
    actions.push({ type: 'DISCARD_CARD', cardId: workingHand[0].id });
  }

  return actions;
}

function simulateTeamMelds(existingMelds: Meld[], actions: GameAction[]): Meld[] {
  const melds = [...existingMelds];
  for (const action of actions) {
    if (action.type === 'MELD_CARDS') {
      // Just add a placeholder
      const rank = action.targetRank ?? 'JOKER';
      melds.push({
        rank,
        cards: [],
        isWildCanasta: rank === 'JOKER',
        isComplete: false,
        type: 'incomplete',
      });
    }
  }
  return melds;
}

function getMinThreshold(teamScore: number): number {
  if (teamScore >= 10000) return 120;
  if (teamScore >= 5000) return 90;
  return 50;
}

function chooseDiscard(hand: Card[], state: GameState, teamMelds: Meld[]): Card | null {
  if (hand.length === 0) return null;

  // Prefer to discard:
  // 1. Black 3s (freeze pile for opponent)
  const black3s = hand.filter((c) => c.isBlackThree);
  if (black3s.length > 0) return black3s[0];

  // 2. Singles of ranks we don't have melds for and aren't useful
  // Count cards by rank
  const byRank: Record<string, Card[]> = {};
  for (const c of hand) {
    if (!c.isWild && !c.isRedThree && !c.isBlackThree) {
      if (!byRank[c.rank]) byRank[c.rank] = [];
      byRank[c.rank].push(c);
    }
  }

  // Find singleton ranks that don't have existing melds
  const singletons = Object.entries(byRank)
    .filter(([rank, cards]) => cards.length === 1 && !teamMelds.some((m) => m.rank === rank))
    .map(([, cards]) => cards[0]);

  if (singletons.length > 0) {
    // Discard lowest value singleton
    singletons.sort((a, b) => (a.rank === 'A' ? 20 : parseInt(a.rank) || 10) - (b.rank === 'A' ? 20 : parseInt(b.rank) || 10));
    return singletons[0];
  }

  // 3. Discard lowest value non-wild card
  const nonWilds = hand.filter((c) => !c.isWild);
  if (nonWilds.length > 0) {
    nonWilds.sort((a, b) => {
      const aVal = a.rank === 'A' ? 20 : parseInt(a.rank) || 10;
      const bVal = b.rank === 'A' ? 20 : parseInt(b.rank) || 10;
      return aVal - bVal;
    });
    return nonWilds[0];
  }

  // 4. Last resort: discard a wild
  return hand[0];
}

/**
 * Should the AI partner say yes to going out?
 */
export function aiPartnerShouldGoOut(state: GameState, partnerIndex: number): boolean {
  const partner = state.players[partnerIndex];
  // Say yes if partner has few cards or team is in good position
  return partner.hand.length <= 3;
}

/**
 * Compute full AI turn actions including draw decision.
 */
export function computeFullAITurn(state: GameState): GameAction[] {
  const actions: GameAction[] = [];

  // Draw phase
  const drawAction = getAIDrawAction(state);
  actions.push(drawAction);

  return actions;
}

/**
 * Check if AI can and should go out.
 */
export function aiShouldGoOut(state: GameState, playerIndex: number): boolean {
  if (!canGoOut(state, playerIndex)) return false;
  const player = state.players[playerIndex];
  // AI goes out if it will have <= 1 card after melding
  return player.hand.length <= 3;
}
