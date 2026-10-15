import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface AccountLinkCompleteMessage {
    type: 'SAI_BANK_LINK_COMPLETE';
    success: boolean;
    state: string;
}

export default function LinkCompletePage() {
    const [searchParams] = useSearchParams();

    const success =
        searchParams.get('success') === 'true';

    const state =
        searchParams.get('state') ?? '';

    const errorMessage =
        searchParams
            .get('errorMessage')
            ?.trim() ||
        '계좌 연동에 실패했습니다.';

    useEffect(() => {
        if (!state) {
            console.error(
                '계좌 연동 완료 state가 없습니다.'
            );

            return;
        }

        const message: AccountLinkCompleteMessage = {
            type: 'SAI_BANK_LINK_COMPLETE',
            success,
            state,
        };

        if (window.opener) {
            window.opener.postMessage(
                message,
                window.location.origin
            );
        }

        const timerId =
            window.setTimeout(
                () => {
                    window.close();
                },
                success ? 800 : 2000
            );

        return () => {
            window.clearTimeout(timerId);
        };
    }, [success, state]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f6f5fb] px-5">
            <p
                className={
                    success
                        ? 'text-[15px] text-text'
                        : 'text-[15px] text-error'
                }
                role={
                    success
                        ? undefined
                        : 'alert'
                }
            >
                {success
                    ? '계좌 연동이 완료되었습니다. 창이 자동으로 닫힙니다...'
                    : errorMessage}
            </p>
        </main>
    );
}