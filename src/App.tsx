import React, { useEffect, useState } from 'react';
import {
    Callout, Caption, ChoiceRow, CloseButton, Closing, Facts, FileButton, FileCard, Group, Header,
    Link, NavLink, NumberedList, Paragraph, Route, Routes, Row, Rows, Slider, TextField, useLocalState,
} from '@instinct/files';
import ps5Photo from './photos/ps5.png';
import ps4Photo from './photos/ps4.jpg';
import dualsensePhoto from './photos/dualsense.png';
import fcPhoto from './photos/game-fc.png';
import godPhoto from './photos/game-god.png';
import spidermanPhoto from './photos/game-spider-man.png';

type ConsoleListing = {
    id: string; number: number; kind: 'PS5' | 'PS4'; title: string; owner: string;
    area: 'زايد' | 'أكتوبر'; district: string;
    pricePerDay: number; deposit: number; rating: number; reviews: number; delivery: boolean;
    model: string; storage: string; controllers: number; games: string[]; includes: string;
    photoKey?: string; mine?: boolean;
};

type GearItem = {
    id: string; number: number; cat: 'controller' | 'game'; title: string; owner: string;
    area: 'زايد' | 'أكتوبر'; district: string;
    pricePerDay: number; deposit: number; rating: number; reviews: number; note: string; photoKey: string;
};

type Request = { id: string; listingNumber: number; title: string; owner: string; days: number; rent: number; deposit: number };
type UserProfile = { name: string; age: string; phone: string; avatar: string; address: string };
type ChatMsg = { me: boolean; text: string };

const PHOTOS: Record<string, string> = { ps5: ps5Photo, ps4: ps4Photo, dualsense: dualsensePhoto, fc: fcPhoto, god: godPhoto, spiderman: spidermanPhoto };
const AVATARS = ['🎮', '👾', '🕹️', '⚡'];

const SEED_CONSOLES: ConsoleListing[] = [
    { id: 's1', number: 1, kind: 'PS5', title: 'بلايستيشن 5 مع يدتين', owner: 'كريم م.', area: 'زايد', district: 'الحي الأول', pricePerDay: 250, deposit: 1000, rating: 4.8, reviews: 12, delivery: true, model: 'ستاندارد', storage: '825GB', controllers: 2, games: ['FC 25', 'God of War'], includes: 'يدتين وشاحن وكابل HDMI' },
    { id: 's2', number: 2, kind: 'PS5', title: 'بلايستيشن 5 ديجيتال', owner: 'عمر ج.', area: 'أكتوبر', district: 'الحصري', pricePerDay: 220, deposit: 800, rating: 4.5, reviews: 8, delivery: true, model: 'ديجيتال', storage: '825GB', controllers: 2, games: ['FC 25', 'Spider-Man 2', 'Tekken 8'], includes: 'يدتين وقاعدة شحن' },
    { id: 's3', number: 3, kind: 'PS4', title: 'بلايستيشن 4 مع خمس ألعاب', owner: 'مازن ع.', area: 'أكتوبر', district: 'حي المنتزه', pricePerDay: 120, deposit: 500, rating: 4.9, reviews: 21, delivery: false, model: 'سليم', storage: '500GB', controllers: 1, games: ['FIFA 23', 'GTA V', 'PES 21', 'Minecraft', 'Fortnite'], includes: 'يد واحدة وكابل HDMI' },
    { id: 's4', number: 4, kind: 'PS4', title: 'بلايستيشن 4 برو', owner: 'سارة م.', area: 'زايد', district: 'كمبوند زيد', pricePerDay: 150, deposit: 600, rating: 4.2, reviews: 5, delivery: true, model: 'برو', storage: '1TB', controllers: 2, games: ['The Last of Us'], includes: 'يدتين وشاحن' },
    { id: 's5', number: 5, kind: 'PS4', title: 'بلايستيشن 4 سليم', owner: 'تامر ع.', area: 'أكتوبر', district: 'الحصري', pricePerDay: 100, deposit: 400, rating: 4.6, reviews: 14, delivery: true, model: 'سليم', storage: '1TB', controllers: 4, games: ['FC 25', 'FIFA 23'], includes: 'أربع إيدي للعب الجماعي' },
];

const SEED_GEAR: GearItem[] = [
    { id: 'g1', number: 6, cat: 'controller', title: 'دراع PS5 DualSense', owner: 'أحمد س.', area: 'زايد', district: 'الحي الثاني', pricePerDay: 40, deposit: 300, rating: 4.7, reviews: 9, note: 'نضيف من غير عيوب، شحنته كاملة', photoKey: 'dualsense' },
    { id: 'g2', number: 7, cat: 'controller', title: 'دراع PS4 DualShock', owner: 'تامر ع.', area: 'أكتوبر', district: 'الحصري', pricePerDay: 25, deposit: 200, rating: 4.4, reviews: 6, note: 'متاح منه كذا واحد للعب الجماعي', photoKey: 'dualsense' },
    { id: 'g3', number: 8, cat: 'game', title: 'FC 25 أسطوانة', owner: 'كريم م.', area: 'زايد', district: 'الحي الأول', pricePerDay: 30, deposit: 400, rating: 5.0, reviews: 3, note: 'الأسطوانة سليمة من غير خدوش', photoKey: 'fc' },
    { id: 'g4', number: 9, cat: 'game', title: 'God of War Ragnarok', owner: 'مازن ع.', area: 'أكتوبر', district: 'حي المنتزه', pricePerDay: 25, deposit: 400, rating: 4.9, reviews: 4, note: 'نسخة PS5', photoKey: 'god' },
    { id: 'g5', number: 10, cat: 'game', title: 'Spider-Man 2', owner: 'عمر ج.', area: 'أكتوبر', district: 'الحصري', pricePerDay: 30, deposit: 400, rating: 4.8, reviews: 7, note: 'متاح النسخة الديجيتال كمان', photoKey: 'spiderman' },
];

const ACTIVE_RENTAL = { number: 2, title: 'بلايستيشن 5 ديجيتال', owner: 'عمر ج.', pricePerDay: 220, days: 3, startMs: Date.now() - 30 * 3600 * 1000 };

function yom(n: number) { return n === 1 ? 'يوم' : n === 2 ? 'يومين' : `${n} أيام`; }
function areaName(a: string) { return a === 'زايد' ? 'الشيخ زايد' : '6 أكتوبر'; }

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
    if (!reviews) return <span className="ajer-muted">لسه مفيش تقييمات</span>;
    return <span className="ajer-stars"><bdi>★ {rating}</bdi> <span className="ajer-muted">(<bdi>{reviews}</bdi> تقييم)</span></span>;
}

function ConsoleCard({ listing, onRequest, onChat, onDelete, onTrack }: { listing: ConsoleListing; onRequest?: () => void; onChat?: () => void; onDelete?: (id: string) => void; onTrack?: () => void }) {
    return <div className="ajer-card">
        <img className="ajer-thumb" src={PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={listing.kind === 'PS5' ? 'جهاز بلايستيشن 5 مع ذراع تحكم' : 'جهاز بلايستيشن 4 مع ذراع تحكم'} />
        <div className="ajer-card-body">
            <div className="ajer-card-title"><span className="ajer-num">{listing.number}</span> {listing.title}</div>
            <div className="ajer-muted">{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
            <div className="ajer-chips">
                <span className="ajer-chip">{listing.model}</span>
                <span className="ajer-chip"><bdi>{listing.storage}</bdi></span>
                <span className="ajer-chip"><bdi>{listing.controllers}</bdi> {listing.controllers === 1 ? 'دراع' : 'دراعات'}</span>
            </div>
            {listing.games.length > 0 && <div className="ajer-muted">الألعاب: {listing.games.join('، ')}</div>}
            {listing.includes ? <div className="ajer-muted">معاه: {listing.includes}</div> : null}
            <div className="ajer-muted"><Stars rating={listing.rating} reviews={listing.reviews} />{listing.delivery ? ' · توصيل للبيت' : ' · استلام من المالك'}</div>
            <div className="ajer-card-foot">
                <span className="ajer-price"><bdi>{listing.pricePerDay}</bdi> ج.م في اليوم</span>
                <span className="ajer-muted">تأمين <bdi>{listing.deposit}</bdi> ج.م بيرجع</span>
            </div>
            {listing.mine && <div className="ajer-badge">قيد التأجير (تجريبي)</div>}
            <div className="ajer-card-actions">
                {onRequest && <Link className="file-button is-compact" data-variant="primary" to="/request" onClick={onRequest}>اطلب إيجار</Link>}
                {onChat && <FileButton variant="secondary" compact pill onClick={onChat}>كلمه</FileButton>}
                {onTrack && <FileButton variant="secondary" compact pill onClick={onTrack}>تتبع مكانه</FileButton>}
                {onDelete && <FileButton variant="ghost" compact onClick={() => onDelete(listing.id)}>احذف الإعلان</FileButton>}
            </div>
        </div>
    </div>;
}

function GearCard({ item, onRequest, onChat }: { item: GearItem; onRequest: () => void; onChat: () => void }) {
    return <div className="ajer-card">
        <img className="ajer-thumb" src={PHOTOS[item.photoKey]} alt={item.title} />
        <div className="ajer-card-body">
            <div className="ajer-card-title"><span className="ajer-num">{item.number}</span> {item.title}</div>
            <div className="ajer-muted">{item.owner} · {areaName(item.area)}، {item.district}</div>
            <div className="ajer-muted">{item.note}</div>
            <div className="ajer-muted"><Stars rating={item.rating} reviews={item.reviews} /></div>
            <div className="ajer-card-foot">
                <span className="ajer-price"><bdi>{item.pricePerDay}</bdi> ج.م في اليوم</span>
                <span className="ajer-muted">تأمين <bdi>{item.deposit}</bdi> ج.م بيرجع</span>
            </div>
            <div className="ajer-card-actions">
                <Link className="file-button is-compact" data-variant="primary" to="/request" onClick={onRequest}>اطلب إيجار</Link>
                <FileButton variant="secondary" compact pill onClick={onChat}>كلمه</FileButton>
            </div>
        </div>
    </div>;
}

function ChatDialog({ name, onClose }: { name: string; onClose: () => void }) {
    const [msgs, setMsgs] = useState<ChatMsg[]>([{ me: false, text: 'أهلًا! الجهاز متاح، اسأل براحتك 🎮' }]);
    const [text, setText] = useState('');
    const send = () => {
        const t = text.trim();
        if (!t) return;
        setMsgs(m => [...m, { me: true, text: t }]);
        setText('');
        setTimeout(() => setMsgs(m => [...m, { me: false, text: 'رد تجريبي: في النسخة الحقيقية الطرف التاني هيرد عليك هنا.' }]), 700);
    };
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label={`محادثة مع ${name}`}>
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">{name}</h2>
            <div className="ajer-chat">
                {msgs.map((m, i) => <div key={i} className={m.me ? 'ajer-bubble ajer-bubble-me' : 'ajer-bubble'}>{m.text}</div>)}
            </div>
            <div className="ajer-chat-row">
                <input className="ajer-chat-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="اكتب رسالتك..." aria-label="اكتب رسالتك" />
                <FileButton variant="primary" compact pill onClick={send}>ابعت</FileButton>
            </div>
            <Caption>شات تجريبي: رسايلك بتفضل على جهازك ومفيش حد بيشوفها.</Caption>
        </div>
    </div>;
}

function TrackingDialog({ title, onClose }: { title: string; onClose: () => void }) {
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label={`تتبع مكان ${title}`}>
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">مكان جهازك دلوقتي</h2>
            <svg className="ajer-map" viewBox="0 0 360 180" role="img" aria-label="خريطة توضيحية بمكان الجهاز">
                <rect x="0" y="0" width="360" height="180" rx="16" fill="#12122a" />
                <path d="M 40 50 Q 120 15 200 45 Q 180 120 90 130 Q 30 105 40 50 Z" fill="#181832" stroke="#26263f" />
                <path d="M 215 35 Q 305 15 335 65 Q 340 135 285 165 Q 215 155 210 95 Q 205 60 215 35 Z" fill="#181832" stroke="#26263f" />
                <circle cx="150" cy="85" r="10" fill="#2ee6d6" />
                <circle cx="150" cy="85" r="18" fill="none" stroke="#2ee6d6" strokeOpacity="0.4" strokeWidth="2" />
                <text x="150" y="120" textAnchor="middle" fontSize="12" fill="#a2a3c6">{title}</text>
            </svg>
            <Facts items={[
                { label: 'آخر ظهور', value: 'من دقيقتين (تجريبي)' },
                { label: 'المكان التقريبي', value: '6 أكتوبر، الحصري' },
                { label: 'طريقة التتبع', value: 'GPS أو AirTag جوه الجهاز' },
            ]} />
            <Callout title="تتبع بموافقة المستأجر" tone="note">دي تجربة ببيانات وهمية. في النسخة الحقيقية المستأجر بيعرف قبل ما يأكد الطلب إن الجهاز فيه جهاز تتبع ضد السرقة وبيوافق عليه، والتتبع بيشتغل بس طول مدة الإيجار.</Callout>
        </div>
    </div>;
}

function Avatar({ char, size }: { char: string; size?: number }) {
    return <span className="ajer-avatar" style={size ? { width: size, height: size, fontSize: size * 0.52 } : undefined} aria-hidden="true">{char}</span>;
}

function Home({ consoles, gear, onRequestConsole, onRequestGear, onChat }: { consoles: ConsoleListing[]; gear: GearItem[]; onRequestConsole: (l: ConsoleListing) => void; onRequestGear: (g: GearItem) => void; onChat: (name: string) => void }) {
    const [tab, setTab] = useState('consoles');
    const [kind, setKind] = useState('الكل');
    const [area, setArea] = useState('الكل');
    const shownConsoles = consoles.filter(l => (kind === 'الكل' || l.kind === kind) && (area === 'الكل' || l.area === area));
    const shownGear = gear.filter(g => g.cat === (tab === 'controllers' ? 'controller' : 'game') && (area === 'الكل' || g.area === area));
    const count = tab === 'consoles' ? `${shownConsoles.length} من ${consoles.length} جهاز` : `${shownGear.length} إعلان`;
    return <>
        <Group label="إزاي شغال" heading>
            <NumberedList items={[
                'صاحب البلايستيشن يضيف جهازه بالصور والألعاب والسعر والتأمين.',
                'تختار أقرب جهاز أو دراع أو لعبة، وتحدد عدد الأيام.',
                'تتفق معاه في الشات، تستلم وتدفع كاش وقت الاستلام.',
                'كل جهاز فيه جهاز تتبع ضد السرقة، بتوافق عليه وانت بتطلب.',
                'لو رجعت قبل المعاد، فرق الأيام بيرجعلك. وبعدها كل طرف يقيّم التاني.',
            ]} />
        </Group>
        <Group label="الإعلانات القريبة منك" heading={count}>
            <ChoiceRow label="بتدور على إيه" options={[{ value: 'consoles', label: 'أجهزة' }, { value: 'controllers', label: 'دراعات' }, { value: 'games', label: 'ألعاب' }]} value={tab} onChange={(v: string) => setTab(v)} />
            {tab === 'consoles' && <ChoiceRow label="الجهاز" options={[{ value: 'الكل', label: 'الكل' }, { value: 'PS5', label: 'PS5' }, { value: 'PS4', label: 'PS4' }]} value={kind} onChange={(v: string) => setKind(v)} />}
            <ChoiceRow label="المنطقة" options={[{ value: 'الكل', label: 'الكل' }, { value: 'زايد', label: 'الشيخ زايد' }, { value: 'أكتوبر', label: '6 أكتوبر' }]} value={area} onChange={(v: string) => setArea(v)} />
            {tab === 'consoles' && (shownConsoles.length === 0
                ? <Callout title="مفيش أجهزة بالفلتر ده" tone="note">جرّب منطقة أو نوع جهاز تاني، أو أضف جهازك أنت.</Callout>
                : shownConsoles.map(l => <ConsoleCard key={l.id} listing={l} onRequest={() => onRequestConsole(l)} onChat={() => onChat(l.owner)} />))}
            {tab !== 'consoles' && (shownGear.length === 0
                ? <Callout title="مفيش إعلانات بالفلتر ده" tone="note">جرّب منطقة تانية.</Callout>
                : shownGear.map(g => <GearCard key={g.id} item={g} onRequest={() => onRequestGear(g)} onChat={() => onChat(g.owner)} />))}
            <Caption>كل الإعلانات دي بيانات تجريبية للتوضيح، مش إعلانات حقيقية.</Caption>
        </Group>
    </>;
}

function MapPage({ consoles, onRequest }: { consoles: ConsoleListing[]; onRequest: (l: ConsoleListing) => void }) {
    const [selected, setSelected] = useState<number | null>(null);
    const pos: Record<number, { x: number; y: number }> = { 1: { x: 265, y: 70 }, 2: { x: 85, y: 95 }, 3: { x: 125, y: 155 }, 4: { x: 290, y: 140 }, 5: { x: 60, y: 140 } };
    const pins = consoles.map(l => ({ l, p: pos[l.number] || { x: 60 + (l.number * 53) % 260, y: 55 + (l.number * 71) % 130 } }));
    const current = consoles.find(l => l.number === selected);
    return <Group label="الخريطة" heading="الأجهزة حوالينك">
        <svg className="ajer-map" viewBox="0 0 360 220" role="img" aria-label="خريطة توضيحية لأماكن الأجهزة في الشيخ زايد و6 أكتوبر">
            <rect x="0" y="0" width="360" height="220" rx="16" fill="#12122a" />
            <path d="M 40 60 Q 110 20 180 55 Q 160 120 90 130 Q 30 110 40 60 Z" fill="#181832" stroke="#26263f" />
            <path d="M 200 40 Q 300 15 335 70 Q 340 150 280 190 Q 200 180 195 110 Q 190 70 200 40 Z" fill="#181832" stroke="#26263f" />
            <text x="100" y="42" textAnchor="middle" fontSize="13" fill="#a2a3c6">6 أكتوبر</text>
            <text x="268" y="105" textAnchor="middle" fontSize="13" fill="#a2a3c6">الشيخ زايد</text>
            {pins.map(({ l, p }) => <g key={l.id} transform={`translate(${p.x},${p.y})`} onClick={() => setSelected(l.number)} style={{ cursor: 'pointer' }} role="button" aria-label={`جهاز رقم ${l.number}: ${l.title}`}>
                <circle r="14" fill={selected === l.number ? '#2ee6d6' : '#8b5cff'} />
                <text textAnchor="middle" dy="4.5" fontSize="12" fontWeight="600" fill="#0a0a16">{l.number}</text>
            </g>)}
        </svg>
        <Caption>خريطة توضيحية للتجربة. دوس على رقم تشوف تفاصيله.</Caption>
        {current
            ? <ConsoleCard listing={current} onRequest={() => onRequest(current)} />
            : <Callout title="اختار جهاز من الخريطة" tone="note">كل رقم على الخريطة هو جهاز معروض للإيجار.</Callout>}
    </Group>;
}

function RequestPage({ target, hasOpenRequest, onConfirm }: { target: { title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number } | null; hasOpenRequest: boolean; onConfirm: (r: { days: number; rent: number; deposit: number }) => void }) {
    const [days, setDays] = useState(2);
    const [accepted, setAccepted] = useState(false);
    const [done, setDone] = useState(false);
    if (!target) return <Group label="طلب إيجار" heading="اختار جهاز الأول">
        <Callout title="مفيش جهاز متختار" tone="note">ارجع للإعلانات واختار جهاز أو دراع أو لعبة، وبعدين دوس اطلب إيجار.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
    </Group>;
    if (done) {
        const rent = days * target.pricePerDay;
        return <Group label="طلب إيجار" heading="طلبك اتسجل">
            <Callout title="دي تجربة، مفيش حاجة اتبعتت لحد" tone="note">في النسخة الحقيقية المالك هيأكد معاك الميعاد والمكان، وتقدر تكلمه من أيقونة الشات جنب الطلب في حسابك.</Callout>
            <Facts items={[
                { label: 'الحاجة', value: target.title },
                { label: 'المدة', value: yom(days) },
                { label: 'الإيجار', value: `${rent} ج.م` },
                { label: 'التأمين بيرجع', value: `${target.deposit} ج.م` },
                { label: 'الدفع', value: 'كاش عند الاستلام' },
                { label: 'التتبع', value: 'وافقت على جهاز التتبع ضد السرقة' },
            ]} />
            <Link className="file-button is-compact" data-variant="primary" to="/profile">شوف طلبك في حسابك</Link>
        </Group>;
    }
    if (hasOpenRequest) return <Group label="طلب إيجار" heading="عندك طلب مفتوح">
        <Callout title="لازم تخلص اللي معاك الأول" tone="warning">مش ممكن تطلب أكتر من طلب في نفس الوقت. خلص أو الغي الطلب اللي عندك من صفحة حسابك، وبعدين اطلب تاني.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/profile">روح لحسابك</Link>
    </Group>;
    const rent = days * target.pricePerDay;
    return <Group label="طلب إيجار" heading={target.title}>
        <Paragraph>{target.ownerLine}</Paragraph>
        <Slider label="عدد الأيام" min={1} max={7} value={days} onChange={(v: number) => setDays(v)} describe={(v: number) => v === 1 ? 'يوم واحد' : yom(v)} />
        <Facts items={[
            { label: 'الإيجار', value: `${rent} ج.م` },
            { label: 'التأمين بيرجع', value: `${target.deposit} ج.م` },
            { label: 'المطلوب عند الاستلام', value: `${rent + target.deposit} ج.م كاش` },
        ]} />
        <Callout title="الدفع عند الاستلام" tone="note">مفيش دفع أونلاين في النسخة دي. تدفع كاش لما تستلم، والتأمين بيرجع لك بعد ما تسلم سليم. ولو رجعت الجهاز قبل المعاد، فرق الأيام بيرجعلك.</Callout>
        <Callout title="الجهاز فيه جهاز تتبع ضد السرقة" tone="warning">صاحب الجهاز يقدر يشوف مكانه عن طريق GPS أو AirTag جواه طول مدة الإيجار. لازم تشوف ده وتوافق عليه قبل ما تأكد الطلب.</Callout>
        <label className="ajer-check">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
            <span>فاهم وموافق إن الجهاز فيه جهاز تتبع ضد السرقة بيشتغل طول مدة الإيجار.</span>
        </label>
        <FileButton variant="primary" pill disabled={!accepted} onClick={() => { if (!accepted) return; onConfirm({ days, rent, deposit: target.deposit }); setDone(true); }}>أكد الطلب</FileButton>
        {!accepted && <Caption>علم موافقتك على التتبع الأول عشان تقدر تأكد.</Caption>}
    </Group>;
}

function AddPage({ onAdd, blocked }: { onAdd: (l: Omit<ConsoleListing, 'id' | 'number' | 'rating' | 'reviews'>) => void; blocked: boolean }) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [kind, setKind] = useState<'PS5' | 'PS4'>('PS5');
    const [model, setModel] = useState('ستاندارد');
    const [storage, setStorage] = useState('825GB');
    const [controllers, setControllers] = useState(2);
    const [photoKey, setPhotoKey] = useState('ps5');
    const [area, setArea] = useState<'زايد' | 'أكتوبر'>('زايد');
    const [district, setDistrict] = useState('');
    const [games, setGames] = useState('');
    const [includes, setIncludes] = useState('');
    const [price, setPrice] = useState('');
    const [deposit, setDeposit] = useState('');
    const [error, setError] = useState('');
    const [added, setAdded] = useState(false);
    const modelOptions = kind === 'PS5'
        ? [{ value: 'ستاندارد', label: 'ستاندارد' }, { value: 'ديجيتال', label: 'ديجيتال' }, { value: 'برو', label: 'برو' }]
        : [{ value: 'سليم', label: 'سليم' }, { value: 'برو', label: 'برو' }, { value: 'فات', label: 'فات' }];
    const submit = () => {
        const p = parseInt(price, 10);
        const d = deposit.trim() === '' ? 0 : parseInt(deposit, 10);
        if (name.trim().length < 2) { setError('اكتب اسمك الأول.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { setError('اكتب رقم موبايل صحيح من 11 رقم.'); return; }
        if (!Number.isFinite(p) || p < 10 || p > 5000) { setError('اكتب سعر اليوم بالجنيه، من 10 لـ 5000.'); return; }
        if (!Number.isFinite(d) || d < 0 || d > 50000) { setError('اكتب التأمين بالجنيه، أو سيبه 0 لو من غير تأمين.'); return; }
        setError('');
        onAdd({
            kind, title: kind === 'PS5' ? `بلايستيشن 5 ${model}` : `بلايستيشن 4 ${model}`,
            owner: name.trim(), area, district: district.trim() || areaName(area),
            pricePerDay: p, deposit: d, delivery: true, mine: true, model, storage, controllers,
            games: games.split(/[،,]/).map(g => g.trim()).filter(Boolean), includes: includes.trim(), photoKey,
        });
        setAdded(true);
    };
    if (blocked) return <Group label="أضف إعلانك" heading="لازم تخلص اللي معاك الأول">
        <Callout title="معاك جهاز مستأجر دلوقتي" tone="warning">مش ممكن تنزل إعلان لجهازك وانت معاك جهاز تاني. سجل إرجاع الجهاز اللي معاك من صفحة حسابك الأول، وبعدين تعالى أضف إعلانك.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/profile">روح لحسابك</Link>
    </Group>;
    return <>
        {added ? <Group label="تمام" heading="إعلانك اتضاف">
            <Callout title="إعلانك ظهر في القائمة" tone="note">دي تجربة على جهازك بس. في النسخة الحقيقية إعلانك هيبان للناس اللي حواليك، وهيبقى عليه علامة قيد التأجير وتقدر تتبع مكانه.</Callout>
            <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
        </Group> : <Group label="أضف إعلانك" heading="أجر جهازك للناس">
            <TextField label="اسمك" value={name} onChange={(v: string) => setName(v)} />
            <TextField label="رقم موبايلك" value={phone} onChange={(v: string) => setPhone(v)} />
            <ChoiceRow label="الجهاز" options={[{ value: 'PS5', label: 'PS5' }, { value: 'PS4', label: 'PS4' }]} value={kind} onChange={(v: string) => { const k = v as 'PS5' | 'PS4'; setKind(k); setModel(k === 'PS5' ? 'ستاندارد' : 'سليم'); setPhotoKey(k === 'PS5' ? 'ps5' : 'ps4'); }} />
            <ChoiceRow label="الموديل" options={modelOptions} value={model} onChange={(v: string) => setModel(v)} />
            <ChoiceRow label="المساحة" options={[{ value: '500GB', label: '500 جيجا' }, { value: '825GB', label: '825 جيجا' }, { value: '1TB', label: '1 تيرا' }, { value: '2TB', label: '2 تيرا' }]} value={storage} onChange={(v: string) => setStorage(v)} />
            <Slider label="عدد الدراعات" min={1} max={4} value={controllers} onChange={(v: number) => setControllers(v)} describe={(v: number) => v === 1 ? 'دراع واحد' : v === 2 ? 'دراعين' : `${v} دراعات`} />
            <ChoiceRow label="صورة الإعلان" options={[{ value: kind === 'PS5' ? 'ps5' : 'ps4', label: 'صورة الجهاز' }, { value: 'dualsense', label: 'صورة دراع' }]} value={photoKey === 'dualsense' ? 'dualsense' : (kind === 'PS5' ? 'ps5' : 'ps4')} onChange={(v: string) => setPhotoKey(v)} />
            <Caption>في النسخة الحقيقية هتصور جهازك وملحقاته بكاميرا الموبايل. في التجربة دي اختار صورة جاهزة.</Caption>
            <TextField label="الألعاب اللي مع الجهاز (افصل بينها بفاصلة)" value={games} onChange={(v: string) => setGames(v)} />
            <TextField label="إيه اللي بييجي مع الجهاز؟ (شاحن، كابلات...)" value={includes} onChange={(v: string) => setIncludes(v)} />
            <ChoiceRow label="المنطقة" options={[{ value: 'زايد', label: 'الشيخ زايد' }, { value: 'أكتوبر', label: '6 أكتوبر' }]} value={area} onChange={(v: string) => setArea(v as 'زايد' | 'أكتوبر')} />
            <TextField label="الحي أو الكمبوند" value={district} onChange={(v: string) => setDistrict(v)} />
            <TextField label="سعر اليوم بالجنيه (اكتب الرقم)" value={price} onChange={(v: string) => setPrice(v)} />
            <TextField label="التأمين بالجنيه بيرجع (اكتب الرقم، أو سيبه فاضي)" value={deposit} onChange={(v: string) => setDeposit(v)} />
            <Callout title="جهازك فيه تتبع ضد السرقة" tone="note">في النسخة الحقيقية جهازك هيبقى فيه GPS أو AirTag، والمستأجر بيشوف ده ويوافق عليه قبل ما يأكد الطلب، وتقدر تتبع مكان جهازك طول ما هو بره.</Callout>
            {error && <Callout title="راجع البيانات" tone="danger">{error}</Callout>}
            <FileButton variant="primary" pill onClick={submit}>انشر الإعلان</FileButton>
            <Caption>بياناتك بتفضل على جهازك في التجربة دي. صورة البطاقة هتتطلب في نسخة لاحقة بشكل آمن.</Caption>
        </Group>}
    </>;
}

function useNow(stepMs: number) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), stepMs); return () => clearInterval(t); }, [stepMs]);
    return now;
}

function CountdownRing({ frac, label, sub }: { frac: number; label: string; sub: string }) {
    const R = 64;
    const C = 2 * Math.PI * R;
    return <div className="ajer-ring-wrap">
        <svg className="ajer-ring" viewBox="0 0 160 160" role="img" aria-label={`فاضل ${label}`}>
            <defs>
                <linearGradient id="ajerGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cff" />
                    <stop offset="100%" stopColor="#2ee6d6" />
                </linearGradient>
            </defs>
            <circle cx="80" cy="80" r={R} fill="none" stroke="#1a1a33" strokeWidth="10" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="url(#ajerGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 80 80)" />
        </svg>
        <div className="ajer-ring-text"><span className="ajer-ring-label">{label}</span><span className="ajer-ring-sub">{sub}</span></div>
    </div>;
}

function ActiveRental({ returned, onReturn }: { returned: boolean; onReturn: () => void }) {
    const now = useNow(30000);
    const endMs = ACTIVE_RENTAL.startMs + ACTIVE_RENTAL.days * 86400000;
    const remainMs = Math.max(0, endMs - now);
    const remDays = Math.floor(remainMs / 86400000);
    const remHours = Math.floor((remainMs % 86400000) / 3600000);
    const usedMs = now - ACTIVE_RENTAL.startMs;
    const usedDays = Math.min(ACTIVE_RENTAL.days, Math.max(1, Math.ceil(usedMs / 86400000)));
    const refund = Math.max(0, (ACTIVE_RENTAL.days - usedDays) * ACTIVE_RENTAL.pricePerDay);
    const frac = Math.max(0, Math.min(1, remainMs / (ACTIVE_RENTAL.days * 86400000)));
    const remainLabel = `${remDays > 0 ? yom(remDays) + ' و' : ''}${remHours} ساعة`;
    return <Group label="إيجارك الحالي" heading={ACTIVE_RENTAL.title}>
        {returned ? <Callout title="اتسجل إرجاع بدري (تجريبي)" tone="note">المفروض يرجعلك {refund} ج.م من {ACTIVE_RENTAL.owner} فرق الأيام الباقية، غير التأمين.</Callout> : <>
            <CountdownRing frac={frac} label={remainLabel} sub="فاضل على التسليم" />
            <Facts items={[
                { label: 'من', value: ACTIVE_RENTAL.owner },
                { label: 'المدة', value: yom(ACTIVE_RENTAL.days) },
                { label: 'التتبع', value: 'وافقت على جهاز التتبع ضد السرقة' },
            ]} />
            <Callout title="لو رجعته بدري" tone="warning">لو سلمته دلوقتي بيرجعلك حوالي {refund} ج.م فرق الأيام الباقية من {ACTIVE_RENTAL.owner}.</Callout>
            <FileButton variant="secondary" compact pill onClick={onReturn}>سجل إرجاع بدري</FileButton>
        </>}
        <Caption>إيجار تجريبي للتوضيح، العداد بيعد لحظة بلحظة.</Caption>
    </Group>;
}

function ProfileForm({ initial, submitLabel, onSave }: { initial: UserProfile | null; submitLabel: string; onSave: (p: UserProfile) => void }) {
    const [name, setName] = useState(initial?.name || '');
    const [age, setAge] = useState(initial?.age || '');
    const [phone, setPhone] = useState(initial?.phone || '');
    const [avatar, setAvatar] = useState(initial?.avatar || AVATARS[0]);
    const [address, setAddress] = useState(initial?.address || '');
    const [error, setError] = useState('');
    const save = () => {
        const a = parseInt(age, 10);
        if (name.trim().length < 2) { setError('اكتب اسمك الأول.'); return; }
        if (!Number.isFinite(a) || a < 10 || a > 100) { setError('اكتب سنك بالأرقام.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { setError('اكتب رقم موبايل صحيح من 11 رقم.'); return; }
        if (address.trim().length < 3) { setError('اكتب عنوانك (المنطقة والحي).' ); return; }
        setError('');
        onSave({ name: name.trim(), age: String(a), phone: phone.trim(), avatar, address: address.trim() });
    };
    return <>
        <div className="ajer-avatar-pick">
            <Avatar char={avatar} size={64} />
            <ChoiceRow label="صورتك الرمزية" options={AVATARS.map(a => ({ value: a, label: a }))} value={avatar} onChange={(v: string) => setAvatar(v)} />
        </div>
        <Caption>في النسخة الحقيقية هتقدر تضيف صورتك الحقيقية بكاميرا الموبايل.</Caption>
        <TextField label="اسمك" value={name} onChange={(v: string) => setName(v)} />
        <TextField label="سنك" value={age} onChange={(v: string) => setAge(v)} />
        <TextField label="رقم موبايلك" value={phone} onChange={(v: string) => setPhone(v)} />
        <TextField label="عنوانك (المنطقة والحي)" value={address} onChange={(v: string) => setAddress(v)} />
        {error && <Callout title="راجع البيانات" tone="danger">{error}</Callout>}
        <FileButton variant="primary" pill onClick={save}>{submitLabel}</FileButton>
        <Caption>بياناتك بتفضل على جهازك بس في التجربة دي، ومبتتشاركش مع حد.</Caption>
    </>;
}

function ProfilePage({ profile, requests, myListings, rentalReturned, onEditProfile, onReturn, onCancelRequest, onDeleteListing, onChat, onTrack }: {
    profile: UserProfile; requests: Request[]; myListings: ConsoleListing[]; rentalReturned: boolean;
    onEditProfile: () => void; onReturn: () => void; onCancelRequest: (id: string) => void;
    onDeleteListing: (id: string) => void; onChat: (name: string) => void; onTrack: (l: ConsoleListing) => void;
}) {
    return <>
        <Group label="حسابك" heading={`أهلًا ${profile.name}`}>
            <div className="ajer-me">
                <Avatar char={profile.avatar} size={56} />
                <div className="ajer-me-info">
                    <div className="ajer-card-title">{profile.name}</div>
                    <div className="ajer-muted">{profile.age} سنة · <bdi>{profile.phone}</bdi></div>
                    <div className="ajer-muted">{profile.address}</div>
                </div>
                <FileButton variant="secondary" compact pill onClick={onEditProfile}>عدل بياناتك</FileButton>
            </div>
            <Facts items={[
                { label: 'إيجاراتك', value: '3 (تجريبي)' },
                { label: 'مستواك', value: 'برونزي' },
                { label: 'الباقي على فضي', value: 'إيجارين' },
            ]} />
            <div className="ajer-progress" role="img" aria-label="وصلت لـ 60 في المية من الطريق للمستوى الفضي"><div style={{ width: '60%' }} /></div>
        </Group>
        <ActiveRental returned={rentalReturned} onReturn={onReturn} />
        {requests.length > 0 && <Group label="طلباتك" heading>
            {requests.map(r => <div key={r.id} className="ajer-card">
                <div className="ajer-card-body">
                    <div className="ajer-card-title">إعلان رقم {r.listingNumber}: {r.title}</div>
                    <div className="ajer-muted">{r.owner} · {yom(r.days)} · إيجار <bdi>{r.rent}</bdi> ج.م وتأمين <bdi>{r.deposit}</bdi> ج.م · كاش عند الاستلام</div>
                    <div className="ajer-card-actions">
                        <FileButton variant="secondary" compact pill onClick={() => onChat(r.owner)}>كلم {r.owner}</FileButton>
                        <FileButton variant="ghost" compact onClick={() => onCancelRequest(r.id)}>الغي الطلب</FileButton>
                    </div>
                </div>
            </div>)}
            <Caption>طلبات تجريبية محفوظة على جهازك بس.</Caption>
        </Group>}
        {myListings.length > 0 && <Group label="إعلاناتك" heading>
            {myListings.map(l => <ConsoleCard key={l.id} listing={l} onDelete={onDeleteListing} onTrack={() => onTrack(l)} />)}
            <Caption>تقدر تتبع مكان جهازك طول ما هو مع المستأجر، والمستأجر موافق على التتبع.</Caption>
        </Group>}
        <Group label="طبقات النجوم" heading="كل ما تأجر أكتر، تكسب أكتر">
            <Rows>
                <Row number={1} name="برونزي" detail="من أول إيجار" value="شارة مؤجر جديد" />
                <Row number={2} name="فضي" detail="خمس إيجارات مكتملة" value="خصم 5 في المية من العمولة" />
                <Row number={3} name="دهبي" detail="خمستاشر إيجار مكتمل" value="خصم 10 في المية وأولوية ظهور" />
            </Rows>
        </Group>
        <Group label="التقييمات" heading="كل طرف يقيّم التاني">
            <Rows>
                <Row number={1} name="مستأجر عن كريم" detail="الجهاز نضيف والتسليم كان أسرع مما توقعت" value="★ 5" valueKnown />
                <Row number={2} name="كريم عن مستأجر" detail="رجع الجهاز في المعاد وبنفس الحالة" value="★ 5" valueKnown />
            </Rows>
            <Caption>تقييمات تجريبية للتوضيح.</Caption>
        </Group>
    </>;
}

function Drawer({ open, profile, myCount, onClose }: { open: boolean; profile: UserProfile | null; myCount: number; onClose: () => void }) {
    if (!open) return null;
    const item = (to: string, label: string, end?: boolean) => <NavLink to={to} end={end} onClick={onClose} className="ajer-drawer-link">{label}</NavLink>;
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="القائمة" onClick={onClose}>
        <div className="ajer-drawer" onClick={e => e.stopPropagation()}>
            <div className="ajer-sheet-close"><CloseButton label="إغلاق القائمة" onClick={onClose} /></div>
            <NavLink to="/profile" onClick={onClose} className="ajer-drawer-me">
                <Avatar char={profile?.avatar || '🎮'} size={48} />
                <span>
                    <span className="ajer-card-title">{profile ? profile.name : 'ضيف'}</span>
                    <span className="ajer-muted">دوس علشان تشوف وتعدل بياناتك</span>
                </span>
            </NavLink>
            <nav className="ajer-drawer-nav" aria-label="صفحات التطبيق">
                {item('/', 'الإعلانات', true)}
                {item('/map', 'الخريطة')}
                {item('/add', 'أضف إعلانك')}
                {item('/profile', `إعلاناتي${myCount ? ` (${myCount})` : ''}`)}
                {item('/profile', 'حسابك')}
            </nav>
        </div>
    </div>;
}

function withDefaults(l: any): ConsoleListing {
    const { ownerKind, shopId, ...rest } = l;
    return { model: 'ستاندارد', storage: '825GB', controllers: 2, games: [], includes: '', ...rest };
}

export function App() {
    const [myListingsRaw, setMyListings, listingsSaved] = useLocalState('ajer-my-listings.v1', [] as any[]);
    const [requestsRaw, setRequests, requestsSaved] = useLocalState('ajer-requests.v1', [] as any[]);
    const [profile, setProfile, profileSaved] = useLocalState('ajer-profile.v1', null as UserProfile | null);
    const [rental, setRental, rentalSaved] = useLocalState('ajer-rental.v1', { returned: false });
    const [requestTarget, setRequestTarget] = useState<{ title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number } | null>(null);
    const [chatWith, setChatWith] = useState<string | null>(null);
    const [tracking, setTracking] = useState<ConsoleListing | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editProfile, setEditProfile] = useState(false);
    const myListings = myListingsRaw.map(withDefaults);
    const requests: Request[] = requestsRaw.map(r => ({ owner: 'المالك', ...r }));
    const consoles = [...SEED_CONSOLES, ...myListings];
    const addListing = (data: Omit<ConsoleListing, 'id' | 'number' | 'rating' | 'reviews'>) => {
        if (!listingsSaved.ready) return;
        const nextNumber = Math.max(consoles.reduce((m, l) => Math.max(m, l.number), 0), ...SEED_GEAR.map(g => g.number)) + 1;
        setMyListings([...myListingsRaw, { ...data, id: `m${Date.now()}`, number: nextNumber, rating: 0, reviews: 0 }]);
    };
    const requestConsole = (l: ConsoleListing) => setRequestTarget({ title: l.title, owner: l.owner, ownerLine: `${l.owner} · ${areaName(l.area)}، ${l.district}`, pricePerDay: l.pricePerDay, deposit: l.deposit, number: l.number });
    const requestGear = (g: GearItem) => setRequestTarget({ title: g.title, owner: g.owner, ownerLine: `${g.owner} · ${areaName(g.area)}، ${g.district}`, pricePerDay: g.pricePerDay, deposit: g.deposit, number: g.number });
    const ready = listingsSaved.ready && requestsSaved.ready && profileSaved.ready && rentalSaved.ready;
    return <FileCard lang="ar" dir="rtl">
        <div className="ajer-app">
        {ready && !profile ? <>
            <Header title="أجر كونسول" fact="نسخة تجريبية 0.5" intro="قبل ما تبدأ، عرفنا بنفسك: بياناتك بتفضل على جهازك بس في التجربة دي." />
            <Group label="بياناتك" heading="معلوماتك الأساسية">
                <ProfileForm initial={null} submitLabel="احفظ وابدأ" onSave={(p) => setProfile(p)} />
            </Group>
        </> : <>
        <div className="ajer-topbar">
            <button type="button" className="ajer-menu-btn" aria-label="افتح القائمة" onClick={() => setMenuOpen(true)}>⋮</button>
        </div>
        <Header title="أجر كونسول" fact="نسخة تجريبية 0.5" intro="وسيط بين اللي عنده بلايستيشن واللي عايز يلعب: اختار أقرب جهاز أو دراع أو لعبة، كلم صاحبها، وادفع كاش عند الاستلام." />
        <Callout title="دي نسخة تجريبية" tone="warning">كل الأجهزة والأسعار والتقييمات هنا بيانات وهمية للتوضيح، ومفيش حجز أو دفع حقيقي بيحصل من الصفحة دي.</Callout>
        <Drawer open={menuOpen} profile={profile} myCount={myListings.length} onClose={() => setMenuOpen(false)} />
        <Routes>
            <Route path="/" element={<Home consoles={consoles} gear={SEED_GEAR} onRequestConsole={requestConsole} onRequestGear={requestGear} onChat={setChatWith} />} />
            <Route path="/map" element={<MapPage consoles={consoles} onRequest={requestConsole} />} />
            <Route path="/add" element={<AddPage onAdd={addListing} blocked={!rental.returned} />} />
            <Route path="/request" element={<RequestPage target={requestTarget} hasOpenRequest={requests.length > 0} onConfirm={(r) => { if (requestsSaved.ready && requestTarget) setRequests([...requestsRaw, { id: `r${Date.now()}`, listingNumber: requestTarget.number, title: requestTarget.title, owner: requestTarget.owner, days: r.days, rent: r.rent, deposit: r.deposit }]); }} />} />
            <Route path="/profile" element={profile ? <ProfilePage profile={profile} requests={requests} myListings={myListings} rentalReturned={rental.returned} onEditProfile={() => setEditProfile(true)} onReturn={() => rentalSaved.ready && setRental({ returned: true })} onCancelRequest={(id) => requestsSaved.ready && setRequests(requestsRaw.filter(r => r.id !== id))} onDeleteListing={(id) => listingsSaved.ready && setMyListings(myListingsRaw.filter(l => l.id !== id))} onChat={setChatWith} onTrack={setTracking} /> : <Group label="حسابك" heading="سجل بياناتك الأول"><Callout title="لسه مفيش بيانات" tone="note">ارجع للصفحة الرئيسية واملأ بياناتك الأول.</Callout></Group>} />
        </Routes>
        {chatWith && <ChatDialog name={chatWith} onClose={() => setChatWith(null)} />}
        {tracking && <TrackingDialog title={tracking.title} onClose={() => setTracking(null)} />}
        {editProfile && profile && <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="تعديل بياناتك">
            <div className="ajer-sheet">
                <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={() => setEditProfile(false)} /></div>
                <h2 className="ajer-sheet-title">عدل بياناتك</h2>
                <ProfileForm initial={profile} submitLabel="احفظ التعديل" onSave={(p) => { setProfile(p); setEditProfile(false); }} />
            </div>
        </div>}
        {(() => { const msgs = [...new Set([listingsSaved.message, requestsSaved.message, profileSaved.message, rentalSaved.message].filter(Boolean))]; return ready && msgs.length ? <Caption>{msgs.join(' ')}</Caption> : null; })()}
        <Caption>صور الأجهزة: بلايستيشن 5 بواسطة Soberian وبلايستيشن 4 بواسطة Evan-Amos والدراع بواسطة Viper polo، عبر ويكيميديا كومنز. أغلفة الألعاب رسوم توضيحية.</Caption>
        <Closing>نسخة تجريبية 0.5. اتعملت 26 نوفمبر 2026. مفيش طلبات حقيقية اتبعتت.</Closing>
        </>}
        </div>
    </FileCard>;
}
