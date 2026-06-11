'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export type DatePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom'

export interface DateRange {
  /** Start of the range (inclusive), ISO yyyy-mm-dd. Null = no lower bound. */
  from: string | null
  /** End of the range (inclusive), ISO yyyy-mm-dd. Null = no upper bound. */
  to: string | null
}

interface DateFilterProps {
  /** Currently selected preset */
  preset: DatePreset
  /** When preset === 'custom', these are the user-picked dates */
  from: string
  to: string
  /** Called when preset changes */
  onPresetChange: (preset: DatePreset) => void
  /** Called when custom dates change */
  onFromChange: (date: string) => void
  onToChange: (date: string) => void
  /** Visual variant to match the page's accent color */
  accent?: 'emerald' | 'blue' | 'violet' | 'amber'
  /** When the filter is "all" we render a minimal variant */
  minimalWhenAll?: boolean
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
]

const ACCENT_RING: Record<NonNullable<DateFilterProps['accent']>, string> = {
  emerald: 'focus:ring-2 focus:ring-emerald-500/20',
  blue: 'focus:ring-2 focus:ring-blue-500/20',
  violet: 'focus:ring-2 focus:ring-violet-500/20',
  amber: 'focus:ring-2 focus:ring-amber-500/20',
}

export function DateFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
  accent = 'emerald',
  minimalWhenAll = true,
}: DateFilterProps) {
  const ring = ACCENT_RING[accent]
  const isAll = preset === 'all'
  const showCustom = preset === 'custom'

  // Compute a short summary for the trigger label when not "all"
  const summary = useMemo(() => {
    if (preset === 'all') return 'All Time'
    if (preset === 'today') return 'Today'
    if (preset === 'yesterday') return 'Yesterday'
    if (preset === 'last7') return 'Last 7 Days'
    if (preset === 'last30') return 'Last 30 Days'
    if (preset === 'thisMonth') return 'This Month'
    if (preset === 'lastMonth') return 'Last Month'
    if (preset === 'thisYear') return 'This Year'
    if (preset === 'custom') {
      if (from && to) {
        return `${from} → ${to}`
      }
      if (from) return `From ${from}`
      if (to) return `Until ${to}`
      return 'Custom'
    }
    return 'All Time'
  }, [preset, from, to])

  if (minimalWhenAll && isAll) {
    // Compact single-row: just the preset dropdown
    return (
      <Select value={preset} onValueChange={(v) => onPresetChange(v as DatePreset)}>
        <SelectTrigger className={cn('h-10 w-full rounded-full border border-input/60 bg-card shadow-sm sm:w-48', ring)}>
          <Calendar className="mr-1.5 size-4 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Select value={preset} onValueChange={(v) => onPresetChange(v as DatePreset)}>
        <SelectTrigger className={cn('h-10 w-full rounded-full border border-input/60 bg-card shadow-sm sm:w-48', ring)}>
          <Calendar className="mr-1.5 size-4 text-muted-foreground" />
          <SelectValue>{summary}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCustom && (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className={cn('h-10 w-36 rounded-full border border-input/60 bg-card px-3 text-sm shadow-sm', ring)}
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onToChange(e.target.value)}
            className={cn('h-10 w-36 rounded-full border border-input/60 bg-card px-3 text-sm shadow-sm', ring)}
            aria-label="To date"
          />
          {(from || to) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                onFromChange('')
                onToChange('')
              }}
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Clear custom dates"
              aria-label="Clear custom dates"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Helper hook: given a preset + custom from/to, returns the resolved
 * DateRange (inclusive on both ends). If preset === 'all' both bounds are null.
 */
export function useDateRange(
  preset: DatePreset,
  from: string,
  to: string,
): DateRange {
  const [range, setRange] = useState<DateRange>({ from: null, to: null })

  useEffect(() => {
    if (preset === 'all') {
      setRange({ from: null, to: null })
      return
    }
    if (preset === 'custom') {
      setRange({ from: from || null, to: to || null })
      return
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const toIso = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    let fromDate: Date | null = null
    let toDate: Date | null = null

    if (preset === 'today') {
      fromDate = startOfToday
      toDate = startOfToday
    } else if (preset === 'yesterday') {
      const y = new Date(startOfToday)
      y.setDate(y.getDate() - 1)
      fromDate = y
      toDate = y
    } else if (preset === 'last7') {
      const d = new Date(startOfToday)
      d.setDate(d.getDate() - 6)
      fromDate = d
      toDate = startOfToday
    } else if (preset === 'last30') {
      const d = new Date(startOfToday)
      d.setDate(d.getDate() - 29)
      fromDate = d
      toDate = startOfToday
    } else if (preset === 'thisMonth') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      toDate = startOfToday
    } else if (preset === 'lastMonth') {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastOfPrevMonth = new Date(firstOfThisMonth)
      lastOfPrevMonth.setDate(lastOfPrevMonth.getDate() - 1)
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      toDate = lastOfPrevMonth
    } else if (preset === 'thisYear') {
      fromDate = new Date(now.getFullYear(), 0, 1)
      toDate = startOfToday
    }

    setRange({ from: fromDate ? toIso(fromDate) : null, to: toDate ? toIso(toDate) : null })
  }, [preset, from, to])

  return range
}

/**
 * Test a record against a DateRange. The record must expose an ISO
 * timestamp string at `dateField` (default: `createdAt`).
 */
export function isInDateRange(
  record: { [k: string]: unknown },
  range: DateRange,
  dateField = 'createdAt',
): boolean {
  if (!range.from && !range.to) return true
  const raw = record[dateField]
  if (typeof raw !== 'string') return true
  // Compare on the yyyy-mm-dd prefix so the filter is inclusive on the
  // "to" day (i.e. to=2026-06-11 still matches records from that day).
  const day = raw.slice(0, 10)
  if (range.from && day < range.from) return false
  if (range.to && day > range.to) return false
  return true
}
