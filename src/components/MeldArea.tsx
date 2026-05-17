import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Meld, Rank } from '../game/types';
import { CardView } from './CardView';

interface MeldAreaProps {
  melds: Meld[];
  teamLabel: string;
  isTeam0?: boolean;
  onMeldPress?: (rank: Rank) => void;
  selectedMeldRank?: Rank;
}

function getMeldTypeLabel(meld: Meld): string {
  switch (meld.type) {
    case 'clean': return '✓ Clean';
    case 'dirty': return '~ Dirty';
    case 'wild': return '★ Wild';
    case 'black3': return '♣ Black 3s';
    case 'incomplete': return '...';
    default: return '';
  }
}

function getMeldTypeColor(meld: Meld): string {
  switch (meld.type) {
    case 'clean': return '#27AE60';
    case 'dirty': return '#E67E22';
    case 'wild': return '#8E44AD';
    case 'black3': return '#2C3E50';
    case 'incomplete': return '#7F8C8D';
    default: return '#7F8C8D';
  }
}

interface MeldCardProps {
  meld: Meld;
  onPress?: () => void;
  isSelected?: boolean;
}

function MeldCard({ meld, onPress, isSelected }: MeldCardProps) {
  const typeColor = getMeldTypeColor(meld);
  const typeLabel = getMeldTypeLabel(meld);

  return (
    <TouchableOpacity
      style={[styles.meldCard, isSelected && styles.meldCardSelected, { borderColor: typeColor }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.meldHeader, { backgroundColor: typeColor }]}>
        <Text style={styles.meldRankText}>
          {meld.isWildCanasta ? 'WILD' : meld.rank}
        </Text>
        <Text style={styles.meldTypeText}>{typeLabel}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.meldCardsScroll}>
        <View style={styles.meldCards}>
          {meld.cards.map((card, idx) => (
            <CardView key={`${card.id}-${idx}`} card={card} small />
          ))}
        </View>
      </ScrollView>
      <Text style={styles.meldCount}>{meld.cards.length}/7 cards</Text>
    </TouchableOpacity>
  );
}

export function MeldArea({ melds, teamLabel, isTeam0 = false, onMeldPress, selectedMeldRank }: MeldAreaProps) {
  return (
    <View style={[styles.container, isTeam0 ? styles.team0 : styles.team1]}>
      <Text style={styles.teamLabel}>{teamLabel}</Text>
      {melds.length === 0 ? (
        <Text style={styles.noMelds}>No melds yet</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.meldsScroll}>
          {melds.map((meld, idx) => {
            const meldKey = meld.isWildCanasta ? 'JOKER' : meld.rank;
            const isSelected = selectedMeldRank === meldKey;
            return (
              <MeldCard
                key={`${meldKey}-${idx}`}
                meld={meld}
                onPress={onMeldPress ? () => onMeldPress(meldKey as Rank) : undefined}
                isSelected={isSelected}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 8,
    marginVertical: 3,
  },
  team0: {
    backgroundColor: 'rgba(39, 174, 96, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.4)',
  },
  team1: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.4)',
  },
  teamLabel: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noMelds: {
    color: '#81C784',
    fontSize: 12,
    fontStyle: 'italic',
    padding: 8,
  },
  meldsScroll: {
    flexGrow: 0,
  },
  meldCard: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderWidth: 1.5,
    marginRight: 8,
    minWidth: 100,
    maxWidth: 160,
    overflow: 'hidden',
  },
  meldCardSelected: {
    backgroundColor: 'rgba(255,255,200,0.15)',
    borderWidth: 2.5,
  },
  meldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  meldRankText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  meldTypeText: {
    color: '#FFF',
    fontSize: 10,
  },
  meldCardsScroll: {
    maxHeight: 72,
  },
  meldCards: {
    flexDirection: 'row',
    padding: 4,
  },
  meldCount: {
    color: '#CCC',
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: 4,
  },
});
