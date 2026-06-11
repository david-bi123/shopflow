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

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card/50 shadow-sm backdrop-blur">
      <Table>
        <TableHeader className="[&_tr]:border-b">
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={['text-xs font-medium tracking-wide text-muted-foreground', col.className]
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
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow
                key={keyExtractor(item)}
                className={[
                  onRowClick ? 'cursor-pointer' : '',
                  'transition-colors',
                  onRowClick ? 'hover:bg-muted/30' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={[
                      'text-sm',
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
  )
}
