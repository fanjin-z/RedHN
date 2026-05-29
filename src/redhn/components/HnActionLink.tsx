import type { ReactNode } from 'react';

type HnActionLinkProps = {
    href: string;
    className: string;
    children: ReactNode;
    onHnAction: (href: string) => void;
    'aria-label'?: string;
};

export function HnActionLink({
    href,
    className,
    children,
    onHnAction,
    'aria-label': ariaLabel,
}: HnActionLinkProps) {
    return (
        <a
            aria-label={ariaLabel}
            className={className}
            href={href}
            onClick={(event) => {
                event.preventDefault();
                onHnAction(href);
            }}
        >
            {children}
        </a>
    );
}
