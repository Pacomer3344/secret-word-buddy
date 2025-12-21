import { RefreshCw, Home, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
      <div className="w-full max-w-md space-y-8">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Home className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Volver al inicio</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Salir del juego?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se perderá el progreso de la partida actual. Las palabras configuradas se mantendrán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onReset}>Salir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="text-8xl animate-bounce-in">🎭</div>

          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Ayuda</TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Consejos de juego</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4 pt-4 text-left">
                    <div>
                      <h4 className="font-medium text-foreground">Para inocentes</h4>
                      <p className="text-sm text-muted-foreground">Da pistas sutiles que demuestren que conoces la palabra sin revelarla.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Para impostores</h4>
                      <p className="text-sm text-muted-foreground">Escucha atentamente y da respuestas vagas pero convincentes.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Votación</h4>
                      <p className="text-sm text-muted-foreground">Después de la ronda de pistas, voten quién creen que es el impostor.</p>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Message */}
        <div className="text-center space-y-4">
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
                Inocentes
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

        {/* Actions with confirmation */}
        <div className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full h-14 text-lg font-display font-semibold rounded-xl"
                size="lg"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Nueva Ronda
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Iniciar nueva ronda?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se asignará una nueva palabra y se redistribuirán los roles entre los jugadores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onNewRound}>Nueva Ronda</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-12 font-display rounded-xl"
              >
                <Home className="h-4 w-4 mr-2" />
                Volver a Configuración
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Volver a configuración?</AlertDialogTitle>
                <AlertDialogDescription>
                  Podrás modificar las palabras y el número de jugadores. Las palabras actuales se mantendrán.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onReset}>Ir a Configuración</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
