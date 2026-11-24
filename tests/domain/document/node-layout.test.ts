/** 节点级布局纯语义：side/fold 值解析、data 投影与布局能力判定。 */
import { describe, expect, it } from 'vitest';
import {
	applyNodeLayoutFields,
	parseFoldValue,
	parseSideValue,
	readLayoutDirectives,
	readNodeLayout,
	supportsBranchSide,
} from '@/src/domain/document';

describe('parseSideValue', () => {
	it.each([
		['left', { side: 'left' }],
		['RIGHT', { side: 'right' }],
		['auto', { side: 'auto' }],
		['left,fold:1', { side: 'left', fold: true }],
		['right, fold:0', { side: 'right', fold: false }],
	])('接受 %s', (value, expected) => {
		expect(parseSideValue(value)).toEqual(expected);
	});

	it.each(['', 'center', 'left,fold:2', 'left,unknown:1', 'left,fold'])(
		'拒绝 %j',
		(value) => {
			expect(parseSideValue(value)).toBeNull();
		},
	);
});

describe('parseFoldValue', () => {
	it('只接受 0 / 1', () => {
		expect(parseFoldValue('1')).toBe(true);
		expect(parseFoldValue(' 0 ')).toBe(false);
		expect(parseFoldValue('true')).toBeNull();
		expect(parseFoldValue('')).toBeNull();
	});
});

describe('readLayoutDirectives', () => {
	it('读取独立与合并写法，后出现的段生效', () => {
		expect(
			readLayoutDirectives([
				{ key: 'side', value: 'left' },
				{ key: 'fold', value: '1' },
			]),
		).toEqual({ side: 'left', fold: true });
		expect(
			readLayoutDirectives([{ key: 'side', value: 'right,fold:0' }]),
		).toEqual({ side: 'right', fold: false });
		expect(
			readLayoutDirectives([
				{ key: 'side', value: 'left' },
				{ key: 'side', value: 'right' },
			]),
		).toEqual({ side: 'right', fold: false });
	});

	it('没有相关段返回 null，非法值按段丢弃', () => {
		expect(readLayoutDirectives([])).toBeNull();
		expect(readLayoutDirectives([{ key: 'id', value: 'abc' }])).toBeNull();
		expect(
			readLayoutDirectives([{ key: 'side', value: 'center' }]),
		).toBeNull();
	});
});

describe('applyNodeLayoutFields / readNodeLayout', () => {
	it('写入 md 字段与引擎投影，auto/展开会清除旧值', () => {
		const data: Record<string, unknown> = {};
		applyNodeLayoutFields(data, { side: 'left', fold: true });
		expect(data).toMatchObject({ mdSide: 'left', dir: 'left', mdFold: true, expand: false });
		expect(readNodeLayout(data)).toEqual({ side: 'left', fold: true });

		applyNodeLayoutFields(data, { side: 'auto', fold: false });
		expect(data).not.toHaveProperty('mdSide');
		expect(data).not.toHaveProperty('dir');
		expect(data).not.toHaveProperty('mdFold');
		expect(data.expand).toBe(true);
		expect(readNodeLayout(data)).toEqual({ side: 'auto', fold: false });
	});
});

describe('supportsBranchSide', () => {
	it('只对读取 data.dir 的三种布局开放', () => {
		for (const layout of ['mindMap', 'timeline', 'fishbone']) {
			expect(supportsBranchSide(layout)).toBe(true);
		}
		for (const layout of ['logicalStructure', 'organizationStructure', 'catalogOrganization']) {
			expect(supportsBranchSide(layout)).toBe(false);
		}
	});
});
