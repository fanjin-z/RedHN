import type { HnApiItem, HnApiUpdates, HnApiUser } from './hnApi';

export type RedhnBackgroundRequest =
    | { type: 'redhn:getItem'; id: number }
    | { type: 'redhn:getItems'; ids: number[] }
    | { type: 'redhn:getUser'; id: string }
    | { type: 'redhn:getUpdates' };

export type RedhnBackgroundResponse<T> =
    | { ok: true; data: T }
    | { ok: false; error: string };

export type RedhnBackgroundData<TRequest extends RedhnBackgroundRequest> =
    TRequest extends { type: 'redhn:getItem' }
        ? HnApiItem | null
        : TRequest extends { type: 'redhn:getItems' }
          ? Record<number, HnApiItem | null>
          : TRequest extends { type: 'redhn:getUser' }
            ? HnApiUser | null
            : TRequest extends { type: 'redhn:getUpdates' }
              ? HnApiUpdates
              : never;

export function isRedhnBackgroundRequest(
    value: unknown,
): value is RedhnBackgroundRequest {
    if (!value || typeof value !== 'object' || !('type' in value)) {
        return false;
    }

    const request = value as Partial<RedhnBackgroundRequest>;
    if (request.type === 'redhn:getItem') {
        return typeof request.id === 'number' && Number.isInteger(request.id);
    }

    if (request.type === 'redhn:getItems') {
        return (
            Array.isArray(request.ids) &&
            request.ids.every(
                (id) => typeof id === 'number' && Number.isInteger(id),
            )
        );
    }

    if (request.type === 'redhn:getUser') {
        return typeof request.id === 'string' && request.id.trim().length > 0;
    }

    return request.type === 'redhn:getUpdates';
}
