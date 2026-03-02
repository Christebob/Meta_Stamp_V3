/**
 * Pockets Page for META-STAMP V3.
 *
 * Allows creators to submit URL content into pockets and view indexed snapshots
 * with pull count and compensation tracking.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Coins,
  ExternalLink,
  Layers3,
  Loader2,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

import { createPocket, getPockets, pullPocket } from '@/services/pocketService';
import type { Pocket, PocketStatus } from '@/types/pocket';


function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleString();
}

function getStatusClass(status: PocketStatus): string {
  if (status === 'active') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  if (status === 'failed') {
    return 'bg-red-100 text-red-700 border-red-200';
  }
  return 'bg-amber-100 text-amber-700 border-amber-200';
}


function Pockets(): JSX.Element {
  const [contentUrl, setContentUrl] = useState('');
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePullId, setActivePullId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const loadPockets = useCallback(async (): Promise<void> => {
    setListError(null);
    setIsLoading(true);

    try {
      const response = await getPockets(100);
      setPockets(response);
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPockets();
  }, [loadPockets]);

  const totalPulls = useMemo(
    () => pockets.reduce((sum, pocket) => sum + pocket.pull_count, 0),
    [pockets]
  );

  const totalCompensation = useMemo(
    () => pockets.reduce((sum, pocket) => sum + pocket.compensation_earned, 0),
    [pockets]
  );

  const handleCreatePocket = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalizedUrl = contentUrl.trim();
    if (!normalizedUrl) {
      setCreateError('Please enter a URL.');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);
    setInfoMessage(null);

    try {
      const createdPocket = await createPocket(normalizedUrl);
      setContentUrl('');
      setInfoMessage(
        createdPocket.status === 'active'
          ? 'Pocket created and indexed successfully.'
          : 'Pocket created but indexing did not complete successfully.'
      );
      await loadPockets();
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePullPocket = async (pocketId: string): Promise<void> => {
    setActivePullId(pocketId);
    setInfoMessage(null);
    setListError(null);

    try {
      const pullResponse = await pullPocket(pocketId);
      setPockets((previous) =>
        previous.map((pocket) => (pocket.id === pullResponse.pocket.id ? pullResponse.pocket : pocket))
      );
      setInfoMessage(
        `Pocket pulled successfully. Added ${formatCurrency(pullResponse.compensation_increment)}.`
      );
    } catch (error) {
      setListError(getErrorMessage(error));
    } finally {
      setActivePullId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-blue-600">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Creator Snapshot Registry</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Pockets</h1>
        <p className="max-w-3xl text-sm text-gray-600">
          Pre-index your channels and URLs into pull-ready snapshots with automatic compensation.
        </p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={(event) => void handleCreatePocket(event)}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="content-url">
            Content URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="content-url"
              type="url"
              value={contentUrl}
              onChange={(event) => setContentUrl(event.target.value)}
              placeholder="https://www.youtube.com/@your-channel"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none ring-blue-500 transition focus:border-blue-500 focus:ring-2"
              disabled={isSubmitting}
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
              Create Pocket
            </button>
          </div>
        </form>

        {createError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            {infoMessage}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Pockets</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{pockets.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Pulls</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalPulls}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Compensation Earned</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalCompensation)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Pockets</h2>
          <button
            type="button"
            onClick={() => void loadPockets()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {listError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{listError}</span>
          </div>
        )}

        {isLoading && pockets.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pockets...
          </div>
        ) : pockets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <Layers3 className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-3 text-sm font-medium text-gray-800">No pockets yet</p>
            <p className="mt-1 text-sm text-gray-600">
              Create your first pocket above to start indexing creator content.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pockets.map((pocket) => (
              <article
                key={pocket.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <a
                      href={pocket.content_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                    >
                      <span className="truncate">{pocket.content_url}</span>
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                    </a>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="rounded-md border border-gray-300 bg-white px-2 py-1">
                        {pocket.content_type}
                      </span>
                      <span>Created {formatDate(pocket.created_at)}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                      pocket.status
                    )}`}
                  >
                    {pocket.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-gray-500">Pull Count</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{pocket.pull_count}</p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-gray-500">Compensation Earned</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {formatCurrency(pocket.compensation_earned)}
                    </p>
                  </div>
                  <div className="rounded-md bg-white p-3">
                    <p className="text-xs text-gray-500">Snapshot</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {pocket.snapshot_text ? 'Indexed' : 'No snapshot'}
                    </p>
                  </div>
                </div>

                {pocket.snapshot_text && (
                  <div className="mt-4 rounded-md border border-gray-200 bg-white p-3">
                    <p className="mb-1 text-xs text-gray-500">Snapshot Preview</p>
                    <p className="line-clamp-3 text-sm text-gray-700">{pocket.snapshot_text}</p>
                  </div>
                )}

                {pocket.error_message && (
                  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {pocket.error_message}
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void handlePullPocket(pocket.id)}
                    disabled={pocket.status !== 'active' || activePullId === pocket.id}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activePullId === pocket.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Coins className="h-4 w-4" />
                    )}
                    Simulate Pull
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


export default Pockets;
