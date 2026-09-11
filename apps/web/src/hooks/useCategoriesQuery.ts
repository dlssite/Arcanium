/**
 * useCategoriesQuery — fetches admin-managed genre categories from the public API.
 *
 * Returns the enabled Category list ordered by sortOrder.
 * Data is stale for 10 minutes — categories change infrequently.
 */
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, type Category } from '@arcanium/api-client';

export { type Category };

export function useCategoriesQuery() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn:  async () => {
      const res = await categoriesApi.list();
      if (res.error) throw new Error(res.error.message ?? 'Failed to load categories');
      return res.data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}
