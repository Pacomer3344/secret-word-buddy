-- Create word categories table
CREATE TABLE public.word_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  words TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.word_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Anyone can view categories"
ON public.word_categories
FOR SELECT
USING (true);

-- Insert predefined categories with words
INSERT INTO public.word_categories (name, icon, words) VALUES
('Futbolistas', '⚽', ARRAY['Messi', 'Ronaldo', 'Neymar', 'Mbappé', 'Haaland', 'Benzema', 'Modric', 'Vinicius', 'Pedri', 'Bellingham', 'Salah', 'De Bruyne', 'Kane', 'Lewandowski', 'Griezmann']),
('Países', '🌍', ARRAY['España', 'Francia', 'Brasil', 'Argentina', 'México', 'Japón', 'Italia', 'Alemania', 'Portugal', 'Inglaterra', 'Colombia', 'Chile', 'Perú', 'Canadá', 'Australia']),
('Animales', '🐾', ARRAY['León', 'Elefante', 'Jirafa', 'Tigre', 'Oso', 'Lobo', 'Águila', 'Delfín', 'Tiburón', 'Serpiente', 'Cocodrilo', 'Canguro', 'Pingüino', 'Koala', 'Panda']),
('Películas', '🎬', ARRAY['Titanic', 'Avatar', 'Matrix', 'Inception', 'Gladiator', 'Joker', 'Interstellar', 'Coco', 'Frozen', 'Shrek', 'Toy Story', 'El Padrino', 'Avengers', 'Batman', 'Spider-Man']),
('Comidas', '🍕', ARRAY['Pizza', 'Hamburguesa', 'Sushi', 'Tacos', 'Paella', 'Pasta', 'Ensalada', 'Pollo', 'Arroz', 'Sopa', 'Helado', 'Chocolate', 'Tortilla', 'Ceviche', 'Empanada']),
('Profesiones', '👔', ARRAY['Médico', 'Abogado', 'Ingeniero', 'Profesor', 'Chef', 'Bombero', 'Policía', 'Arquitecto', 'Periodista', 'Piloto', 'Enfermero', 'Veterinario', 'Músico', 'Actor', 'Diseñador']),
('Deportes', '🏆', ARRAY['Fútbol', 'Baloncesto', 'Tenis', 'Natación', 'Atletismo', 'Golf', 'Boxeo', 'Ciclismo', 'Voleibol', 'Rugby', 'Hockey', 'Béisbol', 'Surf', 'Esquí', 'Skateboard']),
('Marcas', '🏷️', ARRAY['Apple', 'Nike', 'Coca-Cola', 'Google', 'Amazon', 'McDonald''s', 'Samsung', 'Adidas', 'Netflix', 'Spotify', 'Tesla', 'Disney', 'Microsoft', 'PlayStation', 'Nintendo']);