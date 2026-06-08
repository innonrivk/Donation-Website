import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../lib/api';
import { FALLBACK_DONATION_CONTENT } from '../services/fallbackData';

/**
 * Cache key for the monolithic CMS payload.
 * Why a constant? Prevents typo-induced cache misses across components.
 */
export const CMS_QUERY_KEY = ['cms', 'public-content'];

/**
 * Fetches the aggregate CMS payload from the public content endpoint.
 * Falls back to static data if the backend is unreachable.
 *
 * @returns {Promise<object>} The monolithic content payload.
 */
async function fetchCMSContent() {
  let content;
  try {
    const { data } = await publicApi.get('/content');
    content = data;
  } catch {
    content = JSON.parse(JSON.stringify(FALLBACK_DONATION_CONTENT));
  }

  if (content?.websiteContent?.body) {
    content.websiteContent.body = content.websiteContent.body.replace(
      /OpenmindProjects \(OMP\) is dedicated to building stronger communities[\s\S]*?community empowerment\.\s*\n*/i,
      ""
    );
  }
  return content;
}

/**
 * Global CMS data hook powered by TanStack Query.
 *
 * Why `select`? The monolithic payload contains websiteContent,
 * donationBoxes, tiers, milestones, and projects. Without select,
 * every component subscribed to this hook would re-render when ANY
 * field changes. The `select` option creates a stable reference
 * that only triggers re-renders when the selected slice changes.
 *
 * @example
 * // Subscribe only to tiers — won't re-render when milestones change
 * const { data: tiers } = useCMS({ select: (d) => d.tiers });
 *
 * // Get the full payload
 * const { data, isLoading } = useCMS();
 *
 * @param {object} [options] - TanStack Query options, especially `select`.
 * @returns {import('@tanstack/react-query').UseQueryResult} Query result.
 */
export function useCMS(options = {}) {
  return useQuery({
    queryKey: CMS_QUERY_KEY,
    queryFn: fetchCMSContent,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}
