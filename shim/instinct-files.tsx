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
