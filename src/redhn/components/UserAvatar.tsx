import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';

export function UserAvatar({ userId }: { userId: string }) {
    return (
        <span className="redhn-avatar" aria-hidden="true">
            <UserCircleIcon weight="fill" />
            <span>{userInitials(userId)}</span>
        </span>
    );
}

export function userInitials(userId: string): string {
    const parts = userId
        .split(/[^a-z0-9]+/i)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return '?';
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}
