import React from 'react';
import type { AppMeta, Platform } from '../../types/keymap';

interface Props {
  label: string;
  value: string;
  onChange: (appId: string) => void;
  apps: AppMeta[];
  excludeId: string;
  platform: Platform;
  accent: 'blue' | 'teal';
}

export default function AppSelector({ label, value, onChange, apps, excludeId, platform, accent }: Props) {
  const accentClass = accent === 'teal' ? 'border-teal-500 bg-teal-500/10' : 'border-blue-500 bg-blue-500/10';
  const accentText = accent === 'teal' ? 'text-teal-400' : 'text-blue-400';

  const availableApps = apps.filter(
    (a) => a.app_id !== excludeId && a.platforms.includes(platform),
  );

  const selected = apps.find((a) => a.app_id === value);

  return (
    <div className={`rounded-xl border ${accentClass} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {availableApps.map((app) => (
          <button
            key={app.app_id}
            onClick={() => onChange(app.app_id)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center ${
              value === app.app_id
                ? `border-current ${accentText} bg-white/5 font-semibold`
                : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800'
            }`}
          >
            <span className="text-2xl">{app.icon}</span>
            <span className="text-xs leading-tight">{app.name}</span>
            <span className="text-[10px] text-gray-600">{app.type}</span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-3 text-xs text-gray-500">
          {selected.vendor} · {selected.description}
        </p>
      )}
    </div>
  );
}
