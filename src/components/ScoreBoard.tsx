import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TeamState } from '../game/types';

interface ScoreBoardProps {
  teams: [TeamState, TeamState];
  roundScores: Array<{ team0: number; team1: number }>;
}

export function ScoreBoard({ teams, roundScores }: ScoreBoardProps) {
  const currentRoundScore = roundScores[roundScores.length - 1];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.teamScore, styles.team0]}>
          <Text style={styles.teamLabel}>Team A (You)</Text>
          <Text style={styles.totalScore}>{teams[0].totalScore.toLocaleString()}</Text>
          {currentRoundScore && (
            <Text style={[styles.roundScore, { color: currentRoundScore.team0 >= 0 ? '#A5D6A7' : '#EF9A9A' }]}>
              {currentRoundScore.team0 >= 0 ? '+' : ''}{currentRoundScore.team0}
            </Text>
          )}
          <Text style={styles.redThrees}>
            🔴 {teams[0].redThreesLaidDown}/6
          </Text>
        </View>
        <View style={styles.separator}>
          <Text style={styles.vs}>vs</Text>
        </View>
        <View style={[styles.teamScore, styles.team1]}>
          <Text style={styles.teamLabel}>Team B</Text>
          <Text style={styles.totalScore}>{teams[1].totalScore.toLocaleString()}</Text>
          {currentRoundScore && (
            <Text style={[styles.roundScore, { color: currentRoundScore.team1 >= 0 ? '#A5D6A7' : '#EF9A9A' }]}>
              {currentRoundScore.team1 >= 0 ? '+' : ''}{currentRoundScore.team1}
            </Text>
          )}
          <Text style={styles.redThrees}>
            🔴 {teams[1].redThreesLaidDown}/6
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
  },
  team0: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
  },
  team1: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  teamLabel: {
    color: '#E8F5E9',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  totalScore: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  roundScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  redThrees: {
    fontSize: 11,
    color: '#CCC',
    marginTop: 2,
  },
  separator: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  vs: {
    color: '#81C784',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
