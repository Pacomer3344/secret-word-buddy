import { useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

export function useExcelImport(onWordsImported: (words: string[]) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON (array of arrays)
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        
        // Extract words from first column, filter empty values
        const words: string[] = [];
        jsonData.forEach((row) => {
          if (Array.isArray(row) && row[0]) {
            const word = String(row[0]).trim();
            if (word && word.length > 0 && word.length <= 50) {
              words.push(word);
            }
          }
        });

        if (words.length === 0) {
          toast({
            title: 'Sin palabras',
            description: 'No se encontraron palabras válidas en el archivo',
            variant: 'destructive',
          });
          return;
        }

        onWordsImported(words);
        toast({
          title: 'Palabras importadas',
          description: `Se importaron ${words.length} palabra${words.length !== 1 ? 's' : ''}`,
        });
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast({
          title: 'Error',
          description: 'No se pudo leer el archivo Excel',
          variant: 'destructive',
        });
      }
    };

    reader.readAsArrayBuffer(file);
    
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onWordsImported, toast]);

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    handleFileChange,
    triggerFileSelect,
  };
}
