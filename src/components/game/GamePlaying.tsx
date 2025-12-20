import { RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GamePlayingProps {
  playerCount: number;
  impostorCount: number;
  onNewRound: () => void;
  onReset: () => void;
}

export function GamePlaying({
  playerCount,
  impostorCount,
  onNewRound,
  onReset,
}: GamePlayingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Main Message */}
        <div className="space-y-4">
          <div className="text-8xl animate-bounce-in">🎭</div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-primary">
            ¡A jugar!
          </h1>
          <p className="text-xl text-muted-foreground">
            Descubran al impostor
          </p>
        </div>

        {/* Game Info */}
        <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-success">
                {playerCount - impostorCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Jugadores
              </p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-display font-bold text-impostor">
                {impostorCount}
              </p>
              <p className="text-sm text-muted-foreground">
                Impostor{impostorCount !== 1 ? 'es' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
          <p className="font-display font-medium text-sm">💡 Cómo jugar:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Cada jugador dice algo relacionado con la palabra</li>
            <li>El impostor debe fingir que la conoce</li>
            <li>Voten para eliminar al sospechoso</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onNewRound}
            className="w-full h-14 text-lg font-display font-semibold rounded-xl"
            size="lg"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Nueva Ronda
          </Button>
          
          <Button
            onClick={onReset}
            variant="outline"
            className="w-full h-12 font-display rounded-xl"
          >
            <Settings className="h-4 w-4 mr-2" />
            Volver a Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}
