import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../game/types';

interface CardViewProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  onPress?: () => void;
  small?: boolean;
  disabled?: boolean;
}

function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    case 'joker': return '★';
    default: return '?';
  }
}

function isRedSuit(suit: string): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

export function CardView({ card, faceDown = false, selected = false, onPress, small = false, disabled = false }: CardViewProps) {
  const cardStyle = [
    styles.card,
    small && styles.cardSmall,
    selected && styles.cardSelected,
    faceDown && styles.cardBack,
    disabled && styles.cardDisabled,
  ];

  if (faceDown) {
    return (
      <TouchableOpacity onPress={onPress} style={cardStyle} disabled={!onPress || disabled}>
        <View style={styles.cardBackInner}>
          <Text style={styles.cardBackText}>🂠</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const suitColor = card.rank === 'JOKER'
    ? '#9B59B6'
    : isRedSuit(card.suit)
      ? '#C0392B'
      : '#1A1A2E';

  const suitSymbol = getSuitSymbol(card.suit);
  const displayRank = card.rank === 'JOKER' ? 'JKR' : card.rank;

  return (
    <TouchableOpacity onPress={onPress} style={cardStyle} disabled={!onPress || disabled} activeOpacity={0.7}>
      <View style={[styles.cardFace, card.isRedThree && styles.redThreeCard, card.isBlackThree && styles.blackThreeCard]}>
        <Text style={[styles.rankTop, { color: suitColor }, small && styles.rankSmall]}>
          {displayRank}
        </Text>
        <Text style={[styles.suitCenter, { color: suitColor }, small && styles.suitSmall]}>
          {suitSymbol}
        </Text>
        <Text style={[styles.rankBottom, { color: suitColor }, small && styles.rankSmall]}>
          {displayRank}
        </Text>
        {card.isWild && !card.isRedThree && (
          <View style={styles.wildBadge}>
            <Text style={styles.wildBadgeText}>W</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 60,
    height: 84,
    borderRadius: 8,
    backgroundColor: '#FFFEF0',
    borderWidth: 1.5,
    borderColor: '#CCC',
    margin: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cardSmall: {
    width: 44,
    height: 62,
    borderRadius: 6,
    margin: 2,
  },
  cardSelected: {
    borderColor: '#F1C40F',
    borderWidth: 2.5,
    backgroundColor: '#FFFDE7',
    transform: [{ translateY: -8 }],
  },
  cardBack: {
    backgroundColor: '#1A237E',
    borderColor: '#3949AB',
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardBackInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackText: {
    fontSize: 36,
    color: '#3949AB',
  },
  cardFace: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-between',
  },
  redThreeCard: {
    backgroundColor: '#FFF3E0',
  },
  blackThreeCard: {
    backgroundColor: '#F3E5F5',
  },
  rankTop: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  rankSmall: {
    fontSize: 10,
    lineHeight: 12,
  },
  suitCenter: {
    fontSize: 20,
    textAlign: 'center',
  },
  suitSmall: {
    fontSize: 14,
  },
  rankBottom: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
    lineHeight: 16,
    transform: [{ rotate: '180deg' }],
  },
  wildBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#F39C12',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wildBadgeText: {
    fontSize: 8,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
