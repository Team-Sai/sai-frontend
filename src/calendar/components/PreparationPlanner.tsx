import { useEffect, useRef, useState } from "react";
import {
    createProposal,
    createRescheduleProposal,
    confirmProposal,
    PlanningApiError,
} from "../api/preparationPlanningApi";
import type { PreparationFunding, ProposalResponse, Weekday } from "../api/preparationPlanningApi";
import type {PreparationEvent} from "../api/preparationEventApi";
import "../styles/PreparationCoordination.css";

interface Props {
    yearMonth: string;
    onRegistered: () => void;
    rescheduleEvent: PreparationEvent | null;
    onRescheduleCancel: () => void;
    onInteractionLockChange: (locked: boolean) => void;
}
const DAYS: { value: Weekday; label: string }[] = [
    { value: "MONDAY", label: "월" }, { value: "TUESDAY", label: "화" },
    { value: "WEDNESDAY", label: "수" }, { value: "THURSDAY", label: "목" },
    { value: "FRIDAY", label: "금" }, { value: "SATURDAY", label: "토" },
    { value: "SUNDAY", label: "일" },
];
const DEFAULT_DAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"];
const REMINDER_DURATION_MINUTES = 1;

const PREFERENCE_EXAMPLES = [
    "가능하면 여러 회차를 같은 날 같은 시각에 모아줘.",
    "이번 주는 피하고 다음 주 저녁으로 잡아줘.",
    "기존 확인 일정이 있는 날에 함께 배치해줘.",
];

function seoulDate(): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
}
function displayTime(value: string): string {
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short",
        hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(new Date(value));
}
function money(value: number): string { return `${value.toLocaleString("ko-KR")}원`; }
function parseMoney(value: string, label: string): number {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`${label}을 0 이상의 금액으로 입력하세요.`);
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount > 999_999_999_999.99) throw new Error(`${label}이 입력 범위를 초과했습니다.`);
    return amount;
}

export default function PreparationPlanner({
                                               yearMonth,
                                               onRegistered,
                                               rescheduleEvent,
                                               onRescheduleCancel,
                                               onInteractionLockChange,
                                           }: Props) {
    const [allowedDays, setAllowedDays] = useState<Weekday[]>([...DEFAULT_DAYS]);
    const [windowStart, setWindowStart] = useState("18:00");
    const [windowEnd, setWindowEnd] = useState("21:00");
    const [leadDays, setLeadDays] = useState(2);
    const [preferences, setPreferences] = useState("");
    const [useFunding, setUseFunding] = useState(false);
    const [budget, setBudget] = useState("");
    const [available, setAvailable] = useState("");
    const [incomeDate, setIncomeDate] = useState("");
    const [incomeAmount, setIncomeAmount] = useState("");
    const [proposal, setProposal] = useState<ProposalResponse | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [registered, setRegistered] = useState(false);
    // 승인 응답을 잃은 경우 기존 제안 ID로 결과를 먼저 재확인한다.
    const [confirmationUncertain, setConfirmationUncertain] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);
    const runningRef = useRef(false);
    const preferencesRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        return () => {
            controllerRef.current?.abort();
            onInteractionLockChange(false);
        };
    }, [onInteractionLockChange]);

    function invalidateProposal() {
        setProposal(null); setError(null); setNotice(null); setRegistered(false);
    }

    function returnToNewProposal() {
        // 승인 결과가 불확실하거나 요청 중이면 기존 제안을 유지합니다.
        if (runningRef.current || confirmationUncertain || !registered) {
            return;
        }

        // 신규 등록도 재마운트 없이 입력 폼으로 돌아갈 수 있게 합니다.
        invalidateProposal();

        if (rescheduleEvent) {
            onRescheduleCancel();
        }
    }
    function toggleDay(day: Weekday) {
        invalidateProposal();
        setAllowedDays((days) => days.includes(day) ? days.filter((d) => d !== day) : [...days, day]);
    }
    function buildFunding(): PreparationFunding | null {
        if (!useFunding) return null;
        const remainingMonthlyBudget = parseMoney(budget, "이번 달 남은 상환 예산");
        const availableNow = parseMoney(available, "현재 사용 가능액");
        if (availableNow > remainingMonthlyBudget) throw new Error("현재 사용 가능액은 남은 상환 예산 이하여야 합니다.");
        const expectedIncome: PreparationFunding["expectedIncome"] = [];
        if (incomeDate || incomeAmount) {
            if (!incomeDate || !incomeAmount) throw new Error("예정 자금 날짜와 금액을 함께 입력하세요.");
            if (incomeDate <= seoulDate() || incomeDate.slice(0, 7) !== yearMonth) {
                throw new Error("예정 자금 날짜는 오늘 이후이며 대상 월 안이어야 합니다. 오늘 확보한 금액은 현재 사용 가능액에 포함하세요.");
            }
            const amount = parseMoney(incomeAmount, "예정 자금");
            if (amount <= 0) throw new Error("예정 자금은 0보다 커야 합니다.");
            expectedIncome.push({ availableDate: incomeDate, amount });
        }
        return { remainingMonthlyBudget, availableNow, expectedIncome };
    }
    function editConditions() {
        if (
            runningRef.current ||
            confirmationUncertain ||
            registered ||
            yearMonth !== seoulDate().slice(0, 7)
        ) {
            return;
        }

        invalidateProposal();
        preferencesRef.current?.focus();
        preferencesRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }

    async function generate() {
        if (runningRef.current || confirmationUncertain) return;

        let funding: PreparationFunding | null;

        try {
            if (allowedDays.length === 0) {
                throw new Error(
                    "가능한 요일을 하나 이상 선택하세요.",
                );
            }

            if (
                !windowStart ||
                !windowEnd ||
                windowStart >= windowEnd
            ) {
                throw new Error(
                    "종료 시간을 시작 시간보다 늦게 설정하세요.",
                );
            }

            if (
                !Number.isInteger(leadDays) ||
                leadDays < 0 ||
                leadDays > 14
            ) {
                throw new Error(
                    "준비 기한은 0~14일로 입력하세요.",
                );
            }

            funding = buildFunding();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "입력 조건을 확인하세요.",
            );

            return;
        }

        const controller = new AbortController();
        controllerRef.current = controller;

        runningRef.current = true;
        onInteractionLockChange(true);
        setBusy(true);
        invalidateProposal();

        try {
            const request = {
                yearMonth,
                allowedDays,
                windowStart,
                windowEnd,
                durationMinutes: REMINDER_DURATION_MINUTES,
                leadDays,
                preferences,
                funding,
            };

            const result = rescheduleEvent
                ? await createRescheduleProposal(
                    rescheduleEvent.eventId,
                    request,
                    controller.signal,
                )
                : await createProposal(
                    request,
                    controller.signal,
                );

            if (!controller.signal.aborted) {
                setProposal(result);
            }
        } catch (cause) {
            if (!controller.signal.aborted) {
                setError(
                    cause instanceof Error
                        ? cause.message
                        : "일정 제안을 생성하지 못했습니다.",
                );
            }
        } finally {
            runningRef.current = false;

            if (!controller.signal.aborted) {
                setBusy(false);
                onInteractionLockChange(false);
            }
        }
    }
    async function register() {
        if (
            runningRef.current ||
            registered ||
            proposal?.status !== "READY" ||
            !proposal.proposalId ||
            (
                yearMonth !== seoulDate().slice(0, 7) &&
                !confirmationUncertain
            )
        ) {
            return;
        }

        const controller = new AbortController();
        controllerRef.current = controller;

        runningRef.current = true;
        onInteractionLockChange(true);
        setBusy(true);
        setError(null);

        let succeeded = false;
        let uncertain = false;

        try {
            const result = await confirmProposal(
                proposal.proposalId,
                controller.signal,
            );

            if (controller.signal.aborted) return;

            setRegistered(true);
            setConfirmationUncertain(false);
            succeeded = true;

            setNotice(
                result.reused
                    ? "이미 승인된 결과를 확인했습니다."
                    : rescheduleEvent
                        ? "기존 확인 일정의 시각을 변경했습니다."
                        : `회차 ${result.events.length}건의 확인 일정을 등록했습니다.`,
            );
        } catch (cause) {
            if (controller.signal.aborted) return;

            if (
                cause instanceof PlanningApiError &&
                (
                    (cause.status === 404 &&
                        cause.code === "PROPOSAL_NOT_FOUND") ||
                    (cause.status === 409 &&
                        cause.code === "PROPOSAL_CHANGED") ||
                    (cause.status === 410 &&
                        cause.code === "PROPOSAL_EXPIRED")
                )
            ) {
                setProposal(null);
                setConfirmationUncertain(false);
            } else {
                uncertain = true;
                setConfirmationUncertain(true);
            }

            setError(
                cause instanceof Error
                    ? cause.message
                    : "승인 결과를 확인하지 못했습니다. 같은 제안의 승인 결과를 다시 확인하세요.",
            );
        } finally {
            runningRef.current = false;

            if (!controller.signal.aborted) {
                setBusy(false);
                onInteractionLockChange(uncertain);
            }
        }

        if (succeeded) {
            try {
                onRegistered();
            } catch {
                setError(
                    "승인은 완료했지만 캘린더를 갱신하지 못했습니다. 화면을 다시 조회하세요.",
                );
            }
        }
    }
    function resetConditions() {
        if (runningRef.current || confirmationUncertain) return;
        invalidateProposal(); setAllowedDays([...DEFAULT_DAYS]); setWindowStart("18:00"); setWindowEnd("21:00");
        setLeadDays(2); setPreferences(""); setUseFunding(false); setBudget(""); setAvailable(""); setIncomeDate(""); setIncomeAmount("");
    }
    const currentStep = registered ? 3 : proposal?.status === "READY" ? 2 : 1;
    const assessment = proposal?.fundingAssessment;
    const facts = proposal?.coordinationFacts;

    const requestedDayLabels = facts
        ? DAYS
            .filter((day) => facts.allowedDays.includes(day.value))
            .map((day) => day.label)
            .join("·")
        : "";

    return (
        <section className="preparation-planner preparation-planner--design" aria-busy={busy}>
            <div className="planner-heading">
        <span className="planner-heading__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" /></svg>
        </span>
                <div className="planner-heading__copy">
                    <h2>
                        {rescheduleEvent
                            ? "AI 상환 확인 일정 재조율"
                            : "AI 상환 확인 일정 제안"}
                    </h2>
                    <p>미상환 회차·시간 조건·입력한 예산을 고려합니다.</p>
                </div>
                <span className="planner-badge">AI 일정 조율</span>
            </div>
            <p className="planner-callout">확인 알림을 제안합니다. 승인 전에는 등록되지 않으며 실제 상환이나 계약 납기를 변경하지 않습니다.</p>
            {rescheduleEvent && !registered && (
                <div className="planner-callout">
                    <p>{rescheduleEvent.title}</p>

                    <p>
                        선택 당시 시각:{" "}
                        {displayTime(rescheduleEvent.startsAt)}
                    </p>

                    <p>
                        아래 조건으로 변경 시각을 제안받습니다.
                        승인 전에는 기존 일정이 유지됩니다.
                    </p>

                    <button
                        type="button"
                        disabled={busy || confirmationUncertain}
                        onClick={onRescheduleCancel}
                    >
                        재조율 취소
                    </button>
                </div>
            )}
            {yearMonth !== seoulDate().slice(0, 7) && (
                <p className="planner-callout" role="status">
                    신규 제안은 이번 달에만 생성할 수 있습니다.
                    {confirmationUncertain
                        ? " 기존 제안의 승인 결과는 아래 버튼으로 다시 확인하세요."
                        : " 이번 달로 이동한 뒤 제안받아 주세요."}
                </p>
            )}
            {!registered && yearMonth === seoulDate().slice(0, 7) && (
            <form onSubmit={(event) => { event.preventDefault(); void generate(); }}>
                <fieldset className="planner-fields" disabled={busy || confirmationUncertain}>
                    <legend className="planner-sr-only">상환 확인 일정 조건</legend>
                    <div className="planner-field">
                        <span className="planner-field__label">확인 가능한 요일</span>
                        <div className="planner-days">{DAYS.map((day) => (
                            <button key={day.value} type="button" className={`planner-day ${allowedDays.includes(day.value) ? "planner-day--selected" : ""}`} aria-pressed={allowedDays.includes(day.value)} onClick={() => toggleDay(day.value)}>
                                <span>{day.label}</span><span className="planner-day__dot" aria-hidden="true" />
                            </button>
                        ))}</div>
                    </div>
                    <div className="planner-field-grid">
                        <label className="planner-field"><span className="planner-field__label">가능 시간 시작</span><input type="time" required value={windowStart} onChange={(e) => { invalidateProposal(); setWindowStart(e.target.value); }} /></label>
                        <label className="planner-field"><span className="planner-field__label">가능 시간 종료</span><input type="time" required value={windowEnd} onChange={(e) => { invalidateProposal(); setWindowEnd(e.target.value); }} /></label>
                    </div>
                    <div className="planner-preferences">
                        <label className="planner-field">
                            <span className="planner-field__label">
                                어떻게 일정을 조율할까요?
                                <span className="planner-optional">선택</span>
                            </span>

                            <textarea
                                ref={preferencesRef}
                                maxLength={1000}
                                value={preferences}
                                placeholder="예: 여러 회차를 같은 날에 모아줘. 납기가 먼저인 건 따로 알려줘."
                                onChange={(event) => {
                                    invalidateProposal();
                                    setPreferences(event.target.value);
                                }}
                            />
                        </label>

                        <div
                            className="planner-preference-examples"
                            aria-label="조율 요청 예시"
                        >
                            {PREFERENCE_EXAMPLES.map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => {
                                        invalidateProposal();
                                        setPreferences(example);
                                        preferencesRef.current?.focus();
                                    }}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>

                        <p className="planner-field-help">
                            요일·가능 시간·확인 기한을 우선 지킵니다.
                            추가 요청은 그 범위 안에서 조율하며,
                            제한된 요청은 회차별 선택 이유에서 설명합니다.
                        </p>
                    </div>
                    <details className="planner-advanced">
                        <summary>확인 기한 설정 <span>납기 {Number.isFinite(leadDays) ? leadDays : "미입력"}일 전까지</span></summary>
                        <label className="planner-field"><span className="planner-field__label">납기 며칠 전까지 확인할까요?</span><span className="planner-input-unit"><input type="number" min={0} max={14} required value={Number.isFinite(leadDays) ? leadDays : ""} onChange={(e) => { invalidateProposal(); setLeadDays(e.target.value === "" ? Number.NaN : Number(e.target.value)); }} /><span>일 전</span></span><small className="planner-field-help">정상 납기 회차에 적용합니다. 연체 회차는 앞으로 가능한 시간에 확인합니다.</small></label>
                    </details>
                    <div className="planner-funding">
                        <label className="planner-funding-toggle"><input type="checkbox" checked={useFunding} onChange={(e) => { invalidateProposal(); setUseFunding(e.target.checked); }} /><span>예산과 예정 자금을 함께 고려하기</span></label>
                        {useFunding && <>
                            <p className="planner-field-help">이미 상환한 금액을 제외한 남은 예산을 입력하세요. 현재 확보한 자금과 앞으로 확보할 자금을 구분합니다.</p>
                            <div className="planner-field-grid">
                                <label className="planner-field"><span className="planner-field__label">이번 달 남은 상환 예산</span><input type="number" min={0} max={999999999999.99} step="0.01" required value={budget} onChange={(e) => { invalidateProposal(); setBudget(e.target.value); }} /></label>
                                <label className="planner-field"><span className="planner-field__label">현재 사용 가능액</span><input type="number" min={0} max={999999999999.99} step="0.01" required value={available} onChange={(e) => { invalidateProposal(); setAvailable(e.target.value); }} /></label>
                                <label className="planner-field"><span className="planner-field__label">예정 자금 확보 날짜 · 선택</span><input type="date" value={incomeDate} min={seoulDate()} onChange={(e) => { invalidateProposal(); setIncomeDate(e.target.value); }} /></label>
                                <label className="planner-field"><span className="planner-field__label">상환용 예정 자금 · 선택</span><input type="number" min={0.01} max={999999999999.99} step="0.01" value={incomeAmount} onChange={(e) => { invalidateProposal(); setIncomeAmount(e.target.value); }} /></label>
                            </div>
                        </>}
                    </div>
                    <p className="planner-callout planner-callout--time">한국 시간(KST) 기준입니다. 서로 다른 회차는 같은 시각에 묶을 수 있으며 같은 회차의 중복 등록은 막습니다.</p>
                    <ol className="planner-steps" aria-label="일정 등록 단계">{[{ number: 1, title: "조건 입력" }, { number: 2, title: "제안 확인" }, { number: 3, title: "일정 등록" }].map((step) => (
                        <li key={step.number} className={`planner-step ${currentStep === step.number ? "planner-step--active" : ""}`} aria-current={currentStep === step.number ? "step" : undefined}><span className="planner-step__number">{step.number}</span><strong>{step.title}</strong><small>{currentStep === step.number ? "현재 단계" : currentStep > step.number ? "완료" : "다음 단계"}</small></li>
                    ))}</ol>
                    <button
                        className="planner-primary"
                        type="submit"
                    >
                        {busy
                            ? "처리 중…"
                            : rescheduleEvent
                                ? "→ 변경 시각 제안받기"
                                : "→ 일정 제안받기"}
                    </button>
                    <button className="planner-secondary" type="button" onClick={resetConditions}>입력 조건 초기화</button>
                </fieldset>
            </form>
            )}
            {busy && (
                <p className="planner-status-text" role="status">
                    일정 제안 또는 등록을 처리하고 있습니다.
                </p>
            )}

            {error && (
                <p className="planner-status-text" role="alert">
                    {error}
                </p>
            )}

            {notice && (
                <p className="planner-status-text" role="status">
                    {notice}
                </p>
            )}

            {confirmationUncertain && (
                <p className="planner-status-text" role="status">
                    등록 여부를 아직 확인하지 못했습니다.
                    아래 버튼으로 같은 제안의 등록 결과를 다시 확인하세요.
                </p>
            )}
            {assessment && <div className="planner-funding-result">
                <h3>입력한 예산 기준 자금 점검</h3>
                <dl><div><dt>전체 관리 대상 미상환액</dt><dd>{money(assessment.totalRequiredAmount)}</dd></div><div><dt>남은 상환 예산</dt><dd>{money(assessment.remainingMonthlyBudget)}</dd></div><div><dt>예산 부족액</dt><dd>{money(assessment.budgetShortfall)}</dd></div></dl>
                <p className="planner-field-help">{assessment.analysisDate} 기준이며 등록된 확인 일정의 회차도 포함합니다. 예정 자금이 입력한 날짜에 확보된다는 가정입니다.</p>
                {assessment.deadlines.some((d) => d.shortfall > 0) && <ul>{assessment.deadlines.filter((d) => d.shortfall > 0).map((d) => <li key={d.date}>{d.date}까지 누적 필요액 {money(d.cumulativeRequiredAmount)} · 예상 부족액 {money(d.shortfall)}</li>)}</ul>}
            </div>}
            {proposal && <div className="preparation-planner__result">
                {!registered && (
                    <p className="planner-status-text">
                        {proposal.message}
                    </p>
                )}
                {facts && (
                    <section
                        className="planner-coordination"
                        aria-label="조회 사실과 조율 결과"
                    >
                        <h3>확인한 대상과 요청 조건</h3>

                        <dl className="planner-coordination__facts">
                            <div>
                                <dt>전체 관리 대상 미상환 회차</dt>
                                <dd>{facts.outstandingScheduleCount}건</dd>
                            </div>
                            <div>
                                <dt>조회 범위의 기존 준비 일정</dt>
                                <dd>{facts.existingPreparationEventCount}건</dd>
                            </div>
                            <div>
                                <dt>
                                    {facts.reschedule
                                        ? "이번 재조율 대상"
                                        : "이번 신규 제안 대상"}
                                </dt>
                                <dd>{facts.targetScheduleCount}건</dd>
                            </div>
                        </dl>

                        <p className="planner-coordination__conditions">
                            필수 조건: {requestedDayLabels}
                            {" · "}
                            {facts.windowStart.slice(0, 5)}
                            {" ~ "}
                            {facts.windowEnd.slice(0, 5)}
                            {" · 정상 납기 "}
                            {facts.leadDays}일 전까지 확인
                        </p>

                        {facts.requestedPreferences && (
                            <div className="planner-coordination__request">
                                <strong>입력한 조율 요청</strong>
                                <p>{facts.requestedPreferences}</p>
                            </div>
                        )}
                        {!registered &&
                            !confirmationUncertain &&
                            yearMonth === seoulDate().slice(0, 7) && (
                            <button
                                type="button"
                                className="planner-secondary"
                                disabled={busy}
                                onClick={editConditions}
                            >
                                조건 수정 후 다시 제안받기
                            </button>
                        )}
                        {proposal.status === "READY" && (
                            <>
                                <h3>검증된 조율 결과</h3>

                                <p>
                                    {facts.proposedScheduleCount}개 회차의
                                    확인 시각이 필수 조건 검증을 통과했습니다.
                                </p>

                                <p>
                                    {facts.sharedTimeGroupCount > 0
                                        ? `${facts.groupedScheduleCount}개 회차를 ${facts.sharedTimeGroupCount}개 시각에 묶었습니다.`
                                        : "같은 시각에 묶인 회차는 없습니다."}
                                </p>

                                <p className="planner-field-help">
                                    자연어 선호의 반영 내용과 제한된 이유는
                                    아래 회차별 선택 이유를 확인하세요.
                                    예산과 예정 자금은 별도의 서버 계산 결과입니다.
                                </p>
                            </>
                        )}
                    </section>
                )}
                {proposal.violations.length > 0 && (
                    <ul className="planner-validation-messages">
                        {proposal.violations.map((violation, index) => (
                            <li key={`${violation.code}-${index}`}>
                                {violation.message}
                            </li>
                        ))}
                    </ul>
                )}
                {proposal.status === "READY" && <>
                    <ol className="planner-proposals">{proposal.items.map((item) => <li key={item.scheduleId}>
                        <h3>{item.contractName ?? "상환 확인"}</h3><p>미상환액 {money(item.remainingAmount)} · 납기 {item.dueDate}</p>
                        {proposal.rescheduleTarget && (
                            <p>
                                변경 전:{" "}
                                {displayTime(
                                    proposal.rescheduleTarget.startsAt,
                                )}
                            </p>
                        )}

                        <p>
                            {proposal.rescheduleTarget ? "변경 후: " : ""}
                            {displayTime(item.startsAt)} 확인 알림
                        </p>
                        <div className="planner-proposal-reason">
                            <strong>이 시각을 제안한 이유</strong>
                            <p>{item.reason}</p>
                        </div>
                    </li>)}</ol>
                    {proposal.expiresAt && !registered && <p>승인 가능 시각: {displayTime(proposal.expiresAt)}까지</p>}
                    <button
                        type="button"
                        className="planner-primary"
                        disabled={
                            busy ||
                            registered ||
                            (
                                yearMonth !== seoulDate().slice(0, 7) &&
                                !confirmationUncertain
                            )
                        }
                        onClick={() => void register()}
                    >
                        {registered
                            ? "승인 완료"
                            : confirmationUncertain
                                ? "승인 결과 다시 확인"
                                : proposal.rescheduleTarget
                                    ? "기존 확인 일정 변경 승인"
                                    : `회차 ${proposal.items.length}건 확인 일정 등록하기`}
                    </button>

                    {registered && (
                        <button
                            type="button"
                            className="planner-secondary"
                            onClick={returnToNewProposal}
                        >
                            새 일정 제안으로 돌아가기
                        </button>
                    )}
                </>}
            </div>}
        </section>
    );
}