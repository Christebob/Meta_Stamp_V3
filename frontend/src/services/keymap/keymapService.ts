// KeyMap API Service — Meta-Stamp V3
import axios from 'axios';
import type {
  AppMeta,
  ShortcutEntry,
  MapResponse,
  ExportFormat,
  ExportFormat_Meta,
  Platform,
} from '../../types/keymap';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const KEYMAP_BASE = `${API_BASE}/api/v1/keymap`;

// ─────────────────────────────────────────────
// Apps
// ─────────────────────────────────────────────

export async function fetchApps(): Promise<AppMeta[]> {
  const res = await axios.get<{ count: number; apps: AppMeta[] }>(`${KEYMAP_BASE}/apps`);
  return res.data.apps;
}

export async function fetchShortcuts(
  appId: string,
  platform: Platform = 'mac',
  category?: string,
): Promise<ShortcutEntry[]> {
  const params: Record<string, string> = { platform };
  if (category) params.category = category;
  const res = await axios.get<{ shortcuts: ShortcutEntry[] }>(
    `${KEYMAP_BASE}/apps/${appId}/shortcuts`,
    { params },
  );
  return res.data.shortcuts;
}

export async function fetchCategories(appId: string): Promise<string[]> {
  const res = await axios.get<{ categories: string[] }>(
    `${KEYMAP_BASE}/apps/${appId}/categories`,
  );
  return res.data.categories;
}

// ─────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────

export async function mapShortcuts(
  sourceApp: string,
  targetApp: string,
  platform: Platform = 'mac',
  categoryFilter?: string,
): Promise<MapResponse> {
  const res = await axios.post<MapResponse>(`${KEYMAP_BASE}/map`, {
    source_app: sourceApp,
    target_app: targetApp,
    platform,
    category_filter: categoryFilter || null,
  });
  return res.data;
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

export async function fetchExportFormats(): Promise<ExportFormat_Meta[]> {
  const res = await axios.get<{ formats: ExportFormat_Meta[] }>(
    `${KEYMAP_BASE}/export/formats`,
  );
  return res.data.formats;
}

export async function downloadExport(
  sourceApp: string,
  targetApp: string,
  platform: Platform,
  format: ExportFormat,
): Promise<void> {
  const res = await axios.post(
    `${KEYMAP_BASE}/export`,
    { source_app: sourceApp, target_app: targetApp, platform, format },
    { responseType: 'blob' },
  );

  // Derive filename from Content-Disposition header or fallback
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="(.+?)"/);
  const filename = match ? match[1] : `keymap-${sourceApp}-to-${targetApp}.${format}`;

  // Trigger browser download
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
