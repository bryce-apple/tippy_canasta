import { Card, GameState, Meld, Player, TeamState } from './types';
import {
  ALL_RED_THREES_BONUS,
  CANASTA_BONUS_CLEAN,
  CANASTA_BONUS_DIRTY,
  CANASTA_BONUS_WILD,
  GOING_OUT_BONUS,
  RED_THREE_VALUE,
  WINNING_SCORE,
} from './constants';
import { cardPointValue, cardsPointValue } from './rules';

export function meldBonus(meld: Meld): number {
  if (!meld.isComplete) return 0;
  switch (meld.type) {
    case 'clean': return CANASTA_BONUS_CLEAN;
    case 'dirty': return CANASTA_BONUS_DIRTY;
    case 'wild': return CANASTA_BONUS_WILD;
    case 'black3': return 0;
    default: return 0;
  }
}

export function meldCardValue(meld: Meld): number {
  return cardsPointValue(meld.cards);
}

export function redThreeScore(count: number, hasAll6: boolean): number {
  if (count === 0) return 0;
  const base = count * RED_THREE_VALUE;
  return hasAll6 ? base + ALL_RED_THREES_BONUS : base;
}

/**
 * Score a team for the round.
 * goingOutTeamId: which team went out (-1 if no one went out)
 * goingOutPlayerIndex: which player went out
 */
export function scoreRound(
  state: GameState,
  goingOutPlayerIndex: number | null
): { team0Score: number; team1Score: number } {
  const scores = [0, 0];

  for (const teamId of [0, 1] as const) {
    const team = state.teams[teamId];
    let score = 0;

    // Canasta bonuses + card values in melds
    for (const meld of team.melds) {
      score += meldBonus(meld);
      score += meldCardValue(meld);
    }

    // Red threes
    const hasAll6 = team.redThreesLaidDown === 6;
    score += redThreeScore(team.redThreesLaidDown, hasAll6);

    // Going out bonus
    const teamPlayers = state.players.filter((p) => p.teamId === teamId);
    const wentOut =
      goingOutPlayerIndex !== null &&
      teamPlayers.some((p) => p.index === goingOutPlayerIndex);
    if (wentOut) {
      score += GOING_OUT_BONUS;
    }

    // Subtract cards left in hands
    for (const player of teamPlayers) {
      // Going-out player has empty hand
      if (player.index === goingOutPlayerIndex) continue;
      // Subtract hand cards
      score -= cardsPointValue(player.hand);
      // Also subtract red 3s still in hand (not laid down) - penalize
      const redThreesInHand = player.hand.filter((c) => c.isRedThree);
      // Already subtracted above via cardsPointValue, but red 3s not in regular hand typically
      // Penalize for red 3s not laid down (from tippy hand that wasn't picked up)
      const unrevealedRedThrees = player.tippyHand.filter((c) => c.isRedThree);
      score -= unrevealedRedThrees.length * RED_THREE_VALUE;
    }

    scores[teamId] = score;
  }

  return { team0Score: scores[0], team1Score: scores[1] };
}

export function checkWinner(teams: GameState['teams']): 0 | 1 | null {
  for (const team of teams) {
    if (team.totalScore >= WINNING_SCORE) {
      // The team with the higher score wins
      return team.id;
    }
  }
  return null;
}

export function getWinnerAfterRound(
  team0Total: number,
  team1Total: number
): 0 | 1 | null {
  if (team0Total >= WINNING_SCORE && team1Total >= WINNING_SCORE) {
    return team0Total >= team1Total ? 0 : 1;
  }
  if (team0Total >= WINNING_SCORE) return 0;
  if (team1Total >= WINNING_SCORE) return 1;
  return null;
}
