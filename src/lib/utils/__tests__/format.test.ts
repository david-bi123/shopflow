import { describe, expect, it } from 'vitest'

import { formatAmountInWords } from '../format'

describe('formatAmountInWords', () => {
  it('converts whole amounts', () => {
    expect(formatAmountInWords(250, 'GHS')).toBe('Two Hundred and Fifty Ghana Cedis only')
    expect(formatAmountInWords(0, 'GHS')).toBe('Zero only')
    expect(formatAmountInWords(5, 'GHS')).toBe('Five Ghana Cedis only')
  })

  it('includes cents / pesewas', () => {
    expect(formatAmountInWords(250.5, 'GHS')).toBe(
      'Two Hundred and Fifty Ghana Cedis and Fifty Pesewas only',
    )
    expect(formatAmountInWords(9.05, 'NGN')).toBe('Nine Naira and Five Kobo only')
  })

  it('handles thousands and large numbers', () => {
    expect(formatAmountInWords(1250, 'GHS')).toBe('One Thousand Two Hundred and Fifty Ghana Cedis only')
    expect(formatAmountInWords(1000000000, 'USD')).toBe('One Billion US Dollars only')
  })

  it('handles negative amounts', () => {
    expect(formatAmountInWords(-40, 'GHS')).toBe('Minus Forty Ghana Cedis only')
  })
})
