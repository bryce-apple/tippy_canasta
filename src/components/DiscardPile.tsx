import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../game/types';
import { CardView } from './CardView';

interface DiscardPileProps {
  topCard: Card | null;
  pileSize: number;
  isFrozen: boolean;
  onPickUp?: () => void;
  canPickUp?: boolean;
}

export function DiscardPile({ topCard, pileSize, isFrozen, onPickUp, canPickUp = false }: DiscardPileProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Discard ({pileSize})</Text>
      {isFrozen && (
        <View style={styles.frozenBadge}>
          <Text style={styles.frozenText}>FROZEN</Text>
        </View>
      )}
      {topCard ? (
        <TouchableOpacity
          onPress={canPickUp ? onPickUp : undefined}
          disabled={!canPickUp}
          style={[styles.cardWrapper, canPickUp && styles.pickupable]}
        >
          <CardView card={topCard} />
          {canPickUp && (
            <View style={styles.pickUpOverlay}>
              <Text style={styles.pickUpText}>Pick Up</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyPile}>
          <Text style={styles.emptyText}>Empty</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 4,
  },
  label: {
    color: '#E8F5E9',
    fontSize: 12,
    marginBottom: 4,
  },
  frozenBadge: {
    backgroundColor: '#1565C0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  frozenText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardWrapper: {
    position: 'relative',
  },
  pickupable: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F1C40F',
  },
  pickUpOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(241,196,15,0.9)',
    paddingVertical: 2,
    alignItems: 'center',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  pickUpText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1A1A2E',
  },
  emptyPile: {
    width: 60,
    height: 84,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});
