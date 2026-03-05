import React from 'react';
import type { ShortcutMapping } from '../../types/keymap';

interface Props {
  mappings: ShortcutMapping[];
  sourceName: string;
  targetName: string;
  highlightedAction: string | null;
  onRowHover: (actionId: string | null) => void;
  categoryColors: Record<string, string>;
}

function KeyBadge({ shortcut }: { shortcut: string | null }) {
  if (!shortcut) return <span className="text-gray-600 text-xs">—</span>;
  const parts = shortcut.split('+');
  return (
    <span className="flex flex-wrap gap-1 items-center">
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-600 bg-gray-800 text-gray-200 text-xs font-mono shadow-sm">
            {part.trim()}
          </kbd>
          {i < parts.length - 1 && <span className="text-gray-600 text-xs">+</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

export default function MappingTable({
  mappings,
  sourceName,
  targetName,
  highlightedAction,
  onRowHover,
  categoryColors,
}: Props) {
  if (mappings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        No shortcuts match your filter.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 border-b border-gray-800">
            <th className="text-left px-4 py-3 text-gray-400 font-semibold w-8">Cat</th>
            <th className="text-left px-4 py-3 text-gray-400 font-semibold">Action</th>
            <th className="text-left px-4 py-3 text-gray-400 font-semibold">{sourceName}</th>
            <th className="text-left px-4 py-3 text-gray-400 font-semibold">{targetName}</th>
            <th className="text-left px-4 py-3 text-gray-400 font-semibold w-24">Status</th>
          </tr>
        </thead>
        <tbody>
          {mappings.map((m) => {
            const isHighlighted = highlightedAction === m.action_id;
            const catColor = categoryColors[m.category] || 'bg-gray-500';
            return (
              <tr
                key={m.action_id}
                onMouseEnter={() => onRowHover(m.action_id)}
                onMouseLeave={() => onRowHover(null)}
                className={`border-b border-gray-800/50 transition-colors cursor-default ${
                  isHighlighted ? 'bg-teal-900/20' : 'hover:bg-gray-900/60'
                }`}
              >
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${catColor}`}
                    title={m.category}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-medium text-white">{m.label}</div>
                  <div className="text-xs text-gray-600">{m.category}</div>
                </td>
                <td className="px-4 py-2.5">
                  <KeyBadge shortcut={m.source_shortcut} />
                </td>
                <td className="px-4 py-2.5">
                  <KeyBadge shortcut={m.target_shortcut} />
                </td>
                <td className="px-4 py-2.5">
                  {m.mapped ? (
                    <span className="text-teal-400 text-xs font-semibold">✅ Mapped</span>
                  ) : (
                    <span className="text-yellow-600 text-xs font-semibold">⚠️ Gap</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
