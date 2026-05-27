const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

export type HnApiItem = {
    id: number;
    deleted?: boolean;
    type?: 'job' | 'story' | 'comment' | 'poll' | 'pollopt';
    by?: string;
    time?: number;
    text?: string;
    dead?: boolean;
    parent?: number;
    poll?: number;
    kids?: number[];
    url?: string;
    score?: number;
    title?: string;
    parts?: number[];
    descendants?: number;
};

export type HnApiUpdates = {
    items: number[];
    profiles: string[];
};

export async function fetchHnItem(
    id: number,
    fetcher: typeof fetch = fetch,
): Promise<HnApiItem | null> {
    return fetchJson<HnApiItem | null>(
        `${HN_API_BASE}/item/${id}.json`,
        fetcher,
    );
}

export async function fetchHnItems(
    ids: number[],
    fetcher: typeof fetch = fetch,
): Promise<Record<number, HnApiItem | null>> {
    const uniqueIds = Array.from(new Set(ids));
    const entries = await Promise.all(
        uniqueIds.map(
            async (id) => [id, await fetchHnItem(id, fetcher)] as const,
        ),
    );
    return Object.fromEntries(entries);
}

export async function fetchHnUpdates(
    fetcher: typeof fetch = fetch,
): Promise<HnApiUpdates> {
    return fetchJson<HnApiUpdates>(`${HN_API_BASE}/updates.json`, fetcher);
}

async function fetchJson<T>(url: string, fetcher: typeof fetch): Promise<T> {
    const response = await fetcher(url);
    if (!response.ok) {
        throw new Error(`HN API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
}
