import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { fetchCrawlHistory, fetchCrawlStatus, triggerCrawlRun, fetchStats } from '../api'
import type { CrawlHistoryEntry } from '../types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    blue: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20',
    yellow: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  }
  return (
    <div className={`rounded-lg p-4 ${colorClasses[color] ?? colorClasses.blue}`}>
      <div className="text-2xl font-bold tabular-nums">{value.toLocaleString('fr-CA')}</div>
      <div className="text-sm opacity-80 mt-0.5">{label}</div>
    </div>
  )
}

export function CrawlHistoryPage() {
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)
  const [sourceFilter, setSourceFilter] = useState<string>('')

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 60_000,
  })

  const { data: history, isLoading, error, refetch } = useQuery({
    queryKey: ['crawl-history', days, sourceFilter],
    queryFn: () => fetchCrawlHistory(days, sourceFilter || undefined),
    refetchInterval: 30_000,
  })

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['crawl-status'],
    queryFn: fetchCrawlStatus,
    refetchInterval: 10_000,
  })

  const triggerMutation = useMutation({
    mutationFn: () => triggerCrawlRun([]),
    onSuccess: () => {
      refetchStatus()
      setTimeout(() => refetch(), 5000)
    },
  })

  // Auto-refresh when crawl is running
  useEffect(() => {
    if (status?.running) {
      const interval = setInterval(() => {
        refetchStatus()
        refetch()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [status?.running, refetch, refetchStatus])

  const entries = history?.entries ?? []

  // Group entries by date
  const grouped = entries.reduce<Record<string, CrawlHistoryEntry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = []
    acc[entry.date].push(entry)
    return acc
  }, {})

  // Get unique sources for filter
  const sources = [...new Set(entries.map((e) => e.source))].sort()

  // Summary stats
  const totals = entries.reduce(
    (acc, e) => ({
      created: acc.created + e.created,
      updated: acc.updated + e.updated,
      skipped: acc.skipped + e.skipped,
      errors: acc.errors + e.errors,
    }),
    { created: 0, updated: 0, skipped: 0, errors: 0 }
  )

  const navStats = stats
    ? { active_vehicles: stats.active_vehicles, total_dealers: stats.total_dealers, last_updated_at: stats.last_updated_at }
    : undefined

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Navbar stats={navStats} />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Historique des crawls</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Suivi des importations de véhicules par concessionnaire
            </p>
          </div>
          <button
            type="button"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || status?.running}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
          >
            {triggerMutation.isPending || status?.running ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Crawl en cours…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Lancer un crawl
              </>
            )}
          </button>
        </div>

        {/* Status bar when crawl is running */}
        {status?.running && status.jobs.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium text-sm mb-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Crawl en cours
            </div>
            <div className="flex flex-wrap gap-2">
              {status.jobs.map((job) => (
                <span
                  key={job.spider}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {job.spider}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters + Summary stats */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
            >
              <option value={7}>7 derniers jours</option>
              <option value={14}>14 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={60}>60 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>
            {sources.length > 1 && (
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 min-h-[44px]"
              >
                <option value="">Tous les concessionnaires</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Créés" value={totals.created} color="green" />
            <StatCard label="Mis à jour" value={totals.updated} color="blue" />
            <StatCard label="Ignorés" value={totals.skipped} color="yellow" />
            <StatCard label="Erreurs" value={totals.errors} color="red" />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-3">Erreur lors du chargement de l'historique</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && entries.length === 0 && (
          <div className="text-center py-20 text-zinc-500 dark:text-zinc-400">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="font-medium">Aucun historique disponible</p>
            <p className="text-sm mt-1">Lancez un crawl pour commencer à collecter des données</p>
          </div>
        )}

        {/* Timeline grouped by date */}
        {!isLoading && Object.keys(grouped).length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateEntries]) => {
                const dayTotals = dateEntries.reduce(
                  (acc, e) => ({
                    created: acc.created + e.created,
                    updated: acc.updated + e.updated,
                    errors: acc.errors + e.errors,
                    total: acc.total + e.total,
                  }),
                  { created: 0, updated: 0, errors: 0, total: 0 }
                )

                return (
                  <div key={date} className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                    {/* Date header */}
                    <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize">
                        {formatDate(date)}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="text-emerald-600 dark:text-emerald-400">+{dayTotals.created}</span>
                        <span className="text-sky-600 dark:text-sky-400">↻{dayTotals.updated}</span>
                        {dayTotals.errors > 0 && (
                          <span className="text-red-600 dark:text-red-400">✗{dayTotals.errors}</span>
                        )}
                        <span>{dayTotals.total} total</span>
                      </div>
                    </div>

                    {/* Entries table */}
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {dateEntries
                        .sort((a, b) => b.total - a.total)
                        .map((entry) => (
                          <div
                            key={`${entry.date}-${entry.source}`}
                            className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-zinc-400 dark:bg-zinc-500" />
                              <span className="text-sm font-medium truncate">{entry.source}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs tabular-nums shrink-0">
                              {entry.created > 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400" title="Créés">
                                  +{entry.created}
                                </span>
                              )}
                              {entry.updated > 0 && (
                                <span className="text-sky-600 dark:text-sky-400" title="Mis à jour">
                                  ↻{entry.updated}
                                </span>
                              )}
                              {entry.skipped > 0 && (
                                <span className="text-zinc-400 dark:text-zinc-500" title="Ignorés">
                                  ={entry.skipped}
                                </span>
                              )}
                              {entry.errors > 0 && (
                                <span className="text-red-600 dark:text-red-400" title="Erreurs">
                                  ✗{entry.errors}
                                </span>
                              )}
                              <span className="text-zinc-500 dark:text-zinc-400 w-12 text-right">
                                {entry.total}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
