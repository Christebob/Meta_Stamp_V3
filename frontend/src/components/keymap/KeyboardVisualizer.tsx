import React, { useMemo } from 'react';
import type { ShortcutMapping, Platform } from '../../types/keymap';

interface Props {
  mappings: ShortcutMapping[];
  platform: Platform;
  highlightedAction: string | null;
  onKeyHover: (actionId: string | null) => void;
  categoryColors: Record<string, string>;
}

// Standard QWERTY layout rows
const KEYBOARD_ROWS = [
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
  ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Return'],
  ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
  ['Ctrl', 'Alt', 'Cmd', 'Space', 'Cmd', 'Alt', 'Ctrl'],
];

const WIDE_KEYS = new Set(['Backspace', 'Tab', 'Caps', 'Return', 'Shift', 'Ctrl', 'Alt', 'Cmd', 'Space']);

// Extract the bare key from a shortcut string like "Cmd+Shift+K" → "K"
function extractBareKey(shortcut: string | null): string | null {
  if (!shortcut) return null;
  // Handle multi-shortcut like "Q / W" — take first
  const first = shortcut.split('/')[0].trim();
  const parts = first.split('+');
  return parts[parts.length - 1].trim().toUpperCase();
}

export default function KeyboardVisualizer({
  mappings,
  platform,
  highlightedAction,
  onKeyHover,
  categoryColors,
}: Props) {
  // Build a map: bare_key → { mapping, color }
  const keyMappingMap = useMemo(() => {
    const map: Record<string, { mapping: ShortcutMapping; color: string }> = {};
    for (const m of mappings) {
      if (!m.source_shortcut) continue;
      const bare = extractBareKey(m.source_shortcut);
      if (bare) {
        const color = categoryColors[m.category] || 'bg-gray-500';
        map[bare] = { mapping: m, color };
      }
    }
    return map;
  }, [mappings, categoryColors]);

  const highlightedKey = useMemo(() => {
    if (!highlightedAction) return null;
    const m = mappings.find((x) => x.action_id === highlightedAction);
    if (!m?.source_shortcut) return null;
    return extractBareKey(m.source_shortcut);
  }, [highlightedAction, mappings]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
        Keyboard Heatmap — coloured keys have mapped shortcuts
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-1">
              {row.map((key, keyIdx) => {
                const keyUpper = key.toUpperCase();
                const mapped = keyMappingMap[keyUpper];
                const isHighlighted = highlightedKey === keyUpper;
                const isWide = WIDE_KEYS.has(key);

                let bgClass = 'bg-gray-800 border-gray-700';
                let textClass = 'text-gray-500';

                if (mapped) {
                  // Extract tailwind color class — convert bg-teal-500 → border highlight
                  bgClass = `${mapped.color} opacity-80`;
                  textClass = 'text-white font-semibold';
                }

                if (isHighlighted) {
                  bgClass = 'bg-white';
                  textClass = 'text-gray-900 font-bold';
                }

                return (
                  <div
                    key={keyIdx}
                    onMouseEnter={() => mapped && onKeyHover(mapped.mapping.action_id)}
                    onMouseLeave={() => onKeyHover(null)}
                    title={mapped ? `${mapped.mapping.label}: ${mapped.mapping.source_shortcut} → ${mapped.mapping.target_shortcut || 'No equivalent'}` : key}
                    className={`
                      relative flex items-center justify-center rounded border
                      text-[10px] cursor-default select-none transition-all duration-150
                      ${isWide ? 'px-2 min-w-[52px]' : 'w-8'} h-8
                      ${bgClass} ${textClass}
                      ${mapped ? 'cursor-pointer hover:opacity-100 hover:scale-105' : ''}
                    `}
                  >
                    {key === 'Space' ? '' : key.length > 4 ? key.slice(0, 4) : key}
                    {mapped && !isHighlighted && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(categoryColors).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
}
