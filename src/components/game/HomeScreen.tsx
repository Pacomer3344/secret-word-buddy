import { Wifi, WifiOff, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface HomeScreenProps {
  onSelectMode: (mode: 'offline' | 'online') => void;
}

export const HomeScreen = ({ onSelectMode }: HomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-6">
      {/* Logo y título */}
      <div className="text-center mb-12 animate-bounce-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
          <Users className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
          Impostor
        </h1>
        <p className="text-lg text-muted-foreground font-body">
          ¿Quién es el impostor entre ustedes?
        </p>
      </div>

      {/* Opciones de modo */}
      <div className="w-full max-w-md space-y-4">
        {/* Modo Offline */}
        <Card 
          className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2 border-transparent hover:border-primary/30"
          onClick={() => onSelectMode('offline')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                <WifiOff className="w-7 h-7 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-display font-semibold text-foreground mb-1">
                  Modo Offline
                </h2>
                <p className="text-sm text-muted-foreground">
                  Juega pasando el dispositivo entre jugadores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modo Online */}
        <Card 
          className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-2 border-transparent hover:border-primary/30 relative overflow-hidden"
          onClick={() => onSelectMode('online')}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Wifi className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-display font-semibold text-foreground mb-1">
                  Modo Online
                </h2>
                <p className="text-sm text-muted-foreground">
                  Cada jugador usa su propio dispositivo
                </p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                <Sparkles className="w-3 h-3" />
                ¡Nuevo!
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="mt-12 text-sm text-muted-foreground/60">
        Un juego de deducción social
      </p>
    </div>
  );
};
