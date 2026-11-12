import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { fetchNotifications } from "./notificationApi";

const POLL_INTERVAL_MS = 60_000;

function storageKey(email: string) {
  return `notification:lastSeenAt:${email}`;
}

function readLastSeen(email: string): number {
  try {
    return Number(window.localStorage.getItem(storageKey(email))) || 0;
  } catch {
    return 0;
  }
}

function writeLastSeen(email: string, time: number) {
  try {
    window.localStorage.setItem(storageKey(email), String(time));
  } catch {
    // 저장소를 못 쓰는 환경에서는 표시만 갱신되지 않는다.
  }
}

export function useHasNewNotification(isViewing: boolean): boolean {
  const { user } = useAuth();
  const email = user?.email ?? null;
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!email) return;

    let controller: AbortController | null = null;

    async function check() {
      controller?.abort();
      controller = new AbortController();
      try {
        const rows = await fetchNotifications(controller.signal);
        const latest = rows.reduce((max, row) => {
          const time = row.createdAt ? Date.parse(row.createdAt) : NaN;
          return Number.isNaN(time) ? max : Math.max(max, time);
        }, 0);

        if (isViewing) {
          if (latest > readLastSeen(email!)) writeLastSeen(email!, latest);
          setHasNew(false);
        } else {
          setHasNew(latest > readLastSeen(email!));
        }
      } catch {
        // 조회 실패나 취소 시에는 이전 표시를 유지한다.
      }
    }

    void check();
    const timer = window.setInterval(check, POLL_INTERVAL_MS);
    window.addEventListener("focus", check);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      controller?.abort();
    };
  }, [email, isViewing]);

  return email ? hasNew : false;
}
