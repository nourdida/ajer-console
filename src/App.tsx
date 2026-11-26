import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
    status?: 'open' | 'courier' | 'rented'; requestAt?: number; courierMs?: number; dueMs?: number;
};

type GearItem = {
    id: string; number: number; cat: 'controller' | 'game'; title: string; owner: string;
    area: 'زايد' | 'أكتوبر'; district: string;
    pricePerDay: number; deposit: number; rating: number; reviews: number; note: string; photoKey: string;
};

type Request = { id: string; listingNumber: number; title: string; owner: string; days: number; rent: number; deposit: number; fromMs?: number; delivery?: 'pickup' | 'courier'; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string };
type BookingRange = { listingNumber: number; fromMs: number; days: number };
type CondState = { checks: boolean[]; photos: string[] };
type UserProfile = { name: string; age: string; phone: string; avatar: string; address: string; idPhoto?: string };
type ChatMsg = { me: boolean; text: string };
type Complaint = { id: string; from: string; subject: string; detail: string; status: string; date: string };
type AdminUser = { id: string; name: string; phone: string; area: string; age: string; joined: string; status: string; listings: number; rentals: number };
type AdminState = { addedUsers: AdminUser[]; deletedIds: string[]; closedIds: string[] };
type Order = { id: string; requestId: string; title: string; owner: string; ownerPhone: string; pricePerDay: number; days: number; rent: number; deposit: number; createdMs: number; fromMs?: number; delivery?: 'pickup' | 'courier'; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string };
type Rental = { title: string; owner: string; ownerPhone: string; pricePerDay: number; days: number; startMs: number; returned: boolean };
type ChatTarget = { name: string; suggestions?: string[] };

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

const COURIER = { name: 'محمود س.', phone: '01001234567' };
const DEMO_OWNER_PHONE = '01009876543';
const STEP_MS = 15000;
const ORDER_STEPS = [
    'المندوب راح يستلم البلايستيشن من المالك',
    'فحص الجهاز وتجهيزه ليك (تشيك أب)',
    'المندوب اتحرك، في طريقه ليك',
    'المندوب وصل، استلم جهازك',
];
const COURIER_CHAT_SUGGESTIONS = ['أنت فين دلوقتي؟', 'هتوصل إمتى تقريبًا؟', 'كلمت المالك خلاص؟'];
const OWNER_CHAT_SUGGESTIONS = ['الجهاز محتاج باسورد عشان يتفتح، ممكن تبعتهولي؟', 'ممكن أضيف الأكونت بتاعي على الجهاز؟', 'فيه مشكلة في التشغيل، محتاج مساعدتك'];
const SUPPORT_NAME = 'دعم أجر كونسول';
const SUPPORT_SUGGESTIONS = ['عندي مشكلة في طلب', 'سؤال عن العمولة', 'عايز أقدم شكوى'];
const COMMISSION = 0.2;
const DELIVERY_FEE = 20;
const PROMO_CODES: Record<string, number> = { AJER10: 0.10, WELCOME15: 0.15 };
// أيام محجوزة تجريبية لكل جهاز: [بعد كام يوم من النهارده, عدد الأيام]
const SEED_BUSY: Record<number, [number, number][]> = { 1: [[3, 2]], 2: [[1, 1]], 4: [[5, 3]] };
const COND_CHECKS = ['الجهاز بيشتغل تمام', 'الدراعات سليمة وشغالة', 'الكابلات والشاحن موجودين', 'مفيش خدوش أو كسور جديدة'];
const EMPTY_COND: CondState = { checks: COND_CHECKS.map(() => false), photos: [] };

function dayStamp(ms: number) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function busyDaysFor(num: number, bookings: BookingRange[]): Set<number> {
    const s = new Set<number>();
    const today = dayStamp(Date.now());
    (SEED_BUSY[num] || []).forEach(([off, len]) => { for (let i = 0; i < len; i++) s.add(today + (off + i) * 86400000); });
    bookings.filter(b => b.listingNumber === num).forEach(b => { for (let i = 0; i < b.days; i++) s.add(dayStamp(b.fromMs) + i * 86400000); });
    return s;
}
function condComplete(c: CondState | null) { return !!c && c.checks.every(Boolean) && c.photos.length >= 1; }
function fileToSmallDataUrl(f: File, maxW: number, cb: (url: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width);
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * scale);
            c.height = Math.round(img.height * scale);
            const ctx = c.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);
            cb(c.toDataURL('image/jpeg', 0.7));
        };
        img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
}
const SEED_USERS: AdminUser[] = [
    { id: 'u1', name: 'كريم م.', phone: '01011112222', area: 'الشيخ زايد، الحي الأول', age: '26', joined: '12 نوفمبر 2026', status: 'نشط', listings: 1, rentals: 4 },
    { id: 'u2', name: 'عمر ج.', phone: '01033334444', area: '6 أكتوبر، الحصري', age: '22', joined: '14 نوفمبر 2026', status: 'نشط', listings: 1, rentals: 2 },
    { id: 'u3', name: 'مازن ع.', phone: '01055556666', area: '6 أكتوبر، حي المنتزه', age: '31', joined: '15 نوفمبر 2026', status: 'ساب التطبيق', listings: 0, rentals: 1 },
    { id: 'u4', name: 'سارة م.', phone: '01077778888', area: 'الشيخ زايد، كمبوند زيد', age: '27', joined: '20 نوفمبر 2026', status: 'نشط', listings: 1, rentals: 0 },
];
const SEED_COMPLAINTS: Complaint[] = [
    { id: 'c1', from: 'عمر ج.', subject: 'مستأجر رجع الجهاز متأخر يوم', detail: 'الجهاز اتأخر عن المعاد المتفق عليه ومحصلش تواصل.', status: 'مفتوحة', date: 'أمس' },
    { id: 'c2', from: 'سارة م.', subject: 'الدراع التاني مش شغال كويس', detail: 'الدراع فيه دريفت بسيط واتبلغت الدعم بيه.', status: 'مقفولة', date: 'من 3 أيام' },
];
const SEED_LOG = [
    'كريم م. سجل دخول - النهارده 2:15 م',
    'سارة م. أضافت إعلان جديد - النهارده 1:40 م',
    'عمر ج. أكد استلام جهاز - أمس 9:02 م',
    'مازن ع. ساب التطبيق - أمس 6:30 م',
    'سارة م. سجلت حساب جديد - 20 نوفمبر',
];

function yom(n: number) { return n === 1 ? 'يوم' : n === 2 ? 'يومين' : `${n} أيام`; }
function areaName(a: string) { return a === 'زايد' ? 'الشيخ زايد' : '6 أكتوبر'; }

const GAME_COLORS = ['#ff2ec4', '#2ee6d6', '#ffd54d', '#8b5cff', '#4dc3ff', '#7dff9a'];
function gameChipStyle(i: number): React.CSSProperties {
    const c = GAME_COLORS[i % GAME_COLORS.length];
    return { borderColor: c, color: c, background: `${c}1f` };
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
    if (!reviews) return <span className="ajer-muted">لسه مفيش تقييمات</span>;
    return <span className="ajer-stars"><bdi>★ {rating}</bdi> <span className="ajer-muted">(<bdi>{reviews}</bdi> تقييم)</span></span>;
}

function ConsoleCard({ listing, onOpen, onDelete, onTrack }: { listing: ConsoleListing; onOpen?: () => void; onDelete?: (id: string) => void; onTrack?: () => void }) {
    const inner = <>
        <img className="ajer-thumb" src={PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={listing.kind === 'PS5' ? 'جهاز بلايستيشن 5 مع ذراع تحكم' : 'جهاز بلايستيشن 4 مع ذراع تحكم'} />
        <div className="ajer-card-body">
            <div className="ajer-card-title"><span className="ajer-num">{listing.number}</span> {listing.title}</div>
            <div className="ajer-muted">{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
            <div className="ajer-muted"><Stars rating={listing.rating} reviews={listing.reviews} />{listing.delivery ? ' · توصيل للبيت' : ' · استلام من المالك'}</div>
            {listing.games.length > 0 && <div className="ajer-chips">{listing.games.map((g, i) => <span key={g} className="ajer-chip" style={gameChipStyle(i)}>{g}</span>)}</div>}
            <div className="ajer-card-foot">
                <span className="ajer-price"><bdi>{listing.pricePerDay}</bdi> ج.م في اليوم</span>
                <span className="ajer-muted">تأمين <bdi>{listing.deposit}</bdi> ج.م بيرجع</span>
            </div>
            {listing.mine && listing.status === 'rented' && <div className="ajer-badge ajer-badge-red">قيد الإيجار</div>}
            {(onDelete || onTrack) && <div className="ajer-card-actions">
                {onTrack && <FileButton variant="secondary" compact pill onClick={onTrack}>تتبع مكانه</FileButton>}
                {onDelete && <FileButton variant="ghost" compact onClick={() => onDelete(listing.id)}>احذف الإعلان</FileButton>}
            </div>}
        </div>
    </>;
    if (onOpen) return <Link className="ajer-card ajer-card-link" to="/detail" onClick={onOpen}>{inner}</Link>;
    return <div className="ajer-card">{inner}</div>;
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

function ChatDialog({ name, suggestions, onClose }: { name: string; suggestions?: string[]; onClose: () => void }) {
    const [msgs, setMsgs] = useState<ChatMsg[]>([{ me: false, text: suggestions ? 'أهلًا! اسأل براحتك 🎮' : 'أهلًا! الجهاز متاح، اسأل براحتك 🎮' }]);
    const [text, setText] = useState('');
    const sendText = (t: string) => {
        const v = t.trim();
        if (!v) return;
        setMsgs(m => [...m, { me: true, text: v }]);
        setText('');
        setTimeout(() => setMsgs(m => [...m, { me: false, text: 'رد تجريبي: في النسخة الحقيقية الطرف التاني هيرد عليك هنا.' }]), 700);
    };
    const send = () => sendText(text);
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label={`محادثة مع ${name}`}>
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">{name}</h2>
            <div className="ajer-chat">
                {msgs.map((m, i) => <div key={i} className={m.me ? 'ajer-bubble ajer-bubble-me' : 'ajer-bubble'}>{m.text}</div>)}
            </div>
            {suggestions && suggestions.length > 0 && <div className="ajer-chips ajer-suggest">
                {suggestions.map(s => <button key={s} type="button" className="ajer-chip ajer-chip-btn" onClick={() => sendText(s)}>{s}</button>)}
            </div>}
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

function Home({ consoles, gear, onOpenConsole, onRequestGear, onChat }: { consoles: ConsoleListing[]; gear: GearItem[]; onOpenConsole: (l: ConsoleListing) => void; onRequestGear: (g: GearItem) => void; onChat: (name: string) => void }) {
    const [filter, setFilter] = useState<{ cat: 'console' | 'controller' | 'game'; kind?: string; area?: 'زايد' | 'أكتوبر' } | null>(null);
    const [step, setStep] = useState<0 | 1 | 2 | null>(null);
    const [pickKind, setPickKind] = useState<string>('PS5');
    const showConsoles = !filter || filter.cat === 'console';
    const showGear = !filter || filter.cat !== 'console';
    const shownConsoles = consoles.filter(l => !filter || filter.cat !== 'console' || ((!filter.kind || l.kind === filter.kind) && (!filter.area || l.area === filter.area)));
    const shownGear = gear.filter(g => !filter || filter.cat === 'console' || g.cat === filter.cat);
    const filterLabel = !filter ? '' : filter.cat === 'controller' ? 'دراعات' : filter.cat === 'game' ? 'ألعاب' : `${filter.kind} · ${areaName(filter.area || 'زايد')}`;
    const heading = filter ? `${showConsoles ? shownConsoles.length : shownGear.length} نتيجة` : `${consoles.length + gear.length} إعلان قريب منك`;
    const closeSheet = () => setStep(null);
    return <>
        <Group label="الإعلانات القريبة منك" heading={heading}>
            <div className="ajer-filter-row">
                <FileButton variant="secondary" compact pill onClick={() => setStep(0)}>فلتر</FileButton>
                {filter && <button type="button" className="ajer-chip ajer-chip-btn" onClick={() => setFilter(null)}>× {filterLabel}</button>}
            </div>
            {showConsoles && (shownConsoles.length === 0
                ? <Callout title="مفيش أجهزة بالفلتر ده" tone="note">جرّب فلتر تاني، أو أضف جهازك أنت.</Callout>
                : shownConsoles.map(l => <ConsoleCard key={l.id} listing={l} onOpen={() => onOpenConsole(l)} />))}
            {showGear && <>
                {showConsoles && <div className="ajer-subhead">دراعات وألعاب</div>}
                {shownGear.length === 0
                    ? <Callout title="مفيش إعلانات بالفلتر ده" tone="note">جرّب فلتر تاني.</Callout>
                    : shownGear.map(g => <GearCard key={g.id} item={g} onRequest={() => onRequestGear(g)} onChat={() => onChat(g.owner)} />)}
            </>}
            <Caption>كل الإعلانات دي بيانات تجريبية للتوضيح، مش إعلانات حقيقية.</Caption>
        </Group>
        {step !== null && <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="فلتر الإعلانات" onClick={closeSheet}>
            <div className="ajer-sheet" onClick={e => e.stopPropagation()}>
                <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={closeSheet} /></div>
                <h2 className="ajer-sheet-title">فلتر الإعلانات</h2>
                {step === 0 && <div className="ajer-sheet-step" key="s0">
                    <Paragraph>بتدور على إيه؟</Paragraph>
                    <div className="ajer-circles">
                        <button type="button" className="ajer-circle" onClick={() => setStep(1)}>أجهزة</button>
                        <button type="button" className="ajer-circle" onClick={() => { setFilter({ cat: 'controller' }); closeSheet(); }}>دراعات</button>
                        <button type="button" className="ajer-circle" onClick={() => { setFilter({ cat: 'game' }); closeSheet(); }}>ألعاب</button>
                    </div>
                </div>}
                {step === 1 && <div className="ajer-sheet-step" key="s1">
                    <Paragraph>أنهم جهاز؟</Paragraph>
                    <div className="ajer-circles">
                        <button type="button" className="ajer-circle" onClick={() => { setPickKind('PS5'); setStep(2); }}>PS5</button>
                        <button type="button" className="ajer-circle" onClick={() => { setPickKind('PS4'); setStep(2); }}>PS4</button>
                    </div>
                    <FileButton variant="ghost" compact onClick={() => setStep(0)}>ارجع</FileButton>
                </div>}
                {step === 2 && <div className="ajer-sheet-step" key="s2">
                    <Paragraph>في أنهي منطقة؟</Paragraph>
                    <div className="ajer-circles">
                        <button type="button" className="ajer-circle" onClick={() => { setFilter({ cat: 'console', kind: pickKind, area: 'زايد' }); closeSheet(); }}>الشيخ زايد</button>
                        <button type="button" className="ajer-circle" onClick={() => { setFilter({ cat: 'console', kind: pickKind, area: 'أكتوبر' }); closeSheet(); }}>6 أكتوبر</button>
                    </div>
                    <FileButton variant="ghost" compact onClick={() => setStep(1)}>ارجع</FileButton>
                </div>}
            </div>
        </div>}
    </>;
}

function GuideDialog({ onClose }: { onClose: () => void }) {
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="طريقة الاستخدام">
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">إزاي شغال</h2>
            <NumberedList items={[
                'صاحب البلايستيشن يضيف جهازه بالصور والألعاب والسعر والتأمين.',
                'تختار أقرب جهاز أو دراع أو لعبة، وتحدد عدد الأيام.',
                'تتابع المندوب خطوة بخطوة لحد ما يوصلك، وتستلم وتدفع كاش وقت الاستلام.',
                'أول ما تستلم، العداد يبدأ في حسابك وتقدر تكلم المالك في أي وقت.',
                'كل جهاز فيه جهاز تتبع ضد السرقة، بتوافق عليه وانت بتطلب.',
                'لو رجعت قبل المعاد، فرق الأيام بيرجعلك. وبعدها كل طرف يقيّم التاني.',
            ]} />
            <Caption>دي نسخة تجريبية ببيانات وهمية، مفيش حجز أو دفع حقيقي بيحصل.</Caption>
        </div>
    </div>;
}

function AvailabilityCalendar({ busy, fromMs, days, onPick }: { busy: Set<number>; fromMs: number | null; days: number; onPick?: (ms: number) => void }) {
    const today = dayStamp(Date.now());
    const base = new Date(today);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = (new Date(year, month, 1).getDay() + 1) % 7; // الأسبوع يبدأ سبت
    const cells: (number | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d).getTime());
    const selStart = fromMs !== null ? dayStamp(fromMs) : null;
    const selEnd = selStart !== null ? selStart + days * 86400000 : null;
    const monthName = new Date(year, month, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    return <div className="ajer-cal">
        <div className="ajer-cal-month">{monthName}</div>
        <div className="ajer-cal-week">{['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="ajer-cal-grid">
            {cells.map((ms, i) => {
                if (ms === null) return <span key={i} className="ajer-cal-empty" />;
                const isPast = ms < today;
                const isBusy = busy.has(ms);
                const inRange = selStart !== null && selEnd !== null && ms >= selStart && ms < selEnd;
                const isStart = ms === selStart;
                const cls = `ajer-cal-day${isPast ? ' is-past' : ''}${isBusy ? ' is-busy' : ''}${inRange ? ' is-inrange' : ''}${isStart ? ' is-start' : ''}`;
                return <button key={i} type="button" className={cls} disabled={isPast || isBusy || !onPick}
                    aria-label={`يوم ${new Date(ms).getDate()}${isBusy ? ' محجوز' : ''}`}
                    onClick={() => { if (onPick && !isPast && !isBusy) onPick(ms); }}>{new Date(ms).getDate()}</button>;
            })}
        </div>
        <div className="ajer-cal-legend">
            <span><span className="ajer-dot ajer-dot-grey" /> محجوز</span>
            <span><span className="ajer-dot ajer-dot-pinkcal" /> مدة إيجارك</span>
        </div>
    </div>;
}

function TermsDialog({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="عقد الإيجار والشروط">
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">عقد الإيجار والشروط</h2>
            <NumberedList items={[
                'الإيجار بيتحسب من لحظة الاستلام لحد لحظة الإرجاع، ولو رجعت بدري بيرجعلك فرق الأيام.',
                'التأمين بيتحجز عند منصة أجر كونسول طول مدة الإيجار، وبيرجع لك كامل بعد ما تسلم الجهاز سليم.',
                'أي تلف أو كسر في الجهاز أو الدراعات وقت الإيجار مسئولية المستأجر، وبيتخصم من التأمين بعد معاينة المالك وصور التشيك ليست.',
                'لو قيمة التلف أكبر من التأمين، المستأجر بيدفع الفرق.',
                'تأخير الإرجاع بيتحسب يوم إضافي بسعر اليوم العادي عن كل يوم تأخير.',
                'ممنوع فتح الجهاز أو تصليحه عند أي حد من غير علم المالك.',
                'الجهاز فيه جهاز تتبع ضد السرقة شغال طول مدة الإيجار، واستخدامه بيتم بعلمك.',
            ]} />
            <FileButton variant="primary" pill onClick={onAccept}>أوافق على الشروط</FileButton>
            <Caption>عقد تجريبي للتوضيح بصياغة مبسطة، مش عقد قانوني حقيقي.</Caption>
        </div>
    </div>;
}

function ConditionChecklist({ value, onChange }: { value: CondState; onChange: (v: CondState) => void }) {
    const addPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 320, (url) => onChange({ ...value, photos: [...value.photos, url] }));
    };
    return <>
        {COND_CHECKS.map((c, i) => <label key={c} className="ajer-check">
            <input type="checkbox" checked={value.checks[i]} onChange={e => { const checks = [...value.checks]; checks[i] = e.target.checked; onChange({ ...value, checks }); }} />
            <span>{c}</span>
        </label>)}
        <div className="ajer-cond-photos">
            {value.photos.map((p, i) => <img key={i} src={p} className="ajer-cond-photo" alt={`صورة حالة الجهاز ${i + 1}`} />)}
            {value.photos.length < 3 && <label className="ajer-cond-slot">
                + صورة
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={addPhoto} aria-label="ضيف صورة لحالة الجهاز" />
            </label>}
        </div>
        <Caption>صور حالة الجهاز بتحميك وتحمي صاحبه لو حصل خلاف على التلف. لازم صورة واحدة على الأقل، وتقدر تضيف لحد 3.</Caption>
    </>;
}

function ConsoleDetailPage({ listing, busy, onRequest, onChat }: { listing: ConsoleListing | null; busy: Set<number>; onRequest: () => void; onChat: (name: string) => void }) {
    if (!listing) return <Group label="تفاصيل الجهاز" heading="اختار جهاز الأول">
        <Callout title="مفيش جهاز متختار" tone="note">ارجع للإعلانات ودوس على أي جهاز عشان تشوف تفاصيله.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
    </Group>;
    return <Group label="تفاصيل الجهاز" heading={listing.title}>
        <img className="ajer-detail-photo" src={PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={listing.kind === 'PS5' ? 'جهاز بلايستيشن 5 مع ذراع تحكم' : 'جهاز بلايستيشن 4 مع ذراع تحكم'} />
        <div className="ajer-muted">{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
        <div className="ajer-muted"><Stars rating={listing.rating} reviews={listing.reviews} />{listing.delivery ? ' · توصيل للبيت' : ' · استلام من المالك'}</div>
        {listing.games.length > 0 && <div className="ajer-chips">{listing.games.map((g, i) => <span key={g} className="ajer-chip" style={gameChipStyle(i)}>{g}</span>)}</div>}
        <Facts items={[
            { label: 'الموديل', value: listing.model },
            { label: 'المساحة', value: listing.storage },
            { label: 'الدراعات', value: `${listing.controllers} ${listing.controllers === 1 ? 'دراع' : 'دراعات'}` },
            ...(listing.includes ? [{ label: 'بييجي معاه', value: listing.includes }] : []),
            { label: 'السعر', value: `${listing.pricePerDay} ج.م في اليوم` },
            { label: 'التأمين بيرجع', value: `${listing.deposit} ج.م` },
        ]} />
        <Caption>الأيام المتاحة للحجز (بيانات تجريبية):</Caption>
        <AvailabilityCalendar busy={busy} fromMs={null} days={0} />
        <div className="ajer-card-actions">
            <Link className="file-button is-compact" data-variant="primary" to="/request" onClick={onRequest}>اطلب إيجار</Link>
            <FileButton variant="secondary" compact pill onClick={() => onChat(listing.owner)}>كلم {listing.owner}</FileButton>
        </div>
        <Caption>كل جهاز فيه جهاز تتبع ضد السرقة، وهتشوف ده وتوافق عليه قبل ما تأكد الطلب.</Caption>
    </Group>;
}

function BottomNav({ onGuide }: { onGuide: () => void }) {
    return <nav className="ajer-bottomnav" aria-label="صفحات التطبيق">
        <NavLink to="/" end className="ajer-tab">الإعلانات</NavLink>
        <NavLink to="/map" className="ajer-tab">الخريطة</NavLink>
        <NavLink to="/order" className="ajer-tab">طلبك</NavLink>
        <NavLink to="/add" className="ajer-tab">أضف إعلانك</NavLink>
        <NavLink to="/profile" className="ajer-tab">إعلاناتي</NavLink>
        <NavLink to="/profile" className="ajer-tab">حسابك</NavLink>
        <button type="button" className="ajer-tab ajer-tab-help" aria-label="طريقة الاستخدام" onClick={onGuide}>؟</button>
    </nav>;
}

function MapPage({ consoles, onRequest }: { consoles: ConsoleListing[]; onRequest: (l: ConsoleListing) => void }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [locNote, setLocNote] = useState('');
    const [locating, setLocating] = useState(false);
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const leafletMapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const meRef = useRef<L.CircleMarker | null>(null);

    // نقطة تقريبية ثابتة لكل إعلان حسب منطقته (بيانات تجريبية بدون إحداثيات حقيقية)
    const coordsFor = (l: ConsoleListing): [number, number] => {
        const base: [number, number] = l.area === 'زايد' ? [30.04, 30.975] : [29.96, 30.93];
        const j = l.number * 7919;
        const dx = ((j % 100) / 100 - 0.5) * 0.05;
        const dy = (((j * 31) % 100) / 100 - 0.5) * 0.04;
        return [base[0] + dx, base[1] + dy];
    };

    useEffect(() => {
        if (!mapDivRef.current || leafletMapRef.current) return;
        const map = L.map(mapDivRef.current).setView([30.0, 30.95], 11);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        leafletMapRef.current = map;
        return () => {
            map.remove();
            leafletMapRef.current = null;
        };
    }, []);

    useEffect(() => {
        const map = leafletMapRef.current;
        if (!map) return;
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = consoles.map((l) => {
            const icon = L.divIcon({
                className: selected === l.number ? 'ajer-pin is-selected' : 'ajer-pin',
                html: `<span>${l.number}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });
            const marker = L.marker(coordsFor(l), { icon, title: `جهاز رقم ${l.number}: ${l.title}` }).addTo(map);
            marker.on('click', () => setSelected(l.number));
            return marker;
        });
    }, [consoles, selected]);

    const showMyLocation = () => {
        setLocNote('');
        if (!('geolocation' in navigator)) {
            setLocNote('المتصفح ده مش بيدعم تحديد المكان.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                const map = leafletMapRef.current;
                if (map) {
                    meRef.current?.remove();
                    meRef.current = L.circleMarker([p.coords.latitude, p.coords.longitude], {
                        radius: 9,
                        color: '#2ee6d6',
                        weight: 3,
                        fillColor: '#2ee6d6',
                        fillOpacity: 0.35,
                    }).addTo(map);
                    map.setView([p.coords.latitude, p.coords.longitude], 13);
                }
                setLocating(false);
            },
            () => {
                setLocNote('مقدرناش نحدد مكانك. لو ضغطت منع بالغلط، فعّل إذن الموقع للموقع ده من إعدادات المتصفح.');
                setLocating(false);
            },
            { timeout: 10000 }
        );
    };

    const current = consoles.find(l => l.number === selected);
    return <Group label="الخريطة" heading="الأجهزة حوالينك">
        <div ref={mapDivRef} className="ajer-map-real" role="application" aria-label="خريطة أماكن الأجهزة في الشيخ زايد و6 أكتوبر" />
        <Caption>خريطة حقيقية من OpenStreetMap. دوس على رقم تشوف تفاصيله. الأماكن تقريبية للتوضيح، مش عنوان المالك بالظبط.</Caption>
        <FileButton variant="secondary" compact pill onClick={showMyLocation} disabled={locating}>{locating ? 'بنحدد مكانك...' : 'أظهر مكاني على الخريطة'}</FileButton>
        {locNote && <Caption>{locNote}</Caption>}
        {current
            ? <ConsoleCard listing={current} onRequest={() => onRequest(current)} />
            : <Callout title="اختار جهاز من الخريطة" tone="note">كل رقم على الخريطة هو جهاز معروض للإيجار.</Callout>}
    </Group>;
}

function RequestPage({ target, hasOpenRequest, busy, onConfirm }: { target: { title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number } | null; hasOpenRequest: boolean; busy: Set<number>; onConfirm: (r: { days: number; rent: number; deposit: number; fromMs: number; delivery: 'pickup' | 'courier'; deliveryFee: number; promo: string; discount: number; payMethod: string }) => void }) {
    const [days, setDays] = useState(2);
    const [fromMs, setFromMs] = useState<number | null>(null);
    const [delivery, setDelivery] = useState<'pickup' | 'courier'>('pickup');
    const [payMethod, setPayMethod] = useState('كاش عند الاستلام');
    const [promoInput, setPromoInput] = useState('');
    const [promo, setPromo] = useState('');
    const [promoError, setPromoError] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [termsOpen, setTermsOpen] = useState(false);
    const [done, setDone] = useState(false);
    if (!target) return <Group label="طلب إيجار" heading="اختار جهاز الأول">
        <Callout title="مفيش جهاز متختار" tone="note">ارجع للإعلانات واختار جهاز أو دراع أو لعبة، وبعدين دوس اطلب إيجار.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
    </Group>;
    const rent = days * target.pricePerDay;
    const discount = promo ? Math.round(rent * (PROMO_CODES[promo] || 0)) : 0;
    const deliveryFee = delivery === 'courier' ? DELIVERY_FEE : 0;
    const total = rent - discount + deliveryFee + target.deposit;
    if (done) {
        return <Group label="طلب إيجار" heading="طلبك اتسجل">
            <Callout title="دي تجربة، مفيش حاجة اتبعتت لحد" tone="note">في النسخة الحقيقية المالك هيأكد معاك الميعاد والمكان، وتقدر تكلمه من أيقونة الشات جنب الطلب في حسابك.</Callout>
            <Facts items={[
                { label: 'الحاجة', value: target.title },
                ...(fromMs !== null ? [{ label: 'يوم الاستلام', value: new Date(fromMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }) }] : []),
                { label: 'المدة', value: yom(days) },
                { label: 'الإيجار', value: `${rent} ج.م` },
                ...(discount ? [{ label: `خصم كود ${promo}`, value: `- ${discount} ج.م` }] : []),
                { label: 'التوصيل', value: deliveryFee ? `${deliveryFee} ج.م` : 'استلام بنفسك، مجانًا' },
                { label: 'التأمين (محجوز عند المنصة)', value: `${target.deposit} ج.م` },
                { label: 'المطلوب عند الاستلام', value: `${total} ج.م` },
                { label: 'طريقة الدفع', value: `${payMethod} (تجريبي)` },
                { label: 'التتبع', value: 'وافقت على جهاز التتبع ضد السرقة' },
                { label: 'العقد', value: 'وافقت على عقد الإيجار والشروط' },
            ]} />
            <Link className="file-button is-compact" data-variant="primary" to="/order">تابع وصول جهازك لايف</Link>
            <Link className="file-button is-compact" data-variant="secondary" to="/profile">شوف طلبك في حسابك</Link>
        </Group>;
    }
    if (hasOpenRequest) return <Group label="طلب إيجار" heading="عندك طلب مفتوح">
        <Callout title="لازم تخلص اللي معاك الأول" tone="warning">مش ممكن تطلب أكتر من طلب في نفس الوقت. خلص أو الغي الطلب اللي عندك من صفحة حسابك، وبعدين اطلب تاني.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/profile">روح لحسابك</Link>
    </Group>;
    const rangeHasBusy = fromMs !== null && Array.from({ length: days }).some((_, i) => busy.has(dayStamp(fromMs) + i * 86400000));
    const ready = accepted && termsAccepted && fromMs !== null && !rangeHasBusy;
    const applyPromo = () => {
        const code = promoInput.trim().toUpperCase();
        if (!code) { setPromo(''); setPromoError(''); return; }
        if (PROMO_CODES[code]) { setPromo(code); setPromoError(''); }
        else { setPromo(''); setPromoError('الكود ده مش صحيح أو خلص. جرب AJER10.'); }
    };
    return <Group label="طلب إيجار" heading={target.title}>
        <Paragraph>{target.ownerLine}</Paragraph>
        <Caption>اختار يوم الاستلام من التقويم. الأيام الرمادي محجوزة ومش بتتاختار.</Caption>
        <AvailabilityCalendar busy={busy} fromMs={fromMs} days={days} onPick={setFromMs} />
        {rangeHasBusy && <Callout title="المدة دي فيها أيام محجوزة" tone="danger">الجهاز مش متاح في كل الأيام دي. قلل عدد الأيام أو اختار يوم بداية تاني.</Callout>}
        <Slider label="عدد الأيام" min={1} max={7} value={days} onChange={(v: number) => setDays(v)} describe={(v: number) => v === 1 ? 'يوم واحد' : yom(v)} />
        <ChoiceRow label="الاستلام" options={[{ value: 'pickup', label: 'استلام بنفسك، مجانًا' }, { value: 'courier', label: `مندوب يوصلك (+${DELIVERY_FEE} ج.م)` }]} value={delivery} onChange={(v: string) => setDelivery(v as 'pickup' | 'courier')} />
        <ChoiceRow label="طريقة الدفع" options={['كاش عند الاستلام', 'فودافون كاش', 'إنستاباي'].map(v => ({ value: v, label: v }))} value={payMethod} onChange={setPayMethod} />
        <Caption>اختيار طريقة الدفع للتوضيح بس، مفيش دفع حقيقي بيحصل في التجربة دي. والتأمين بيتحجز عند المنصة مش عند المالك.</Caption>
        <div className="ajer-promo-row">
            <input className="ajer-promo-input" dir="ltr" placeholder="كود الخصم" value={promoInput} onChange={e => setPromoInput(e.target.value)} aria-label="كود الخصم" />
            <FileButton variant="secondary" compact pill onClick={applyPromo}>طبق</FileButton>
        </div>
        {promo && <Caption>كود {promo} اشتغل: خصم {Math.round((PROMO_CODES[promo] || 0) * 100)} في المية من الإيجار.</Caption>}
        {promoError && <Caption>{promoError}</Caption>}
        <Caption>أكواد تجريبية للتجربة: AJER10 خصم 10 في المية، WELCOME15 خصم 15 في المية.</Caption>
        <Facts items={[
            { label: 'الإيجار', value: `${rent} ج.م` },
            ...(discount ? [{ label: `خصم كود ${promo}`, value: `- ${discount} ج.م` }] : []),
            { label: 'التوصيل', value: deliveryFee ? `${deliveryFee} ج.م` : 'مجانًا' },
            { label: 'التأمين (محجوز عند المنصة)', value: `${target.deposit} ج.م` },
            { label: 'المطلوب عند الاستلام', value: `${total} ج.م` },
        ]} />
        <Callout title="التأمين محجوز عند المنصة" tone="note">التأمين بيتحجز عند أجر كونسول طول مدة الإيجار، وبيرجع لك كامل بعد ما تسلم الجهاز سليم. لو فيه تلف بيتخصم منه بعد المعاينة. ولو رجعت الجهاز قبل المعاد، فرق الأيام بيرجعلك.</Callout>
        <Callout title="الجهاز فيه جهاز تتبع ضد السرقة" tone="warning">صاحب الجهاز يقدر يشوف مكانه عن طريق GPS أو AirTag جواه طول مدة الإيجار. لازم تشوف ده وتوافق عليه قبل ما تأكد الطلب.</Callout>
        <label className="ajer-check">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
            <span>فاهم وموافق إن الجهاز فيه جهاز تتبع ضد السرقة بيشتغل طول مدة الإيجار.</span>
        </label>
        <label className="ajer-check">
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
            <span>قريت <button type="button" className="ajer-linklike" onClick={() => setTermsOpen(true)}>عقد الإيجار والشروط</button> وموافق عليه، بما فيه شروط التلف والتأمين.</span>
        </label>
        <FileButton variant="primary" pill disabled={!ready} onClick={() => { if (!ready) return; onConfirm({ days, rent, deposit: target.deposit, fromMs: fromMs || Date.now(), delivery, deliveryFee, promo, discount, payMethod }); setDone(true); }}>أكد الطلب</FileButton>
        {!ready && <Caption>اختار يوم استلام فاضي من التقويم، ووافق على التتبع وعقد الإيجار عشان تقدر تأكد.</Caption>}
        {termsOpen && <TermsDialog onAccept={() => { setTermsAccepted(true); setTermsOpen(false); }} onClose={() => setTermsOpen(false)} />}
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
            <Callout title="عمولة التطبيق 20 في المية" tone="note">التطبيق بياخد عمولة 20 في المية من سعر الإيجار بس، مش من التأمين. التأمين كله بيرجع للمستأجر.</Callout>
            {(() => { const pv = parseInt(price, 10); if (!Number.isFinite(pv) || pv <= 0) return null; const fee = Math.round(pv * COMMISSION); return <Callout title="احسبها على السعر اللي كتبته" tone="note">لو اليوم بـ {pv} ج.م: عمولة التطبيق {fee} ج.م عن كل يوم، وصافيلك {pv - fee} ج.م في اليوم. يعني لو اتأجر 3 أيام، صافيك {3 * (pv - fee)} ج.م من أصل {3 * pv} ج.م.</Callout>; })()}
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

function OrderPage({ order, onHandover, handoverCheck, onHandoverCheck, onChat }: { order: Order | null; onHandover: () => void; handoverCheck: CondState; onHandoverCheck: (v: CondState) => void; onChat: (name: string, suggestions?: string[]) => void }) {
    const now = useNow(1000);
    if (!order) return <Group label="تتبع طلبك" heading="مفيش طلب شغال دلوقتي">
        <Callout title="لما تطلب جهاز هتلاقي التتبع هنا" tone="note">اطلب جهاز من الإعلانات، وأول ما تؤكد الطلب هتقدر تتابع المندوب خطوة بخطوة من الصفحة دي.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
    </Group>;
    const stage = Math.min(ORDER_STEPS.length - 1, Math.floor((now - order.createdMs) / STEP_MS));
    const arrived = stage === ORDER_STEPS.length - 1;
    const widths = [12, 40, 70, 100];
    return <>
        <Group label="تتبع طلبك" heading={order.title}>
            <Paragraph>{order.owner} · {yom(order.days)} · المطلوب عند الاستلام {order.rent + order.deposit + (order.deliveryFee || 0) - (order.discount || 0)} ج.م{!order.payMethod || order.payMethod === 'كاش عند الاستلام' ? ' كاش' : ` (${order.payMethod} - تجريبي)`}</Paragraph>
            <div className="ajer-progress" role="img" aria-label={`طلبك في خطوة ${stage + 1} من ${ORDER_STEPS.length}`}><div style={{ width: `${widths[stage]}%` }} /></div>
            <div className="ajer-steps">
                {ORDER_STEPS.map((s, i) => <div key={i} className={`ajer-step${i < stage ? ' is-done' : ''}${i === stage ? ' is-now' : ''}`}>
                    <span className="ajer-step-dot">{i < stage ? '✓' : i + 1}</span>
                    <span className="ajer-step-text">{s}</span>
                </div>)}
            </div>
            <Caption>تجربة بسرعة مضاعفة: كل خطوة بتاخد ١٥ ثانية. في النسخة الحقيقية المندوب هو اللي بيحدث الخطوات أول بأول.</Caption>
            {arrived && <>
                <Callout title="المندوب وصل" tone="note">استلم جهازك وراجعه كويس قدام المندوب قبل ما الاستلام يتأكد. التشيك ليست وصور الحالة بتحميك من أي خلاف على التلف بعد كده.</Callout>
                <h3 className="ajer-subhead">تشيك ليست حالة الجهاز عند الاستلام</h3>
                <ConditionChecklist value={handoverCheck} onChange={onHandoverCheck} />
                {condComplete(handoverCheck)
                    ? <Link className="file-button" data-variant="primary" to="/profile" onClick={onHandover}>تأكيد الاستلام (زرار المندوب)</Link>
                    : <FileButton variant="primary" pill disabled>تأكيد الاستلام (زرار المندوب)</FileButton>}
                {!condComplete(handoverCheck) && <Caption>علم على كل نقاط التشيك ليست وضيف صورة واحدة على الأقل للجهاز عشان يتأكد الاستلام.</Caption>}
                <Caption>في النسخة الحقيقية الزرار ده بيظهر للمندوب لما يسلمك الجهاز، وأول ما يدوسه العداد بتاعك بيبدأ.</Caption>
            </>}
        </Group>
        <Group label="المندوب معاك طول الطريق" heading={COURIER.name}>
            <Facts items={[
                { label: 'الاسم', value: COURIER.name },
                { label: 'موبايل', value: COURIER.phone },
                { label: 'الحالة', value: ORDER_STEPS[stage] },
            ]} />
            <div className="ajer-card-actions">
                <a className="file-button is-compact" data-variant="primary" href={`tel:${COURIER.phone}`}>اتصل بالمندوب</a>
                <FileButton variant="secondary" compact pill onClick={() => onChat(COURIER.name, COURIER_CHAT_SUGGESTIONS)}>ابعتله رسالة</FileButton>
            </div>
            <Caption>مندوب تجريبي ببيانات وهمية. في النسخة الحقيقية بيبقى مندوب أجر كونسول وتقدر تكلمه أو تبعتله في أي وقت لحد ما تستلم.</Caption>
        </Group>
    </>;
}

function ActiveRental({ rental, onReturn, onClear, returnCheck, onReturnCheck, onChat }: { rental: Rental; onReturn: () => void; onClear: () => void; returnCheck: CondState; onReturnCheck: (v: CondState) => void; onChat: (name: string, suggestions?: string[]) => void }) {
    const now = useNow(30000);
    const endMs = rental.startMs + rental.days * 86400000;
    const remainMs = Math.max(0, endMs - now);
    const remDays = Math.floor(remainMs / 86400000);
    const remHours = Math.floor((remainMs % 86400000) / 3600000);
    const remMins = Math.floor((remainMs % 3600000) / 60000);
    const usedMs = now - rental.startMs;
    const usedDays = Math.min(rental.days, Math.max(1, Math.ceil(usedMs / 86400000)));
    const refund = Math.max(0, (rental.days - usedDays) * rental.pricePerDay);
    const frac = Math.max(0, Math.min(1, remainMs / (rental.days * 86400000)));
    const remainLabel = remDays > 0 ? `${yom(remDays)} و${remHours} ساعة` : `${remHours} ساعة و${remMins} دقيقة`;
    return <Group label="إيجارك الحالي" heading={rental.title}>
        {rental.returned ? <>
            <Callout title="اتسجل إرجاع بدري (تجريبي)" tone="note">المفروض يرجعلك {refund} ج.م من {rental.owner} فرق الأيام الباقية، غير التأمين.</Callout>
            <FileButton variant="ghost" compact onClick={onClear}>إنهاء الإيجار ومسحه</FileButton>
        </> : <>
            <CountdownRing frac={frac} label={remainLabel} sub="فاضل على الإرجاع" />
            <Facts items={[
                { label: 'المالك', value: rental.owner },
                { label: 'موبايل المالك', value: rental.ownerPhone },
                { label: 'المدة', value: yom(rental.days) },
                { label: 'التتبع', value: 'وافقت على جهاز التتبع ضد السرقة' },
            ]} />
            <div className="ajer-card-actions">
                <a className="file-button is-compact" data-variant="primary" href={`tel:${rental.ownerPhone}`}>اتصل بالمالك</a>
                <FileButton variant="secondary" compact pill onClick={() => onChat(rental.owner, OWNER_CHAT_SUGGESTIONS)}>كلم {rental.owner}</FileButton>
            </div>
            <Caption>لو الجهاز محتاج باسورد عشان يتفتح، أو عايز تستأذن تضيف الأكونت بتاعك، كلم المالك من هنا.</Caption>
            <Callout title="لو رجعته بدري" tone="warning">لو سلمته دلوقتي بيرجعلك حوالي {refund} ج.م فرق الأيام الباقية، والتأمين المحجوز عند المنصة بيرجع لك كامل بعد معاينة المالك للجهاز.</Callout>
            <h3 className="ajer-subhead">تشيك ليست حالة الجهاز عند الإرجاع</h3>
            <ConditionChecklist value={returnCheck} onChange={onReturnCheck} />
            <FileButton variant="secondary" compact pill disabled={!condComplete(returnCheck)} onClick={() => { if (condComplete(returnCheck)) onReturn(); }}>سجل إرجاع بدري</FileButton>
            {!condComplete(returnCheck) && <Caption>كمّل تشيك ليست الإرجاع وضيف صورة واحدة على الأقل عشان تسجل الإرجاع.</Caption>}
        </>}
        <Caption>العداد بيعد لحظة بلحظة من لحظة الاستلام.</Caption>
    </Group>;
}

function ProfileForm({ initial, submitLabel, onSave }: { initial: UserProfile | null; submitLabel: string; onSave: (p: UserProfile) => void }) {
    const [name, setName] = useState(initial?.name || '');
    const [age, setAge] = useState(initial?.age || '');
    const [phone, setPhone] = useState(initial?.phone || '');
    const [avatar, setAvatar] = useState(initial?.avatar || AVATARS[0]);
    const [address, setAddress] = useState(initial?.address || '');
    const [idPhoto, setIdPhoto] = useState(initial?.idPhoto || '');
    const [error, setError] = useState('');
    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 480 / img.width);
                const c = document.createElement('canvas');
                c.width = Math.round(img.width * scale);
                c.height = Math.round(img.height * scale);
                const ctx = c.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);
                setIdPhoto(c.toDataURL('image/jpeg', 0.7));
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(f);
    };
    const save = () => {
        const a = parseInt(age, 10);
        if (name.trim().length < 2) { setError('اكتب اسمك الأول.'); return; }
        if (!Number.isFinite(a) || a < 10 || a > 100) { setError('اكتب سنك بالأرقام.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { setError('اكتب رقم موبايل صحيح من 11 رقم.'); return; }
        if (address.trim().length < 3) { setError('اكتب عنوانك (المنطقة والحي).' ); return; }
        if (!idPhoto) { setError('ضيف صورة البطاقة الأول، مطلوبة للأمان.'); return; }
        setError('');
        onSave({ name: name.trim(), age: String(a), phone: phone.trim(), avatar, address: address.trim(), idPhoto });
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
        <div className="ajer-idphoto">
            <span className="ajer-idphoto-label">صورة البطاقة (إثبات شخصية)</span>
            <label className="ajer-idphoto-drop">
              {idPhoto ? "غيّر صورة البطاقة" : "ارفع صورة البطاقة من موبايلك"}
              <input type="file" accept="image/*" onChange={pickPhoto} aria-label="ارفع صورة البطاقة" style={{ display: "none" }} />
            </label>
            {idPhoto ? <img className="ajer-idphoto-preview" src={idPhoto} alt="صورة البطاقة اللي رفعتها" /> : null}
        </div>
        <Caption>صورة البطاقة مطلوبة عشان الأمان، ومبيشوفهاش أي مستخدم خالص - إدارة التطبيق بس اللي بتشوفها.</Caption>
        {error && <Callout title="راجع البيانات" tone="danger">{error}</Callout>}
        <FileButton variant="primary" pill onClick={save}>{submitLabel}</FileButton>
        <Caption>بياناتك بتفضل على جهازك بس في التجربة دي، ومبتتشاركش مع حد.</Caption>
    </>;
}

function ProfilePage({ profile, requests, myListings, rental, returnCheck, onReturnCheck, onEditProfile, onReturn, onClearRental, onCancelRequest, onDeleteListing, onChat, onTrack, onLenderAnswer, onPickedUp, onSupport, onComplain }: {
    profile: UserProfile; requests: Request[]; myListings: ConsoleListing[]; rental: Rental | null;
    returnCheck: CondState; onReturnCheck: (v: CondState) => void;
    onEditProfile: () => void; onReturn: () => void; onClearRental: () => void; onCancelRequest: (id: string) => void;
    onDeleteListing: (id: string) => void; onChat: (name: string, suggestions?: string[]) => void; onTrack: (l: ConsoleListing) => void;
    onLenderAnswer: (id: string, available: boolean) => void; onPickedUp: (id: string) => void; onSupport: () => void; onComplain: () => void;
}) {
    const now = useNow(5000);
    useEffect(() => {
        myListings.forEach(l => { if (l.status === 'courier' && l.courierMs !== undefined && l.courierMs <= now) onPickedUp(l.id); });
    }, [now]);
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
        {rental && <ActiveRental rental={rental} onReturn={onReturn} onClear={onClearRental} returnCheck={returnCheck} onReturnCheck={onReturnCheck} onChat={onChat} />}
        {requests.length > 0 && <Group label="طلباتك" heading>
            {requests.map(r => <div key={r.id} className="ajer-card">
                <div className="ajer-card-body">
                    <div className="ajer-card-title">إعلان رقم {r.listingNumber}: {r.title}</div>
                    <div className="ajer-muted">{r.owner} · {yom(r.days)} · إيجار <bdi>{r.rent}</bdi> ج.م وتأمين <bdi>{r.deposit}</bdi> ج.م · كاش عند الاستلام</div>
                    <div className="ajer-card-actions">
                        <Link className="file-button is-compact" data-variant="primary" to="/order">تتبع طلبك لايف</Link>
                        <FileButton variant="secondary" compact pill onClick={() => onChat(r.owner)}>كلم {r.owner}</FileButton>
                        <FileButton variant="ghost" compact onClick={() => onCancelRequest(r.id)}>الغي الطلب</FileButton>
                    </div>
                </div>
            </div>)}
            <Caption>طلبات تجريبية محفوظة على جهازك بس.</Caption>
        </Group>}
        {myListings.length > 0 && <Group label="إعلاناتك" heading>
            {myListings.map(l => {
                const requested = l.status === 'open' && l.requestAt !== undefined && l.requestAt <= now;
                return <div key={l.id}>
                    {requested && <div className="ajer-notice">
                        <div className="ajer-card-title">حد عايز يأجر جهازك</div>
                        <div className="ajer-muted">مستأجر طلب {l.title} لمدة يومين. جهازك متاح للإيجار دلوقتي؟</div>
                        <div className="ajer-card-actions">
                            <FileButton variant="primary" compact pill onClick={() => onLenderAnswer(l.id, true)}>متاح</FileButton>
                            <FileButton variant="ghost" compact onClick={() => onLenderAnswer(l.id, false)}>مش متاح دلوقتي</FileButton>
                        </div>
                    </div>}
                    <ConsoleCard listing={l} onDelete={l.status === 'rented' ? undefined : onDeleteListing} onTrack={() => onTrack(l)} />
                    {l.status === 'courier' && <div className="ajer-status-line"><span className="ajer-dot ajer-dot-pink" />المندوب في طريقه يستلم الجهاز منك</div>}
                    {l.status === 'rented' && <div className="ajer-status-line"><span className="ajer-dot ajer-dot-red" />قيد الإيجار{l.dueMs ? ` · بيرجع يوم ${new Date(l.dueMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}</div>}
                </div>;
            })}
            <Caption>الإعلان المؤجر بيختفي من صفحة الإعلانات العامة، وانت بس اللي شايفه هنا. تقدر تتبع مكان جهازك طول ما هو بره.</Caption>
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
        <Group label="خدمة العملاء" heading>
            <Paragraph>عندك مشكلة أو سؤال؟ كلم الدعم في أي وقت، أو قدم شكوى رسمية والإدارة تراجعها.</Paragraph>
            <div className="ajer-card-actions">
                <FileButton variant="secondary" compact pill onClick={onSupport}>كلم الدعم</FileButton>
                <FileButton variant="ghost" compact onClick={onComplain}>قدم شكوى</FileButton>
            </div>
        </Group>
    </>;
}

function ComplaintDialog({ from, onSubmit, onClose }: { from: string; onSubmit: (subject: string, detail: string) => void; onClose: () => void }) {
    const [subject, setSubject] = useState('');
    const [detail, setDetail] = useState('');
    const [sent, setSent] = useState(false);
    const submit = () => {
        if (subject.trim().length < 3 || detail.trim().length < 5) return;
        onSubmit(subject.trim(), detail.trim());
        setSent(true);
    };
    return <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="تقديم شكوى">
        <div className="ajer-sheet">
            <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="ajer-sheet-title">قدم شكوى</h2>
            {sent ? <>
                <Callout title="شكواك وصلت للإدارة" tone="note">الإدارة هتراجعها وترد عليك في شات الدعم. رقم الشكوى عندك في حسابك.</Callout>
                <FileButton variant="primary" pill onClick={onClose}>تمام</FileButton>
            </> : <>
                <TextField label="موضوع الشكوى" value={subject} onChange={(v: string) => setSubject(v)} />
                <TextField label="اشرح المشكلة بالتفصيل" value={detail} onChange={(v: string) => setDetail(v)} />
                <FileButton variant="primary" pill disabled={subject.trim().length < 3 || detail.trim().length < 5} onClick={submit}>ابعت الشكوى</FileButton>
                <Caption>الشكوى بتتسجل باسمك ({from}) وبتوصل لإدارة التطبيق.</Caption>
            </>}
        </div>
    </div>;
}

function AdminPage({ profile, myListings, requests, order, complaints, admin, onDeleteUser, onAddUser, onCloseComplaint }: {
    profile: UserProfile; myListings: ConsoleListing[]; requests: Request[]; order: Order | null; complaints: Complaint[];
    admin: AdminState; onDeleteUser: (id: string) => void; onAddUser: (u: AdminUser) => void; onCloseComplaint: (id: string) => void;
}) {
    const [selected, setSelected] = useState<AdminUser | 'me' | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const users = [...SEED_USERS.filter(u => !admin.deletedIds.includes(u.id)), ...admin.addedUsers.filter(u => !admin.deletedIds.includes(u.id))];
    const allComplaints = [...complaints, ...SEED_COMPLAINTS];
    const openComplaints = allComplaints.filter(c => c.status === 'مفتوحة' && !admin.closedIds.includes(c.id));
    const rentedCount = myListings.filter(l => l.status === 'rented').length;
    const addUser = () => {
        if (newName.trim().length < 2 || newPhone.replace(/\D/g, '').length < 10) return;
        onAddUser({ id: `a${Date.now()}`, name: newName.trim(), phone: newPhone.trim(), area: '—', age: '—', joined: 'النهارده', status: 'نشط', listings: 0, rentals: 0 });
        setNewName('');
        setNewPhone('');
        setShowAdd(false);
    };
    return <>
        <Group label="لوحة الإدارة" heading="نظرة عامة">
            <Facts items={[
                { label: 'المستخدمين المسجلين', value: `${users.length + 1}` },
                { label: 'طلبات شغالة دلوقتي', value: `${(order ? 1 : 0) + 2} (فيه تجريبي)` },
                { label: 'أجهزة قيد الإيجار', value: `${rentedCount + 3} (فيه تجريبي)` },
                { label: 'شكاوى مفتوحة', value: `${openComplaints.length}` },
            ]} />
            <Callout title="لوحة تحكم تجريبية" tone="warning">الأرقام والمستخدمين هنا أغلبهم بيانات وهمية للتوضيح. في النسخة الحقيقية كل حاجة بتتسجل لحظة بلحظة على السيرفر.</Callout>
        </Group>
        <Group label="المستخدمين" heading={`${users.length + 1} مسجل`}>
            <div className="ajer-card ajer-user-row" role="button" tabIndex={0} onClick={() => setSelected('me')} onKeyDown={e => { if (e.key === 'Enter') setSelected('me'); }}>
                <div className="ajer-card-body">
                    <div className="ajer-card-title">{profile.name} <span className="ajer-badge">أنت</span></div>
                    <div className="ajer-muted"><bdi>{profile.phone}</bdi> · {profile.address} · {myListings.length} إعلان</div>
                </div>
            </div>
            {users.map(u => <div key={u.id} className="ajer-card ajer-user-row" role="button" tabIndex={0} onClick={() => setSelected(u)} onKeyDown={e => { if (e.key === 'Enter') setSelected(u); }}>
                <div className="ajer-card-body">
                    <div className="ajer-card-title">{u.name}{u.status !== 'نشط' ? <span className="ajer-muted"> · {u.status}</span> : null}</div>
                    <div className="ajer-muted"><bdi>{u.phone}</bdi> · {u.area}</div>
                    <div className="ajer-muted">سجل يوم {u.joined} · {u.listings} إعلان · {u.rentals} إيجار</div>
                </div>
            </div>)}
            {showAdd ? <div className="ajer-card"><div className="ajer-card-body">
                <TextField label="اسم المستخدم" value={newName} onChange={(v: string) => setNewName(v)} />
                <TextField label="رقم موبايله" value={newPhone} onChange={(v: string) => setNewPhone(v)} />
                <div className="ajer-card-actions">
                    <FileButton variant="primary" compact pill onClick={addUser}>احفظ الحساب</FileButton>
                    <FileButton variant="ghost" compact onClick={() => setShowAdd(false)}>إلغاء</FileButton>
                </div>
            </div></div> : <FileButton variant="secondary" compact pill onClick={() => setShowAdd(true)}>أضف حساب جديد</FileButton>}
        </Group>
        <Group label="الطلبات والإيجارات الحالية" heading>
            <Rows>
                {order ? <Row number={1} name={`${order.title} (طلبك التجريبي)`} detail={`المستأجر: ${profile.name} · المالك: ${order.owner}`} value="شغال" valueKnown /> : null}
                <Row number={order ? 2 : 1} name="بلايستيشن 5 ديجيتال" detail="المستأجر: عمر ج. · المالك: كريم م." value="المندوب في الطريق" valueKnown />
                <Row number={order ? 3 : 2} name="بلايستيشن 4 برو" detail="المستأجر: سارة م. · المالك: تامر ع." value="قيد الإيجار" valueKnown />
            </Rows>
            <Caption>الطلبات دي تجريبية للتوضيح، ما عدا طلبك لو عندك طلب شغال.</Caption>
        </Group>
        <Group label="الشكاوى" heading={`${allComplaints.length} شكوى`}>
            {allComplaints.length === 0 && <Caption>مفيش شكاوى لحد دلوقتي.</Caption>}
            {allComplaints.map(c => {
                const closed = c.status !== 'مفتوحة' || admin.closedIds.includes(c.id);
                return <div key={c.id} className="ajer-card"><div className="ajer-card-body">
                    <div className="ajer-card-title">{c.subject}</div>
                    <div className="ajer-muted">من {c.from} · {c.date}</div>
                    <div className="ajer-muted">{c.detail}</div>
                    <div className="ajer-card-actions">
                        <span className={closed ? 'ajer-chip' : 'ajer-chip ajer-chip-open'}>{closed ? 'مقفولة' : 'مفتوحة'}</span>
                        {!closed && <FileButton variant="ghost" compact onClick={() => onCloseComplaint(c.id)}>اقفل الشكوى</FileButton>}
                    </div>
                </div></div>;
            })}
        </Group>
        <Group label="سجل الدخول والخروج" heading>
            <Rows>
                <Row number={1} name={`${profile.name} (أنت)`} detail="سجل دخول" value="دلوقتي" valueKnown />
                {SEED_LOG.map((line, i) => <Row key={i} number={i + 2} name={line} detail="" value="" />)}
            </Rows>
        </Group>
        {selected !== null && <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="بيانات المستخدم" onClick={() => setSelected(null)}>
            <div className="ajer-sheet" onClick={e => e.stopPropagation()}>
                <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={() => setSelected(null)} /></div>
                {selected === 'me' ? <>
                    <h2 className="ajer-sheet-title">{profile.name} (أنت)</h2>
                    <Facts items={[
                        { label: 'الموبايل', value: profile.phone },
                        { label: 'السن', value: `${profile.age} سنة` },
                        { label: 'العنوان', value: profile.address },
                        { label: 'إعلاناته', value: `${myListings.length}` },
                        { label: 'طلباته المفتوحة', value: `${requests.length}` },
                    ]} />
                    {profile.idPhoto ? <img className="ajer-idphoto-full" src={profile.idPhoto} alt="صورة بطاقة المستخدم" /> : <div className="ajer-idphoto-empty">لسه ما رفعش صورة بطاقة</div>}
                    <Caption>صورة البطاقة بتظهر هنا في لوحة الإدارة بس، مبيشوفهاش أي مستخدم تاني.</Caption>
                </> : (() => { const u = selected as AdminUser; return <>
                    <h2 className="ajer-sheet-title">{u.name}</h2>
                    <Facts items={[
                        { label: 'الموبايل', value: u.phone },
                        { label: 'العنوان', value: u.area },
                        { label: 'سجل يوم', value: u.joined },
                        { label: 'الحالة', value: u.status },
                        { label: 'إعلاناته', value: `${u.listings}` },
                        { label: 'إيجاراته', value: `${u.rentals}` },
                    ]} />
                    <div className="ajer-idphoto-empty">صورة بطاقة تجريبية للتوضيح</div>
                    <div className="ajer-card-actions">
                        <FileButton variant="ghost" compact onClick={() => { onDeleteUser(u.id); setSelected(null); }}>احذف الحساب</FileButton>
                    </div>
                </>; })()}
            </div>
        </div>}
    </>;
}

function Drawer({ open, profile, myCount, onClose, onGuide, onSupport }: { open: boolean; profile: UserProfile | null; myCount: number; onClose: () => void; onGuide: () => void; onSupport: () => void }) {
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
                {item('/order', 'تتبع طلبك')}
                {item('/add', 'أضف إعلانك')}
                {item('/profile', `إعلاناتي${myCount ? ` (${myCount})` : ''}`)}
                {item('/profile', 'حسابك')}
                {item('/admin', 'لوحة الإدارة')}
                <button type="button" className="ajer-drawer-link ajer-drawer-btn" onClick={() => { onClose(); onSupport(); }}>خدمة العملاء</button>
                <button type="button" className="ajer-drawer-link ajer-drawer-btn" onClick={() => { onClose(); onGuide(); }}>طريقة الاستخدام</button>
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
    const [order, setOrder, orderSaved] = useLocalState('ajer-order.v1', null as Order | null);
    const [rental, setRental, rentalSaved] = useLocalState('ajer-rental.v2', null as Rental | null);
    const [requestTarget, setRequestTarget] = useState<{ title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number } | null>(null);
    const [chatWith, setChatWith] = useState<ChatTarget | null>(null);
    const [tracking, setTracking] = useState<ConsoleListing | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [detail, setDetail] = useState<ConsoleListing | null>(null);
    const [editProfile, setEditProfile] = useState(false);
    const [complaints, setComplaints, complaintsSaved] = useLocalState('ajer-complaints.v1', [] as Complaint[]);
    const [bookings, setBookings, bookingsSaved] = useLocalState('ajer-bookings.v1', [] as BookingRange[]);
    const [handoverCheck, setHandoverCheck, handoverCheckSaved] = useLocalState('ajer-check-handover.v1', EMPTY_COND as CondState);
    const [returnCheck, setReturnCheck, returnCheckSaved] = useLocalState('ajer-check-return.v1', EMPTY_COND as CondState);
    const [admin, setAdmin, adminSaved] = useLocalState('ajer-admin.v1', { addedUsers: [], deletedIds: [], closedIds: [] } as AdminState);
    const [complaintOpen, setComplaintOpen] = useState(false);
    const myListings = myListingsRaw.map(withDefaults);
    const requests: Request[] = requestsRaw.map(r => ({ owner: 'المالك', ...r }));
    const consoles = [...SEED_CONSOLES, ...myListings].filter(l => l.status !== 'rented');
    const addListing = (data: Omit<ConsoleListing, 'id' | 'number' | 'rating' | 'reviews'>) => {
        if (!listingsSaved.ready) return;
        const nextNumber = Math.max(consoles.reduce((m, l) => Math.max(m, l.number), 0), ...SEED_GEAR.map(g => g.number)) + 1;
        setMyListings([...myListingsRaw, { ...data, id: `m${Date.now()}`, number: nextNumber, rating: 0, reviews: 0 }]);
    };
    const requestConsole = (l: ConsoleListing) => setRequestTarget({ title: l.title, owner: l.owner, ownerLine: `${l.owner} · ${areaName(l.area)}، ${l.district}`, pricePerDay: l.pricePerDay, deposit: l.deposit, number: l.number });
    const requestGear = (g: GearItem) => setRequestTarget({ title: g.title, owner: g.owner, ownerLine: `${g.owner} · ${areaName(g.area)}، ${g.district}`, pricePerDay: g.pricePerDay, deposit: g.deposit, number: g.number });
    const ready = listingsSaved.ready && requestsSaved.ready && profileSaved.ready && orderSaved.ready && rentalSaved.ready && complaintsSaved.ready && adminSaved.ready && bookingsSaved.ready && handoverCheckSaved.ready && returnCheckSaved.ready;
    useEffect(() => {
        if (!listingsSaved.ready) return;
        if (myListingsRaw.some(l => l.requestAt === undefined || l.status === undefined)) {
            setMyListings(myListingsRaw.map(l => ({ status: 'open', requestAt: Date.now() + 30000, ...l })));
        }
    }, [listingsSaved.ready]);
    const lenderAnswer = (id: string, available: boolean) => {
        if (!listingsSaved.ready) return;
        setMyListings(myListingsRaw.map(l => l.id === id
            ? (available ? { ...l, status: 'courier', courierMs: Date.now() + 30000 } : { ...l, requestAt: Date.now() + 60000 })
            : l));
    };
    const pickedUp = (id: string) => {
        if (!listingsSaved.ready) return;
        const next = myListingsRaw.map(l => l.id === id ? { ...l, status: 'rented', dueMs: Date.now() + 2 * 86400000 } : l);
        setMyListings(next);
        const found = next.map(withDefaults).find(l => l.id === id);
        if (found) setTracking(found);
    };
    const submitComplaint = (subject: string, detail: string) => {
        if (!complaintsSaved.ready || !profile) return;
        setComplaints([...complaints, { id: `u${Date.now()}`, from: profile.name, subject, detail, status: 'مفتوحة', date: 'النهارده' }]);
    };
    const deleteUser = (id: string) => adminSaved.ready && setAdmin({ ...admin, deletedIds: [...admin.deletedIds, id] });
    const addUser = (u: AdminUser) => adminSaved.ready && setAdmin({ ...admin, addedUsers: [...admin.addedUsers, u] });
    const closeComplaint = (id: string) => adminSaved.ready && setAdmin({ ...admin, closedIds: [...admin.closedIds, id] });
    const openSupport = () => setChatWith({ name: SUPPORT_NAME, suggestions: SUPPORT_SUGGESTIONS });
    const handover = () => {
        if (!order || !rentalSaved.ready) return;
        setRental({ title: order.title, owner: order.owner, ownerPhone: order.ownerPhone, pricePerDay: order.pricePerDay, days: order.days, startMs: Date.now(), returned: false });
        if (requestsSaved.ready) setRequests(requestsRaw.filter(r => r.id !== order.requestId));
        if (orderSaved.ready) setOrder(null);
    };
    return <FileCard lang="ar" dir="rtl">
        <div className="ajer-app">
        {ready && !profile ? <>
            <Header title="NEXUS" fact="نسخة تجريبية 0.9" intro="قبل ما تبدأ، عرفنا بنفسك: بياناتك بتفضل على جهازك بس في التجربة دي." />
            <Group label="بياناتك" heading="معلوماتك الأساسية">
                <ProfileForm initial={null} submitLabel="احفظ وابدأ" onSave={(p) => setProfile(p)} />
            </Group>
        </> : <>
        <div className="ajer-topbar">
            <button type="button" className="ajer-menu-btn" aria-label="افتح القائمة" onClick={() => setMenuOpen(true)}>⋮</button>
        </div>
        <Header title="NEXUS" fact="نسخة تجريبية 0.9" intro="وسيط بين اللي عنده بلايستيشن واللي عايز يلعب: اختار أقرب جهاز أو دراع أو لعبة، كلم صاحبها، وادفع كاش عند الاستلام." />
        <Callout title="دي نسخة تجريبية" tone="warning">كل الأجهزة والأسعار والتقييمات هنا بيانات وهمية للتوضيح، ومفيش حجز أو دفع حقيقي بيحصل من الصفحة دي.</Callout>
        <Drawer open={menuOpen} profile={profile} myCount={myListings.length} onClose={() => setMenuOpen(false)} onGuide={() => setGuideOpen(true)} onSupport={openSupport} />
        <Routes>
            <Route path="/" element={<Home consoles={consoles} gear={SEED_GEAR} onOpenConsole={setDetail} onRequestGear={requestGear} onChat={(n) => setChatWith({ name: n })} />} />
            <Route path="/map" element={<MapPage consoles={consoles} onRequest={requestConsole} />} />
            <Route path="/add" element={<AddPage onAdd={addListing} blocked={!!rental && !rental.returned} />} />
            <Route path="/admin" element={profile ? <AdminPage profile={profile} myListings={myListings} requests={requests} order={order} complaints={complaints} admin={admin} onDeleteUser={deleteUser} onAddUser={addUser} onCloseComplaint={closeComplaint} /> : <Group label="لوحة الإدارة" heading="سجل بياناتك الأول"><Callout title="لسه مفيش بيانات" tone="note">ارجع للصفحة الرئيسية واملأ بياناتك الأول.</Callout></Group>} />
            <Route path="/detail" element={<ConsoleDetailPage listing={detail} busy={detail ? busyDaysFor(detail.number, bookings) : new Set<number>()} onRequest={() => detail && requestConsole(detail)} onChat={(n) => setChatWith({ name: n })} />} />
            <Route path="/order" element={<OrderPage order={order} onHandover={handover} handoverCheck={handoverCheck} onHandoverCheck={setHandoverCheck} onChat={(n, s) => setChatWith({ name: n, suggestions: s })} />} />
            <Route path="/request" element={<RequestPage target={requestTarget} hasOpenRequest={requests.length > 0} busy={requestTarget ? busyDaysFor(requestTarget.number, bookings) : new Set<number>()} onConfirm={(r) => { if (requestsSaved.ready && orderSaved.ready && requestTarget) { const reqId = `r${Date.now()}`; setRequests([...requestsRaw, { id: reqId, listingNumber: requestTarget.number, title: requestTarget.title, owner: requestTarget.owner, days: r.days, rent: r.rent, deposit: r.deposit, fromMs: r.fromMs, delivery: r.delivery, deliveryFee: r.deliveryFee, promo: r.promo, discount: r.discount, payMethod: r.payMethod }]); setOrder({ id: `o${Date.now()}`, requestId: reqId, title: requestTarget.title, owner: requestTarget.owner, ownerPhone: DEMO_OWNER_PHONE, pricePerDay: requestTarget.pricePerDay, days: r.days, rent: r.rent, deposit: r.deposit, createdMs: Date.now(), fromMs: r.fromMs, delivery: r.delivery, deliveryFee: r.deliveryFee, promo: r.promo, discount: r.discount, payMethod: r.payMethod }); if (bookingsSaved.ready) setBookings([...bookings, { listingNumber: requestTarget.number, fromMs: r.fromMs, days: r.days }]); } }} />} />
            <Route path="/profile" element={profile ? <ProfilePage profile={profile} requests={requests} myListings={myListings} rental={rental} returnCheck={returnCheck} onReturnCheck={setReturnCheck} onEditProfile={() => setEditProfile(true)} onReturn={() => rentalSaved.ready && rental && setRental({ ...rental, returned: true })} onClearRental={() => rentalSaved.ready && setRental(null)} onCancelRequest={(id) => { if (requestsSaved.ready) setRequests(requestsRaw.filter(r => r.id !== id)); if (orderSaved.ready && order && order.requestId === id) setOrder(null); }} onDeleteListing={(id) => listingsSaved.ready && setMyListings(myListingsRaw.filter(l => l.id !== id))} onChat={(n, s) => setChatWith({ name: n, suggestions: s })} onTrack={setTracking} onLenderAnswer={lenderAnswer} onPickedUp={pickedUp} onSupport={openSupport} onComplain={() => setComplaintOpen(true)} /> : <Group label="حسابك" heading="سجل بياناتك الأول"><Callout title="لسه مفيش بيانات" tone="note">ارجع للصفحة الرئيسية واملأ بياناتك الأول.</Callout></Group>} />
        </Routes>
        <BottomNav onGuide={() => setGuideOpen(true)} />
        {guideOpen && <GuideDialog onClose={() => setGuideOpen(false)} />}
        {complaintOpen && profile && <ComplaintDialog from={profile.name} onSubmit={submitComplaint} onClose={() => setComplaintOpen(false)} />}
        {chatWith && <ChatDialog name={chatWith.name} suggestions={chatWith.suggestions} onClose={() => setChatWith(null)} />}
        {tracking && <TrackingDialog title={tracking.title} onClose={() => setTracking(null)} />}
        {editProfile && profile && <div className="ajer-overlay" role="dialog" aria-modal="true" aria-label="تعديل بياناتك">
            <div className="ajer-sheet">
                <div className="ajer-sheet-close"><CloseButton label="إغلاق" onClick={() => setEditProfile(false)} /></div>
                <h2 className="ajer-sheet-title">عدل بياناتك</h2>
                <ProfileForm initial={profile} submitLabel="احفظ التعديل" onSave={(p) => { setProfile(p); setEditProfile(false); }} />
            </div>
        </div>}
        {(() => { const msgs = [...new Set([listingsSaved.message, requestsSaved.message, profileSaved.message, orderSaved.message, rentalSaved.message].filter(Boolean))]; return ready && msgs.length ? <Caption>{msgs.join(' ')}</Caption> : null; })()}
        <Caption>صور الأجهزة: بلايستيشن 5 بواسطة Soberian وبلايستيشن 4 بواسطة Evan-Amos والدراع بواسطة Viper polo، عبر ويكيميديا كومنز. أغلفة الألعاب رسوم توضيحية.</Caption>
        <Closing>نسخة تجريبية 0.9. اتعملت 26 نوفمبر 2026. مفيش طلبات حقيقية اتبعتت.</Closing>
        </>}
        </div>
    </FileCard>;
}
