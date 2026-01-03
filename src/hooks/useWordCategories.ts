import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WordCategory {
  id: string;
  name: string;
  icon: string | null;
  words: string[];
}

export function useWordCategories(onWordsAdded: (words: string[]) => void) {
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('word_categories')
        .select('id, name, icon, words')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las categorías",
          variant: "destructive",
        });
      } else {
        setCategories(data || []);
      }
      setLoading(false);
    };

    fetchCategories();
  }, [toast]);

  const selectCategory = useCallback((category: WordCategory) => {
    onWordsAdded(category.words);
    toast({
      title: "Categoría añadida",
      description: `Se añadieron ${category.words.length} palabras de "${category.name}"`,
    });
  }, [onWordsAdded, toast]);

  return {
    categories,
    loading,
    selectCategory,
  };
}
