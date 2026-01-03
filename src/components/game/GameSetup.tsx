import { useState } from 'react';
import { Plus, X, Users, UserX, Play, Home, HelpCircle, FileSpreadsheet, FolderOpen, Loader2 } from 'lucide-react';
import { useExcelImport } from '@/hooks/useExcelImport';
import { useWordCategories } from '@/hooks/useWordCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface GameSetupProps {
  words: string[];
  playerCount: number;
  impostorCount: number;
  onAddWord: (word: string) => void;
  onRemoveWord: (word: string) => void;
  onPlayerCountChange: (count: number) => void;
  onImpostorCountChange: (count: number) => void;
  onStartGame: () => void;
  onGoHome: () => void;
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
  onGoHome,
  canStart,
}: GameSetupProps) {
  const [newWord, setNewWord] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  
  const { fileInputRef, handleFileChange, triggerFileSelect } = useExcelImport((importedWords) => {
    importedWords.forEach(word => onAddWord(word));
  });
  
  const { categories, loading: loadingCategories, selectCategory } = useWordCategories((categoryWords) => {
    categoryWords.forEach(word => onAddWord(word));
    setCategoryOpen(false);
  });

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

  // Validation messages for better error prevention
  const getValidationMessage = () => {
    if (words.length === 0) return 'Agrega al menos una palabra';
    if (playerCount < 2) return 'Se necesitan al menos 2 jugadores';
    if (impostorCount >= playerCount) return 'Muy pocos jugadores para tantos impostores';
    return null;
  };

  const validationMessage = getValidationMessage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header with navigation */}
        <div className="flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onGoHome}
                className="rounded-full"
              >
                <Home className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Volver al inicio</TooltipContent>
          </Tooltip>

          <div className="text-center flex-1">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary">
              🎭 Impostor
            </h1>
          </div>

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
                <DialogTitle className="font-display text-xl">¿Cómo jugar?</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-4 pt-4 text-left">
                    <div>
                      <h4 className="font-medium text-foreground">1. Configuración</h4>
                      <p className="text-sm text-muted-foreground">Agrega palabras, define el número de jugadores e impostores.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">2. Reparto de roles</h4>
                      <p className="text-sm text-muted-foreground">Cada jugador verá si es inocente (con la palabra) o impostor.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">3. Juego</h4>
                      <p className="text-sm text-muted-foreground">Los jugadores dicen algo relacionado con la palabra. El impostor debe fingir.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">4. Votación</h4>
                      <p className="text-sm text-muted-foreground">Voten para eliminar al sospechoso. ¡Descubran al impostor!</p>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-center text-muted-foreground -mt-4">
          Configura tu partida
        </p>

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
            <Button onClick={triggerFileSelect} size="icon" variant="outline" className="shrink-0" title="Importar desde Excel">
              <FileSpreadsheet className="h-5 w-5" />
            </Button>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline" className="shrink-0" title="Elegir categoría">
                  <FolderOpen className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  <p className="text-sm font-medium px-2 py-1">Categorías</p>
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => selectCategory(cat)}
                      >
                        <span className="mr-2">{cat.icon}</span>
                        {cat.name}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {cat.words.length}
                        </span>
                      </Button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
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

        {/* Start Button with validation feedback */}
        <div className="space-y-2">
          <Button
            onClick={onStartGame}
            disabled={!canStart}
            className="w-full h-14 text-lg font-display font-semibold rounded-xl shadow-lg"
            size="lg"
          >
            <Play className="h-5 w-5 mr-2" />
            Iniciar Juego
          </Button>
          {validationMessage && (
            <p className="text-center text-sm text-muted-foreground">
              ⚠️ {validationMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
