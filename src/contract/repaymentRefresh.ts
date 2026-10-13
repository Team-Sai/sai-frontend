const EVENT_NAME = 'sai:repayment-data-changed';

export function notifyRepaymentChanged(): void {
    window.dispatchEvent(new Event(EVENT_NAME));
}

export function subscribeRepaymentChanged(
    listener: () => void,
): () => void {
    window.addEventListener(EVENT_NAME, listener);

    return () => {
        window.removeEventListener(EVENT_NAME, listener);
    };
}