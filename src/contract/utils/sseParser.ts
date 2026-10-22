/*
 * SSE(Server-Sent Events) 응답 조각을 이벤트 단위로 나눈다.
 *
 *   event: progress
 *   data: {"step": "analysis"}
 *                                ← 빈 줄이 오면 이벤트 하나 끝
 *   : keep-alive                 ← ':'로 시작하면 주석 (무시)
 *
 * 네트워크에서는 글자가 아무 데서나 잘려서 오므로,
 * push()로 받은 조각을 모아 두었다가 완성된 이벤트만 넘긴다.
 */

export interface SseEvent {
  event: string;
  data: string;
}

export function createSseParser(onEvent: (event: SseEvent) => void) {
  let buffer = "";
  let eventName: string | null = null;
  let dataLines: string[] = [];

  function dispatch() {
    if (dataLines.length > 0) {
      onEvent({ event: eventName ?? "message", data: dataLines.join("\n") });
    }

    eventName = null;
    dataLines = [];
  }

  function handleLine(rawLine: string) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

    if (line === "") {
      dispatch();
      return;
    }

    if (line.startsWith(":")) {
      return;
    }

    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);

    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "event") {
      eventName = value;
    } else if (field === "data") {
      dataLines.push(value);
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk;

      let newline = buffer.indexOf("\n");

      while (newline >= 0) {
        handleLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    },

    /** 연결이 끝났을 때 남은 내용을 마저 처리한다. */
    flush() {
      if (buffer) {
        handleLine(buffer);
        buffer = "";
      }

      dispatch();
    },
  };
}