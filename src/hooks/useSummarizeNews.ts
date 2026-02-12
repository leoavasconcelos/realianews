import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SummarizeResult {
  summary: string;
  newsId?: string;
  model: string;
}

export const useSummarizeNews = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = async (params: {
    newsId?: string;
    title: string;
    content: string;
    topics?: string[];
  }): Promise<SummarizeResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize-news`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      return data as SummarizeResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { summarize, loading, error };
};
