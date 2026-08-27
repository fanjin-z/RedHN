import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { XIcon } from '@phosphor-icons/react';

type MobileNavigationDrawerProps = {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    triggerRef: RefObject<HTMLButtonElement | null>;
};

export function MobileNavigationDrawer({
    children,
    open,
    onClose,
    triggerRef,
}: MobileNavigationDrawerProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!open || !dialog) return;

        const mobileViewport = window.matchMedia('(max-width: 900px)');
        if (!mobileViewport.matches) {
            onClose();
            return;
        }

        const trigger = triggerRef.current;
        const restoreScroll = lockPageScroll();
        // The native modal makes the rest of the page inert, including across
        // WXT's shadow-root boundary.
        dialog.showModal();
        const onViewportChange = () => {
            if (!mobileViewport.matches) onClose();
        };
        mobileViewport.addEventListener('change', onViewportChange);

        return () => {
            mobileViewport.removeEventListener('change', onViewportChange);
            dialog.close();
            restoreScroll();
            if (mobileViewport.matches) trigger?.focus({ preventScroll: true });
        };
    }, [open, onClose, triggerRef]);

    return (
        <dialog
            aria-label="Hacker News navigation"
            className="redhn-mobile-nav"
            id="redhn-mobile-navigation"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                if (
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right ||
                    event.clientY < bounds.top ||
                    event.clientY > bounds.bottom
                ) {
                    onClose();
                }
            }}
            onClose={(event) => {
                if (!event.currentTarget.open) onClose();
            }}
            onKeyDown={(event) => {
                // Handle keys here before WXT stops them leaving the shadow root.
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                } else if (event.key === 'Tab') {
                    const items = Array.from(
                        event.currentTarget.querySelectorAll<HTMLElement>(
                            'button:not([disabled]), a[href]',
                        ),
                    );
                    const index = items.indexOf(event.target as HTMLElement);
                    const nextIndex = event.shiftKey
                        ? (index - 1 + items.length) % items.length
                        : (index + 1) % items.length;
                    event.preventDefault();
                    items[nextIndex]?.focus();
                }
            }}
            ref={dialogRef}
        >
            <div className="redhn-mobile-nav__header">
                <span className="redhn-brand">Hacker News</span>
                <button
                    aria-label="Close navigation"
                    className="redhn-icon-button redhn-mobile-nav__close"
                    onClick={onClose}
                    type="button"
                >
                    <XIcon aria-hidden="true" weight="bold" />
                </button>
            </div>
            <div className="redhn-mobile-nav__scroll">{children}</div>
        </dialog>
    );
}

function lockPageScroll(): () => void {
    const { scrollX, scrollY } = window;
    // Lock the host page, not the synthetic body inside WXT's shadow root.
    // A fixed body also prevents background touch scrolling on iOS Safari.
    const overrides: [CSSStyleDeclaration, string, string][] = [
        [document.documentElement.style, 'overflow', 'hidden'],
        [document.body.style, 'position', 'fixed'],
        [document.body.style, 'top', `${-scrollY}px`],
        [document.body.style, 'left', `${-scrollX}px`],
        [document.body.style, 'width', '100%'],
    ];
    if (window.innerWidth > document.documentElement.clientWidth) {
        overrides.push([
            document.documentElement.style,
            'scrollbar-gutter',
            'stable',
        ]);
    }
    const restoreStyles = overrides.map(([style, property, value]) => {
        const previousValue = style.getPropertyValue(property);
        const previousPriority = style.getPropertyPriority(property);
        style.setProperty(property, value, 'important');
        return () => {
            if (previousValue) {
                style.setProperty(property, previousValue, previousPriority);
            } else {
                style.removeProperty(property);
            }
        };
    });

    return () => {
        restoreStyles.forEach((restore) => restore());
        window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    };
}
