export function readReplyDraft(parentId: number): string {
    try {
        return sessionStorage.getItem(`redhn.replyDraft.${parentId}`) ?? '';
    } catch {
        return '';
    }
}

export function saveReplyDraft(parentId: number, text: string): void {
    try {
        const key = `redhn.replyDraft.${parentId}`;
        if (text) {
            sessionStorage.setItem(key, text);
        } else {
            sessionStorage.removeItem(key);
        }
    } catch {
        // The composer must still work when session storage is unavailable.
    }
}
