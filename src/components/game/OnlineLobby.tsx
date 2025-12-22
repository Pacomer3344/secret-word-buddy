import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnlineLobbyProps {
  playerName: string;
  onSetPlayerName: (name: string) => void;
  onCreateRoom: () => Promise<{ error?: string; success?: boolean; roomCode?: string }>;
  onJoinRoom: (code: string) => Promise<{ error?: string; success?: boolean }>;
  onGoHome: () => void;
}

export default function OnlineLobby({
  playerName,
  onSetPlayerName,
  onCreateRoom,
  onJoinRoom,
  onGoHome,
}: OnlineLobbyProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Error', description: 'Ingresa tu nombre', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await onCreateRoom();
    setIsLoading(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      toast({ title: 'Error', description: 'Ingresa tu nombre', variant: 'destructive' });
      return;
    }
    if (!roomCode.trim()) {
      toast({ title: 'Error', description: 'Ingresa el código de sala', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const result = await onJoinRoom(roomCode);
    setIsLoading(false);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Button
          variant="ghost"
          onClick={onGoHome}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio
        </Button>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Modo Online
          </h1>
          <p className="text-muted-foreground">
            Juega con amigos en tiempo real
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tu Nombre</CardTitle>
            <CardDescription>Ingresa tu nombre para identificarte</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Ej: Juan"
              value={playerName}
              onChange={(e) => onSetPlayerName(e.target.value)}
              maxLength={20}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">
              <Users className="w-4 h-4 mr-2" />
              Crear Sala
            </TabsTrigger>
            <TabsTrigger value="join">
              <UserPlus className="w-4 h-4 mr-2" />
              Unirse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Crear Nueva Sala</CardTitle>
                <CardDescription>
                  Crea una sala y comparte el código con tus amigos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleCreateRoom} 
                  className="w-full"
                  disabled={isLoading || !playerName.trim()}
                >
                  {isLoading ? 'Creando...' : 'Crear Sala'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle>Unirse a Sala</CardTitle>
                <CardDescription>
                  Ingresa el código de 6 caracteres
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomCode">Código de Sala</Label>
                  <Input
                    id="roomCode"
                    placeholder="ABC123"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <Button 
                  onClick={handleJoinRoom}
                  className="w-full"
                  disabled={isLoading || !playerName.trim() || !roomCode.trim()}
                >
                  {isLoading ? 'Uniéndose...' : 'Unirse'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
