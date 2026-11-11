import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { privacyPolicy } from './content/privacyPolicy';
import { termsOfService } from './content/termsOfService';
import type { LegalBlock, LegalDocument, LegalListItem } from './types';
import { LEGAL_LINKS, SERVICE_NAME } from './constants';
import styles from './LegalPage.module.css';

const DOCUMENTS: Record<string, LegalDocument> = {
  '/terms': termsOfService,
  '/privacy': privacyPolicy,
};

// 〔 〕로 감싼 미확정 값을 강조 표시한다.
function renderText(text: string): ReactNode {
  return text.split(/(〔[^〕]*〕)/).map((part, index) =>
    part.startsWith('〔') ? (
      <mark key={index} className={styles.placeholder}>
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

function ListItem({ item }: { item: LegalListItem }) {
  if (typeof item === 'string') return <li>{renderText(item)}</li>;
  return (
    <li>
      {renderText(item.text)}
      <ul className={styles.subList}>
        {item.children.map((child) => (
          <li key={child}>{renderText(child)}</li>
        ))}
      </ul>
    </li>
  );
}

function Block({ block }: { block: LegalBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className={styles.paragraph}>{renderText(block.text)}</p>;
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={block.ordered ? styles.orderedList : styles.list}>
          {block.items.map((item) => (
            <ListItem key={typeof item === 'string' ? item : item.text} item={item} />
          ))}
        </ListTag>
      );
    }
    case 'contact':
      return (
        <div className={styles.contactGrid}>
          {block.groups.map((group) => (
            <div key={group.title} className={styles.contactCard}>
              <strong className={styles.contactTitle}>{group.title}</strong>
              <dl className={styles.contactRows}>
                {group.rows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{renderText(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      );
  }
}

export default function LegalPage() {
  const { pathname } = useLocation();
  const doc = DOCUMENTS[pathname] ?? termsOfService;
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    contentRef.current?.scrollTo(0, 0);
    const previousTitle = document.title;
    document.title = `${doc.title} | ${SERVICE_NAME}`;
    return () => {
      document.title = previousTitle;
    };
  }, [doc]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <nav className={styles.tabs} aria-label="약관 및 정책">
          {LEGAL_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.meta}>시행일 {renderText(doc.effectiveDate)}</p>
      </header>

      <div className={styles.body}>
        <article
          ref={contentRef}
          className={styles.content}
          tabIndex={0}
          aria-label={`${doc.title} 본문`}
        >
          {doc.intro.map((text) => (
            <p key={text} className={styles.intro}>
              {renderText(text)}
            </p>
          ))}

          {doc.articles.map((article, index) => (
            <section key={article.title} className={styles.article}>
              <h2 className={styles.articleTitle}>
                <span className={styles.articleNumber}>제{index + 1}조</span>
                {article.title}
              </h2>
              {article.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} />
              ))}
            </section>
          ))}

          {doc.addenda && (
            <section className={styles.article}>
              <h2 className={styles.articleTitle}>부칙</h2>
              {doc.addenda.map((text) => (
                <p key={text} className={styles.paragraph}>
                  {renderText(text)}
                </p>
              ))}
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
