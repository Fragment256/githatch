import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DiffLine = { type: '+' | '-' | ' '; line: string }

export function computeLineDiff(original: string, updated: string): DiffLine[] {
  const a = original.split('\n')
  const b = updated.split('\n')
  const m = a.length
  const n = b.length

  const dp: number[][] = []
  for (let i = 0; i <= m; i++) {
    dp.push(new Array(n + 1).fill(0) as number[])
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: ' ', line: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: '+', line: b[j - 1] })
      j--
    } else {
      result.unshift({ type: '-', line: a[i - 1] })
      i--
    }
  }
  return result
}
