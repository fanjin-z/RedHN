import { useEffect, useRef, type RefObject } from 'react';

type CloseOnOutsidePointerOptions = {
    open: boolean;
    onClose: () => void;
};

export function useCloseOnOutsidePointer<T extends HTMLElement>({
    open,
    onClose,
}: CloseOnOutsidePointerOptions): RefObject<T | null> {
    const containerRef = useRef<T>(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const closeIfOutside = (event: PointerEvent) => {
            const container = containerRef.current;
            const target = event.target;
            const path =
                typeof event.composedPath === 'function'
                    ? event.composedPath()
                    : [];

            if (
                container &&
                (path.includes(container) ||
                    (target && container.contains(target as Node)))
            ) {
                return;
            }

            onClose();
        };

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('pointerdown', closeIfOutside);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('pointerdown', closeIfOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [onClose, open]);

    return containerRef;
}
