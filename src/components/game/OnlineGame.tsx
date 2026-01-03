import { useOnlineGame } from '@/hooks/useOnlineGame';
import OnlineLobby from './OnlineLobby';
import WaitingRoom from './WaitingRoom';
import OnlineRoleReveal from './OnlineRoleReveal';
import OnlineGamePlaying from './OnlineGamePlaying';

interface OnlineGameProps {
  onGoHome: () => void;
}

export default function OnlineGame({ onGoHome }: OnlineGameProps) {
  const {
    state,
    setPlayerName,
    createRoom,
    joinRoom,
    addWord,
    addWords,
    removeWord,
    setImpostorCount,
    startGame,
    confirmRole,
    newRound,
    leaveRoom,
    refreshPlayers,
    canStartGame,
  } = useOnlineGame();

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const handleGoHome = () => {
    if (state.roomId) {
      leaveRoom();
    }
    onGoHome();
  };

  // Lobby - Enter name and create/join room
  if (state.phase === 'lobby') {
    return (
      <OnlineLobby
        playerName={state.playerName}
        onSetPlayerName={setPlayerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onGoHome={onGoHome}
      />
    );
  }

  // Waiting Room - Host adds words, players wait
  if (state.phase === 'waiting') {
    return (
      <WaitingRoom
        roomCode={state.roomCode!}
        players={state.players}
        words={state.words}
        impostorCount={state.impostorCount}
        isHost={state.isHost}
        canStart={canStartGame}
        onAddWord={addWord}
        onAddWords={addWords}
        onRemoveWord={removeWord}
        onSetImpostorCount={setImpostorCount}
        onStartGame={startGame}
        onLeaveRoom={handleLeaveRoom}
        onRefreshPlayers={refreshPlayers}
      />
    );
  }

  // Role Reveal - Each player sees their role
  if (state.phase === 'reveal' && state.myRole) {
    return (
      <OnlineRoleReveal
        playerName={state.playerName}
        role={state.myRole}
        word={state.currentWord}
        onConfirm={confirmRole}
      />
    );
  }

  // Playing - Game in progress
  if (state.phase === 'playing' && state.myRole) {
    return (
      <OnlineGamePlaying
        players={state.players}
        myRole={state.myRole}
        word={state.currentWord}
        isHost={state.isHost}
        onNewRound={newRound}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // Fallback while loading
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  );
}
