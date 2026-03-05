import React from 'react';
import type { ExportFormat, Platform } from '../../types/keymap';

interface FormatOption {
  id: ExportFormat;
  name: string;
  icon: string;
  platform: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'karabiner',
    name: 'Karabiner-Elements',
    icon: '🍎',
    platform: 'Mac',
    description: 'Low-level key remapper — import as complex rule',
  },
  {
    id: 'keyboard_maestro',
    name: 'Keyboard Maestro',
    icon: '⌨️',
    platform: 'Mac',
    description: 'Macro engine — double-click to import',
  },
  {
    id: 'autohotkey',
    name: 'AutoHotkey v2',
    icon: '🪟',
    platform: 'Windows',
    description: 'Background script — app-specific remapping',
  },
  {
    id: 'stream_deck',
    name: 'Stream Deck',
    icon: '🎛️',
    platform: 'Mac + Windows',
    description: 'Hardware profile — import into Stream Deck app',
  },
  {
    id: 'markdown',
    name: 'Reference Table',
    icon: '📋',
    platform: 'Mac + Windows',
    description: 'Human-readable shortcut cheat sheet',
  },
];

interface Props {
  format: ExportFormat;
  onFormatChange: (f: ExportFormat) => void;
  onExport: () => void;
  loading: boolean;
  platform: Platform;
  sourceName: string;
  targetName: string;
}

export default function ExportPanel({
  format,
  onFormatChange,
  onExport,
  loading,
  platform,
  sourceName,
  targetName,
}: Props) {
  const selected = FORMAT_OPTIONS.find((f) => f.id === format)!;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
        Export Remapping Script
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-5">
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onFormatChange(opt.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center ${
              format === opt.id
                ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
            }`}
          >
            <span className="text-xl">{opt.icon}</span>
            <span className="text-xs font-semibold leading-tight">{opt.name}</span>
            <span className="text-[10px] text-gray-600">{opt.platform}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white font-medium">
            {selected.icon} {selected.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>
          <p className="text-xs text-gray-600 mt-1">
            {sourceName} → {targetName} · {platform}
          </p>
        </div>
        <button
          onClick={onExport}
          disabled={loading}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Generating...
            </>
          ) : (
            <>
              ⬇️ Download
            </>
          )}
        </button>
      </div>

      {/* Install instructions */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500 space-y-1">
        {format === 'karabiner' && (
          <>
            <p className="font-semibold text-gray-400">How to install:</p>
            <p>1. Open Karabiner-Elements → Complex Modifications → Add rule</p>
            <p>2. Click "Import more rules from the internet" or drag the .json file</p>
            <p>3. Enable the rule — it activates only when {targetName} is focused</p>
          </>
        )}
        {format === 'keyboard_maestro' && (
          <>
            <p className="font-semibold text-gray-400">How to install:</p>
            <p>1. Double-click the downloaded .kmmacros file</p>
            <p>2. Keyboard Maestro will import the macro group automatically</p>
            <p>3. Macros are scoped to {targetName} — no conflicts with other apps</p>
          </>
        )}
        {format === 'autohotkey' && (
          <>
            <p className="font-semibold text-gray-400">How to install:</p>
            <p>1. Install AutoHotkey v2 from autohotkey.com</p>
            <p>2. Double-click the .ahk file to run it</p>
            <p>3. Add it to your Startup folder to run automatically on login</p>
          </>
        )}
        {format === 'stream_deck' && (
          <>
            <p className="font-semibold text-gray-400">How to install:</p>
            <p>1. Open Stream Deck app → Profiles → Import</p>
            <p>2. Select the downloaded .streamDeckProfile file</p>
            <p>3. Assign the profile to {targetName} for automatic switching</p>
          </>
        )}
        {format === 'markdown' && (
          <>
            <p className="font-semibold text-gray-400">Usage:</p>
            <p>Print this reference table or keep it open while learning {targetName}</p>
            <p>All shortcuts are organized by category with coverage status</p>
          </>
        )}
      </div>
    </div>
  );
}
