import { Link } from 'react-router-dom';
import AppImage from '../common/components/AppImage';
import RevealText from './components/RevealText';
import ExampleCalendar from './components/ExampleCalendar';
import styles from './IntroPage.module.css';

const c = (names: string) =>
  names
    .split(' ')
    .map((name) => styles[name])
    .join(' ');

export default function IntroPage() {
  return (
    <div className={styles.page}>
      <section id="intro" className={c('hero is-open')}>
        <div className={c('hero-copy')}>
          <h1>
            당신의 거래는 어떤
            <br />
            <em>이야기</em>를 담고 있나요?
          </h1>
          <p>
            단순한 숫자 뒤에 숨겨진 신뢰와 약속의 흐름
            <br />
            사이원장이 그 복잡한 과정을 명료한 서사로 풀어냅니다
          </p>
        </div>
        <div className={c('blob blob-a')} aria-hidden="true"></div>
        <div className={c('blob blob-b')} aria-hidden="true"></div>
        <div className={c('blob blob-c')} aria-hidden="true"></div>
        <div className={c('blob blob-d')} aria-hidden="true"></div>
        <div className={c('blob blob-e')} aria-hidden="true"></div>
        <div className={c('blob blob-f')} aria-hidden="true"></div>
        <div className={c('hero-card card-settlement')}>
          <AppImage src="/images/guest/settlement.avif" alt="공동정산" width={288} height={231} />
          <span>정산</span>
        </div>
        <div className={c('hero-card card-iou')}>
          <AppImage
            src="/images/guest/loan-agreement.avif"
            alt="금전소비대차"
            width={360}
            height={289}
          />
          <span>금전소비대차</span>
        </div>
        <div className={c('hero-card card-diagnosis')}>
          <AppImage
            src="/images/guest/safety-diagnosis.avif"
            alt="안심거래진단"
            width={324}
            height={260}
          />
          <span>안심거래진단</span>
        </div>
        <div className={c('hero-card card-calendar')}>
          <AppImage src="/images/guest/schedule.avif" alt="거래일정" width={265} height={216} />
          <span>거래일정</span>
        </div>
      </section>

      <section id="settlement" className={c('split-section white one-place')}>
        <div className={c('section-copy')}>
          <RevealText as="p" className={c('eyebrow green')} text={'돈 관계를 한눈에'} />
          <RevealText as="h2" text={'정산부터 차용증까지\n한 곳에서 관리하세요'} />
          <RevealText
            as="p"
            className={c('description')}
            text={
              '누가 얼마를 냈는지, 다음 상환일은 언제인지\n복잡한 돈의 흐름을 사이원장이 또렷하게 정리해 드려요.'
            }
          />
        </div>
        <div className={c('summary-card feature-card')}>
          <h3>오늘의 사이원장</h3>
          <p className={c('muted')}>함께 관리 중인 금액</p>
          <strong>6,340,000원</strong>
          <div className={c('summary-row')}>
            <span>공동정산</span>
            <b className={c('green-text')}>840,000원</b>
          </div>
          <div className={c('summary-row')}>
            <span>차용증</span>
            <b className={c('blue-text')}>5,000,000원</b>
          </div>
          <div className={c('summary-row')}>
            <span>이번 달 예정</span>
            <b className={c('red-text')}>500,000원</b>
          </div>
        </div>
        <AppImage
          className={c('person-img person-one')}
          src="/images/guest/character-settlement.avif"
          alt="정산 캐릭터"
          width={818}
          height={1024}
          loading="lazy"
          decoding="async"
        />
      </section>

      <section id="iou" className={c('split-section pale')}>
        <div className={c('iou-card feature-card')}>
          <p className={c('eyebrow green')}>전자 차용증</p>
          <strong>5,000,000원</strong>
          <p className={c('muted')}>한민엽님이 박채연님에게 빌려준 금액</p>
          <hr />
          <div className={c('detail')}>
            <span>이자율</span>
            <b>연 5.0%</b>
          </div>
          <div className={c('detail')}>
            <span>상환일</span>
            <b>2028. 05. 20</b>
          </div>
          <div className={c('detail')}>
            <span>서명 상태</span>
            <b className={c('green-text')}>양자 서명 완료</b>
          </div>
          <div className={c('safe-box')}>✓&nbsp; 안전하게 보관된 전자계약이에요</div>
        </div>
        <div className={c('section-copy')}>
          <RevealText as="p" className={c('eyebrow green')} text={'가까운 사이일수록'} />
          <RevealText as="h2" text={'약속은 더 분명하게\n남겨두세요'} />
          <RevealText
            as="p"
            className={c('description')}
            text={
              '원금과 이자, 상환일을 간편하게 정하고\n두 사람이 서명한 계약을 안전하게 보관해요.'
            }
          />
        </div>
      </section>

      <section className={c('split-section pale diagnosis-section')}>
        <div className={c('diagnosis-card feature-card')}>
          <h3>안심거래진단</h3>
          <p className={c('muted')}>계약 조건을 확인하고 있어요</p>
          <div className={c('diagnosis-result-title')}>거래 진단 결과</div>
          <div className={c('diagnosis-summary')}>4개 항목 중 2개 확인 필요</div>
          <div className={c('check-row')}>
            <b>이자율 확인</b>
            <span>안전</span>
            <small>연 5.0% · 적정 범위</small>
          </div>
          <div className={c('check-row warning')}>
            <b>가족간 증여세 진단</b>
            <span>확인 필요</span>
            <small>증여로 판단될 가능성 확인</small>
          </div>
          <div className={c('check-row')}>
            <b>상환 계획</b>
            <span>안전</span>
            <small>매월 20일 자동 안내</small>
          </div>
          <div className={c('check-row warning')}>
            <b>증빙 자료</b>
            <span>확인 필요</span>
            <small>송금 내역·차용증 보관</small>
          </div>
        </div>
        <div className={c('section-copy')}>
          <RevealText as="p" className={c('eyebrow green')} text={'차용증 작성 전'} />
          <RevealText as="h2" text={'안심거래진단으로\n한 번 더 확인하세요'} />
          <RevealText
            as="p"
            className={c('description')}
            text={'입력한 금액과 이자율, 상환 계획을 바탕으로\n확인할 항목을 미리 알려드려요.'}
          />
        </div>
        <AppImage
          className={c('person-img person-two')}
          src="/images/guest/character-diagnosis.avif"
          alt="거래 진단 캐릭터"
          width={818}
          height={1024}
          loading="lazy"
          decoding="async"
        />
      </section>

      <section className={c('split-section pale auto-match')}>
        <div className={c('activity-card feature-card')}>
          <h3>입금 내역</h3>
          <p className={c('muted')}>최근 거래가 자동으로 반영됐어요</p>
          <div className={c('activity-list')}>
            <div>
              <b>한민엽</b>
              <strong>+210,000원</strong>
              <small>오늘 14:20</small>
              <i>매칭 완료</i>
            </div>
            <div>
              <b>박채연</b>
              <strong>+170,000원</strong>
              <small>어제 19:45</small>
              <i>매칭 완료</i>
            </div>
            <div>
              <b>양예은</b>
              <strong>+80,000원</strong>
              <small>오늘 11:10</small>
              <i className={c('needs')}>확인 필요</i>
            </div>
            <div>
              <b>지인진</b>
              <strong>+210,000원</strong>
              <small>어제 10:15</small>
              <i className={c('needs')}>확인 필요</i>
            </div>
            <div>
              <b>박채빈</b>
              <strong>+140,000원</strong>
              <small>어제 10:15</small>
              <i className={c('needs')}>확인 필요</i>
            </div>
          </div>
        </div>
        <div className={c('section-copy')}>
          <RevealText as="p" className={c('eyebrow blue')} text={'입금 내역 자동 확인'} />
          <RevealText
            as="h2"
            text={'통장을 열어보지 않아도\n동기화 한번에\n정산이 알아서 맞춰져요'}
          />
          <RevealText
            as="p"
            className={c('description')}
            text={
              '연동한 계좌의 입금 내역을 확인해\n정산 대상과 자동으로 연결하고 상태를 업데이트해요.'
            }
          />
        </div>
      </section>

      <ExampleCalendar />

      <section className={c('cta')}>
        <div className={c('cta-panel')}>
          <p className={c('eyebrow green centered')}>복잡했던 돈 관계</p>
          <h2>
            이제 사이원장에서
            <br />
            가볍게 시작하세요
          </h2>
          <p>번거로운 정산부터 차용증, 입금 확인까지 모두 한 곳에서 관리하세요.</p>
          <Link className={c('cta-button')} to="/login">
            사이원장 시작하기
          </Link>
        </div>
      </section>
    </div>
  );
}
