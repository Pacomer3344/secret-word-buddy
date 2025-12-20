import { useState } from 'react';
import { Plus, X, Users, UserX, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface GameSetupProps {
  words: string[];
  playerCount: number;
  impostorCount: number;
  onAddWord: (word: string) => void;
  onRemoveWord: (word: string) => void;
  onPlayerCountChange: (count: number) => void;
  onImpostorCountChange: (count: number) => void;
  onStartGame: () => void;
  canStart: boolean;
}

export function GameSetup({
  words,
  playerCount,
  impostorCount,
  onAddWord,
  onRemoveWord,
  onPlayerCountChange,
  onImpostorCountChange,
  onStartGame,
  canStart,
}: GameSetupProps) {
  const [newWord, setNewWord] = useState('');

  const handleAddWord = () => {
    if (newWord.trim()) {
      onAddWord(newWord);
      setNewWord('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddWord();
    }
  };

  const maxImpostors = Math.max(1, Math.floor(playerCount / 2));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary">
            🎭 Impostor
          </h1>
          <p className="text-muted-foreground">
            Configura tu partida
          </p>
        </div>

        {/* Word Input */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-4">
          <h2 className="font-display font-semibold text-lg">Palabras</h2>
          
          <div className="flex gap-2">
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe una palabra..."
              className="flex-1"
            />
            <Button onClick={handleAddWord} size="icon" className="shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Word List */}
          <div className="min-h-[80px] flex flex-wrap gap-2">
            {words.length === 0 ? (
              <p className="text-muted-foreground text-sm w-full text-center py-4">
                Agrega palabras para jugar
              </p>
            ) : (
              words.map((word) => (
                <Badge
                  key={word}
                  variant="secondary"
                  className="text-sm py-1.5 px-3 flex items-center gap-2 animate-bounce-in"
                >
                  {word}
                  <button
                    onClick={() => onRemoveWord(word)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>

        {/* Player Settings */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-6">
          {/* Player Count */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-display font-medium">Jugadores</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPlayerCountChange(Math.max(2, playerCount - 1))}
                disabled={playerCount <= 2}
              >
                -
              </Button>
              <span className="text-3xl font-display font-bold w-12 text-center">
                {playerCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPlayerCountChange(playerCount + 1)}
              >
                +
              </Button>
            </div>
          </div>

          {/* Impostor Count */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-impostor" />
              <span className="font-display font-medium">Impostores</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onImpostorCountChange(Math.max(1, impostorCount - 1))}
                disabled={impostorCount <= 1}
              >
                -
              </Button>
              <span className="text-3xl font-display font-bold w-12 text-center text-impostor">
                {impostorCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onImpostorCountChange(Math.min(maxImpostors, impostorCount + 1))}
                disabled={impostorCount >= maxImpostors}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Máximo {maxImpostors} impostor{maxImpostors !== 1 ? 'es' : ''} para {playerCount} jugadores
            </p>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={onStartGame}
          disabled={!canStart}
          className="w-full h-14 text-lg font-display font-semibold rounded-xl shadow-lg"
          size="lg"
        >
          <Play className="h-5 w-5 mr-2" />
          Iniciar Juego
        </Button>
      </div>
    </div>
  );
}
