/**
 * Pockets feature TypeScript types for META-STAMP V3.
 *
 * Defines API-facing types for creator pockets, including creation, listing,
 * and pull simulation responses.
 */

/**
 * Pocket lifecycle status values returned by backend.
 */
export type PocketStatus = 'indexing' | 'active' | 'failed';

/**
 * Creator pocket snapshot object.
 */
export interface Pocket {
  id: string;
  creator_id: string;
  content_url: string;
  content_type: string;
  status: PocketStatus;
  pull_count: number;
  compensation_earned: number;
  snapshot_text: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for creating a new pocket.
 */
export interface CreatePocketRequest {
  content_url: string;
}

/**
 * Pull simulation API response.
 */
export interface PocketPullResponse {
  pocket: Pocket;
  retrieved_content: string;
  compensation_increment: number;
}
