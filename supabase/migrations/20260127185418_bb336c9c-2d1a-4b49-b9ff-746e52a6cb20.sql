-- Tornar o bucket exam-images público para permitir URLs públicas
UPDATE storage.buckets 
SET public = true 
WHERE id = 'exam-images';