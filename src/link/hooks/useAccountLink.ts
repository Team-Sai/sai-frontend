import { useCallback, useEffect, useRef, useState } from 'react';
import { startAccountLink } from '../api/linkApi';

interface UseAccountLinkOptions {
    onSuccess: () => void | Promise<void>;
}

interface AccountLinkCompleteMessage {
    type: 'SAI_BANK_LINK_COMPLETE';
    success: boolean;
    state: string;
}

function isAccountLinkCompleteMessage(
    value: unknown
): value is AccountLinkCompleteMessage {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value)
    ) {
        return false;
    }

    const message = value as Record<string, unknown>;

    return (
        message.type === 'SAI_BANK_LINK_COMPLETE' &&
        typeof message.success === 'boolean' &&
        typeof message.state === 'string' &&
        message.state.trim() !== ''
    );
}

export function useAccountLink({
                                   onSuccess,
                               }: UseAccountLinkOptions) {
    const [isConnecting, setIsConnecting] =
        useState(false);

    const bankWindowRef = useRef<Window | null>(
        null
    );

    const linkStateRef = useRef<string | null>(
        null
    );

    const resetLinkState = useCallback(() => {
        bankWindowRef.current = null;
        linkStateRef.current = null;
        setIsConnecting(false);
    }, []);

    const connectAccount = useCallback(async () => {
        if (isConnecting) {
            return false;
        }

        const bankWindow = window.open(
            'about:blank',
            'sai-bank-link',
            'width=480,height=720'
        );

        if (!bankWindow) {
            window.alert(
                '계좌 연동 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제한 후 다시 시도해 주세요.'
            );

            return false;
        }

        setIsConnecting(true);

        try {
            const { redirectUrl } =
                await startAccountLink();

            let linkState: string | null = null;

            try {
                linkState = new URL(
                    redirectUrl,
                    window.location.origin
                ).searchParams.get('state');
            } catch (error) {
                console.error(
                    '계좌 연동 URL 파싱 실패',
                    error
                );
            }

            if (!linkState) {
                bankWindow.close();

                resetLinkState();

                window.alert(
                    '계좌 연동 상태값을 전달받지 못했습니다.'
                );

                return false;
            }

            linkStateRef.current = linkState;
            bankWindowRef.current = bankWindow;

            bankWindow.location.href = redirectUrl;

            return true;
        } catch (error) {
            console.error(
                '계좌 연동 시작 실패',
                error
            );

            bankWindow.close();

            resetLinkState();

            window.alert(
                error instanceof Error
                    ? error.message
                    : '계좌 연동을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.'
            );

            return false;
        }
    }, [isConnecting, resetLinkState]);

    useEffect(() => {
        function handleMessage(
            event: MessageEvent
        ) {
            const bankWindow =
                bankWindowRef.current;

            const expectedState =
                linkStateRef.current;

            if (!bankWindow) {
                return;
            }

            if (!expectedState) {
                return;
            }

            if (
                event.origin !==
                window.location.origin
            ) {
                return;
            }

            if (event.source !== bankWindow) {
                return;
            }

            if (
                !isAccountLinkCompleteMessage(
                    event.data
                )
            ) {
                return;
            }

            if (
                event.data.state !==
                expectedState
            ) {
                console.warn(
                    '계좌 연동 state가 일치하지 않습니다.'
                );

                return;
            }

            resetLinkState();

            if (event.data.success) {
                void onSuccess();
            } else {
                window.alert(
                    '계좌 연동에 실패했습니다.'
                );
            }
        }

        window.addEventListener(
            'message',
            handleMessage
        );

        return () => {
            window.removeEventListener(
                'message',
                handleMessage
            );

            bankWindowRef.current?.close();
            bankWindowRef.current = null;
            linkStateRef.current = null;
        };
    }, [onSuccess, resetLinkState]);

    useEffect(() => {
        if (!isConnecting) {
            return;
        }

        const pollId = window.setInterval(
            () => {
                const bankWindow =
                    bankWindowRef.current;

                if (!bankWindow) {
                    return;
                }

                if (bankWindow.closed) {
                    resetLinkState();

                    window.alert(
                        '계좌 연동이 취소되었습니다.'
                    );
                }
            },
            500
        );

        return () => {
            window.clearInterval(pollId);
        };
    }, [
        isConnecting,
        resetLinkState,
    ]);

    return {
        isConnecting,
        connectAccount,
    };
}