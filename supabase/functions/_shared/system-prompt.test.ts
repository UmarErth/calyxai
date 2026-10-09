import { describe, expect, it } from 'vitest'
import { intelligenceFor, systemPromptFor } from './system-prompt'

describe('Calyx intelligence profiles', () => {
  it('orders plans from core to maximum reasoning', () => {
    expect(intelligenceFor('free')).toMatchObject({ name: 'Calyx Core', thinkingLevel: 'low' })
    expect(intelligenceFor('starter')).toMatchObject({ name: 'Calyx Focus', thinkingLevel: 'medium' })
    expect(intelligenceFor('work')).toMatchObject({ name: 'Calyx Work', thinkingLevel: 'high' })
    expect(intelligenceFor('unlimited')).toMatchObject({ name: 'Calyx Max', thinkingLevel: 'high' })
  })

  it('adds stronger prompt layers without removing the reliability baseline', () => {
    const core = systemPromptFor('free')
    const work = systemPromptFor('work')
    const max = systemPromptFor('unlimited')
    expect(work).toContain(core)
    expect(work).toContain('WORK EXECUTION PROTOCOL')
    expect(max).toContain(work)
    expect(max).toContain('MAXIMUM RELIABILITY PROTOCOL')
  })
})
