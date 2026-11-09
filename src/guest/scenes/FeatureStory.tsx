import type { CSSProperties, ReactNode } from 'react';
import BrowserFrame from '../components/BrowserFrame';
import { scrollToSceneStep, useScrollScene } from '../hooks/useScrollScene';
import styles from './FeatureStory.module.css';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const STEPS = [
  {
    tab: '정산',
    nav: 1,
    path: '/settlements/12',
    eyebrow: '공동정산',
    title: '누가 냈는지\n더는 묻지 않아도 돼요',
    description:
      '모임 회비, 여행 경비, 가족 생활비까지. 금액과 참여자만 정하면 분담 금액을 나누고, 참여자별 입금 현황과 입금률을 한 화면에서 보여줘요.',
    points: ['1/N 또는 직접 정한 금액으로 분배', '매달 돌아오는 회비는 정기 정산으로'],
  },
  {
    tab: '차용증',
    nav: 2,
    path: '/contracts/8/sign',
    eyebrow: '전자 차용증',
    title: '가까운 사이일수록\n약속은 더 분명하게',
    description:
      '원금과 이자, 상환일을 정하고 두 사람이 전자서명하면 끝. 서명한 계약서는 보관함에 안전하게 남고 언제든 PDF로 꺼내 볼 수 있어요.',
    points: ['어려운 특약은 AI 조항 도우미가 함께 작성', '가족 간 거래는 증여세 위험까지 미리 진단'],
  },
  {
    tab: '입금 확인',
    nav: 0,
    path: '/transactions',
    eyebrow: '입금 자동 확인',
    title: '통장을 열어보지 않아도\n정산이 알아서 맞춰져요',
    description:
      '연결한 계좌의 거래내역을 불러와 정산과 차용증에 자동으로 연결해요. 애매한 입금만 골라서 어디에 반영할지 물어봐요.',
    points: ['금액이 정확히 일치하면 자동 반영', '부분입금·초과입금도 구분해서 표시'],
  },
  {
    tab: '캘린더',
    nav: 3,
    path: '/calendar',
    eyebrow: '상환 캘린더',
    title: '한 달의 돈 약속을\n달력 하나로',
    description:
      '받을 일정과 보낼 일정을 한 달 달력에 모아 보여주고, 정산 마감일이나 상환일이 다가오면 미리 알려드려요.',
    points: ['받을 돈은 파란색, 보낼 돈은 빨간색', '연체된 일정은 따로 표시'],
  },
] as const;

const NAV = ['대시보드', '정산', '금전소비대차', '캘린더'];

/** 헤더 메뉴(정산·금전소비대차·캘린더)가 이 장면의 해당 단계로 이동하도록 두는 위치 표시 */
const ANCHORS = [
  { id: 'settlement', step: 0 },
  { id: 'iou', step: 1 },
  { id: 'calendar', step: 3 },
];

const PARTICIPANTS = [
  { name: '김신한', share: '210,000', paid: '210,000', done: true },
  { name: '이몽룡', share: '210,000', paid: '210,000', done: true },
  { name: '이영희', share: '210,000', paid: '210,000', done: true },
  { name: '성춘향', share: '210,000', paid: '0', done: false },
];

const TRANSACTIONS = [
  { name: '김신한', memo: '제주 회비', amount: '+210,000', state: '확인 필요', pending: true },
  { name: '이몽룡', memo: '5월 상환', amount: '+500,000', state: '반영 완료' },
  { name: '이영희', memo: '제주 회비', amount: '+210,000', state: '반영 완료' },
  { name: '성춘향', memo: '체크카드', amount: '-6,800', state: '' },
];

/** 2026년 8월 (1일이 토요일) */
const CELLS = Array.from({ length: 35 }, (_, i) => i - 5).map((d) => (d >= 1 && d <= 31 ? d : null));
const EVENTS: Record<number, 'get' | 'give' | 'late'> = { 3: 'give', 9: 'get', 17: 'give', 19: 'get', 25: 'get', 28: 'late' };

const lines = (text: string) =>
  text.split('\n').map((line, index) => (
    <span key={index}>
      {index > 0 && <br />}
      {line}
    </span>
  ));

function AppChrome({ nav, children }: { nav: number; children: ReactNode }) {
  return (
    <div className={styles.app}>
      <div className={styles.appHeader}>
        <span className={styles.appBrand}>
          <i />
          사이원장
        </span>
        {NAV.map((item, index) => (
          <span key={item} className={index === nav ? styles.navOn : ''}>
            {item}
          </span>
        ))}
        <span className={styles.appIcons}>
          <i />
          <i />
        </span>
      </div>
      <div className={styles.appBody}>{children}</div>
    </div>
  );
}

/**
 * 핵심 기능 네 가지. 화면은 고정된 채로 스크롤하면
 * 왼쪽 설명과 오른쪽 웹 화면이 단계별로 바뀐다.
 * 오른쪽 화면은 실제 페이지 구성을 본뜬 그림이라, 실제 캡처가 생기면 이미지로 바꿔도 된다.
 */
export default function FeatureStory() {
  const ref = useScrollScene<HTMLElement>({ steps: STEPS.length });

  return (
    <section ref={ref} className={styles.scene} data-step="0" aria-label="핵심 기능">
      {ANCHORS.map((anchor) => (
        <span
          key={anchor.id}
          id={anchor.id}
          className={styles.anchor}
          style={{ '--k': anchor.step } as Vars}
          aria-hidden="true"
        />
      ))}
      <div className={styles.stage}>
        <div className={styles.inner}>
          <div className={styles.copyCol}>
            <div className={styles.tabs} role="tablist" aria-label="기능">
              {STEPS.map((step, index) => (
                <button
                  key={step.tab}
                  type="button"
                  role="tab"
                  className={styles.tab}
                  style={{ '--k': index } as Vars}
                  onClick={() => scrollToSceneStep(ref.current, index, STEPS.length)}
                >
                  <span>{step.tab}</span>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className={styles.copies}>
              {STEPS.map((step, index) => (
                <article key={step.tab} className={styles.copy} style={{ '--k': index } as Vars}>
                  <p className={styles.eyebrow}>{step.eyebrow}</p>
                  <h2>{lines(step.title)}</h2>
                  <p className={styles.description}>{step.description}</p>
                  <ul className={styles.points}>
                    {step.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.deviceCol} aria-hidden="true">
            {STEPS.map((step, index) => (
              <div key={step.tab} className={styles.screen} style={{ '--k': index } as Vars}>
                <BrowserFrame path={step.path}>
                  {index === 0 && (
                    <AppChrome nav={step.nav}>
                      <div className={styles.pageHead}>
                        <div>
                          <small>정산 요청 정보</small>
                          <b>제주 여행 회비</b>
                        </div>
                        <span className={styles.pillGreen}>진행 중</span>
                      </div>
                      <div className={styles.tiles}>
                        <div>
                          <small>전체 지출 합계</small>
                          <b>840,000원</b>
                        </div>
                        <div>
                          <small>입금 완료 금액</small>
                          <b className={styles.green}>630,000원</b>
                        </div>
                        <div>
                          <small>잔여 금액</small>
                          <b>210,000원</b>
                        </div>
                        <div>
                          <small>입금률</small>
                          <b>75%</b>
                          <span className={styles.rateBar}>
                            <i />
                          </span>
                        </div>
                      </div>
                      <p className={styles.tableTitle}>참여자별 입금 현황</p>
                      <div className={styles.table}>
                        <div className={styles.tHead}>
                          <span>참여자</span>
                          <span>분담 금액</span>
                          <span>입금 금액</span>
                          <span>입금 상태</span>
                        </div>
                        {PARTICIPANTS.map((p, i) => (
                          <div key={p.name} className={styles.tRow} style={{ '--r': i } as Vars}>
                            <span>
                              <em className={styles.avatar}>{p.name.slice(1, 2)}</em>
                              {p.name}
                            </span>
                            <span>{p.share}원</span>
                            <span>{p.paid}원</span>
                            <span>
                              <em className={p.done ? styles.pillGreen : styles.pillGray}>
                                {p.done ? '완료' : '미입금'}
                              </em>
                            </span>
                          </div>
                        ))}
                      </div>
                    </AppChrome>
                  )}

                  {index === 1 && (
                    <AppChrome nav={step.nav}>
                      <div className={styles.contract}>
                        <p className={styles.docTitle}>금전소비대차 계약서</p>
                        <dl className={styles.docTerms}>
                          <div>
                            <dt>제1조 (원금)</dt>
                            <dd>금 5,000,000원</dd>
                          </div>
                          <div>
                            <dt>제2조 (이자)</dt>
                            <dd>연 5.0%</dd>
                          </div>
                          <div>
                            <dt>제3조 (변제기)</dt>
                            <dd>2028년 5월 20일</dd>
                          </div>
                          <div>
                            <dt>제6조 (연체 위약금)</dt>
                            <dd>
                              <span className={styles.aiChip}>S-AI 작성</span>
                            </dd>
                          </div>
                        </dl>
                        <div className={styles.signs}>
                          {[
                            ['채권자 (갑)', '김신한'],
                            ['채무자 (을)', '이영희'],
                          ].map(([role, name], i) => (
                            <div key={role} className={styles.sign} style={{ '--r': i } as Vars}>
                              <small>{role}</small>
                              <b>{name}</b>
                              <svg viewBox="0 0 120 40">
                                <path d="M6 28c10-20 18-24 20-12s-6 18 2 10 14-22 20-8-2 16 8 4 12-8 18-1 10 3 18-5 12-3 20-1" />
                              </svg>
                            </div>
                          ))}
                        </div>
                        <div className={styles.stamp}>✓ 양자 서명 완료 · 보관함에 저장됨</div>
                      </div>
                    </AppChrome>
                  )}

                  {index === 2 && (
                    <AppChrome nav={step.nav}>
                      <div className={styles.pageHead}>
                        <div>
                          <small>연결된 계좌의 거래내역을 확인할 수 있습니다.</small>
                          <b>거래내역</b>
                        </div>
                        <span className={styles.sync}>
                          <i /> 최근 동기화 방금
                        </span>
                      </div>
                      <div className={styles.txList}>
                        {TRANSACTIONS.map((t, i) => (
                          <div key={t.name} className={styles.tx} style={{ '--r': i } as Vars}>
                            <b>{t.name}</b>
                            <small>{t.memo}</small>
                            <strong className={t.amount.startsWith('+') ? styles.blue : ''}>
                              {t.amount}원
                            </strong>
                            {t.state && (
                              <em className={'pending' in t ? styles.pillAmber : styles.pillGreen}>
                                {t.state}
                              </em>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className={styles.match}>
                        <p className={styles.matchTitle}>정산·차용증 매칭 선택</p>
                        <p className={styles.matchSub}>이영희 · +210,000원 입금</p>
                        <div className={styles.candidate}>
                          <span className={styles.radio} />
                          <div>
                            <b>
                              <em className={styles.tagSettle}>정산</em> 제주 여행 회비
                            </b>
                            <small>참여자 이영희 · 예정 잔여금액 210,000원</small>
                          </div>
                          <em className={styles.pillGreen}>정확히 일치</em>
                        </div>
                        <div className={styles.matchBtn}>선택하여 반영</div>
                      </div>
                    </AppChrome>
                  )}

                  {index === 3 && (
                    <AppChrome nav={step.nav}>
                      <div className={styles.calWrap}>
                        <div className={styles.cal}>
                          <div className={styles.calHead}>
                            <b>2026년 8월</b>
                            <span className={styles.legend}>
                              <i className={styles.get} /> 받을 일정
                              <i className={styles.give} /> 보낼 일정
                            </span>
                          </div>
                          <div className={styles.week}>
                            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                              <span key={d}>{d}</span>
                            ))}
                          </div>
                          <div className={styles.month}>
                            {CELLS.map((d, i) => (
                              <span
                                key={i}
                                className={`${d === 17 ? styles.selected : ''} ${
                                  d && EVENTS[d] ? styles[EVENTS[d]] : ''
                                }`}
                                style={{ '--r': i } as Vars}
                              >
                                {d ?? ''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className={styles.dayPanel}>
                          <b>8월 17일 (월)</b>
                          <div className={styles.dayItem}>
                            <em className={styles.pillRed}>보낼 일정</em>
                            <strong>500,000원</strong>
                            <small>보증금 상환 · 이영희님께</small>
                          </div>
                          <div className={`${styles.dayItem} ${styles.dim}`}>
                            <em className={styles.pillBlue}>받을 일정</em>
                            <strong>210,000원</strong>
                            <small>8월 19일 · 간병비 정산</small>
                          </div>
                        </div>
                      </div>
                      <div className={styles.toast}>
                        <span className={styles.toastIcon} />
                        <div>
                          <b>내일은 보증금 상환일이에요</b>
                          <small>이영희님께 500,000원</small>
                        </div>
                      </div>
                    </AppChrome>
                  )}
                </BrowserFrame>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
