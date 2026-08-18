'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

const toDateInputValue = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const todayStr = toDateInputValue(new Date())

/** `yyyy-mm-dd` -> `dd-mm-yyyy` for display on the date field. */
const toDmy = (iso: string) => iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1')

/** Parse a typed `dd-mm-yyyy` string into `yyyy-mm-dd`, or null if invalid (incl. future dates). */
const dmyToIso = (dmy: string): string | null => {
  const m = /^(\d{2})[/\-](\d{2})[/\-](\d{4})$/.exec(dmy.trim())
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  if (iso > todayStr) return null
  return iso
}

interface DateInputProps {
  /** Current value in ISO `yyyy-mm-dd` form. */
  value: string
  /** Called with the new ISO `yyyy-mm-dd` value, or '' while typing is incomplete. */
  onChange: (iso: string) => void
  /** Latest allowed date, ISO `yyyy-mm-dd`. Defaults to today. */
  max?: string
  /** Earliest allowed date, ISO `yyyy-mm-dd`. */
  min?: string
  /** Input element id (applied to the visible text field). */
  id?: string
  className?: string
  /** Accessible label for the visible text field. */
  'aria-label'?: string
}

/**
 * A date field that shows and accepts `dd-mm-yyyy`, backed by an invisible
 * native `<input type="date">` so the browser's date picker still opens.
 */
export function DateInput({ value, onChange, max = todayStr, min, id, className, 'aria-label': ariaLabel }: DateInputProps) {
  const [dmy, setDmy] = useState(() => toDmy(value))
  const editing = useRef(false)

  // Re-sync the visible text when the external value changes (e.g. a
  // filter is cleared) but not while the user is typing a partial date.
  useEffect(() => {
    if (editing.current) return
    setDmy(toDmy(value))
  }, [value])

  const handleChange = (raw: string) => {
    editing.current = true
    setDmy(raw)
    const iso = dmyToIso(raw)
    onChange(iso ?? '')
  }

  const handleBlur = () => {
    editing.current = false
    const iso = dmyToIso(dmy)
    if (iso) {
      onChange(iso)
      setDmy(toDmy(iso))
    } else {
      onChange(value)
      setDmy(toDmy(value))
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        value={dmy}
        placeholder="DD-MM-YYYY"
        className={cn('pr-9', className)}
        aria-label={ariaLabel}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <input
        id={id ? `${id}-picker` : undefined}
        type="date"
        value={value}
        max={max}
        min={min}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        onChange={(e) => {
          const v = e.target.value
          if (v) {
            onChange(v)
            setDmy(toDmy(v))
          }
        }}
      />
      <button
        type="button"
        aria-label="Open date picker"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => {
          const picker = document.getElementById(
            id ? `${id}-picker` : 'date-picker'
          ) as HTMLInputElement | null
          picker?.showPicker?.()
        }}
      >
        <CalendarDays className="size-3.5" />
      </button>
    </div>
  )
}