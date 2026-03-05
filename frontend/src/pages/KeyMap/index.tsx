import React, { useState, useEffect, useCallback } from 'react';
import { fetchApps, mapShortcuts, downloadExport } from '../../services/keymap/keymapService';
import type { AppMeta, MapResponse, ShortcutMapping, Platform, ExportFormat } from '../../types/keymap';
import KeyboardVisualizer from '../../components/keymap/KeyboardVisualizer';
import MappingTable from '../../components/keymap/MappingTable';
import AppSelector from '../../components/keymap/AppSelector';
import ExportPanel from '../../components/keymap/ExportPanel';
import CoverageBar from '../../components/keymap/CoverageBar';

const CATEGORY_COLORS: Record<string, string> = {
  Transport: 'bg-teal-500',
  Edit: 'bg-blue-500',
  Tools: 'bg-purple-500',
  View: 'bg-orange-500',
  Markers: 'bg-yellow-500',
  Tracks: 'bg-green-500',
  Mix: 'bg-red-500',
  Color: 'bg-pink-500',
  Export: 'bg-gray-500',
};

export default function KeyMapPage() {
  const [apps, setApps] = useState<AppMeta[]>([]);
  const [sourceApp, setSourceApp] = useState<string>('pro_tools');
  const [targetApp, setTargetApp] = useState<string>('final_cut_pro');
  const [platform, setPlatform] = useState<Platform>('mac');
  const [mapResult, setMapResult] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('karabiner');
  const [exportLoading, setExportLoading] = useState(false);
  const [highlightedAction, setHighlightedAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load apps on mount
  useEffect(() => {
    fetchApps()
      .then(setApps)
      .catch(() => setError('Failed to load apps. Is the backend running?'));
  }, []);

  // Auto-map when source/target/platform changes
  useEffect(() => {
    if (!sourceApp || !targetApp || sourceApp === targetApp) return;
    handleMap();
  }, [sourceApp, targetApp, platform]);

  const handleMap = useCallback(async () => {
    if (!sourceApp || !targetApp || sourceApp === targetApp) return;
    setLoading(true);
    setError(null);
    try {
      const result = await mapShortcuts(sourceApp, targetApp, platform);
      setMapResult(result);
      setActiveCategory('All');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Mapping failed. Check the API.');
    } finally {
      setLoading(false);
    }
  }, [sourceApp, targetApp, platform]);

  const handleExport = async () => {
    if (!mapResult) return;
    setExportLoading(true);
    try {
      await downloadExport(sourceApp, targetApp, platform, exportFormat);
    } catch (e) {
      setError('Export failed. Try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Filtered mappings
  const filteredMappings: ShortcutMapping[] = mapResult
    ? mapResult.mappings.filter((m) => {
        const matchCat = activeCategory === 'All' || m.category === activeCategory;
        const matchSearch =
          !searchQuery ||
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.source_shortcut || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.target_shortcut || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
      })
    : [];

  const categories = mapResult
    ? ['All', ...Array.from(new Set(mapResult.mappings.map((m) => m.category))).sort()]
    : ['All'];

  const sourceAppMeta = apps.find((a) => a.app_id === sourceApp);
  const targetAppMeta = apps.find((a) => a.app_id === targetApp);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-400 tracking-tight">
              ⌨️ KeyMap
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Reprogrammable keyboard for creative software — by Meta-Stamp
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Platform toggle */}
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              {(['mac', 'windows'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    platform === p
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {p === 'mac' ? '🍎 Mac' : '🪟 Windows'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── Error ── */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── App Selectors ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AppSelector
            label="Source App (your muscle memory)"
            value={sourceApp}
            onChange={setSourceApp}
            apps={apps}
            excludeId={targetApp}
            platform={platform}
            accent="blue"
          />
          <AppSelector
            label="Target App (where you're working)"
            value={targetApp}
            onChange={setTargetApp}
            apps={apps}
            excludeId={sourceApp}
            platform={platform}
            accent="teal"
          />
        </div>

        {/* ── Coverage Bar ── */}
        {mapResult && (
          <CoverageBar
            sourceName={mapResult.source_name}
            targetName={mapResult.target_name}
            mapped={mapResult.mapped_shortcuts}
            total={mapResult.total_shortcuts}
            pct={mapResult.coverage_pct}
          />
        )}

        {/* ── Keyboard Visualizer ── */}
        {mapResult && (
          <KeyboardVisualizer
            mappings={mapResult.mappings}
            platform={platform}
            highlightedAction={highlightedAction}
            onKeyHover={setHighlightedAction}
            categoryColors={CATEGORY_COLORS}
          />
        )}

        {/* ── Category Tabs + Search ── */}
        {mapResult && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    activeCategory === cat
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat}
                  {cat !== 'All' && (
                    <span className="ml-1 opacity-60">
                      ({mapResult.mappings.filter((m) => m.category === cat).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="ml-auto">
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 w-52"
              />
            </div>
          </div>
        )}

        {/* ── Mapping Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-teal-400 text-lg animate-pulse">
              ⌨️ Mapping shortcuts...
            </div>
          </div>
        ) : mapResult ? (
          <MappingTable
            mappings={filteredMappings}
            sourceName={mapResult.source_name}
            targetName={mapResult.target_name}
            highlightedAction={highlightedAction}
            onRowHover={setHighlightedAction}
            categoryColors={CATEGORY_COLORS}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <div className="text-5xl mb-4">⌨️</div>
            <p className="text-lg">Select two apps above to see the shortcut mapping.</p>
          </div>
        )}

        {/* ── Export Panel ── */}
        {mapResult && (
          <ExportPanel
            format={exportFormat}
            onFormatChange={setExportFormat}
            onExport={handleExport}
            loading={exportLoading}
            platform={platform}
            sourceName={mapResult.source_name}
            targetName={mapResult.target_name}
          />
        )}
      </div>
    </div>
  );
}
