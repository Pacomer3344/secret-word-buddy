import { forwardRef } from 'react';
import { HomeScreen } from '@/components/game/HomeScreen';
import { GameSetup } from '@/components/game/GameSetup';
import { RoleReveal } from '@/components/game/RoleReveal';
import { GamePlaying } from '@/components/game/GamePlaying';
import OnlineGame from '@/components/game/OnlineGame';
import { useImpostorGame } from '@/hooks/useImpostorGame';

const Index = forwardRef<HTMLDivElement>((_, ref) => {
  const {
    state,
    addWord,
    removeWord,
    setPlayerCount,
    setImpostorCount,
    startGame,
    nextPlayer,
    newRound,
    resetGame,
    selectMode,
    canStartGame,
  } = useImpostorGame();

  // Online mode has its own flow
  if (state.mode === 'online') {
    return <OnlineGame onGoHome={() => selectMode(null)} />;
  }

  return (
    <div ref={ref}>
      {state.phase === 'home' && (
        <HomeScreen onSelectMode={selectMode} />
      )}

      {state.phase === 'setup' && (
        <GameSetup
          words={state.words}
          playerCount={state.playerCount}
          impostorCount={state.impostorCount}
          onAddWord={addWord}
          onRemoveWord={removeWord}
          onPlayerCountChange={setPlayerCount}
          onImpostorCountChange={setImpostorCount}
          onStartGame={startGame}
          onGoHome={() => selectMode(null)}
          canStart={canStartGame}
        />
      )}

      {state.phase === 'reveal' && (
        <RoleReveal
          playerIndex={state.currentPlayerIndex}
          totalPlayers={state.playerCount}
          role={state.roles[state.currentPlayerIndex]}
          word={state.currentWord}
          onNext={nextPlayer}
        />
      )}

      {state.phase === 'playing' && (
        <GamePlaying
          playerCount={state.playerCount}
          impostorCount={state.impostorCount}
          onNewRound={newRound}
          onReset={resetGame}
        />
      )}
    </div>
  );
});

Index.displayName = 'Index';

export default Index;
