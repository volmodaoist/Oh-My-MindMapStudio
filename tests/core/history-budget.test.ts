import { describe, expect, it } from 'vitest';
import { HISTORY_BUDGET_BYTES, HISTORY_SNAPSHOT_BYTES_PER_NODE, resolveHistoryLimit } from '../../src/core/history-budget';

describe('共享快照预算（无 DOM 或引擎运行时）', () => {
  it('预算内条数、单调性与撤销地板保持一致', () => {
    let previous = 500;
    for (let nodes = 1; nodes <= 5000; nodes += 23) {
      const count = resolveHistoryLimit(nodes);
      expect(count).toBeGreaterThanOrEqual(30);
      expect(count).toBeLessThanOrEqual(previous);
      if (count > 30) expect(count * nodes * HISTORY_SNAPSHOT_BYTES_PER_NODE).toBeLessThanOrEqual(HISTORY_BUDGET_BYTES);
      previous = count;
    }
    expect(resolveHistoryLimit(0)).toBe(500);
    expect(resolveHistoryLimit(10000)).toBe(30);
  });
});
