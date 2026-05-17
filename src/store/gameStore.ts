import { create } from 'zustand';
import { GameAction, GameState, PlayerIndex, Rank } from '../game/types';
import { createInitialState, gameReducer } from '../game/gameEngine';
import { computeAITurn, aiShouldGoOut, aiPartnerShouldGoOut } from '../game/ai';
import { AI_TURN_DELAY_MS } from '../game/constants';
import { canGoOut, getPartnerIndex } from '../game/rules';

interface GameStore {
  state: GameState;
  dispatch: (action: GameAction) => void;
  runAITurn: () => Promise<void>;
  isAITurnRunning: boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialState(),
  isAITurnRunning: false,

  dispatch: (action: GameAction) => {
    set((store) => ({
      state: gameReducer(store.state, action),
    }));
  },

  runAITurn: async () => {
    const store = get();
    if (store.isAITurnRunning) return;

    set({ isAITurnRunning: true });

    try {
      let currentState = get().state;

      // Keep running while it's an AI player's turn
      while (
        currentState.phase !== 'roundEnd' &&
        currentState.phase !== 'gameOver' &&
        currentState.players[currentState.currentPlayerIndex]?.isHuman === false
      ) {
        await delay(AI_TURN_DELAY_MS);

        currentState = get().state;

        if (currentState.phase === 'draw') {
          // AI draws
          const drawAction = currentState.discardPile.length > 0 && !currentState.pileIsFrozen
            ? computeBestDrawAction(currentState)
            : { type: 'DRAW_FROM_PILE' as const };

          set((store) => ({ state: gameReducer(store.state, drawAction) }));
          currentState = get().state;

          await delay(AI_TURN_DELAY_MS / 2);
        }

        if (currentState.phase === 'meld') {
          // AI melds and discards
          const actions = computeAITurn(currentState);

          for (const action of actions) {
            if (action.type === 'DISCARD_CARD') {
              // Handle going out check before discarding
              const playerIdx = currentState.currentPlayerIndex;
              const player = currentState.players[playerIdx];

              if (aiShouldGoOut(currentState, playerIdx)) {
                // AI wants to go out - check with partner
                const partnerIdx = getPartnerIndex(playerIdx) as PlayerIndex;
                const partnerSaysYes = aiPartnerShouldGoOut(currentState, partnerIdx);
                if (partnerSaysYes) {
                  // Go ahead and discard (going out)
                }
              }

              set((store) => ({ state: gameReducer(store.state, action) }));
              currentState = get().state;
              await delay(AI_TURN_DELAY_MS / 2);
              break;
            } else {
              set((store) => ({ state: gameReducer(store.state, action) }));
              currentState = get().state;
              await delay(300);
            }
          }
        }

        // If still in meld phase (no discard action), force discard
        currentState = get().state;
        if (
          currentState.phase === 'meld' &&
          currentState.players[currentState.currentPlayerIndex]?.isHuman === false
        ) {
          const player = currentState.players[currentState.currentPlayerIndex];
          if (player.hand.length > 0) {
            set((store) => ({
              state: gameReducer(store.state, { type: 'DISCARD_CARD', cardId: player.hand[0].id }),
            }));
            currentState = get().state;
          }
        }

        currentState = get().state;
      }

      // After AI turns done, update message for human
      if (
        currentState.phase === 'draw' &&
        currentState.players[currentState.currentPlayerIndex]?.isHuman === true
      ) {
        set((store) => ({
          state: {
            ...store.state,
            message: 'Your turn! Draw 2 cards or pick up the discard pile.',
          },
        }));
      }
    } finally {
      set({ isAITurnRunning: false });
    }
  },
}));

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBestDrawAction(state: GameState): GameAction {
  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];

  if (state.discardPile.length === 0) return { type: 'DRAW_FROM_PILE' };

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  if (topDiscard.isBlackThree) return { type: 'DRAW_FROM_PILE' };

  // Check if AI can benefit from picking up
  const matchingNaturals = player.hand.filter(
    (c) => !c.isWild && c.rank === topDiscard.rank
  );
  const wilds = player.hand.filter((c) => c.isWild);

  const hasGoodMatch = topDiscard.isWild
    ? wilds.length >= 2
    : matchingNaturals.length >= 2;

  if (hasGoodMatch && state.discardPile.length >= 3) {
    const { canPickUp } = require('../game/rules').canPickUpDiscardPile(
      topDiscard,
      player.hand,
      team,
      state.pileIsFrozen
    );
    if (canPickUp) return { type: 'PICK_UP_DISCARD_PILE' };
  }

  return { type: 'DRAW_FROM_PILE' };
}
