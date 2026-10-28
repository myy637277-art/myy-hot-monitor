import type { CollectProgress, SourcesResponse, SourceStatus, StoriesResponse, WatchesResponse } from '@hot/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function useSources() {
  const client = useQueryClient();
  const wasRunning = useRef(false);
  const sources = useQuery({
    queryKey: ['sources'],
    queryFn: () => getJson<SourcesResponse>('/api/v1/sources'),
    refetchInterval: (query) => (query.state.data?.running || query.state.data?.ai.scoring ? 2000 : false),
  });

  useEffect(() => {
    const busy = Boolean(sources.data?.running || sources.data?.ai.scoring);
    if (wasRunning.current && !busy) {
      void client.invalidateQueries({ queryKey: ['stories'] });
      void client.invalidateQueries({ queryKey: ['watches'] });
    }
    wasRunning.current = busy;
  }, [sources.data?.running, sources.data?.ai.scoring, client]);

  return sources;
}

export function useStories() {
  const sources = useSources();
  return useQuery({
    queryKey: ['stories'],
    queryFn: () => getJson<StoriesResponse>('/api/v1/stories?limit=100'),
    refetchInterval: sources.data?.running || sources.data?.ai.scoring ? 2000 : false,
  });
}

export function useCollect() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/collect', { method: 'POST' });
      if (!res.ok && res.status !== 409) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['sources'] });
      await client.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useWatches() {
  const sources = useSources();
  return useQuery({
    queryKey: ['watches'],
    queryFn: () => getJson<WatchesResponse>('/api/v1/watches'),
    refetchInterval: sources.data?.running || sources.data?.ai.scoring ? 2000 : false,
  });
}

async function watchRequest(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  if (res.ok) return;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (body?.error === 'duplicate') throw new Error('这个关键词已经在列表里');
  throw new Error('没有保存成功');
}

export function useAddWatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (keyword: string) =>
      watchRequest('/api/v1/watches', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keyword }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['watches'] }),
  });
}

export function usePauseWatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; paused: boolean }) =>
      watchRequest(`/api/v1/watches/${input.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paused: input.paused }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['watches'] }),
  });
}

export function useDeleteWatch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => watchRequest(`/api/v1/watches/${id}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['watches'] }),
  });
}

export function collectStatus(running: boolean, progress?: CollectProgress): string | null {
  if (!running) return null;
  return `${progress?.sourceName || '准备来源'} · 已到 ${progress?.items ?? 0} 条`;
}

export function usageLabel(source: SourceStatus): string {
  const cap = source.usage.cap == null ? '' : ` / 上限 ${source.usage.cap}`;
  return `今日 ${source.usage.requests} 次${cap} · ${source.usage.items} 条`;
}
