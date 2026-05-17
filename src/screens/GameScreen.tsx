import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { CardView } from '../components/CardView';
import { HandView } from '../components/HandView';
import { MeldArea } from '../components/MeldArea';
import { DiscardPile } from '../components/DiscardPile';
import { ScoreBoard } from '../components/ScoreBoard';
import { canGoOut, canPickUpDiscardPile } from '../game/rules';
import { Card, Rank } from '../game/types';

interface GameScreenProps {
  onRoundEnd: () => void;
  onGameOver: () => void;
}

export function GameScreen({ onRoundEnd, onGameOver }: GameScreenProps) {
  const { state, dispatch, runAITurn, isAITurnRunning } = useGameStore();
  const aiTurnRef = useRef(false);

  const humanPlayer = state.players[0];
  const partner = state.players[2];
  const opponent1 = state.players[1];
  const opponent3 = state.players[3];
  const team0 = state.teams[0];
  const team1 = state.teams[1];

  const isHumanTurn = state.currentPlayerIndex === 0 && !isAITurnRunning;
  const topDiscard = state.discardPile.length > 0
    ? state.discardPile[state.discardPile.length - 1]
    : null;

  const { canPickUp } = topDiscard
    ? canPickUpDiscardPile(topDiscard, humanPlayer.hand, team0, state.pileIsFrozen)
    : { canPickUp: false };

  const selectedCards = humanPlayer.hand.filter((c) => state.selectedCardIds.has(c.id));
  const hasSelection = selectedCards.length > 0;

  // Trigger AI turns when it's not human's turn
  useEffect(() => {
    if (
      state.phase !== 'roundEnd' &&
      state.phase !== 'gameOver' &&
      !state.players[state.currentPlayerIndex]?.isHuman &&
      !isAITurnRunning
    ) {
      runAITurn();
    }
  }, [state.currentPlayerIndex, state.phase]);

  // Navigate when round/game ends
  useEffect(() => {
    if (state.phase === 'roundEnd') {
      onRoundEnd();
    } else if (state.phase === 'gameOver') {
      onGameOver();
    }
  }, [state.phase]);

  const handleCardPress = (card: Card) => {
    if (!isHumanTurn || state.phase === 'draw') return;
    if (state.selectedCardIds.has(card.id)) {
      dispatch({ type: 'DESELECT_CARD', cardId: card.id });
    } else {
      dispatch({ type: 'SELECT_CARD', cardId: card.id });
    }
  };

  const handleDraw = () => {
    if (!isHumanTurn || state.phase !== 'draw') return;
    dispatch({ type: 'DRAW_FROM_PILE' });
  };

  const handlePickUpPile = () => {
    if (!isHumanTurn || state.phase !== 'draw') return;
    dispatch({ type: 'PICK_UP_DISCARD_PILE' });
  };

  const handleMeld = () => {
    if (!isHumanTurn || !hasSelection) return;
    const cardIds = selectedCards.map((c) => c.id);
    dispatch({ type: 'MELD_CARDS', cardIds });
  };

  const handleAddToMeld = () => {
    if (!isHumanTurn || !hasSelection || !state.selectedMeldRank) return;
    const cardIds = selectedCards.map((c) => c.id);
    dispatch({ type: 'ADD_TO_MELD', cardIds, meldRank: state.selectedMeldRank });
  };

  const handleDiscard = () => {
    if (!isHumanTurn || selectedCards.length !== 1) return;
    dispatch({ type: 'DISCARD_CARD', cardId: selectedCards[0].id });
  };

  const handleMeldPress = (rank: Rank) => {
    if (!isHumanTurn) return;
    if (state.selectedMeldRank === rank) {
      dispatch({ type: 'SELECT_MELD_RANK', rank: rank });
    } else {
      dispatch({ type: 'SELECT_MELD_RANK', rank });
    }
  };

  const handleGoOut = () => {
    if (!isHumanTurn) return;
    if (!canGoOut(state, 0)) {
      Alert.alert(
        'Cannot Go Out',
        'You need at least one clean canasta, one dirty canasta, and one wild canasta to go out.'
      );
      return;
    }
    dispatch({ type: 'ASK_GO_OUT' });
  };

  const handleGoOutAnswer = (answer: boolean) => {
    dispatch({ type: 'ANSWER_GO_OUT', answer });
  };

  const canGoOutNow = canGoOut(state, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - Scores */}
      <ScoreBoard teams={state.teams as [typeof team0, typeof team1]} roundScores={state.roundScores} />

      {/* Message bar */}
      <View style={styles.messageBanner}>
        <Text style={styles.messageText} numberOfLines={2}>
          {isAITurnRunning && !state.players[state.currentPlayerIndex]?.isHuman
            ? `Player ${state.currentPlayerIndex} is thinking...`
            : state.message}
        </Text>
        <Text style={styles.roundText}>Round {state.roundNumber}</Text>
      </View>

      {/* Opponents row */}
      <View style={styles.opponentsRow}>
        <View style={styles.opponentSection}>
          <Text style={styles.playerLabel}>
            P1 {state.currentPlayerIndex === 1 ? '▶' : ''}
          </Text>
          <HandView
            cards={opponent1.hand}
            faceDown
            cardCount={opponent1.hand.length}
          />
        </View>
        <View style={styles.centerPiles}>
          {/* Draw pile */}
          <View style={styles.drawPileContainer}>
            <Text style={styles.pileLabel}>Draw ({state.drawPile.length})</Text>
            <TouchableOpacity
              onPress={handleDraw}
              disabled={!isHumanTurn || state.phase !== 'draw'}
              style={[styles.drawPile, isHumanTurn && state.phase === 'draw' && styles.drawPileActive]}
            >
              <Text style={styles.drawPileText}>🂠</Text>
            </TouchableOpacity>
          </View>
          {/* Discard pile */}
          <DiscardPile
            topCard={topDiscard}
            pileSize={state.discardPile.length}
            isFrozen={state.pileIsFrozen}
            onPickUp={handlePickUpPile}
            canPickUp={isHumanTurn && state.phase === 'draw' && canPickUp}
          />
        </View>
        <View style={styles.opponentSection}>
          <Text style={styles.playerLabel}>
            P3 {state.currentPlayerIndex === 3 ? '▶' : ''}
          </Text>
          <HandView
            cards={opponent3.hand}
            faceDown
            cardCount={opponent3.hand.length}
          />
        </View>
      </View>

      {/* Melds area */}
      <ScrollView style={styles.meldsArea} showsVerticalScrollIndicator={false}>
        <MeldArea
          melds={team0.melds}
          teamLabel={`Team A (You & P2) — First Meld: ${team0.hasFirstMeld ? '✓' : '✗'}`}
          isTeam0
          onMeldPress={isHumanTurn && state.phase === 'meld' ? handleMeldPress : undefined}
          selectedMeldRank={state.selectedMeldRank}
        />
        <MeldArea
          melds={team1.melds}
          teamLabel={`Team B (P1 & P3) — First Meld: ${team1.hasFirstMeld ? '✓' : '✗'}`}
          isTeam0={false}
        />
      </ScrollView>

      {/* Partner section */}
      <View style={styles.partnerRow}>
        <Text style={styles.playerLabel}>
          P2 (Partner) {state.currentPlayerIndex === 2 ? '▶' : ''} {partner.hasTippyHand ? '📦' : ''}
        </Text>
        <HandView
          cards={partner.hand}
          faceDown
          cardCount={partner.hand.length}
        />
      </View>

      {/* Action buttons */}
      {isHumanTurn && (
        <View style={styles.actionButtons}>
          {state.phase === 'draw' && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={handleDraw}>
                <Text style={styles.actionBtnText}>Draw 2</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, !canPickUp && styles.actionBtnDisabled]}
                onPress={handlePickUpPile}
                disabled={!canPickUp}
              >
                <Text style={styles.actionBtnText}>Pick Up Pile</Text>
              </TouchableOpacity>
            </>
          )}
          {state.phase === 'meld' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, !hasSelection && styles.actionBtnDisabled]}
                onPress={handleMeld}
                disabled={!hasSelection}
              >
                <Text style={styles.actionBtnText}>Meld Selected</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, (!hasSelection || !state.selectedMeldRank) && styles.actionBtnDisabled]}
                onPress={handleAddToMeld}
                disabled={!hasSelection || !state.selectedMeldRank}
              >
                <Text style={styles.actionBtnText}>Add to Meld</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, selectedCards.length !== 1 && styles.actionBtnDisabled]}
                onPress={handleDiscard}
                disabled={selectedCards.length !== 1}
              >
                <Text style={styles.actionBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnGoOut, !canGoOutNow && styles.actionBtnDisabled]}
                onPress={handleGoOut}
                disabled={!canGoOutNow}
              >
                <Text style={styles.actionBtnText}>Go Out?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnClear}
                onPress={() => dispatch({ type: 'CLEAR_SELECTION' })}
              >
                <Text style={styles.actionBtnText}>Clear</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Human's hand */}
      <View style={styles.humanHandSection}>
        <Text style={styles.playerLabel}>
          You (P0) {state.currentPlayerIndex === 0 ? '▶' : ''} {humanPlayer.hasTippyHand ? '📦 Tippy' : ''}
          {' '}({humanPlayer.hand.length} cards)
        </Text>
        <HandView
          cards={humanPlayer.hand}
          selectedCardIds={state.selectedCardIds}
          onCardPress={handleCardPress}
          isCurrentPlayer={state.currentPlayerIndex === 0}
        />
      </View>

      {/* Go Out Query Modal */}
      <Modal
        visible={!!state.pendingGoOutQuery}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Go Out?</Text>
            <Text style={styles.modalText}>
              {state.pendingGoOutQuery?.askingPlayerIndex === 0
                ? 'Should you go out? (Asking partner P2)'
                : `Player ${state.pendingGoOutQuery?.askingPlayerIndex} wants to go out. Should they?`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnYes]}
                onPress={() => handleGoOutAnswer(true)}
              >
                <Text style={styles.modalBtnText}>Yes!</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnNo]}
                onPress={() => handleGoOutAnswer(false)}
              >
                <Text style={styles.modalBtnText}>Not yet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D5016',
    padding: 8,
  },
  messageBanner: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    color: '#F0F4C3',
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  roundText: {
    color: '#A5D6A7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  opponentsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  opponentSection: {
    flex: 1,
    maxWidth: 120,
  },
  centerPiles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },
  drawPileContainer: {
    alignItems: 'center',
  },
  pileLabel: {
    color: '#E8F5E9',
    fontSize: 12,
    marginBottom: 4,
  },
  drawPile: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#1A237E',
    borderWidth: 1.5,
    borderColor: '#3949AB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawPileActive: {
    borderColor: '#F1C40F',
    borderWidth: 2.5,
  },
  drawPileText: {
    fontSize: 32,
    color: '#3949AB',
  },
  meldsArea: {
    flex: 1,
    marginVertical: 4,
  },
  partnerRow: {
    marginVertical: 4,
  },
  playerLabel: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
    justifyContent: 'center',
  },
  actionBtn: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    minWidth: 80,
    alignItems: 'center',
  },
  actionBtnGoOut: {
    backgroundColor: '#7B1FA2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CE93D8',
    minWidth: 80,
    alignItems: 'center',
  },
  actionBtnClear: {
    backgroundColor: '#424242',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#757575',
    minWidth: 60,
    alignItems: 'center',
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  humanHandSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 6,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalText: {
    color: '#E8F5E9',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  modalBtnYes: {
    backgroundColor: '#2E7D32',
    borderWidth: 1.5,
    borderColor: '#81C784',
  },
  modalBtnNo: {
    backgroundColor: '#B71C1C',
    borderWidth: 1.5,
    borderColor: '#EF9A9A',
  },
  modalBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
