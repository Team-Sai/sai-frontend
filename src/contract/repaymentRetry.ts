import type {
    RepaymentManagementResponse,
} from './types/repaymentManagement';

type Metadata = RepaymentManagementResponse['metadata'];

export const MAX_AUTO_RETRIES = 3;

export function isAnalysisPending(metadata: Metadata): boolean {
    return (
        metadata.delivery === 'FALLBACK' &&
        (
            metadata.fallbackReason === 'ANALYSIS_IN_PROGRESS' ||
            metadata.fallbackReason === 'WAIT_TIMEOUT'
        )
    );
}

export function getAutoRetryDelay(
    metadata: Metadata,
    retriesUsed: number,
): number | null {
    if (
        !isAnalysisPending(metadata) ||
        retriesUsed >= MAX_AUTO_RETRIES
    ) {
        return null;
    }

    const seconds = metadata.retryAfterSeconds;

    if (
        seconds === null ||
        !Number.isInteger(seconds) ||
        seconds < 1 ||
        seconds > 30
    ) {
        return null;
    }

    return seconds * 1000;
}

export function waitForRetry(
    milliseconds: number,
    signal: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }

        const onAbort = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', onAbort);

            reject(new DOMException('Aborted', 'AbortError'));
        };

        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort);
            resolve();
        }, milliseconds);

        signal.addEventListener('abort', onAbort, { once: true });
    });
}