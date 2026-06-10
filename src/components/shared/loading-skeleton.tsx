import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface LoadingSkeletonProps {
  rows?: number
  columns?: number
}

export function LoadingSkeleton({ rows = 5, columns = 6 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="rounded-xl border bg-card/40 p-4">
        <Table>
          <TableHeader className="[&_tr]:border-b">
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20 rounded-lg" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: rows }).map((_, row) => (
              <TableRow key={row}>
                {Array.from({ length: columns }).map((_, col) => (
                  <TableCell key={col}>
                    <Skeleton className="h-4 w-full rounded-lg" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
