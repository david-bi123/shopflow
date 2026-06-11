'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  cell: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  onRowClick?: (item: T) => void
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

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/60">
            <TableRow className="border-b transition-colors hover:bg-slate-50/60">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={[
                    'text-xs font-semibold uppercase tracking-wider text-slate-500',
                    col.className,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.length === 0 ? (
              <EmptyState colSpan={columns.length} />
            ) : (
              data.map((item, index) => (
                <TableRow
                  key={keyExtractor(item)}
                  data-state={onRowClick ? 'interactive' : undefined}
                  className={[
                    'border-b transition-colors duration-200 last:border-b-0',
                    index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                    onRowClick ? 'cursor-pointer hover:bg-slate-100/80' : 'hover:bg-slate-50/60',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={[
                        'text-sm text-slate-700',
                        col.className,
                      ]
                        .filter(Boolean)
                        .join(' ')}
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
  )
}
