// KeyMap TypeScript types — Meta-Stamp V3

export type Platform = 'mac' | 'windows';

export type ExportFormat =
  | 'autohotkey'
  | 'karabiner'
  | 'keyboard_maestro'
  | 'stream_deck'
  | 'markdown';

export interface AppMeta {
  app_id: string;
  name: string;
  vendor: string;
  type: string; // 'DAW' | 'NLE' | 'NLE/Color'
  platforms: Platform[];
  icon: string;
  description: string;
}

export interface ShortcutEntry {
  action_id: string;
  label: string;
  mac: string | null;
  windows: string | null;
  category: string;
}

export interface ShortcutMapping {
  action_id: string;
  label: string;
  category: string;
  source_shortcut: string | null;
  target_shortcut: string | null;
  target_label: string | null;
  mapped: boolean;
}

export interface MapResponse {
  source_app: string;
  source_name: string;
  target_app: string;
  target_name: string;
  platform: Platform;
  total_shortcuts: number;
  mapped_shortcuts: number;
  unmapped_shortcuts: number;
  coverage_pct: number;
  mappings: ShortcutMapping[];
}

export interface ExportFormat_Meta {
  id: ExportFormat;
  name: string;
  platform: string;
  extension: string;
  description: string;
  install_url: string | null;
}

export type KeyCategory =
  | 'Transport'
  | 'Edit'
  | 'Tools'
  | 'View'
  | 'Markers'
  | 'Tracks'
  | 'Mix'
  | 'Color'
  | 'Export';
