import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGameStore } from '../store/gameStore';

interface WinScreenProps {
  onNewGame: () => void;
}

export function WinScreen({ onNewGame }: WinScreenProps) {
  const { state, dispatch } = useGameStore();

  const winner = state.winner;
  const team0Score = state.teams[0].totalScore;
  const team1Score = state.teams[1].totalScore;
  const isTeam0Winner = winner === 0;

  const handleNewGame = () => {
    dispatch({ type: 'NEW_GAME' });
    onNewGame();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.trophy}>🏆</Text>
        <Text style={styles.winnerText}>
          {isTeam0Winner ? 'Team A Wins!' : 'Team B Wins!'}
        </Text>
        <Text style={styles.subTitle}>
          {isTeam0Winner
            ? 'Congratulations! You and your partner won!'
            : 'The AI opponents win this time!'}
        </Text>

        <View style={styles.scoreBox}>
          <View style={[styles.scoreRow, isTeam0Winner && styles.winnerRow]}>
            <Text style={styles.scoreName}>Team A (You & P2)</Text>
            <Text style={[styles.scoreValue, isTeam0Winner && styles.winnerScore]}>
              {team0Score.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.scoreRow, !isTeam0Winner && styles.winnerRow]}>
            <Text style={styles.scoreName}>Team B (P1 & P3)</Text>
            <Text style={[styles.scoreValue, !isTeam0Winner && styles.winnerScore]}>
              {team1Score.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.roundsText}>
          Game completed in {state.roundScores.length} round{state.roundScores.length !== 1 ? 's' : ''}
        </Text>

        {state.roundScores.length > 0 && (
          <View style={styles.roundHistory}>
            <Text style={styles.historyTitle}>Round History</Text>
            {state.roundScores.map((r, idx) => (
              <View key={idx} style={styles.historyRow}>
                <Text style={styles.historyLabel}>Round {idx + 1}</Text>
                <Text style={[styles.historyScore, { color: '#A5D6A7' }]}>
                  A: {r.team0 >= 0 ? '+' : ''}{r.team0}
                </Text>
                <Text style={[styles.historyScore, { color: '#EF9A9A' }]}>
                  B: {r.team1 >= 0 ? '+' : ''}{r.team1}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.newGameBtn} onPress={handleNewGame}>
          <Text style={styles.newGameBtnText}>Play Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D2137',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  trophy: {
    fontSize: 72,
  },
  winnerText: {
    color: '#F1C40F',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subTitle: {
    color: '#BDC3C7',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  scoreBox: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  winnerRow: {
    backgroundColor: 'rgba(241,196,15,0.15)',
  },
  scoreName: {
    color: '#ECF0F1',
    fontSize: 17,
    fontWeight: '500',
  },
  scoreValue: {
    color: '#ECF0F1',
    fontSize: 22,
    fontWeight: 'bold',
  },
  winnerScore: {
    color: '#F1C40F',
  },
  roundsText: {
    color: '#7F8C8D',
    fontSize: 14,
  },
  roundHistory: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  historyTitle: {
    color: '#BDC3C7',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyLabel: {
    color: '#95A5A6',
    fontSize: 13,
    flex: 1,
  },
  historyScore: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  newGameBtn: {
    backgroundColor: '#1ABC9C',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  newGameBtnText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
