import { describe, it, expect } from 'vitest'
import { parseHashRoute, buildHashRoute } from '../src/core/routing/hashRoute'

describe('parseHashRoute', () => {
  it('parses bare mode', () => {
    expect(parseHashRoute('#/boat')).toEqual({ mode: 'boat', data: null })
    expect(parseHashRoute('#/base')).toEqual({ mode: 'base', data: null })
  })

  it('parses mode with data', () => {
    expect(parseHashRoute('#/boat?data=abc123')).toEqual({ mode: 'boat', data: 'abc123' })
  })

  it('returns null for empty hash', () => {
    expect(parseHashRoute('')).toBeNull()
    expect(parseHashRoute('#')).toBeNull()
  })

  it('returns null for unknown mode', () => {
    expect(parseHashRoute('#/plane')).toBeNull()
  })

  it('detects legacy #data=... format as boat', () => {
    expect(parseHashRoute('#data=xyz')).toEqual({ mode: 'boat', data: 'xyz', legacy: true })
  })
})

describe('buildHashRoute', () => {
  it('builds bare route', () => {
    expect(buildHashRoute({ mode: 'boat', data: null })).toBe('#/boat')
  })

  it('builds route with data', () => {
    expect(buildHashRoute({ mode: 'base', data: 'xyz' })).toBe('#/base?data=xyz')
  })
})
