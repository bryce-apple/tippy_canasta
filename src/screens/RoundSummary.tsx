import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGameStore } from '../store/gameStore';
import { meldBonus, meldCardValue, redThreeScore } from '../game/scoring';
import { cardsPointValue } from '../game/rules';
import { GOING_OUT_BONUS } from '../game/constants';

interface RoundSummaryProps {
  onContinue: () => void;
}

export function RoundSummary({ onContinue }: RoundSummaryProps) {
  const { state, dispatch } = useGameStore();
  const latestRound = state.roundScores[state.roundScores.length - 1];

  const handleContinue = () => {
    dispatch({ type: 'NEXT_ROUND' });
    onContinue();
  };

  const renderTeamSummary = (teamId: 0 | 1) => {
    const team = state.teams[teamId];
    const teamName = teamId === 0 ? 'Team A (You & P2)' : 'Team B (P1 & P3)';
    const roundScore = teamId === 0 ? latestRound?.team0 ?? 0 : latestRound?.team1 ?? 0;
    const teamColor = teamId === 0 ? '#27AE60' : '#E74C3C';

    // Compute breakdown
    let canastaBonusTotal = 0;
    let meldCardTotal = 0;
    for (const meld of team.melds) {
      canastaBonusTotal += meldBonus(meld);
      meldCardTotal += meldCardValue(meld);
    }

    const hasAll6 = team.redThreesLaidDown === 6;
    const redThreeTotal = redThreeScore(team.redThreesLaidDown, hasAll6);

    // Hand deductions
    const teamPlayers = state.players.filter((p) => p.teamId === teamId);
    let handDeductions = 0;
    for (const player of teamPlayers) {
      handDeductions += cardsPointValue(player.hand);
    }

    return (
      <View style={[styles.teamBox, { borderColor: teamColor }]}>
        <View style={[styles.teamHeader, { backgroundColor: teamColor }]}>
          <Text style={styles.teamName}>{teamName}</Text>
          <Text style={[styles.roundTotal, { color: roundScore >= 0 ? '#A5D6A7' : '#EF9A9A' }]}>
            {roundScore >= 0 ? '+' : ''}{roundScore} pts
          </Text>
        </View>
        <View style={styles.breakdown}>
          {team.melds.length > 0 && (
            <>
              <Text style={styles.breakdownTitle}>Melds:</Text>
              {team.melds.map((meld, idx) => (
                <View key={idx} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {meld.isWildCanasta ? 'WILD' : meld.rank} ({meld.type})
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {meldCardValue(meld)} + {meldBonus(meld)} bonus
                  </Text>
                </View>
              ))}
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Canasta Bonuses</Text>
            <Text style={styles.breakdownValue}>{canastaBonusTotal}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Card Values in Melds</Text>
            <Text style={styles.breakdownValue}>{meldCardTotal}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Red 3s ({team.redThreesLaidDown}/6){hasAll6 ? ' ALL BONUS!' : ''}
            </Text>
            <Text style={styles.breakdownValue}>{redThreeTotal}</Text>
          </View>
          {handDeductions > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Cards in Hand (penalty)</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>-{handDeductions}</Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Score</Text>
            <Text style={styles.teamTotalScore}>{team.totalScore.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Round {state.roundNumber - 1} Summary</Text>
      <ScrollView contentContainerStyle={styles.content}>
        {renderTeamSummary(0)}
        {renderTeamSummary(1)}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          After {state.roundScores.length} rounds — Team A: {state.teams[0].totalScore.toLocaleString()} | Team B: {state.teams[1].totalScore.toLocaleString()}
        </Text>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Next Round →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2631',
  },
  title: {
    color: '#F0F4C3',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  teamBox: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  teamName: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  roundTotal: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  breakdown: {
    backgroundColor: '#1B2631',
    padding: 12,
    gap: 6,
  },
  breakdownTitle: {
    color: '#BDC3C7',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  breakdownLabel: {
    color: '#ECF0F1',
    fontSize: 14,
    flex: 1,
  },
  breakdownValue: {
    color: '#A5D6A7',
    fontSize: 14,
    fontWeight: '600',
  },
  negative: {
    color: '#EF9A9A',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 8,
    marginTop: 4,
  },
  totalLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamTotalScore: {
    color: '#F1C40F',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    color: '#BDC3C7',
    fontSize: 13,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: '#27AE60',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
