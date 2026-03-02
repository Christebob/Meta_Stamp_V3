/**
 * Pockets API service for META-STAMP V3.
 *
 * Handles creator pocket creation, listing, and pull simulation.
 */

import apiClient from './api';
import type { CreatePocketRequest, Pocket, PocketPullResponse } from '@/types/pocket';

const POCKETS_BASE_URL = '/api/v1/pockets';

/**
 * Validate and normalize a pocket URL input.
 */
function normalizeContentUrl(contentUrl: string): string {
  const normalized = contentUrl.trim();
  if (!normalized) {
    throw new Error('Content URL is required');
  }
  return normalized;
}

/**
 * Create a pocket from a URL.
 */
export async function createPocket(contentUrl: string): Promise<Pocket> {
  const payload: CreatePocketRequest = {
    content_url: normalizeContentUrl(contentUrl),
  };

  const response = (await apiClient.post<Pocket>(`${POCKETS_BASE_URL}/`, payload)) as unknown as Pocket;
  return response;
}

/**
 * List creator pockets.
 */
export async function getPockets(limit = 50): Promise<Pocket[]> {
  const response = (await apiClient.get<Pocket[]>(`${POCKETS_BASE_URL}/`, {
    params: { limit },
  })) as unknown as Pocket[];
  return response;
}

/**
 * Simulate an AI pull event for a pocket.
 */
export async function pullPocket(pocketId: string): Promise<PocketPullResponse> {
  const normalizedId = pocketId.trim();
  if (!normalizedId) {
    throw new Error('Pocket ID is required');
  }

  const response = (await apiClient.post<PocketPullResponse>(
    `${POCKETS_BASE_URL}/${encodeURIComponent(normalizedId)}/pull`
  )) as unknown as PocketPullResponse;
  return response;
}
