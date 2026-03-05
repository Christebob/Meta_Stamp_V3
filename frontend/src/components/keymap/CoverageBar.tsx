import React from 'react';

interface Props {
  sourceName: string;
  targetName: string;
  mapped: number;
  total: number;
  pct: number;
}

export default function CoverageBar({ sourceName, targetName, mapped, total, pct }: Props) {
  const color = pct >= 80 ? 'bg-teal-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-white">
          {sourceName} <span className="text-gray-500">→</span> {targetName}
        </div>
        <div className="text-sm font-bold text-teal-400">{pct}% coverage</div>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-6 mt-2 text-xs text-gray-500">
        <span>
          <span className="text-teal-400 font-semibold">{mapped}</span> shortcuts mapped
        </span>
        <span>
          <span className="text-gray-400 font-semibold">{total - mapped}</span> no equivalent
        </span>
        <span>
          <span className="text-white font-semibold">{total}</span> total
        </span>
      </div>
    </div>
  );
}
