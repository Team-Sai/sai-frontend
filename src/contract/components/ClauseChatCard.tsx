import type { ReactNode } from "react";

import type {
  ClauseChatFieldEdit,
  ClauseChatQuestion,
} from "../types/clauseAgent";
import "./ClauseChatCard.css";

/** 기본값 확인 질문 id (AI 서버 decision_rules.DEFAULTS_QUESTION_ID) */
const DEFAULTS_QUESTION_ID = "confirm_defaults";

interface ClauseChatCardProps {
  sessionId: string | null;
  summary: string | null;
  notices: string[];
  guide: string | null;
  fieldEdits: ClauseChatFieldEdit[];
  questions: ClauseChatQuestion[];
  replies: { user: string; ai: string | null }[];
  readyToWrite: boolean;
  /** 답장을 보내고 기다리는 중 */
  waiting: boolean;
  /** 작성이 시작됐으면 버튼을 숨긴다 */
  writing: boolean;
  avatar: ReactNode;
  onReply: (text: string) => void;
}

export default function ClauseChatCard({
  sessionId,
  summary,
  notices,
  guide,
  fieldEdits,
  questions,
  replies,
  readyToWrite,
  waiting,
  writing,
  avatar,
  onReply,
}: ClauseChatCardProps) {
  // 질문은 한 번에 하나씩 보여 준다.
  const current = questions[0];
  const canAnswer = sessionId !== null && !readyToWrite && !writing;

  return (
    <section className="sai-chat">
      <div className="sai-chat-row">
        {avatar}

        <div className="sai-chat-bubble sai-chat-bubble--assistant">
          <strong>
            {sessionId ? "이렇게 이해했어요" : "이 요청은 특약으로 쓰기 어려워요"}
          </strong>

          {summary && <p>{summary}</p>}

          {guide && <p className="sai-chat__multiline">{guide}</p>}

          {fieldEdits.length > 0 && (
            <ul className="sai-chat__field-edits">
              {fieldEdits.map((edit) => (
                <li key={edit.field}>
                  {edit.label}: {edit.current} → <b>{edit.value}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {notices.length > 0 && (
        <div className="sai-warning sai-chat__notices">
          <strong>꼭 알아 두세요</strong>

          {notices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </div>
      )}

      {replies.map((reply, index) => (
        <div key={`${index}-${reply.user}`}>
          <div className="sai-user-row">
            <div className="sai-chat-bubble sai-chat-bubble--user">
              {reply.user}
            </div>
          </div>

          {reply.ai && (
            <div className="sai-chat-row sai-chat__echo">
              {avatar}

              <div className="sai-chat-bubble sai-chat-bubble--assistant">
                <p>{reply.ai}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {canAnswer && current && (
        <div className="sai-chat-row">
          {avatar}

          <div className="sai-chat-bubble sai-chat-bubble--assistant">
            <p className="sai-chat__multiline">{current.text}</p>

            <div className="sai-chat__options">
              {current.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={waiting}
                  onClick={() => onReply(option)}
                >
                  {option}
                </button>
              ))}

              {current.id !== DEFAULTS_QUESTION_ID && (
                <button
                  type="button"
                  className="is-subtle"
                  disabled={waiting}
                  onClick={() => onReply("나중에 정할게요")}
                >
                  나중에 정할게요
                </button>
              )}
            </div>

            <small>버튼 대신 아래 입력창에 직접 써도 돼요.</small>
          </div>
        </div>
      )}

      {canAnswer && !current && (
        <div className="sai-chat-row">
          {avatar}

          <div className="sai-chat-bubble sai-chat-bubble--assistant">
            <strong>이대로 특약을 쓸까요?</strong>

            <div className="sai-chat__options">
              <button
                type="button"
                disabled={waiting}
                onClick={() => onReply("네")}
              >
                네, 써 주세요
              </button>

              <button
                type="button"
                className="is-subtle"
                disabled={waiting}
                onClick={() => onReply("아니요")}
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}

      {waiting && <p className="sai-chat__waiting">확인하고 있어요…</p>}
    </section>
  );
}