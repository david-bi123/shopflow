'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export interface Column<T> {
  key: string
  header: string
  cell: (item: T) => ReactNode
  className?: string
  /**
   * When true, this column is hidden on the card view (below md) and only
   * shown in the table view on md+. Use for secondary info (e.g. email,
   * address) that crowds the mobile card.
   */
  hideOnMobileCard?: boolean
  /**
   * Hides this column in the table view below the given breakpoint so the
   * table fits without horizontal scrolling on narrow screens (md–lg).
   */
  hideBelow?: 'md' | 'lg'
  /**
   * The label shown next to this column's value on the mobile card view
   * (e.g. "Customer", "Total"). Optional — if omitted, the column is
   * hidden on the card.
   */
  mobileLabel?: string
  /**
   * If true, this column is rendered as the primary line of the card
   * (large bold text). Typically the name/title field.
   */
  primaryOnCard?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
  /**
   * Optional renderer for the action area on each mobile card. Render
   * buttons / dropdowns here. The card layout positions this on the right.
   */
  renderCardActions?: (item: T) => ReactNode
  /**
   * Optional caption shown above the mobile card list to remind users
   * they can tap a card to open the row. Defaults to "Tap a card to open".
   */
  cardListHint?: string
  /**
   * When provided, a selection checkbox column is added to the desktop
   * table and a checkbox is shown on each mobile card. `onToggleSelect`
   * toggles one row; `onToggleSelectAll` toggles every row currently in
   * `data` (i.e. the current page).
   */
  selectedKeys?: string[]
  onToggleSelect?: (key: string) => void
  onToggleSelectAll?: () => void
}

function EmptyState({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="rounded-full bg-slate-100 p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-slate-400"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="3" x2="21" y1="9" y2="9" />
              <line x1="9" x2="9" y1="21" y2="9" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">No results found</p>
            <p className="text-sm text-slate-500">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

function CardEmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50/40 p-8 text-center md:hidden">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-slate-400"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <line x1="3" x2="21" y1="9" y2="9" />
          <line x1="9" x2="9" y1="21" y2="9" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900">No results found</p>
      <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filters.</p>
    </div>
  )
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  renderCardActions,
  cardListHint = 'Tap a card to open',
  selectedKeys,
  onToggleSelect,
  onToggleSelectAll,
}: DataTableProps<T>) {
  // Identify the primary column for the card view (largest text)
  const primaryCol = columns.find((c) => c.primaryOnCard) ?? columns[0]

  const hideBelowClass = (col: Column<T>) =>
    col.hideBelow === 'md'
      ? 'hidden md:table-cell'
      : col.hideBelow === 'lg'
        ? 'hidden lg:table-cell'
        : ''

  const selectable = selectedKeys !== undefined
  const pageKeys = data.map((item) => keyExtractor(item))
  const allSelected = selectable && data.length > 0 && pageKeys.every((k) => selectedKeys.includes(k))
  const someSelected =
    selectable && data.some((item) => selectedKeys.includes(keyExtractor(item)))
  const headerColSpan = columns.length + (selectable ? 1 : 0)

  return (
    <>
      {/* Mobile card list — visible only below md */}
      <div className="md:hidden">
        {data.length === 0 ? (
          <CardEmptyState />
        ) : (
          <>
            {cardListHint && (
              <p className="mb-2 px-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                {cardListHint}
              </p>
            )}
            <ul className="space-y-2">
              {data.map((item) => {
                const primary = primaryCol.cell(item)
                const secondaryCols = columns.filter(
                  (c) =>
                    c.key !== primaryCol.key &&
                    c.mobileLabel &&
                    !c.hideOnMobileCard,
                )
                return (
                  <li
                    key={keyExtractor(item)}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      'rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-accent/30 active:bg-accent/50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {selectable && (
                        <div className="mt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedKeys.includes(keyExtractor(item))}
                            onCheckedChange={() => onToggleSelect?.(keyExtractor(item))}
                            aria-label={`Select ${keyExtractor(item)}`}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {primary}
                        </div>
                        {secondaryCols.length > 0 && (
                          <dl className="mt-1.5 space-y-0.5">
                            {secondaryCols.map((col) => (
                              <div
                                key={col.key}
                                className="flex items-baseline gap-1.5 text-xs"
                              >
                                <dt className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                                  {col.mobileLabel}
                                </dt>
                                <dd className="min-w-0 truncate text-foreground/80">
                                  {col.cell(item)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                      {renderCardActions && (
                        <div
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderCardActions(item)}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {/* Desktop table — visible only on md+ screens */}
      <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/60">
              <TableRow className="border-b transition-colors hover:bg-slate-50/60">
                {selectable && (
                  <TableHead className="w-10 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={() => onToggleSelectAll?.()}
                      aria-label="Select all rows on this page"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500',
                      hideBelowClass(col),
                      col.className,
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.length === 0 ? (
                <EmptyState colSpan={headerColSpan} />
              ) : (
                data.map((item, index) => (
                  <TableRow
                    key={keyExtractor(item)}
                    data-state={onRowClick ? 'interactive' : undefined}
                    className={cn(
                      'border-b transition-colors duration-200 last:border-b-0',
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                      onRowClick
                        ? 'cursor-pointer hover:bg-slate-100/80'
                        : 'hover:bg-slate-50/60',
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedKeys.includes(keyExtractor(item))}
                          onCheckedChange={() => onToggleSelect?.(keyExtractor(item))}
                          aria-label={`Select ${keyExtractor(item)}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'whitespace-nowrap text-sm text-slate-700',
                          hideBelowClass(col),
                          col.className,
                        )}
                      >
                        {col.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
