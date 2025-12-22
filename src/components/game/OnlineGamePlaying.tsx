import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RotateCcw, 
  ArrowLeft, 
  HelpCircle,
  Users,
  Crown,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { Player } from '@/hooks/useOnlineGame';

interface OnlineGamePlayingProps {
  players: Player[];
  myRole: 'player' | 'impostor';
  word: string | null;
  isHost: boolean;
  onNewRound: () => void;
  onLeaveRoom: () => void;
}

export default function OnlineGamePlaying({
  players,
  myRole,
  word,
  isHost,
  onNewRound,
  onLeaveRoom,
}: OnlineGamePlayingProps) {
  const isImpostor = myRole === 'impostor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Salir de la sala?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isHost 
                    ? 'Como host, si sales la sala se eliminará para todos.'
                    : 'Saldrás de la sala actual.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onLeaveRoom}>Salir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <HelpCircle className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cómo jugar</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>Objetivo:</strong> Descubrir quién es el impostor.</p>
                <p><strong>Jugadores:</strong> Conocen la palabra y deben dar pistas sutiles.</p>
                <p><strong>Impostores:</strong> No conocen la palabra y deben fingir que sí.</p>
                <p><strong>Consejo:</strong> Hagan preguntas y observen las respuestas.</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Role Card */}
        <Card className={`border-2 ${isImpostor ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5'}`}>
          <CardContent className="py-8 text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isImpostor ? 'bg-destructive/20' : 'bg-primary/20'
            }`}>
              {isImpostor ? (
                <EyeOff className="w-8 h-8 text-destructive" />
              ) : (
                <Eye className="w-8 h-8 text-primary" />
              )}
            </div>
            
            {isImpostor ? (
              <div>
                <h2 className="text-2xl font-bold text-destructive mb-2">Eres Impostor</h2>
                <p className="text-muted-foreground">No conoces la palabra secreta</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-1">La palabra secreta es:</p>
                <h2 className="text-3xl font-bold text-primary">{word}</h2>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Jugadores ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => (
                <Badge
                  key={player.player_id}
                  variant="secondary"
                  className="text-sm py-1 px-3"
                >
                  {player.is_host && <Crown className="w-3 h-3 mr-1" />}
                  {player.player_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Host Controls */}
        {isHost && (
          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" variant="default">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Nueva Ronda
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Iniciar nueva ronda?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se asignarán nuevos roles y una nueva palabra secreta.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onNewRound}>
                    Nueva Ronda
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Non-host message */}
        {!isHost && (
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                El host puede iniciar una nueva ronda cuando termine
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
