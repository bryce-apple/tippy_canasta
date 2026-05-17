import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GameScreen } from './src/screens/GameScreen';
import { RoundSummary } from './src/screens/RoundSummary';
import { WinScreen } from './src/screens/WinScreen';

type Screen = 'game' | 'roundSummary' | 'win';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('game');

  const navigate = (screen: Screen) => setCurrentScreen(screen);

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'game' && (
        <GameScreen
          onRoundEnd={() => navigate('roundSummary')}
          onGameOver={() => navigate('win')}
        />
      )}
      {currentScreen === 'roundSummary' && (
        <RoundSummary
          onContinue={() => navigate('game')}
        />
      )}
      {currentScreen === 'win' && (
        <WinScreen
          onNewGame={() => navigate('game')}
        />
      )}
    </>
  );
}
