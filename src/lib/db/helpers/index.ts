export function toNum(val: unknown): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') return Number(val)
  return 0
}

export function toStr(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

export function serializeRow<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(row)) {
    if (key === 'id' || key === 'tenantId' || key === 'customerId' || key === 'createdBy' || key === 'userId' || key === 'performedBy') {
      out[key] = val != null ? String(val) : val
    } else {
      out[key] = val
    }
  }
  return out as T
}

export function serializeList<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(serializeRow) as T[]
}
