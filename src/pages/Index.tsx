import { GameSetup } from '@/components/game/GameSetup';
import { RoleReveal } from '@/components/game/RoleReveal';
import { GamePlaying } from '@/components/game/GamePlaying';
import { useImpostorGame } from '@/hooks/useImpostorGame';

const Index = () => {
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
    canStartGame,
  } = useImpostorGame();

  return (
    <>
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
    </>
  );
};

export default Index;
