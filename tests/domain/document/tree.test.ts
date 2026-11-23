/** 通用领域树的遍历顺序、短路与深树行为。 */
import { describe, expect, it } from 'vitest';
import { walkTree } from '@/src/domain/document/tree';

interface TNode {
	id: string;
	children?: readonly TNode[] | null;
}

describe('walkTree', () => {
	it('先序遍历：父先于子、子按 children 原顺序（等价递归 forEach）', () => {
		const tree: TNode = {
			id: 'root',
			children: [
				{ id: 'a', children: [{ id: 'a1' }, { id: 'a2' }] },
				{ id: 'b', children: [{ id: 'b1', children: [{ id: 'b1x' }] }] },
				{ id: 'c' },
			],
		};
		const order: string[] = [];
		walkTree(tree, (n) => {
			order.push(n.id);
		});
		expect(order).toEqual([
			'root',
			'a',
			'a1',
			'a2',
			'b',
			'b1',
			'b1x',
			'c',
		]);
	});

	it('每个节点只被访问一次，且 visit 收到的是原节点对象引用', () => {
		const a1: TNode = { id: 'a1' };
		const tree: TNode = { id: 'root', children: [{ id: 'a', children: [a1] }] };
		const seen: TNode[] = [];
		walkTree(tree, (n) => {
			seen.push(n);
		});
		expect(seen).toHaveLength(3);
		expect(seen[2]).toBe(a1);
		expect(new Set(seen).size).toBe(3);
	});

	it('visit 返回 false 立即终止整棵树（命中即停，后续兄弟/子树不再访问）', () => {
		const tree: TNode = {
			id: 'root',
			children: [
				{ id: 'hit', children: [{ id: 'hit-child' }] },
				{ id: 'after' },
			],
		};
		const order: string[] = [];
		walkTree(tree, (n) => {
			order.push(n.id);
			if (n.id === 'hit') {
				return false;
			}
			return undefined;
		});
		expect(order).toEqual(['root', 'hit']);
	});

	it('根节点即返回 false 时只访问一次', () => {
		const tree: TNode = { id: 'root', children: [{ id: 'a' }] };
		let calls = 0;
		walkTree(tree, () => {
			calls++;
			return false;
		});
		expect(calls).toBe(1);
	});

	it('返回非 false 的真值不构成终止——实现按 `=== false` 严格判定', () => {
		// 为什么这样断言：实现用 `visit(current) === false` 判定终止，
		// 若未来改成 falsy 判定（!result），越出契约的 JS 调用方语义会突变。
		const tree: TNode = { id: 'root', children: [{ id: 'a' }, { id: 'b' }] };
		const order: string[] = [];
		// 越出 `void | false` 返回契约的调用方（未经类型检查的 JS 用法），
		// 经 double assertion 复现，确保断言仍指向运行时真实行为。
		const visitor = ((n: TNode) => {
			order.push(n.id);
			return true;
		}) as unknown as (node: TNode) => void | false;
		walkTree(tree, visitor);
		expect(order).toEqual(['root', 'a', 'b']);
	});

	it('children 缺失 / 为 undefined / 为 null / 为空数组均安全', () => {
		const visited: string[] = [];
		walkTree<TNode>({ id: 'missing' }, (n) => {
			visited.push(n.id);
		});
		walkTree<TNode>({ id: 'undefined', children: undefined }, (n) => {
			visited.push(n.id);
		});
		walkTree<TNode>({ id: 'null', children: null }, (n) => {
			visited.push(n.id);
		});
		walkTree<TNode>({ id: 'empty', children: [] }, (n) => {
			visited.push(n.id);
		});
		expect(visited).toEqual(['missing', 'undefined', 'null', 'empty']);
	});

	it('同一子节点被两个父引用时会被访问两次（无去重、无环检测）', () => {
		// 为什么这样断言：walkTree 是纯遍历，不做 visited 集合；共享子节点
		// 的调用方若需去重必须自备集合。锁死此点避免误加去重改变调用方语义。
		const shared: TNode = { id: 'shared' };
		const tree: TNode = {
			id: 'root',
			children: [{ id: 'p1', children: [shared] }, { id: 'p2', children: [shared] }],
		};
		const order: string[] = [];
		walkTree(tree, (n) => {
			order.push(n.id);
		});
		expect(order).toEqual(['root', 'p1', 'shared', 'p2', 'shared']);
	});

	it('5 万级深链不栈溢出（显式栈回归；递归实现会 RangeError）', () => {
		const depth = 50_000;
		let chain: TNode = { id: 'n0' };
		let cursor = chain;
		for (let i = 1; i < depth; i++) {
			const next: TNode = { id: `n${i}` };
			cursor.children = [next];
			cursor = next;
		}
		let count = 0;
		let lastId = '';
		expect(() =>
			walkTree(chain, (n) => {
				count++;
				lastId = n.id;
			}),
		).not.toThrow();
		expect(count).toBe(depth);
		expect(lastId).toBe(`n${depth - 1}`);
	});

	it('深链中提前短路时只访问到命中层（不构建完整遍历）', () => {
		const depth = 1000;
		let chain: TNode = { id: 'n0' };
		let cursor = chain;
		for (let i = 1; i < depth; i++) {
			const next: TNode = { id: `n${i}` };
			cursor.children = [next];
			cursor = next;
		}
		let count = 0;
		walkTree(chain, (n) => {
			count++;
			if (n.id === 'n9') {
				return false;
			}
			return undefined;
		});
		expect(count).toBe(10);
	});
});
