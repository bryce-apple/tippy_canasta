import { Card, GameAction, GameState, Meld, PlayerIndex, Rank, TeamId, TeamState } from './types';
import {
  CARDS_PER_REGULAR_HAND,
  CARDS_PER_TIPPY_HAND,
  CANASTA_SIZE,
  NUM_PLAYERS,
} from './constants';
import { createDeck, dealCards, flipStartCard, shuffleDeck } from './deck';
import {
  buildMeld,
  canGoOut,
  canPickUpDiscardPile,
  cardPointValue,
  cardsPointValue,
  classifyMeld,
  getMatchingPairForDiscard,
  getPartnerIndex,
  getTeamForPlayer,
  meetsFirstMeldThreshold,
  validateAddToMeld,
  validateNewMeld,
} from './rules';
import { getWinnerAfterRound, scoreRound } from './scoring';

// ---- Initial state ----

function createInitialTeams(): [TeamState, TeamState] {
  return [
    { id: 0, melds: [], redThreesLaidDown: 0, hasFirstMeld: false, totalScore: 0 },
    { id: 1, melds: [], redThreesLaidDown: 0, hasFirstMeld: false, totalScore: 0 },
  ];
}

export function createInitialState(): GameState {
  const deck = shuffleDeck(createDeck());
  const { hands, tippyHands, remainingDeck } = dealCards(
    deck,
    NUM_PLAYERS,
    CARDS_PER_REGULAR_HAND,
    CARDS_PER_TIPPY_HAND
  );

  const { card: startCard, remainingDeck: drawPile } = flipStartCard(remainingDeck);

  const teams = createInitialTeams();

  const players = [0, 1, 2, 3].map((idx) => ({
    index: idx as PlayerIndex,
    teamId: getTeamForPlayer(idx) as TeamId,
    hand: hands[idx],
    tippyHand: tippyHands[idx],
    hasTippyHand: true,
    isHuman: idx === 0,
    hasCompletedCanasta: false,
  }));

  // Handle red 3s in initial hands
  let state: GameState = {
    players,
    teams: [teams[0], teams[1]],
    drawPile,
    discardPile: [startCard],
    currentPlayerIndex: 0,
    phase: 'draw',
    roundNumber: 1,
    pileIsFrozen: false,
    roundScores: [],
    selectedCardIds: new Set<string>(),
    message: 'Your turn! Draw 2 cards or pick up the discard pile.',
  };

  // Process red 3s in initial hands for all players
  for (let i = 0; i < NUM_PLAYERS; i++) {
    state = processRedThreesInHand(state, i, false);
  }

  return state;
}

// ---- Red 3 processing ----

function processRedThreesInHand(state: GameState, playerIndex: number, drawReplacement: boolean): GameState {
  let newState = { ...state };
  const player = newState.players[playerIndex];
  const redThrees = player.hand.filter((c) => c.isRedThree);

  if (redThrees.length === 0) return state;

  // Remove red 3s from hand
  const newHand = player.hand.filter((c) => !c.isRedThree);

  // Add to team's red three count
  const teamId = player.teamId;
  const newTeams = [...newState.teams] as [TeamState, TeamState];
  newTeams[teamId] = {
    ...newTeams[teamId],
    redThreesLaidDown: newTeams[teamId].redThreesLaidDown + redThrees.length,
  };

  // Draw replacement cards if needed
  let newDrawPile = [...newState.drawPile];
  let finalHand = [...newHand];

  if (drawReplacement) {
    for (let i = 0; i < redThrees.length; i++) {
      if (newDrawPile.length > 0) {
        const drawn = newDrawPile.shift()!;
        // If the replacement is also a red 3, we'll process it in next iteration
        finalHand.push(drawn);
      }
    }
  }

  const newPlayers = newState.players.map((p, idx) =>
    idx === playerIndex ? { ...p, hand: finalHand } : p
  );

  newState = {
    ...newState,
    players: newPlayers,
    teams: newTeams,
    drawPile: newDrawPile,
  };

  // Recursively process if replacement drew more red 3s
  if (drawReplacement) {
    const stillHasRed3s = newState.players[playerIndex].hand.some((c) => c.isRedThree);
    if (stillHasRed3s) {
      return processRedThreesInHand(newState, playerIndex, drawReplacement);
    }
  }

  return newState;
}

// ---- Meld helpers ----

function applyMeldToTeam(
  teams: [TeamState, TeamState],
  teamId: TeamId,
  meld: Meld
): [TeamState, TeamState] {
  const newTeams = [...teams] as [TeamState, TeamState];
  newTeams[teamId] = {
    ...newTeams[teamId],
    melds: [...newTeams[teamId].melds, meld],
    hasFirstMeld: true,
  };
  return newTeams;
}

function updateMeldInTeam(
  teams: [TeamState, TeamState],
  teamId: TeamId,
  meldIndex: number,
  newMeld: Meld
): [TeamState, TeamState] {
  const newTeams = [...teams] as [TeamState, TeamState];
  const newMelds = [...newTeams[teamId].melds];
  newMelds[meldIndex] = newMeld;
  newTeams[teamId] = { ...newTeams[teamId], melds: newMelds };
  return newTeams;
}

function removeCardsFromHand(hand: Card[], cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return hand.filter((c) => !idSet.has(c.id));
}

function getCardsById(hand: Card[], cardIds: string[]): Card[] {
  const idSet = new Set(cardIds);
  return hand.filter((c) => idSet.has(c.id));
}

// ---- Check if canasta completed ----

function checkCanastaCompletion(
  state: GameState,
  playerIndex: number,
  prevMelds: Meld[],
  newMelds: Meld[]
): GameState {
  const player = state.players[playerIndex];
  if (player.hasCompletedCanasta) return state; // already triggered

  // Count complete melds before and after
  const prevComplete = prevMelds.filter((m) => m.isComplete).length;
  const newComplete = newMelds.filter((m) => m.isComplete).length;

  if (newComplete > prevComplete && player.hasTippyHand) {
    // Trigger tippy hand pickup!
    let newState = { ...state };
    const tippyCards = player.tippyHand;
    const newHand = [...player.hand, ...tippyCards];

    const newPlayers = newState.players.map((p, idx) =>
      idx === playerIndex
        ? { ...p, hand: newHand, tippyHand: [], hasTippyHand: false, hasCompletedCanasta: true }
        : p
    );

    newState = {
      ...newState,
      players: newPlayers,
      message: 'You completed a canasta! Tippy hand added to your hand.',
    };

    // Process red 3s from tippy hand
    newState = processRedThreesInHand(newState, playerIndex, true);

    return newState;
  }

  return state;
}

// ---- Turn advancement ----

function advanceTurn(state: GameState): GameState {
  const nextPlayer = ((state.currentPlayerIndex + 1) % NUM_PLAYERS) as PlayerIndex;

  // Check if draw pile has enough cards
  if (state.drawPile.length < 2) {
    // Round ends
    return endRound(state, null);
  }

  const isHuman = nextPlayer === 0;
  const newState: GameState = {
    ...state,
    currentPlayerIndex: nextPlayer,
    phase: 'draw',
    pileIsFrozen: false,
    selectedCardIds: new Set<string>(),
    selectedMeldRank: undefined,
    message: isHuman ? 'Your turn! Draw 2 cards or pick up the discard pile.' : `Player ${nextPlayer} is thinking...`,
  };

  return newState;
}

// ---- Round ending ----

export function endRound(state: GameState, goingOutPlayerIndex: number | null): GameState {
  const { team0Score, team1Score } = scoreRound(state, goingOutPlayerIndex);

  const newRoundScores = [...state.roundScores, { team0: team0Score, team1: team1Score }];

  const newTeam0Total = state.teams[0].totalScore + team0Score;
  const newTeam1Total = state.teams[1].totalScore + team1Score;

  const winner = getWinnerAfterRound(newTeam0Total, newTeam1Total);

  const newTeams: [TeamState, TeamState] = [
    { ...state.teams[0], totalScore: newTeam0Total },
    { ...state.teams[1], totalScore: newTeam1Total },
  ];

  return {
    ...state,
    teams: newTeams,
    roundScores: newRoundScores,
    phase: winner !== null ? 'gameOver' : 'roundEnd',
    winner: winner !== null ? (winner as TeamId) : undefined,
    message: goingOutPlayerIndex !== null
      ? `Player ${goingOutPlayerIndex} went out! Round over.`
      : 'Draw pile exhausted. Round over!',
  };
}

// ---- New round ----

export function startNewRound(state: GameState): GameState {
  const nextDealer = ((state.currentPlayerIndex + 1) % NUM_PLAYERS) as PlayerIndex;

  const deck = shuffleDeck(createDeck());
  const { hands, tippyHands, remainingDeck } = dealCards(
    deck,
    NUM_PLAYERS,
    CARDS_PER_REGULAR_HAND,
    CARDS_PER_TIPPY_HAND
  );

  const { card: startCard, remainingDeck: drawPile } = flipStartCard(remainingDeck);

  const newTeams: [TeamState, TeamState] = [
    { ...state.teams[0], melds: [], redThreesLaidDown: 0, hasFirstMeld: false },
    { ...state.teams[1], melds: [], redThreesLaidDown: 0, hasFirstMeld: false },
  ];

  const players = [0, 1, 2, 3].map((idx) => ({
    index: idx as PlayerIndex,
    teamId: getTeamForPlayer(idx) as TeamId,
    hand: hands[idx],
    tippyHand: tippyHands[idx],
    hasTippyHand: true,
    isHuman: idx === 0,
    hasCompletedCanasta: false,
  }));

  let newState: GameState = {
    ...state,
    players,
    teams: newTeams,
    drawPile,
    discardPile: [startCard],
    currentPlayerIndex: nextDealer,
    phase: 'draw',
    roundNumber: state.roundNumber + 1,
    pileIsFrozen: false,
    selectedCardIds: new Set<string>(),
    selectedMeldRank: undefined,
    message: nextDealer === 0 ? 'New round! Your turn to go first.' : `New round! Player ${nextDealer} goes first.`,
    winner: undefined,
  };

  // Process red 3s in initial hands
  for (let i = 0; i < NUM_PLAYERS; i++) {
    newState = processRedThreesInHand(newState, i, false);
  }

  return newState;
}

// ---- Main reducer ----

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();

    case 'NEXT_ROUND':
      return startNewRound(state);

    case 'SELECT_CARD': {
      if (state.phase !== 'meld' && state.phase !== 'discard') return state;
      if (state.currentPlayerIndex !== 0) return state;
      const newSelected = new Set(state.selectedCardIds);
      newSelected.add(action.cardId);
      return { ...state, selectedCardIds: newSelected };
    }

    case 'DESELECT_CARD': {
      const newSelected = new Set(state.selectedCardIds);
      newSelected.delete(action.cardId);
      return { ...state, selectedCardIds: newSelected };
    }

    case 'SELECT_MELD_RANK':
      return { ...state, selectedMeldRank: action.rank };

    case 'CLEAR_SELECTION':
      return { ...state, selectedCardIds: new Set<string>(), selectedMeldRank: undefined };

    case 'DRAW_FROM_PILE':
      return handleDrawFromPile(state);

    case 'PICK_UP_DISCARD_PILE':
      return handlePickUpDiscardPile(state);

    case 'MELD_CARDS':
      return handleMeldCards(state, action.cardIds, action.targetRank);

    case 'ADD_TO_MELD':
      return handleAddToMeld(state, action.cardIds, action.meldRank);

    case 'DISCARD_CARD':
      return handleDiscard(state, action.cardId);

    case 'ASK_GO_OUT':
      return handleAskGoOut(state);

    case 'ANSWER_GO_OUT':
      return handleAnswerGoOut(state, action.answer);

    default:
      return state;
  }
}

// ---- Action handlers ----

function handleDrawFromPile(state: GameState): GameState {
  if (state.phase !== 'draw') {
    return { ...state, message: 'Not time to draw.' };
  }

  if (state.drawPile.length < 2) {
    return endRound(state, null);
  }

  const newDraw = [...state.drawPile];
  const drawn: Card[] = [newDraw.shift()!, newDraw.shift()!];

  const newHand = [...state.players[state.currentPlayerIndex].hand, ...drawn];
  const newPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  let newState: GameState = {
    ...state,
    players: newPlayers,
    drawPile: newDraw,
    phase: 'meld',
    message: 'Cards drawn. Meld cards or discard to end turn.',
  };

  // Process red 3s from drawn cards
  newState = processRedThreesInHand(newState, state.currentPlayerIndex, true);

  return newState;
}

function handlePickUpDiscardPile(state: GameState): GameState {
  if (state.phase !== 'draw') {
    return { ...state, message: 'Not time to pick up pile.' };
  }

  if (state.discardPile.length === 0) {
    return { ...state, message: 'Discard pile is empty.' };
  }

  if (state.pileIsFrozen) {
    return { ...state, message: 'Pile is frozen by black 3.' };
  }

  const topDiscard = state.discardPile[state.discardPile.length - 1];
  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];

  const { canPickUp, reason } = canPickUpDiscardPile(
    topDiscard,
    player.hand,
    team,
    state.pileIsFrozen
  );

  if (!canPickUp) {
    return { ...state, message: reason ?? 'Cannot pick up discard pile.' };
  }

  // Take entire pile
  const pileCards = [...state.discardPile];
  const newHand = [...player.hand, ...pileCards];

  const newPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: [],
    phase: 'meld',
    message: `Picked up ${pileCards.length} cards! Meld cards or discard.`,
  };

  // Process red 3s from picked up pile
  newState = processRedThreesInHand(newState, state.currentPlayerIndex, true);

  return newState;
}

function handleMeldCards(state: GameState, cardIds: string[], targetRank?: Rank): GameState {
  if (state.phase !== 'meld') {
    return { ...state, message: 'Not time to meld.' };
  }

  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];
  const cards = getCardsById(player.hand, cardIds);

  if (cards.length !== cardIds.length) {
    return { ...state, message: 'Some cards not found in hand.' };
  }

  // Determine if it's a wild canasta (all wilds)
  const isWildCanasta = cards.every((c) => c.isWild);
  const naturals = cards.filter((c) => !c.isWild);
  const rank: Rank = targetRank ?? (isWildCanasta ? 'JOKER' : naturals[0]?.rank ?? 'JOKER');

  const error = validateNewMeld(cards, team.melds);
  if (error) {
    return { ...state, message: error };
  }

  // Check first meld threshold
  if (!team.hasFirstMeld) {
    if (!meetsFirstMeldThreshold(cards, team.totalScore)) {
      const threshold = team.totalScore >= 10000 ? 120 : team.totalScore >= 5000 ? 90 : 50;
      return {
        ...state,
        message: `First meld must be worth at least ${threshold} points.`,
      };
    }
  }

  const newMeld = buildMeld(rank, cards, isWildCanasta);
  const prevMelds = team.melds;
  const newTeams = applyMeldToTeam(state.teams as [TeamState, TeamState], player.teamId, newMeld);
  const newHand = removeCardsFromHand(player.hand, cardIds);

  const newPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  let newState: GameState = {
    ...state,
    players: newPlayers,
    teams: newTeams,
    selectedCardIds: new Set<string>(),
    selectedMeldRank: undefined,
    message: `Melded ${cards.length} cards of ${rank}.`,
  };

  // Check tippy hand
  newState = checkCanastaCompletion(newState, state.currentPlayerIndex, prevMelds, newTeams[player.teamId].melds);

  return newState;
}

function handleAddToMeld(state: GameState, cardIds: string[], meldRank: Rank): GameState {
  if (state.phase !== 'meld') {
    return { ...state, message: 'Not time to meld.' };
  }

  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];
  const cards = getCardsById(player.hand, cardIds);

  if (cards.length !== cardIds.length) {
    return { ...state, message: 'Some cards not found in hand.' };
  }

  // Find the meld
  const meldIndex = team.melds.findIndex((m) => {
    if (m.isWildCanasta) return meldRank === 'JOKER';
    return m.rank === meldRank;
  });

  if (meldIndex === -1) {
    return { ...state, message: `No meld found for rank ${meldRank}.` };
  }

  const meld = team.melds[meldIndex];
  const error = validateAddToMeld(cards, meld);
  if (error) {
    return { ...state, message: error };
  }

  const newCards = [...meld.cards, ...cards];
  const newMeld = buildMeld(meld.rank, newCards, meld.isWildCanasta);
  const prevMelds = team.melds;
  const newTeams = updateMeldInTeam(
    state.teams as [TeamState, TeamState],
    player.teamId,
    meldIndex,
    newMeld
  );
  const newHand = removeCardsFromHand(player.hand, cardIds);

  const newPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  let newState: GameState = {
    ...state,
    players: newPlayers,
    teams: newTeams,
    selectedCardIds: new Set<string>(),
    selectedMeldRank: undefined,
    message: `Added ${cards.length} cards to ${meldRank} meld.`,
  };

  // Check tippy hand
  newState = checkCanastaCompletion(newState, state.currentPlayerIndex, prevMelds, newTeams[player.teamId].melds);

  return newState;
}

function handleDiscard(state: GameState, cardId: string): GameState {
  if (state.phase !== 'meld' && state.phase !== 'discard') {
    return { ...state, message: 'Not time to discard.' };
  }

  const player = state.players[state.currentPlayerIndex];
  const card = player.hand.find((c) => c.id === cardId);

  if (!card) {
    return { ...state, message: 'Card not found in hand.' };
  }

  // Remove from hand
  const newHand = player.hand.filter((c) => c.id !== cardId);
  const newDiscardPile = [...state.discardPile, card];

  const newPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, hand: newHand } : p
  );

  let newState: GameState = {
    ...state,
    players: newPlayers,
    discardPile: newDiscardPile,
    pileIsFrozen: card.isBlackThree,
    selectedCardIds: new Set<string>(),
    selectedMeldRank: undefined,
  };

  // Check if player went out (hand is empty after discard)
  if (newHand.length === 0) {
    // Check going out requirements
    const team = state.teams[player.teamId];
    const hasClean = team.melds.some((m) => m.type === 'clean');
    const hasDirty = team.melds.some((m) => m.type === 'dirty');
    const hasWild = team.melds.some((m) => m.type === 'wild');

    if (hasClean && hasDirty && hasWild) {
      return endRound(newState, state.currentPlayerIndex);
    } else {
      // Player emptied hand but can't go out - this is an error state
      // Put the discard back? For now, just advance turn
      return advanceTurn({ ...newState, message: "Hand empty but can't go out yet. Advancing turn." });
    }
  }

  return advanceTurn(newState);
}

function handleAskGoOut(state: GameState): GameState {
  if (!canGoOut(state, state.currentPlayerIndex)) {
    return { ...state, message: 'Cannot go out yet. Need clean, dirty, and wild canastas.' };
  }

  const partnerIndex = getPartnerIndex(state.currentPlayerIndex);

  return {
    ...state,
    pendingGoOutQuery: {
      askingPlayerIndex: state.currentPlayerIndex,
      partnerIndex: partnerIndex as PlayerIndex,
    },
    message: 'Asking partner if you should go out...',
  };
}

function handleAnswerGoOut(state: GameState, answer: boolean): GameState {
  const newState = { ...state, pendingGoOutQuery: undefined };

  if (!answer) {
    return { ...newState, message: 'Partner says not yet. Continue your turn.' };
  }

  // Player decides to go out - they must discard their last card
  return {
    ...newState,
    phase: 'discard',
    message: 'Partner says go! Discard your last card to go out.',
  };
}

// ---- AI action execution (exported for store) ----

export function getAIDrawAction(state: GameState): GameAction {
  const player = state.players[state.currentPlayerIndex];
  const team = state.teams[player.teamId];

  if (state.discardPile.length > 0 && !state.pileIsFrozen) {
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    const { canPickUp } = canPickUpDiscardPile(topDiscard, player.hand, team, state.pileIsFrozen);
    if (canPickUp) {
      // AI picks up if it has a strong benefit
      const matchingCards = player.hand.filter(
        (c) => !c.isWild && c.rank === topDiscard.rank
      );
      if (matchingCards.length >= 2 || player.hand.filter((c) => c.isWild).length >= 2) {
        return { type: 'PICK_UP_DISCARD_PILE' };
      }
    }
  }

  return { type: 'DRAW_FROM_PILE' };
}
