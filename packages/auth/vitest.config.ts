import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    globals: true,
    include: ['examples/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
