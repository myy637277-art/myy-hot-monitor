import { afterEach, describe, expect, it } from 'vitest';
import { embeddingLayerStatus } from '../src/collect/embed.ts';
import { decideMatch } from '../src/collect/merge.ts';
import { ensureSources, ingestItems, listStories } from '../src/collect/store.ts';
import { memoryDb } from './helpers.ts';

const opened: Array<() => void> = [];
afterEach(() => opened.splice(0).forEach((close) => close()));

describe('story merge', () => {
  it('matches the same dedupe key, then SimHash within 3, then embeddings only when enabled', () => {
    const far = 0b11111n;
    const existing = [{ storyId: 's1', dedupeKey: 'url:https://example.com/a', simhash: far, embedding: new Float32Array([1, 0]) }];
    expect(decideMatch({ dedupeKey: 'url:https://example.com/a', simhash: 0n, embedding: null }, existing, false)).toBe('s1');
    expect(decideMatch({ dedupeKey: 'url:other', simhash: 0b00111n, embedding: null }, existing, false)).toBe('s1');
    expect(decideMatch({ dedupeKey: 'url:other', simhash: 0n, embedding: new Float32Array([1, 0]) }, existing, false)).toBeNull();
    expect(decideMatch({ dedupeKey: 'url:other', simhash: 0n, embedding: new Float32Array([1, 0]) }, existing, true)).toBe('s1');
    expect(decideMatch({ dedupeKey: 'url:other', simhash: 0n, embedding: new Float32Array([0, 1]) }, existing, true)).toBeNull();
  });

  it('writes one story when two sources repeat a title, and keeps them apart when embedding is off', () => {
    const { db, close } = memoryDb();
    opened.push(close);
    ensureSources(db, { search: 80, twitter: 150 });
    const now = new Date('2026-10-26T02:00:00.000Z');
    const shared = '开源模型评测显示中文推理能力明显提升';
    ingestItems(
      db,
      [
        { sourceId: 'weibo_hot', title: shared, url: 'https://s.weibo.com/weibo?q=1', summary: shared, publishedAt: null, dedupeKey: 'weibo:shared' },
        { sourceId: 'rss:qbitai', title: shared, url: 'https://www.qbitai.com/2026/10/example', summary: shared, publishedAt: null, dedupeKey: 'url:https://www.qbitai.com/2026/10/example' },
      ],
      now,
      false,
    );
    const stories = listStories(db, 10);
    expect(stories).toHaveLength(1);
    expect(stories[0]?.sources.map((source) => source.id).sort()).toEqual(['rss:qbitai', 'weibo_hot']);
  });

  it('skips embedding dedup and keeps URL plus SimHash', () => {
    expect(embeddingLayerStatus()).toEqual({
      skipped: true,
      reason: '已跳过 Embedding 去重，当前只按网址和 SimHash 合并',
    });
  });
});
