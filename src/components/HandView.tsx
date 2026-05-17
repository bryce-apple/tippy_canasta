import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../game/types';
import { CardView } from './CardView';

interface HandViewProps {
  cards: Card[];
  selectedCardIds?: Set<string>;
  onCardPress?: (card: Card) => void;
  faceDown?: boolean;
  label?: string;
  cardCount?: number; // for face-down hands, show count
  isCurrentPlayer?: boolean;
}

export function HandView({
  cards,
  selectedCardIds = new Set(),
  onCardPress,
  faceDown = false,
  label,
  cardCount,
  isCurrentPlayer = false,
}: HandViewProps) {
  const displayCount = cardCount ?? cards.length;

  return (
    <View style={[styles.container, isCurrentPlayer && styles.currentPlayerContainer]}>
      {label && (
        <Text style={styles.label}>
          {label} {faceDown ? `(${displayCount} cards)` : `(${cards.length} cards)`}
        </Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {faceDown ? (
          // Show face-down cards
          Array.from({ length: displayCount }).map((_, idx) => (
            <CardView
              key={idx}
              card={{ id: `back-${idx}`, suit: 'spades', rank: 'A', isWild: false, isRedThree: false, isBlackThree: false }}
              faceDown
              small
            />
          ))
        ) : (
          cards.map((card) => (
            <CardView
              key={card.id}
              card={card}
              selected={selectedCardIds.has(card.id)}
              onPress={onCardPress ? () => onCardPress(card) : undefined}
            />
          ))
        )}
        {cards.length === 0 && !faceDown && (
          <Text style={styles.emptyText}>Empty hand</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  currentPlayerContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  label: {
    color: '#E8F5E9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  emptyText: {
    color: '#81C784',
    fontSize: 13,
    fontStyle: 'italic',
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
});
