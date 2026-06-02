import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { extensionEnabledItem } from '../../src/redhn/state/storage';
import './style.css';

function Popup() {
    const [enabled, setEnabled] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        let active = true;

        void extensionEnabledItem.getValue().then((storedEnabled) => {
            if (!active) {
                return;
            }

            setEnabled(storedEnabled);
            setLoaded(true);
        });

        const unwatch = extensionEnabledItem.watch((storedEnabled) => {
            setEnabled(storedEnabled);
            setLoaded(true);
        });

        return () => {
            active = false;
            unwatch();
        };
    }, []);

    const updateEnabled = (nextEnabled: boolean) => {
        setPending(true);
        setEnabled(nextEnabled);

        void extensionEnabledItem.setValue(nextEnabled).finally(() => {
            setPending(false);
        });
    };

    return (
        <main className="popup-shell">
            <label className="popup-toggle">
                <span className="popup-logo" aria-hidden="true">
                    Y
                </span>
                <span className="popup-copy">
                    <h1>RedHN</h1>
                    <p>{enabled ? 'Enabled' : 'Disabled'}</p>
                </span>
                <span className="popup-switch">
                    <input
                        aria-label="Toggle RedHN"
                        checked={enabled}
                        disabled={!loaded || pending}
                        onChange={(event) => {
                            updateEnabled(event.currentTarget.checked);
                        }}
                        type="checkbox"
                    />
                    <span aria-hidden="true" />
                </span>
            </label>
        </main>
    );
}

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(<Popup />);
}
