import { useState, useEffect } from 'react';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

interface ConnectCard {
  id: string;
  title: string;
  description: string | null;
  url: string;
  iconName: string | null;
  category: 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';
  displayOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateConnectCardInput {
  title: string;
  description?: string;
  url: string;
  iconName?: string;
  category: 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';
  enabled?: boolean;
}

interface UpdateConnectCardInput {
  title?: string;
  description?: string;
  url?: string;
  iconName?: string;
  category?: 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';
  displayOrder?: number;
  enabled?: boolean;
}

export function useConnectCardManagement(category: string = 'ALL') {
  const [cards, setCards] = useState<ConnectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = useAdminAuthStore((state) => state.token);
  const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = new URL(`${apiUrl}/api/v1/admin/connect-cards`);
      if (category !== 'ALL') {
        url.searchParams.set('category', category);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch connect cards');

      const json = await res.json();
      setCards(json.data || []);
    } catch (err) {
      console.error('[useConnectCardManagement] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cards');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCards();
    }
  }, [token, category]);

  const createCard = async (input: CreateConnectCardInput): Promise<boolean> => {
    try {
      setIsCreating(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/v1/admin/connect-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to create card');
      }

      await fetchCards();
      return true;
    } catch (err) {
      console.error('[useConnectCardManagement] Create error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create card');
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const updateCard = async (id: string, input: UpdateConnectCardInput): Promise<boolean> => {
    try {
      setIsUpdating(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/v1/admin/connect-cards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to update card');
      }

      await fetchCards();
      return true;
    } catch (err) {
      console.error('[useConnectCardManagement] Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update card');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCard = async (id: string): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/v1/admin/connect-cards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to delete card');
      }

      await fetchCards();
      return true;
    } catch (err) {
      console.error('[useConnectCardManagement] Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete card');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const reorderCards = async (items: { id: string; displayOrder: number }[]): Promise<boolean> => {
    try {
      setIsUpdating(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/v1/admin/connect-cards/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || 'Failed to reorder cards');
      }

      await fetchCards();
      return true;
    } catch (err) {
      console.error('[useConnectCardManagement] Reorder error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder cards');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    cards,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createCard,
    updateCard,
    deleteCard,
    reorderCards,
    refetch: fetchCards,
  };
}
