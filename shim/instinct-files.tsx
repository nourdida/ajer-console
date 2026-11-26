// Shim for the '@instinct/files' design kit so the app builds standalone
// on GitHub Pages. Reproduces the kit's exact DOM structure and classes.
import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react';
import './design.css';
import theme from '../theme.js';

/* ---------------- Theme (theme.js at the repo root, edited by the owner) ---------------- */

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

(function applyTheme() {
  const t: any = theme || {};
  const root = document.documentElement;
  if (t.اللون_الأساسي) root.style.setProperty('--ds-teal', t.اللون_الأساسي);
  if (t.لون_الخلفية) root.style.setProperty('--ds-page', t.لون_الخلفية);
  if (t.لون_الكتابة) root.style.setProperty('--ds-ink', t.لون_الكتابة);

  const extra: string[] = [];
  const accent: string | undefined = t.اللون_الأساسي;
  if (accent && /^#?[0-9a-f]{6}$/i.test(accent.trim())) {
    const a = accent;
    const g = (x: number) => hexToRgba(a, x);
    extra.push(`.ajer-app h1{text-shadow:0 0 18px ${g(0.45)},0 0 46px ${g(0.3)}}`);
    extra.push(`.ajer-num{border-color:${g(0.5)};color:${a};box-shadow:0 0 10px ${g(0.25)}}`);
    extra.push(`.ajer-menu-btn{color:${a};box-shadow:0 0 12px ${g(0.25)}}`);
    extra.push(`.ajer-menu-btn:focus-visible{outline-color:${a}}`);
    extra.push(`.ajer-badge{border-color:${g(0.55)};color:${a};background:${g(0.1)};box-shadow:0 0 12px ${g(0.25)}}`);
    extra.push(`.ajer-progress>div{background:linear-gradient(90deg,#8b5cff,${a});box-shadow:0 0 12px ${g(0.5)}}`);
    extra.push(`.ajer-ring{filter:drop-shadow(0 0 12px ${g(0.35)})}`);
    extra.push(`.ajer-ring-label{color:${a};text-shadow:0 0 14px ${g(0.6)}}`);
    extra.push(`.ajer-check input{accent-color:${a}}`);
    extra.push(`.ajer-bubble-me{background:${g(0.12)};border-color:${g(0.45)}}`);
    extra.push(`.ajer-chat-input:focus{outline-color:${g(0.5)}}`);
    extra.push(`.ajer-drawer-link[aria-current="page"]{color:${a};background:${g(0.08)};text-shadow:0 0 12px ${g(0.5)}}`);
    extra.push(`.ajer-drawer-link:focus-visible{outline-color:${a}}`);
    extra.push(`.file-nav a[aria-current="page"]{color:${a};box-shadow:inset 0 -2px 0 ${a};text-shadow:0 0 14px ${g(0.6)}}`);
    extra.push(`.ajer-card-actions button[data-variant="primary"],.ajer-app>button[data-variant="primary"],.ajer-sheet button[data-variant="primary"]{box-shadow:0 0 16px ${g(0.35)}}`);
  }
  if (t.شكل_الأزرار === 'مربع') {
    extra.push('.file-button,.file-button.is-pill{border-radius:10px}');
  }
  if (t.حجم_الخط === 'كبير') {
    extra.push('body{font-size:18px}');
  }
  const fonts: Record<string, { href: string; family: string }> = {
    'كايرو': { href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap', family: "'Cairo',sans-serif" },
    'تجوال': { href: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap', family: "'Tajawal',sans-serif" },
  };
  const f = fonts[t.الخط];
  if (f) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = f.href;
    document.head.appendChild(link);
    extra.push(`:root{--ds-font-text:${f.family};--ds-font-display:${f.family}}`);
    extra.push(`body,.file-card{font-family:${f.family}}`);
  }
  if (extra.length) {
    const style = document.createElement('style');
    style.textContent = extra.join('\n');
    document.head.appendChild(style);
  }
})();

/* ---------------- Router (hash-based, works on static hosting) ---------------- */

type RouterValue = { path: string; navigate: (to: string) => void };
const RouterCtx = createContext<RouterValue>({ path: '/', navigate: () => {} });

function readPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/';
}

export function FileRouter({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string>(readPath);
  useEffect(() => {
    const onHash = () => setPath(readPath());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = (to: string) => {
    window.location.hash = to;
  };
  return <RouterCtx.Provider value={{ path, navigate }}>{children}</RouterCtx.Provider>;
}

export function Route(_props: { path: string; element: React.ReactNode }) {
  return null;
}

export function Routes({ children }: { children: React.ReactNode }) {
  const { path } = useContext(RouterCtx);
  let match: React.ReactNode = null;
  React.Children.forEach(children, (child) => {
    if (match) return;
    if (React.isValidElement(child) && (child.props as any).path === path) {
      match = (child.props as any).element;
    }
  });
  return <>{match}</>;
}

type AnchorProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  end?: boolean;
};

export function Link({ to, onClick, children, ...rest }: AnchorProps) {
  const { navigate } = useContext(RouterCtx);
  return (
    <a
      href={'#' + to}
      data-discover="true"
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function NavLink({ to, end, onClick, children, ...rest }: AnchorProps) {
  const { path, navigate } = useContext(RouterCtx);
  const active = end ? path === to : path === to || path.startsWith(to + '/');
  return (
    <a
      href={'#' + to}
      data-discover="true"
      aria-current={active ? 'page' : undefined}
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/* ---------------- Page structure ---------------- */

export function FileCard({ lang, dir, children }: { lang?: string; dir?: string; children: React.ReactNode }) {
  return (
    <main dir={dir as any} lang={lang} className="file-card" data-width="fluid">
      {children}
    </main>
  );
}

export function Header({ title, fact, intro }: { title: React.ReactNode; fact?: React.ReactNode; intro?: React.ReactNode }) {
  return (
    <header className="file-header">
      <h1 className="file-title">{title}</h1>
      {fact ? <p className="file-fact">{fact}</p> : null}
      {intro ? <p className="file-intro">{intro}</p> : null}
    </header>
  );
}

export function Group({ label, heading, children }: { label: React.ReactNode; heading?: React.ReactNode | boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <section className="file-group" aria-labelledby={id}>
      {heading === true || heading === undefined ? (
        <h2 id={id} className="file-group-heading">{label}</h2>
      ) : (
        <hgroup className="file-group-head">
          <p className="file-group-label">{label}</p>
          <h2 id={id} className="file-group-heading">{heading}</h2>
        </hgroup>
      )}
      {children}
    </section>
  );
}

export function Closing({ children }: { children: React.ReactNode }) {
  return <footer className="file-closing">{children}</footer>;
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="file-p">{children}</p>;
}

export function Caption({ children }: { children: React.ReactNode }) {
  return <p className="file-caption">{children}</p>;
}

export function Callout({ title, tone, children }: { title: React.ReactNode; tone?: string; children: React.ReactNode }) {
  return (
    <aside className="file-callout file-bar" data-tone={tone}>
      <span className="file-strong">{title}</span>
      <span>{children}</span>
    </aside>
  );
}

export function NumberedList({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="file-steps">
      {items.map((item, i) => (
        <li key={i}>
          <span className="file-step-n">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function Facts({ items }: { items: { label: React.ReactNode; value: React.ReactNode }[] }) {
  return (
    <dl className="file-facts">
      {items.map((it, i) => (
        <div key={i}>
          <dt>{it.label}</dt>
          <dd>
            <bdi>{it.value}</bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Rows({ children }: { children: React.ReactNode }) {
  return <div className="file-rows">{children}</div>;
}

export function Row({ number, name, detail, value, valueKnown }: { number?: React.ReactNode; name: React.ReactNode; detail?: React.ReactNode; value?: React.ReactNode; valueKnown?: boolean }) {
  return (
    <div className="file-row">
      <span className="file-row-slot is-number">{number}</span>
      <div className="file-row-body">
        <div className="file-row-main">
          <span className="file-strong">{name}</span>
          {detail ? <span className="file-row-detail">{detail}</span> : null}
        </div>
        {value !== undefined ? <bdi className={valueKnown ? 'file-row-value file-known' : 'file-row-value'}>{value}</bdi> : null}
      </div>
    </div>
  );
}

/* ---------------- Controls ---------------- */

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = {
  variant?: string;
  compact?: boolean;
  pill?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
};

export function FileButton({ variant, compact, pill, disabled, onClick, children }: ButtonProps) {
  return (
    <button type="button" className={cx('file-button', compact && 'is-compact', pill && 'is-pill')} data-variant={variant} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function CloseButton({ label, onClick }: { label: string; onClick?: React.MouseEventHandler<HTMLButtonElement> }) {
  return (
    <button type="button" aria-label={label} className="file-button file-close" data-variant="ghost" onClick={onClick}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M6.25 6.25L17.75 17.75M17.75 6.25L6.25 17.75" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export function ChoiceRow({ label, options, value, onChange }: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[]; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="file-control" role="group" aria-labelledby={id}>
      <span id={id} className="file-control-label">{label}</span>
      <div className="file-choice-row">
        {options.map((o) => (
          <button key={o.value} type="button" className="file-button is-compact" data-variant="secondary" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: React.ReactNode; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="file-control">
      <label htmlFor={id} className="file-control-label">{label}</label>
      <input id={id} className="file-field" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Slider({ label, min, max, value, onChange, describe }: { label: React.ReactNode; min: number; max: number; value: number; onChange: (v: number) => void; describe?: (v: number) => React.ReactNode }) {
  const id = useId();
  const pct = max > min ? Math.round(((value - min) / (max - min)) * 1000) / 10 : 0;
  return (
    <div className="file-control">
      <div className="file-control-head">
        <label htmlFor={id} className="file-control-label">{label}</label>
        <span>{describe ? describe(value) : value}</span>
      </div>
      <input
        id={id}
        className="file-slider"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        style={{ ['--file-slider-fill' as any]: pct + '%' }}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
    </div>
  );
}

/* ---------------- Local state (localStorage) ---------------- */

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void, { ready: boolean; message: string | null }] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch (e) {}
    return initial;
  });
  const set = (v: T) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {}
  };
  return [value, set, { ready: true, message: null }];
}
