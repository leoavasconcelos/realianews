import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFullAnalysis = (newsId: string) => {
  const [fullAnalysis, setFullAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAnalysis = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First check if cached in DB
        const { data, error: dbError } = await supabase
          .from('news')
          .select('full_analysis')
          .eq('id', newsId)
          .single();

        if (dbError) throw dbError;

        if (data?.full_analysis) {
          if (!cancelled) {
            setFullAnalysis(data.full_analysis);
            setIsLoading(false);
          }
          return;
        }

        // Generate via edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-full-analysis`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ newsId }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to generate analysis');
        }

        const result = await response.json();
        if (!cancelled) {
          setFullAnalysis(result.fullAnalysis || null);
        }
      } catch (err) {
        console.error('useFullAnalysis error:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao gerar análise');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalysis();
    return () => { cancelled = true; };
  }, [newsId]);

  return { fullAnalysis, isLoading, error };
};
