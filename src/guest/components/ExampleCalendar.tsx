import { useState } from 'react';
import { Button } from '../../common/components/Button';
import RevealText from './RevealText';
import styles from '../IntroPage.module.css';

const EVENTS = [
  { day: 3, label: '월세 납부일', tone: 'red' },
  { day: 9, label: '가족 회비 정산', tone: 'blue' },
  { day: 17, label: '보증금 상환일', tone: 'red' },
  { day: 19, label: '간병비 정산', tone: 'orange' },
  { day: 25, label: '여행 회비 정산', tone: 'blue' },
];

export default function ExampleCalendar() {
  const [month, setMonth] = useState(() => new Date(2026, 7, 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + lastDay) / 7) * 7;
  const shift = (offset: number) =>
    setMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));

  return (
    <section id="calendar" className={styles['calendar-section']} aria-label="일정 소개">
      <RevealText
        as="p"
        className={`${styles.eyebrow} ${styles.green} ${styles.centered}`}
        text="정산과 상환 일정을 한눈에"
      />
      <RevealText
        as="h2"
        className={styles.centered}
        text={'한 달의 돈 약속을\n달력 하나로 확인하세요'}
      />
      <div className={styles['calendar-layout']}>
        <div className={styles['calendar-card']}>
          <div className={styles['calendar-head']}>
            <strong aria-live="polite">
              {year}년 {monthIndex + 1}월
            </strong>
            <Button variant="text" controlSize="sm" aria-label="이전 달" onClick={() => shift(-1)}>
              ‹
            </Button>
            <Button variant="text" controlSize="sm" aria-label="다음 달" onClick={() => shift(1)}>
              ›
            </Button>
          </div>
          <div
            className={styles.calendarScroll}
            tabIndex={0}
            role="region"
            aria-label="월별 달력, 좁은 화면에서 가로 스크롤"
          >
            <div className={styles.weekdays}>
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <b key={day}>{day}</b>
              ))}
            </div>
            <div className={styles['calendar-grid']}>
              {Array.from({ length: cellCount }, (_, index) => {
                const date = new Date(year, monthIndex, index - firstDay + 1);
                const inMonth = date.getMonth() === monthIndex;
                const event = inMonth
                  ? EVENTS.find((item) => item.day === date.getDate())
                  : undefined;
                return (
                  <div key={index} className={`${styles.day} ${!inMonth ? styles.muted : ''}`}>
                    <span>{date.getDate()}</span>
                    {event && (
                      <div className={`${styles.event} ${styles[event.tone]}`}>{event.label}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className={styles.upcoming}>
          <h3>다가오는 일정</h3>
          {EVENTS.map((event) => (
            <div key={event.day} className={`${styles['upcoming-item']} ${styles[event.tone]}`}>
              <b>{event.day}</b>
              <span>{event.label}</span>
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}
