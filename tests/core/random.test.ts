import { expect, it } from 'vitest'
import { createRandom } from '../../src/core/random'

it('creates repeatable sequences for a seed', () => {
  const a = createRandom(42)
  const b = createRandom(42)
  expect([a(), a(), a()]).toEqual([b(), b(), b()])
  expect([a(), a()]).not.toEqual([createRandom(43)(), createRandom(43)()])
})
