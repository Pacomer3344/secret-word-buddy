import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';

interface OnlineRoleRevealProps {
  playerName: string;
  role: 'player' | 'impostor';
  word: string | null;
  onConfirm: () => void;
}

export default function OnlineRoleReveal({
  playerName,
  role,
  word,
  onConfirm,
}: OnlineRoleRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const isImpostor = role === 'impostor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Tu Rol, {playerName}</h2>
          <p className="text-muted-foreground">
            {isRevealed ? 'Memoriza tu rol' : 'Toca para revelar tu rol'}
          </p>
        </div>

        <Card 
          className={`transition-all duration-500 ${
            isRevealed 
              ? isImpostor 
                ? 'border-destructive bg-destructive/5' 
                : 'border-primary bg-primary/5'
              : 'cursor-pointer hover:border-primary/50'
          }`}
          onClick={() => !isRevealed && setIsRevealed(true)}
        >
          <CardContent className="py-12">
            {!isRevealed ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <EyeOff className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-lg">Toca para revelar</p>
              </div>
            ) : (
              <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                {isImpostor ? (
                  <>
                    <div className="w-24 h-24 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="w-12 h-12 text-destructive" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-destructive mb-2">
                        ¡IMPOSTOR!
                      </h3>
                      <p className="text-muted-foreground">
                        No conoces la palabra secreta.<br />
                        Intenta descubrirla sin ser detectado.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                      <Eye className="w-12 h-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium text-muted-foreground mb-2">
                        La palabra secreta es:
                      </h3>
                      <p className="text-4xl font-bold text-primary">
                        {word}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {isRevealed && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
            <Button 
              onClick={onConfirm} 
              className="w-full" 
              size="lg"
            >
              <Check className="w-5 h-5 mr-2" />
              Entendido
            </Button>
            
            <p className="text-sm text-center text-muted-foreground">
              ⚠️ No muestres tu pantalla a otros jugadores
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
