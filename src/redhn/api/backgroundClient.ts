import type {
    RedhnBackgroundData,
    RedhnBackgroundRequest,
    RedhnBackgroundResponse,
} from './messages';

export async function sendRedhnMessage<TRequest extends RedhnBackgroundRequest>(
    request: TRequest,
): Promise<RedhnBackgroundResponse<RedhnBackgroundData<TRequest>>> {
    return (await browser.runtime.sendMessage(
        request,
    )) as RedhnBackgroundResponse<RedhnBackgroundData<TRequest>>;
}
