import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
    useAuthUser, useProfile, useDevices, useOrders, useMyChats, useMessages, useComplaints, useAllUsers,
    fbSignUp, fbSignIn, fbSignOut, fbSaveProfile, fbAddDevice, fbUpdateDevice, fbDeleteDevice, useExactLocations,
    fbCreateOrder, fbUpdateOrder, fbDeleteOrder, fbOpenChat, fbSendMessage, fbAddComplaint, fbCloseComplaint, fbDeleteUser,
    authErrorAr, dmChannelId, orderChannelId, ORDER_BUSY,
    type DeviceDoc, type OrderDoc, type OrderStatus, type ChatDoc, type ProfileDoc, type AdminUserDoc, type ComplaintDoc,
} from './fb';
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
import xboxPhoto from './photos/xbox.jpg';
import xboxpadPhoto from './photos/xboxpad.jpg';

type ConsoleListing = {
    id: string; number: number; kind: 'PS5' | 'PS4' | 'Xbox'; title: string; owner: string;
    area: 'زايد' | 'أكتوبر'; district: string;
    pricePerDay: number; deposit: number; rating: number; reviews: number; delivery: boolean;
    model: string; storage: string; controllers: number; games: string[]; includes: string;
    photoKey?: string; mine?: boolean; ownerId?: string; photoData?: string; createdAt?: number;
    lat?: number; lng?: number;
    status?: 'open' | 'courier' | 'rented'; requestAt?: number; courierMs?: number; dueMs?: number;
};

type Request = { id: string; listingNumber: number; title: string; owner: string; days: number; rent: number; deposit: number; fromMs?: number; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string };
type BookingRange = { listingNumber: number; fromMs: number; days: number };
type CondState = { checks: boolean[]; photos: string[] };
type UserProfile = { name: string; age: string; phone: string; avatar: string; address: string; photo?: string; idPhoto?: string };
type ChatMsg = { me: boolean; text: string };
type Complaint = { id: string; from: string; subject: string; detail: string; status: string; date: string };
type AdminUser = { id: string; name: string; phone: string; area: string; age: string; joined: string; status: string; listings: number; rentals: number };
type AdminState = { addedUsers: AdminUser[]; deletedIds: string[]; closedIds: string[] };
type Order = { id: string; requestId: string; title: string; owner: string; ownerPhone: string; pricePerDay: number; days: number; rent: number; deposit: number; createdMs: number; fromMs?: number; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string; courierAccepted?: boolean };
type Rental = { title: string; owner: string; ownerPhone: string; pricePerDay: number; days: number; startMs: number; returned: boolean; channelId?: string };
type ChatTarget = { name: string; suggestions?: string[]; channelId?: string };

const PHOTOS: Record<string, string> = { ps5: ps5Photo, ps4: ps4Photo, dualsense: dualsensePhoto, fc: fcPhoto, god: godPhoto, spiderman: spidermanPhoto, xbox: xboxPhoto, xboxpad: xboxpadPhoto };
const KIND_ALT: Record<string, string> = { PS5: 'جهاز بلايستيشن 5 مع ذراع تحكم', PS4: 'جهاز بلايستيشن 4 مع ذراع تحكم', Xbox: 'جهاز إكس بوكس مع ذراع تحكم' };
const KIND_MODELS: Record<string, { value: string; label: string }[]> = {
    PS5: [{ value: 'ستاندارد', label: 'ستاندارد' }, { value: 'ديجيتال', label: 'ديجيتال' }, { value: 'برو', label: 'برو' }],
    PS4: [{ value: 'سليم', label: 'سليم' }, { value: 'برو', label: 'برو' }, { value: 'فات', label: 'فات' }],
    Xbox: [{ value: 'سيريس إكس', label: 'سيريس إكس' }, { value: 'سيريس إس', label: 'سيريس إس' }, { value: 'ون إكس', label: 'ون إكس' }],
};
const KIND_DEFAULT_MODEL: Record<string, string> = { PS5: 'ستاندارد', PS4: 'سليم', Xbox: 'سيريس إكس' };
const KIND_PHOTO: Record<string, string> = { PS5: 'ps5', PS4: 'ps4', Xbox: 'xbox' };
const KIND_PAD_PHOTO: Record<string, string> = { PS5: 'dualsense', PS4: 'dualsense', Xbox: 'xboxpad' };
const KIND_TITLE: Record<string, string> = { PS5: 'بلايستيشن 5', PS4: 'بلايستيشن 4', Xbox: 'إكس بوكس' };
const AREA_CENTER: Record<string, [number, number]> = { 'زايد': [30.04, 30.975], 'أكتوبر': [29.96, 30.93] };
type LatLng = { lat: number; lng: number };
const AVATARS = ['🎮', '👾', '🕹️', '⚡'];

const COURIER = { name: 'محمود س.', phone: '01001234567' };
const DEMO_OWNER_PHONE = '01009876543';
const STEP_MS = 15000;
const ORDER_STEPS = [
    'المندوب راح يستلم الجهاز من المالك',
    'المندوب فحص الجهاز وركّب AirTag التتبع جواه',
    'المندوب اتحرك، في طريقه ليك',
    'المندوب وصل، استلم جهازك',
];
const COURIER_CHAT_SUGGESTIONS = ['أنت فين دلوقتي؟', 'هتوصل إمتى تقريبًا؟', 'كلمت المالك خلاص؟'];
const OWNER_CHAT_SUGGESTIONS = ['الجهاز محتاج باسورد عشان يتفتح، ممكن تبعتهولي؟', 'ممكن أضيف الأكونت بتاعي على الجهاز؟', 'فيه مشكلة في التشغيل، محتاج مساعدتك'];
const SUPPORT_NAME = 'دعم NEXUS';
const SUPPORT_SUGGESTIONS = ['عندي مشكلة في طلب', 'سؤال عن العمولة', 'عايز أقدم شكوى'];
const COMMISSION = 0.2;
const DELIVERY_FEE = 20;
const PROMO_CODES: Record<string, number> = { NEXUS10: 0.10, WELCOME15: 0.15 };
// بوابة لوحة الإدارة تجريبية: الباسورد مش مكتوب صريح في الكود، محفوظ الهاش بتاعه بس.
// ده مستوى أمان النسخة التجريبية؛ الحماية الحقيقية هتبقى على السيرفر (Firebase) في المرحلة الجاية.
const ADMIN_HASH = 'f2046f537adf32d38c6a8206299b260c30daaa6917986cbcbfccba3d352e9cb2';

function sha256Sync(input: string): string {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const bytes = new TextEncoder().encode(input);
    const bitLen = bytes.length * 8;
    const withPad: number[] = [...bytes, 0x80];
    while (withPad.length % 64 !== 56) withPad.push(0);
    for (let i = 7; i >= 0; i--) withPad.push(Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff);
    const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;
    for (let off = 0; off < withPad.length; off += 64) {
        const w = new Array<number>(64);
        for (let t = 0; t < 16; t++) w[t] = (((withPad[off + t * 4] << 24) | (withPad[off + t * 4 + 1] << 16) | (withPad[off + t * 4 + 2] << 8) | withPad[off + t * 4 + 3]) >>> 0);
        for (let t = 16; t < 64; t++) {
            const s0 = (rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) >>> 0;
            const s1 = (rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)) >>> 0;
            w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let t = 0; t < 64; t++) {
            const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
            const ch = ((e & f) ^ (~e & g)) >>> 0;
            const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
            const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
            const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
            const t2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

async function sha256Hex(s: string): Promise<string> {
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch { /* نكمل بالتنفيذ الداخلي */ }
    return sha256Sync(s);
}

async function checkAdminPassword(pw: string): Promise<boolean> {
    const normalized = pw.toLowerCase().replace(/\s+/g, '');
    if (!normalized) return false;
    return (await sha256Hex(normalized)) === ADMIN_HASH;
}

// نقل بيانات التخزين المحلي من المفاتيح القديمة لاسم التطبيق الجديد (مرة واحدة)
(function migrateOldKeys() {
    try {
        const OLD = 'ajer-';
        if (localStorage.getItem('nexus-migrated.v1')) return;
        const moves: [string, string][] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf(OLD) === 0) {
                const nk = 'nexus-' + k.slice(OLD.length);
                if (localStorage.getItem(nk) === null) moves.push([k, nk]);
            }
        }
        moves.forEach(([o, n]) => { const v = localStorage.getItem(o); if (v !== null) localStorage.setItem(n, v); });
        localStorage.setItem('nexus-migrated.v1', '1');
    } catch { /* تجاهل */ }
})();
const COND_CHECKS = ['الجهاز بيشتغل تمام', 'الدراعات سليمة وشغالة', 'الكابلات والشاحن موجودين', 'مفيش خدوش أو كسور جديدة'];
const EMPTY_COND: CondState = { checks: COND_CHECKS.map(() => false), photos: [] };

function dayStamp(ms: number) { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
function busyDaysFor(l: ConsoleListing | null | undefined, orders: OrderDoc[]): Set<number> {
    const s = new Set<number>();
    if (!l) return s;
    const today = dayStamp(Date.now());
    orders.filter(o => o.deviceId === l.id && ORDER_BUSY.includes(o.status) && o.fromMs !== undefined)
        .forEach(o => { for (let i = 0; i < o.days; i++) s.add(dayStamp(o.fromMs as number) + i * 86400000); });
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
function yom(n: number) { return n === 1 ? 'يوم' : n === 2 ? 'يومين' : `${n} أيام`; }
function statusAr(s: OrderStatus): string {
    return ({ requested: 'الطلب عند المالك', accepted: 'بنستنى مندوب يستلمه', taken: 'مندوب استلم الطلب', pickedup: 'المندوب في الطريق للمستأجر', arrived: 'المندوب وصل عند المستأجر', delivered: 'قيد الإيجار', returning: 'الإرجاع جاري', returned: 'اترجع خلاص', declined: 'اترفض' } as Record<OrderStatus, string>)[s];
}
const STAGE_OF: Record<string, number> = { accepted: 0, taken: 0, pickedup: 2, arrived: 3, delivered: 3 };
function areaName(a: string) { return a === 'زايد' ? 'الشيخ زايد' : '6 أكتوبر'; }

const GAME_COLORS = ['#ff2ec4', '#2ee6d6', '#ffd54d', '#8b5cff', '#4dc3ff', '#7dff9a'];
function gameChipStyle(i: number): React.CSSProperties {
    const c = GAME_COLORS[i % GAME_COLORS.length];
    return { borderColor: c, color: c, background: `${c}1f` };
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
    if (!reviews) return <span className="nexus-muted">لسه مفيش تقييمات</span>;
    return <span className="nexus-stars"><bdi>★ {rating}</bdi> <span className="nexus-muted">(<bdi>{reviews}</bdi> تقييم)</span></span>;
}

function ConsoleCard({ listing, onOpen, onDelete, onTrack }: { listing: ConsoleListing; onOpen?: () => void; onDelete?: (id: string) => void; onTrack?: () => void }) {
    const inner = <>
        <img className="nexus-thumb" src={listing.photoData || PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={KIND_ALT[listing.kind] || 'جهاز ألعاب مع ذراع تحكم'} />
        <div className="nexus-card-body">
            <div className="nexus-card-title"><span className="nexus-num">{listing.number}</span> {listing.title}</div>
            <div className="nexus-muted">{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
            <div className="nexus-muted"><Stars rating={listing.rating} reviews={listing.reviews} />' · توصيل بالمندوب'</div>
            {listing.games.length > 0 && <div className="nexus-chips">{listing.games.map((g, i) => <span key={g} className="nexus-chip" style={gameChipStyle(i)}>{g}</span>)}</div>}
            <div className="nexus-card-foot">
                <span className="nexus-price"><bdi>{listing.pricePerDay}</bdi> ج.م في اليوم</span>
                <span className="nexus-muted">تأمين <bdi>{listing.deposit}</bdi> ج.م بيرجع</span>
            </div>
            {listing.mine && listing.status === 'rented' && <div className="nexus-badge nexus-badge-red">قيد الإيجار</div>}
            {(onDelete || onTrack) && <div className="nexus-card-actions">
                {onTrack && <FileButton variant="secondary" compact pill onClick={onTrack}>تتبع مكانه</FileButton>}
                {onDelete && <FileButton variant="ghost" compact onClick={() => onDelete(listing.id)}>احذف الإعلان</FileButton>}
            </div>}
        </div>
    </>;
    if (onOpen) return <Link className="nexus-card nexus-card-link" to="/detail" onClick={onOpen}>{inner}</Link>;
    return <div className="nexus-card">{inner}</div>;
}

function ChatDialog({ name, suggestions, onClose, channelId, meUid, meName }: { name: string; suggestions?: string[]; onClose: () => void; channelId?: string; meUid?: string; meName?: string }) {
    const live = useMessages(channelId);
    const [msgs, setMsgs] = useState<ChatMsg[]>([{ me: false, text: suggestions ? 'أهلًا! اسأل براحتك 🎮' : 'أهلًا! الجهاز متاح، اسأل براحتك 🎮' }]);
    const [text, setText] = useState('');
    const [sendErr, setSendErr] = useState('');
    const real = !!channelId && !!meUid;
    const sendText = (t: string) => {
        const v = t.trim();
        if (!v) return;
        if (real) {
            fbSendMessage(channelId as string, meUid as string, meName || 'مستخدم', v).catch((e) => { console.warn(e); setSendErr('الرسالة متبعتتش. اتأكد من النت وجرب تاني.'); });
        } else {
            setMsgs(m => [...m, { me: true, text: v }]);
        }
        setText('');
    };
    const send = () => sendText(text);
    const bubbles: ChatMsg[] = real
        ? (live || []).map((m) => ({ me: m.from === meUid, text: m.text }))
        : msgs;
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label={`محادثة مع ${name}`}>
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="nexus-sheet-title">{name}</h2>
            <div className="nexus-chat">
                {real && live === undefined && <Caption>بنحمّل الرسايل من السيرفر...</Caption>}
                {real && live !== undefined && live.length === 0 && <Caption>مفيش رسايل لسه. اكتب أول رسالة.</Caption>}
                {bubbles.map((m, i) => <div key={i} className={m.me ? 'nexus-bubble nexus-bubble-me' : 'nexus-bubble'}>{m.text}</div>)}
            </div>
            {suggestions && suggestions.length > 0 && <div className="nexus-chips nexus-suggest">
                {suggestions.map(s => <button key={s} type="button" className="nexus-chip nexus-chip-btn" onClick={() => sendText(s)}>{s}</button>)}
            </div>}
            <div className="nexus-chat-row">
                <input className="nexus-chat-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="اكتب رسالتك..." aria-label="اكتب رسالتك" />
                <FileButton variant="primary" compact pill onClick={send}>ابعت</FileButton>
            </div>
            {sendErr && <Caption>{sendErr}</Caption>}
            {real && <Caption>شات مباشر على السيرفر: الطرف التاني بيشوف رسالتك في نفس اللحظة.</Caption>}
        </div>
    </div>;
}

function TrackingMap({ lat, lng, title, exact }: { lat: number; lng: number; title: string; exact: boolean }) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    useEffect(() => {
        if (!divRef.current || mapRef.current) return;
        const map = L.map(divRef.current, { attributionControl: true }).setView([lat, lng], exact ? 16 : 14);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        if (!exact) {
            L.circle([lat, lng], { radius: 380, color: '#8b5cff', weight: 1, dashArray: '6 6', fillColor: '#8b5cff', fillOpacity: 0.06 }).addTo(map);
        }
        const icon = L.divIcon({ className: 'nexus-pin is-selected', html: `<span>${exact ? 'دقيق' : 'هنا'}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        L.marker([lat, lng], { icon }).addTo(map);
        mapRef.current = map;
        const t1 = setTimeout(() => map.invalidateSize(), 250);
        const t2 = setTimeout(() => map.invalidateSize(), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div ref={divRef} className="nexus-map-real nexus-map-track" role="application" aria-label={`خريطة حقيقية بمكان ${title}`} />;
}

function TrackingDialog({ title, lat, lng, exact, place, onClose }: { title: string; lat: number; lng: number; exact: boolean; place: string; onClose: () => void }) {
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label={`تتبع مكان ${title}`}>
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="nexus-sheet-title">مكان جهازك دلوقتي</h2>
            <TrackingMap lat={lat} lng={lng} title={title} exact={exact} />
            <Facts items={[
                { label: 'الخريطة', value: exact ? 'حقيقية، والمكان دقيق من المجموعة الخاصة' : 'حقيقية، والمكان مموّه (~٣٥٠م)' },
                { label: 'آخر ظهور', value: 'من دقيقتين' },
                { label: 'المكان', value: place },
                { label: 'طريقة التتبع', value: 'GPS أو AirTag جوه الجهاز' },
            ]} />
            <Callout title="تتبع بموافقة المستأجر" tone="note">المستأجر بيعرف قبل ما يأكد الطلب إن الجهاز فيه جهاز تتبع ضد السرقة وبيوافق عليه، والتتبع بيشتغل بس طول مدة الإيجار. الخريطة حقيقية وبتعرض مكان الجهاز المحفوظ على السيرفر، لكن قراءات التتبع الحية (زي آخر ظهور) لسه توضيحية لحد ما أجهزة التتبع تشتغل فعليًا.</Callout>
        </div>
    </div>;
}

function Avatar({ char, size }: { char: string; size?: number }) {
    return <span className="nexus-avatar" style={size ? { width: size, height: size, fontSize: size * 0.52 } : undefined} aria-hidden="true">{char}</span>;
}

function Home({ consoles, onOpenConsole }: { consoles: ConsoleListing[]; onOpenConsole: (l: ConsoleListing) => void }) {
    const [filter, setFilter] = useState<{ cat: 'console' | 'controller' | 'game'; kind?: string; area?: 'زايد' | 'أكتوبر' } | null>(null);
    const [step, setStep] = useState<0 | 1 | 2 | null>(null);
    const [pickKind, setPickKind] = useState<string>('PS5');
    const shownConsoles = consoles.filter(l => !filter || filter.cat !== 'console' || ((!filter.kind || l.kind === filter.kind) && (!filter.area || l.area === filter.area)));
    const filterLabel = !filter ? '' : `${filter.kind} · ${areaName(filter.area || 'زايد')}`;
    const heading = filter ? `${shownConsoles.length} نتيجة` : consoles.length === 0 ? 'لسه مفيش إعلانات' : `${consoles.length} إعلان قريب منك`;
    const closeSheet = () => setStep(null);
    return <>
        <Group label="الإعلانات القريبة منك" heading={heading}>
            <div className="nexus-filter-row">
                <FileButton variant="secondary" compact pill onClick={() => setStep(0)}>فلتر</FileButton>
                {filter && <button type="button" className="nexus-chip nexus-chip-btn" onClick={() => setFilter(null)}>× {filterLabel}</button>}
            </div>
            {shownConsoles.length === 0
                ? (filter
                    ? <Callout title="مفيش أجهزة بالفلتر ده" tone="note">جرّب فلتر تاني، أو أضف جهازك أنت.</Callout>
                    : <Callout title="لسه مفيش أجهزة منشورة" tone="note">كون أول واحد ينزل جهازه: دوس "أضف إعلانك" تحت.</Callout>)
                : shownConsoles.map(l => <ConsoleCard key={l.id} listing={l} onOpen={() => onOpenConsole(l)} />)}
            <Caption>كل الإعلانات هنا حقيقية من مستخدمين زيك، منشورة على السيرفر.</Caption>
        </Group>
        {step !== null && <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="فلتر الإعلانات" onClick={closeSheet}>
            <div className="nexus-sheet" onClick={e => e.stopPropagation()}>
                <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={closeSheet} /></div>
                <h2 className="nexus-sheet-title">فلتر الإعلانات</h2>
                {step === 0 && <div className="nexus-sheet-step" key="s0">
                    <Paragraph>بتدور على إيه؟</Paragraph>
                    <div className="nexus-circles">
                        <button type="button" className="nexus-circle" onClick={() => setStep(1)}>أجهزة</button>
                    </div>
                </div>}
                {step === 1 && <div className="nexus-sheet-step" key="s1">
                    <Paragraph>أنهم جهاز؟</Paragraph>
                    <div className="nexus-circles">
                        <button type="button" className="nexus-circle" onClick={() => { setPickKind('PS5'); setStep(2); }}>PS5</button>
                        <button type="button" className="nexus-circle" onClick={() => { setPickKind('PS4'); setStep(2); }}>PS4</button>
                        <button type="button" className="nexus-circle" onClick={() => { setPickKind('Xbox'); setStep(2); }}>Xbox</button>
                    </div>
                    <FileButton variant="ghost" compact onClick={() => setStep(0)}>ارجع</FileButton>
                </div>}
                {step === 2 && <div className="nexus-sheet-step" key="s2">
                    <Paragraph>في أنهي منطقة؟</Paragraph>
                    <div className="nexus-circles">
                        <button type="button" className="nexus-circle" onClick={() => { setFilter({ cat: 'console', kind: pickKind, area: 'زايد' }); closeSheet(); }}>الشيخ زايد</button>
                        <button type="button" className="nexus-circle" onClick={() => { setFilter({ cat: 'console', kind: pickKind, area: 'أكتوبر' }); closeSheet(); }}>6 أكتوبر</button>
                    </div>
                    <FileButton variant="ghost" compact onClick={() => setStep(1)}>ارجع</FileButton>
                </div>}
            </div>
        </div>}
    </>;
}

function GuideDialog({ onClose }: { onClose: () => void }) {
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="طريقة الاستخدام">
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="nexus-sheet-title">إزاي شغال</h2>
            <NumberedList items={[
                'صاحب الجهاز يضيف جهازه بالصور والألعاب والسعر والتأمين.',
                'تختار أقرب جهاز أو دراع أو لعبة، وتحدد عدد الأيام.',
                'مندوب المنصة بيستلم الجهاز من المالك ويراجعه ويحط فيه AirTag تتبع، ويوصله لحد بابك، وتدفع عند الاستلام.',
                'أول ما تستلم، العداد يبدأ في حسابك وتقدر تكلم المالك في أي وقت.',
                'كل جهاز فيه جهاز تتبع ضد السرقة، بتوافق عليه وانت بتطلب.',
                'عند الإرجاع المندوب بيستلم الجهاز منك ويتشيك عليه ويشيل الـ AirTag ويرجعه للمالك. لو رجعت قبل المعاد، فرق الأيام بيرجعلك.',
            ]} />
            <Caption>الدفع كاش عند الاستلام مع المندوب، مفيش دفع إلكتروني جوه التطبيق.</Caption>
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
    return <div className="nexus-cal">
        <div className="nexus-cal-month">{monthName}</div>
        <div className="nexus-cal-week">{['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="nexus-cal-grid">
            {cells.map((ms, i) => {
                if (ms === null) return <span key={i} className="nexus-cal-empty" />;
                const isPast = ms < today;
                const isBusy = busy.has(ms);
                const inRange = selStart !== null && selEnd !== null && ms >= selStart && ms < selEnd;
                const isStart = ms === selStart;
                const cls = `nexus-cal-day${isPast ? ' is-past' : ''}${isBusy ? ' is-busy' : ''}${inRange ? ' is-inrange' : ''}${isStart ? ' is-start' : ''}`;
                return <button key={i} type="button" className={cls} disabled={isPast || isBusy || !onPick}
                    aria-label={`يوم ${new Date(ms).getDate()}${isBusy ? ' محجوز' : ''}`}
                    onClick={() => { if (onPick && !isPast && !isBusy) onPick(ms); }}>{new Date(ms).getDate()}</button>;
            })}
        </div>
        <div className="nexus-cal-legend">
            <span><span className="nexus-dot nexus-dot-grey" /> محجوز</span>
            <span><span className="nexus-dot nexus-dot-pinkcal" /> مدة إيجارك</span>
        </div>
    </div>;
}

function TermsDialog({ onAccept, onClose }: { onAccept: () => void; onClose: () => void }) {
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="عقد الإيجار والشروط">
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="nexus-sheet-title">عقد الإيجار والشروط</h2>
            <NumberedList items={[
                'الإيجار بيتحسب من لحظة الاستلام لحد لحظة الإرجاع، ولو رجعت بدري بيرجعلك فرق الأيام.',
                'التأمين بيتحجز عند منصة NEXUS طول مدة الإيجار، وبيرجع لك كامل بعد ما تسلم الجهاز سليم.',
                'أي تلف أو كسر في الجهاز أو الدراعات وقت الإيجار مسئولية المستأجر، وبيتخصم من التأمين بعد معاينة المالك وصور التشيك ليست.',
                'لو قيمة التلف أكبر من التأمين، المستأجر بيدفع الفرق.',
                'تأخير الإرجاع بيتحسب يوم إضافي بسعر اليوم العادي عن كل يوم تأخير.',
                'ممنوع فتح الجهاز أو تصليحه عند أي حد من غير علم المالك.',
                'الجهاز فيه جهاز تتبع ضد السرقة شغال طول مدة الإيجار، واستخدامه بيتم بعلمك.',
            ]} />
            <FileButton variant="primary" pill onClick={onAccept}>أوافق على الشروط</FileButton>
            <Caption>الشروط دي صياغة مبسطة للتوضيح، مش عقد قانوني.</Caption>
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
        {COND_CHECKS.map((c, i) => <label key={c} className="nexus-check">
            <input type="checkbox" checked={value.checks[i]} onChange={e => { const checks = [...value.checks]; checks[i] = e.target.checked; onChange({ ...value, checks }); }} />
            <span>{c}</span>
        </label>)}
        <div className="nexus-cond-photos">
            {value.photos.map((p, i) => <img key={i} src={p} className="nexus-cond-photo" alt={`صورة حالة الجهاز ${i + 1}`} />)}
            {value.photos.length < 3 && <label className="nexus-cond-slot">
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
        <img className="nexus-detail-photo" src={listing.photoData || PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={KIND_ALT[listing.kind] || 'جهاز ألعاب مع ذراع تحكم'} />
        <div className="nexus-muted">{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
        <div className="nexus-muted"><Stars rating={listing.rating} reviews={listing.reviews} />' · توصيل بالمندوب'</div>
        {listing.games.length > 0 && <div className="nexus-chips">{listing.games.map((g, i) => <span key={g} className="nexus-chip" style={gameChipStyle(i)}>{g}</span>)}</div>}
        <Facts items={[
            { label: 'الموديل', value: listing.model },
            { label: 'المساحة', value: listing.storage },
            { label: 'الدراعات', value: `${listing.controllers} ${listing.controllers === 1 ? 'دراع' : 'دراعات'}` },
            ...(listing.includes ? [{ label: 'بييجي معاه', value: listing.includes }] : []),
            { label: 'السعر', value: `${listing.pricePerDay} ج.م في اليوم` },
            { label: 'التأمين بيرجع', value: `${listing.deposit} ج.م` },
        ]} />
        <Caption>الأيام المتاحة للحجز:</Caption>
        <AvailabilityCalendar busy={busy} fromMs={null} days={0} />
        <div className="nexus-card-actions">
            <Link className="file-button is-compact" data-variant="primary" to="/request" onClick={onRequest}>اطلب إيجار</Link>
            <FileButton variant="secondary" compact pill onClick={() => onChat(listing.owner)}>كلم {listing.owner}</FileButton>
        </div>
        <Caption>كل جهاز فيه جهاز تتبع ضد السرقة، وهتشوف ده وتوافق عليه قبل ما تأكد الطلب.</Caption>
    </Group>;
}

type IconName = 'grid' | 'map' | 'package' | 'plus' | 'list' | 'user' | 'headset' | 'help' | 'shield';
const ICON_PATHS: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    map: <><path d="M12 21s-7-5.1-7-11a7 7 0 0 1 14 0c0 5.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></>,
    package: <><path d="M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73z" /><path d="M5.3 7.3 12 11.2l6.7-3.9" /><path d="M12 11.2V21" /></>,
    plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
    headset: <><path d="M4 13a8 8 0 0 1 16 0" /><path d="M3 15a2 2 0 0 1 2-2h1v6H5a2 2 0 0 1-2-2v-2z" /><path d="M21 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2z" /><path d="M18 19a4 4 0 0 1-4 3h-2" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.6c0 1.6-2.4 2.1-2.4 3.4" /><circle cx="12" cy="16.8" r="0.4" /></>,
    shield: <><path d="M12 3l7 3v5c0 4.6-3 7.7-7 9.5-4-1.8-7-4.9-7-9.5V6z" /><path d="M9.5 12l1.8 1.8 3.6-3.6" /></>,
};
function Icon({ name, size }: { name: IconName; size?: number }) {
    return <svg width={size || 22} height={size || 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="nexus-icon">{ICON_PATHS[name]}</svg>;
}

function BottomNav({ onGuide }: { onGuide: () => void }) {
    return <nav className="nexus-bottomnav" aria-label="صفحات التطبيق">
        <NavLink to="/" end className="nexus-tab"><Icon name="grid" /><span>الإعلانات</span></NavLink>
        <NavLink to="/map" className="nexus-tab"><Icon name="map" /><span>الخريطة</span></NavLink>
        <NavLink to="/order" className="nexus-tab"><Icon name="package" /><span>طلبك</span></NavLink>
        <NavLink to="/add" className="nexus-tab"><Icon name="plus" /><span>أضف إعلانك</span></NavLink>
        <NavLink to="/profile" className="nexus-tab"><Icon name="list" /><span>إعلاناتي</span></NavLink>
        <NavLink to="/profile" className="nexus-tab"><Icon name="user" /><span>حسابك</span></NavLink>
        <button type="button" className="nexus-tab nexus-tab-help" aria-label="طريقة الاستخدام" onClick={onGuide}><Icon name="help" size={24} /></button>
    </nav>;
}

function MapPage({ consoles, onRequest, exactLoc }: { consoles: ConsoleListing[]; onRequest: (l: ConsoleListing) => void; exactLoc: Record<string, LatLng> }) {
    const [selected, setSelected] = useState<number | null>(null);
    const [locNote, setLocNote] = useState('');
    const [locating, setLocating] = useState(false);
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const leafletMapRef = useRef<L.Map | null>(null);
    const groupRef = useRef<L.LayerGroup | null>(null);
    const meRef = useRef<L.CircleMarker | null>(null);
    const meAccRef = useRef<L.Circle | null>(null);

    // الإحداثيات العامة مموّهة أصلًا (~٣٥٠م). الدقيق بيجيلو من المجموعة الخاصة للمالك والمندوب المكلف بس
    const posFor = (l: ConsoleListing): { pos: [number, number]; exact: boolean } => {
        if (exactLoc[l.id]) return { pos: [exactLoc[l.id].lat, exactLoc[l.id].lng], exact: true };
        if (typeof l.lat === 'number' && typeof l.lng === 'number') return { pos: [l.lat, l.lng], exact: false };
        const base = AREA_CENTER[l.area] || AREA_CENTER['زايد'];
        const j = l.number * 7919;
        const dx = ((j % 100) / 100 - 0.5) * 0.05;
        const dy = (((j * 31) % 100) / 100 - 0.5) * 0.04;
        return { pos: [base[0] + dx, base[1] + dy], exact: false };
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
        groupRef.current?.remove();
        const group = L.layerGroup();
        consoles.forEach((l) => {
            const { pos, exact } = posFor(l);
            if (!exact && typeof l.lat === 'number') {
                L.circle(pos, { radius: 380, color: '#8b5cff', weight: 1, dashArray: '6 6', fillColor: '#8b5cff', fillOpacity: 0.06 }).addTo(group);
            }
            const icon = L.divIcon({
                className: selected === l.number ? 'nexus-pin is-selected' : 'nexus-pin',
                html: `<span>${l.number}</span>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
            });
            const marker = L.marker(pos, { icon, title: `جهاز رقم ${l.number}: ${l.title}` }).addTo(group);
            marker.on('click', () => setSelected(l.number));
        });
        group.addTo(map);
        groupRef.current = group;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consoles, selected, exactLoc]);

    const showMyLocation = () => {
        setLocNote('');
        if (!('geolocation' in navigator)) {
            setLocNote('المتصفح ده مش بيدعم تحديد المكان. جرّب تفتح الموقع من كروم على الموبايل.');
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                const map = leafletMapRef.current;
                if (map) {
                    meRef.current?.remove();
                    meAccRef.current?.remove();
                    meAccRef.current = L.circle([p.coords.latitude, p.coords.longitude], {
                        radius: p.coords.accuracy || 60,
                        color: '#2ee6d6', weight: 1, fillColor: '#2ee6d6', fillOpacity: 0.12,
                    }).addTo(map);
                    meRef.current = L.circleMarker([p.coords.latitude, p.coords.longitude], {
                        radius: 9,
                        color: '#2ee6d6',
                        weight: 3,
                        fillColor: '#2ee6d6',
                        fillOpacity: 0.35,
                    }).addTo(map);
                    map.setView([p.coords.latitude, p.coords.longitude], 14);
                }
                setLocNote('ده مكانك التقريبي دلوقتي.');
                setLocating(false);
            },
            (err) => {
                if (err.code === 1) setLocNote('إذن الموقع ممنوع. فعّل إذن الموقع (Location) للموقع من إعدادات المتصفح وجرب تاني. ولو بتفتح من الأبلكيشن، اسمح بإذن الموقع للتطبيق نفسه من إعدادات الموبايل.');
                else if (err.code === 2) setLocNote('مكانك مش متاح دلوقتي. اتأكد إن الـ GPS شغال وجرب تاني.');
                else setLocNote('تحديد المكان خد وقت أطول من اللازم. اقف في مكان مفتوح ودوس تاني.');
                setLocating(false);
            },
            { timeout: 20000, maximumAge: 60000, enableHighAccuracy: true }
        );
    };

    const current = consoles.find(l => l.number === selected);
    return <Group label="الخريطة" heading="الأجهزة حوالينك">
        <div ref={mapDivRef} className="nexus-map-real" role="application" aria-label="خريطة أماكن الأجهزة في الشيخ زايد و6 أكتوبر" />
        <Caption>خريطة حقيقية من OpenStreetMap. دوس على رقم تشوف تفاصيله. مكان كل جهاز بيظهر تقريبي جوه دايرة حوالي ٣٥٠ متر — المكان الدقيق محفوظ لوحده على السيرفر، وحدش يقدر يشوفه غير المالك نفسه والمندوب وقت الاستلام.</Caption>
        <FileButton variant="secondary" compact pill onClick={showMyLocation} disabled={locating}>{locating ? 'بنحدد مكانك...' : 'أظهر مكاني على الخريطة'}</FileButton>
        {locNote && <Caption>{locNote}</Caption>}
        {current
            ? <ConsoleCard listing={current} onRequest={() => onRequest(current)} />
            : <Callout title="اختار جهاز من الخريطة" tone="note">كل رقم على الخريطة هو جهاز معروض للإيجار.</Callout>}
    </Group>;
}

function RequestPage({ target, hasOpenRequest, busy, onConfirm }: { target: { title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number; deviceId?: string; ownerId?: string } | null; hasOpenRequest: boolean; busy: Set<number>; onConfirm: (r: { days: number; rent: number; deposit: number; fromMs: number; deliveryFee: number; promo: string; discount: number; payMethod: string }) => void }) {
    const [days, setDays] = useState(2);
    const [fromMs, setFromMs] = useState<number | null>(null);
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
    const deliveryFee = DELIVERY_FEE;
    const total = rent - discount + deliveryFee + target.deposit;
    if (done) {
        return <Group label="طلب إيجار" heading="طلبك اتسجل">
            <Callout title="طلبك اتبعت للمالك على السيرفر" tone="note">المالك هيشوف طلبك في حسابه في نفس اللحظة ويرد عليك: متاح أو مش متاح. تقدر تكلمه من زرار الشات جنب الطلب في صفحة حسابك، وتتابع كل التحديثات لايف من صفحة طلبك.</Callout>
            <Facts items={[
                { label: 'الحاجة', value: target.title },
                ...(fromMs !== null ? [{ label: 'يوم الاستلام', value: new Date(fromMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }) }] : []),
                { label: 'المدة', value: yom(days) },
                { label: 'الإيجار', value: `${rent} ج.م` },
                ...(discount ? [{ label: `خصم كود ${promo}`, value: `- ${discount} ج.م` }] : []),
                { label: 'التوصيل بالمندوب', value: `${DELIVERY_FEE} ج.م` },
                { label: 'التأمين (محجوز عند المنصة)', value: `${target.deposit} ج.م` },
                { label: 'المطلوب عند الاستلام', value: `${total} ج.م` },
                { label: 'طريقة الدفع', value: payMethod },
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
        else { setPromo(''); setPromoError('الكود ده مش صحيح أو خلص. جرب NEXUS10.'); }
    };
    return <Group label="طلب إيجار" heading={target.title}>
        <Paragraph>{target.ownerLine}</Paragraph>
        <Caption>اختار يوم الاستلام من التقويم. الأيام الرمادي محجوزة ومش بتتاختار.</Caption>
        <AvailabilityCalendar busy={busy} fromMs={fromMs} days={days} onPick={setFromMs} />
        {rangeHasBusy && <Callout title="المدة دي فيها أيام محجوزة" tone="danger">الجهاز مش متاح في كل الأيام دي. قلل عدد الأيام أو اختار يوم بداية تاني.</Callout>}
        <Slider label="عدد الأيام" min={1} max={7} value={days} onChange={(v: number) => setDays(v)} describe={(v: number) => v === 1 ? 'يوم واحد' : yom(v)} />
        <Callout title="الاستلام والإرجاع دايمًا عن طريق مندوب المنصة" tone="note">مفيش استلام بنفسك: مندوب NEXUS بيستلم الجهاز من المالك، بيراجعه وبيحط فيه AirTag تتبع، وبيوصله ليك لحد الباب. وفي الإرجاع بياخده منك، بيتشيك عليه وبيشيل الـ AirTag ويرجعه لصاحبه. رسوم التوصيل {DELIVERY_FEE} ج.م.</Callout>
        <ChoiceRow label="طريقة الدفع" options={['كاش عند الاستلام', 'فودافون كاش', 'إنستاباي'].map(v => ({ value: v, label: v }))} value={payMethod} onChange={setPayMethod} />
        <Caption>الدفع بيتم بينك وبين المندوب عند الاستلام (مفيش دفع إلكتروني جوه التطبيق لسه). والتأمين بيتحجز عند المنصة مش عند المالك.</Caption>
        <div className="nexus-promo-row">
            <input className="nexus-promo-input" dir="ltr" placeholder="كود الخصم" value={promoInput} onChange={e => setPromoInput(e.target.value)} aria-label="كود الخصم" />
            <FileButton variant="secondary" compact pill onClick={applyPromo}>طبق</FileButton>
        </div>
        {promo && <Caption>كود {promo} اشتغل: خصم {Math.round((PROMO_CODES[promo] || 0) * 100)} في المية من الإيجار.</Caption>}
        {promoError && <Caption>{promoError}</Caption>}
                <Facts items={[
            { label: 'الإيجار', value: `${rent} ج.م` },
            ...(discount ? [{ label: `خصم كود ${promo}`, value: `- ${discount} ج.م` }] : []),
            { label: 'التوصيل بالمندوب', value: `${DELIVERY_FEE} ج.م` },
            { label: 'التأمين (محجوز عند المنصة)', value: `${target.deposit} ج.م` },
            { label: 'المطلوب عند الاستلام', value: `${total} ج.م` },
        ]} />
        <Callout title="التأمين محجوز عند المنصة" tone="note">التأمين بيتحجز عند منصة NEXUS طول مدة الإيجار، وبيرجع لك كامل بعد ما تسلم الجهاز سليم. لو فيه تلف بيتخصم منه بعد المعاينة. ولو رجعت الجهاز قبل المعاد، فرق الأيام بيرجعلك.</Callout>
        <Callout title="الجهاز فيه جهاز تتبع ضد السرقة" tone="warning">صاحب الجهاز يقدر يشوف مكانه عن طريق GPS أو AirTag جواه طول مدة الإيجار. لازم تشوف ده وتوافق عليه قبل ما تأكد الطلب.</Callout>
        <label className="nexus-check">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />
            <span>فاهم وموافق إن الجهاز فيه جهاز تتبع ضد السرقة بيشتغل طول مدة الإيجار.</span>
        </label>
        <label className="nexus-check">
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} />
            <span>قريت <button type="button" className="nexus-linklike" onClick={() => setTermsOpen(true)}>عقد الإيجار والشروط</button> وموافق عليه، بما فيه شروط التلف والتأمين.</span>
        </label>
        <FileButton variant="primary" pill disabled={!ready} onClick={() => { if (!ready) return; onConfirm({ days, rent, deposit: target.deposit, fromMs: fromMs || Date.now(), deliveryFee, promo, discount, payMethod }); setDone(true); }}>أكد الطلب</FileButton>
        {!ready && <Caption>اختار يوم استلام فاضي من التقويم، ووافق على التتبع وعقد الإيجار عشان تقدر تأكد.</Caption>}
        {termsOpen && <TermsDialog onAccept={() => { setTermsAccepted(true); setTermsOpen(false); }} onClose={() => setTermsOpen(false)} />}
    </Group>;
}

function LocationPicker({ area, value, onChange }: { area: 'زايد' | 'أكتوبر'; value: LatLng | null; onChange: (v: LatLng) => void }) {
    const divRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    useEffect(() => {
        if (!divRef.current || mapRef.current) return;
        const map = L.map(divRef.current, { attributionControl: false }).setView(AREA_CENTER[area] || AREA_CENTER['زايد'], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        map.on('click', (e: L.LeafletMouseEvent) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }));
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 250);
        return () => { map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (mapRef.current) mapRef.current.setView(AREA_CENTER[area] || AREA_CENTER['زايد'], 13);
    }, [area]);
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
        if (value) {
            const icon = L.divIcon({ className: 'nexus-pin is-selected', html: '<span>هنا</span>', iconSize: [30, 30], iconAnchor: [15, 15] });
            const m = L.marker([value.lat, value.lng], { icon, draggable: true }).addTo(map);
            m.on('dragend', () => { const p = m.getLatLng(); onChange({ lat: p.lat, lng: p.lng }); });
            markerRef.current = m;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);
    return <div ref={divRef} className="nexus-map-pick" role="application" aria-label="اختار مكان الجهاز على الخريطة" />;
}

function AddPage({ onAdd, blocked, profile }: { onAdd: (l: { kind: 'PS5' | 'PS4' | 'Xbox'; model: string; storage: string; controllers: number; area: 'زايد' | 'أكتوبر'; district: string; games: string[]; includes: string; pricePerDay: number; deposit: number; photoKey?: string; photoData?: string; lat: number; lng: number }) => void; blocked: boolean; profile: UserProfile }) {
    const [kind, setKind] = useState<'PS5' | 'PS4' | 'Xbox'>('PS5');
    const [model, setModel] = useState('ستاندارد');
    const [storage, setStorage] = useState('825GB');
    const [controllers, setControllers] = useState(2);
    const [photoKey, setPhotoKey] = useState('ps5');
    const [photoData, setPhotoData] = useState('');
    const [area, setArea] = useState<'زايد' | 'أكتوبر'>('زايد');
    const [district, setDistrict] = useState('');
    const [games, setGames] = useState('');
    const [includes, setIncludes] = useState('');
    const [price, setPrice] = useState('');
    const [deposit, setDeposit] = useState('');
    const [error, setError] = useState('');
    const [added, setAdded] = useState(false);
    const [loc, setLoc] = useState<LatLng | null>(null);
    const [locNote, setLocNote] = useState('');
    const [locating, setLocating] = useState(false);
    const useMyLocation = () => {
        setLocNote('');
        if (!('geolocation' in navigator)) { setLocNote('المتصفح ده مش بيدعم تحديد المكان. حدد مكان جهازك بيدك على الخريطة.'); return; }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocNote('اتحفظ مكانك الحالي كمكان للجهاز.'); setLocating(false); },
            (err) => {
                if (err.code === 1) setLocNote('إذن الموقع ممنوع. فعّله من إعدادات المتصفح، أو حدد المكان بيدك على الخريطة.');
                else if (err.code === 2) setLocNote('مكانك مش متاح دلوقتي. اتأكد إن الـ GPS شغال، أو حدد المكان بيدك على الخريطة.');
                else setLocNote('تحديد المكان خد وقت أطول من اللازم. جرب تاني أو حدد المكان بيدك على الخريطة.');
                setLocating(false);
            },
            { timeout: 20000, maximumAge: 60000, enableHighAccuracy: true }
        );
    };
    const modelOptions = KIND_MODELS[kind] || KIND_MODELS.PS5;
    const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 640, setPhotoData);
    };
    const submit = () => {
        const p = parseInt(price, 10);
        const d = deposit.trim() === '' ? 0 : parseInt(deposit, 10);
        if (!Number.isFinite(p) || p < 10 || p > 5000) { setError('اكتب سعر اليوم بالجنيه، من 10 لـ 5000.'); return; }
        if (!Number.isFinite(d) || d < 0 || d > 50000) { setError('اكتب التأمين بالجنيه، أو سيبه 0 لو من غير تأمين.'); return; }
        if (!loc) { setError('حدد مكان الجهاز على الخريطة: دوس على مكانك في الخريطة أو استخدم زرار مكاني الحالي.'); return; }
        setError('');
        onAdd({
            kind, model, storage, controllers, area, district: district.trim() || areaName(area),
            games: games.split(/[،,]/).map(g => g.trim()).filter(Boolean), includes: includes.trim(),
            pricePerDay: p, deposit: d, photoKey: photoData ? undefined : photoKey, photoData: photoData || undefined,
            lat: loc.lat, lng: loc.lng,
        });
        setAdded(true);
    };
    if (blocked) return <Group label="أضف إعلانك" heading="لازم تخلص اللي معاك الأول">
        <Callout title="معاك جهاز مستأجر دلوقتي" tone="warning">مش ممكن تنزل إعلان لجهازك وانت معاك جهاز تاني. سجل إرجاع الجهاز اللي معاك من صفحة حسابك الأول، وبعدين تعالى أضف إعلانك.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/profile">روح لحسابك</Link>
    </Group>;
    return <>
        {added ? <Group label="تمام" heading="إعلانك اتنشر">
            <Callout title="إعلانك بقى لايف على السيرفر" tone="note">كل مستخدم بيفتح التطبيق دلوقتي بيشوف إعلانك في القائمة وعلى الخريطة. أول ما حد يطلبه، الطلب هيظهرلك في صفحة حسابك.</Callout>
            <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
        </Group> : <Group label="أضف إعلانك" heading="أجر جهازك للناس">
            <Paragraph>الإعلان هينزل باسمك ورقمك من حسابك: {profile.name} · <bdi>{profile.phone}</bdi></Paragraph>
            <ChoiceRow label="الجهاز" options={[{ value: 'PS5', label: 'PS5' }, { value: 'PS4', label: 'PS4' }, { value: 'Xbox', label: 'Xbox' }]} value={kind} onChange={(v: string) => { const k = v as 'PS5' | 'PS4' | 'Xbox'; setKind(k); setModel(KIND_DEFAULT_MODEL[k]); setPhotoKey(KIND_PHOTO[k]); }} />
            <ChoiceRow label="الموديل" options={modelOptions} value={model} onChange={(v: string) => setModel(v)} />
            <ChoiceRow label="المساحة" options={[{ value: '500GB', label: '500 جيجا' }, { value: '825GB', label: '825 جيجا' }, { value: '1TB', label: '1 تيرا' }, { value: '2TB', label: '2 تيرا' }]} value={storage} onChange={(v: string) => setStorage(v)} />
            <Slider label="عدد الدراعات" min={1} max={4} value={controllers} onChange={(v: number) => setControllers(v)} describe={(v: number) => v === 1 ? 'دراع واحد' : v === 2 ? 'دراعين' : `${v} دراعات`} />
            <div className="nexus-idphoto">
                <span className="nexus-idphoto-label">صورة الجهاز (صوره بموبايلك)</span>
                <label className="nexus-idphoto-drop">
                    {photoData ? 'غيّر صورة الجهاز' : 'ارفع صورة جهازك'}
                    <input type="file" accept="image/*" onChange={pickPhoto} aria-label="ارفع صورة الجهاز" style={{ display: 'none' }} />
                </label>
                {photoData ? <img className="nexus-idphoto-preview" src={photoData} alt="صورة الجهاز اللي رفعتها" /> : null}
            </div>
            {!photoData && <ChoiceRow label="أو اختار صورة جاهزة" options={[{ value: KIND_PHOTO[kind], label: 'صورة الجهاز' }, { value: KIND_PAD_PHOTO[kind], label: 'صورة دراع' }]} value={[KIND_PHOTO[kind], KIND_PAD_PHOTO[kind]].includes(photoKey) ? photoKey : KIND_PHOTO[kind]} onChange={(v: string) => setPhotoKey(v)} />}
            <Caption>صورة حقيقية للجهاز بتخلي إعلانك أوضح وبتزود ثقة الناس فيك.</Caption>
            <TextField label="الألعاب اللي مع الجهاز (افصل بينها بفاصلة)" value={games} onChange={(v: string) => setGames(v)} />
            <TextField label="إيه اللي بييجي مع الجهاز؟ (شاحن، كابلات...)" value={includes} onChange={(v: string) => setIncludes(v)} />
            <ChoiceRow label="المنطقة" options={[{ value: 'زايد', label: 'الشيخ زايد' }, { value: 'أكتوبر', label: '6 أكتوبر' }]} value={area} onChange={(v: string) => setArea(v as 'زايد' | 'أكتوبر')} />
            <TextField label="الحي أو الكمبوند" value={district} onChange={(v: string) => setDistrict(v)} />
            <div className="nexus-idphoto">
                <span className="nexus-idphoto-label">مكان الجهاز على الخريطة</span>
                <LocationPicker area={area} value={loc} onChange={(v: LatLng) => { setLoc(v); setLocNote(''); }} />
                <div className="nexus-card-actions">
                    <FileButton variant="secondary" compact pill onClick={useMyLocation} disabled={locating}>{locating ? 'بنحدد مكانك...' : 'استخدم مكاني الحالي'}</FileButton>
                </div>
            </div>
            {locNote && <Caption>{locNote}</Caption>}
            {loc && <Caption>المكان اتحفظ. تقدر تحرك الدبوس بيدك لو عايز تظبطه.</Caption>}
            <Callout title="مكانك الدقيق في أمان" tone="note">اللي بيتصفح التطبيق بيشوف دايرة تقريبية بقطر ٣٥٠ متر حوالين المكان الحقيقي. المكان الدقيق بيتخزن لوحده على السيرفر، وقواعد السيرفر نفسها بتمنع حد غيرك (وغير المندوب وقت الاستلام) يقراه.</Callout>
            <TextField label="سعر اليوم بالجنيه (اكتب الرقم)" value={price} onChange={(v: string) => setPrice(v)} />
            <Callout title="عمولة التطبيق 20 في المية" tone="note">التطبيق بياخد عمولة 20 في المية من سعر الإيجار بس، مش من التأمين. التأمين كله بيرجع للمستأجر.</Callout>
            {(() => { const pv = parseInt(price, 10); if (!Number.isFinite(pv) || pv <= 0) return null; const fee = Math.round(pv * COMMISSION); return <Callout title="احسبها على السعر اللي كتبته" tone="note">لو اليوم بـ {pv} ج.م: عمولة التطبيق {fee} ج.م عن كل يوم، وصافيلك {pv - fee} ج.م في اليوم. يعني لو اتأجر 3 أيام، صافيك {3 * (pv - fee)} ج.م من أصل {3 * pv} ج.م.</Callout>; })()}
            <TextField label="التأمين بالجنيه بيرجع (اكتب الرقم، أو سيبه فاضي)" value={deposit} onChange={(v: string) => setDeposit(v)} />
            <Callout title="جهازك فيه تتبع ضد السرقة" tone="note">مندوب المنصة بيركب AirTag في الجهاز وهو واصل للمستأجر وبيشيله عند الإرجاع، والمستأجر بيشوف ده ويوافق عليه قبل ما يأكد الطلب، وتقدر تتبع مكان جهازك طول ما هو بره.</Callout>
            {error && <Callout title="راجع البيانات" tone="danger">{error}</Callout>}
            <FileButton variant="primary" pill onClick={submit}>انشر الإعلان</FileButton>
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
    return <div className="nexus-ring-wrap">
        <svg className="nexus-ring" viewBox="0 0 160 160" role="img" aria-label={`فاضل ${label}`}>
            <defs>
                <linearGradient id="nexusGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b5cff" />
                    <stop offset="100%" stopColor="#2ee6d6" />
                </linearGradient>
            </defs>
            <circle cx="80" cy="80" r={R} fill="none" stroke="#1a1a33" strokeWidth="10" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="url(#nexusGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 80 80)" />
        </svg>
        <div className="nexus-ring-text"><span className="nexus-ring-label">{label}</span><span className="nexus-ring-sub">{sub}</span></div>
    </div>;
}

function OrderPage({ order, onHandoverCheck, onChat }: { order: OrderDoc | null; onHandoverCheck: (v: CondState) => void; onChat: (name: string, suggestions?: string[], channelId?: string) => void }) {
    if (!order) return <Group label="تتبع طلبك" heading="مفيش طلب شغال دلوقتي">
        <Callout title="لما تطلب جهاز هتلاقي التتبع هنا" tone="note">اطلب جهاز من الإعلانات، وأول ما المالك يقبل طلبك هتقدر تتابع المندوب خطوة بخطوة من الصفحة دي، لايف.</Callout>
        <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
    </Group>;
    if (order.status === 'requested') return <Group label="تتبع طلبك" heading={order.title}>
        <Callout title="طلبك عند المالك دلوقتي" tone="note">استنى رده: لو قال متاح، المندوب هيتحرك وهتلاقي الخطوات بتتحدث هنا لايف. لو رفض، الطلب هيشيل نفسه وتقدر تطلب جهاز تاني.</Callout>
        <Facts items={[
            { label: 'المالك', value: order.ownerName },
            { label: 'المدة', value: yom(order.days) },
            { label: 'المطلوب عند الاستلام', value: `${order.rent + order.deposit + (order.deliveryFee || 0) - (order.discount || 0)} ج.م` },
        ]} />
    </Group>;
    const stage = STAGE_OF[order.status] ?? 0;
    const arrived = order.status === 'arrived' || order.status === 'delivered';
    const widths = [12, 40, 70, 100];
    const check = order.handoverCheck || EMPTY_COND;
    return <>
        <Group label="تتبع طلبك" heading={order.title}>
            <Paragraph>{order.ownerName} · {yom(order.days)} · المطلوب عند الاستلام {order.rent + order.deposit + (order.deliveryFee || 0) - (order.discount || 0)} ج.م{!order.payMethod || order.payMethod === 'كاش عند الاستلام' ? ' كاش' : ` (${order.payMethod})`}</Paragraph>
            <div className="nexus-progress" role="img" aria-label={`طلبك في خطوة ${stage + 1} من ${ORDER_STEPS.length}`}><div style={{ width: `${widths[stage]}%` }} /></div>
            <div className="nexus-steps">
                {ORDER_STEPS.map((s, i) => <div key={i} className={`nexus-step${i < stage ? ' is-done' : ''}${i === stage ? ' is-now' : ''}`}>
                    <span className="nexus-step-dot">{i < stage ? '✓' : i + 1}</span>
                    <span className="nexus-step-text">{s}</span>
                </div>)}
            </div>
            {order.courierName
                ? <div className="nexus-status-line"><span className="nexus-dot nexus-dot-pink" />مندوب استلم طلبك: {order.courierName} شغال عليه دلوقتي</div>
                : <div className="nexus-status-line"><span className="nexus-dot nexus-dot-grey" />بنستنى مندوب يستلم طلبك</div>}
            <Caption>الخطوات بتتحدث لايف: المندوب بيحدثها من لوحته وانت بتشوفها في نفس اللحظة.</Caption>
            {arrived && <>
                <Callout title="المندوب وصل" tone="note">استلم جهازك وراجعه كويس قدام المندوب. علم على التشيك ليست وصوّر الجهاز: دي إثبات حالتك. زرار تأكيد التسليم مع المندوب في لوحته هو، وأول ما يدوسه العداد بتاعك بيبدأ.</Callout>
                <h3 className="nexus-subhead">تشيك ليست حالة الجهاز عند الاستلام</h3>
                <ConditionChecklist value={check} onChange={onHandoverCheck} />
                {!condComplete(check)
                    ? <Caption>علم على كل نقاط التشيك ليست وضيف صورة واحدة على الأقل للجهاز، وبعدها المندوب يأكد التسليم من لوحته. التشيك ليست بتوصل للمندوب لحظة بلحظة.</Caption>
                    : <Caption>التشيك ليست كاملة. المندوب دلوقتي يقدر يأكد التسليم من لوحته.</Caption>}
            </>}
        </Group>
        {order.courierName && <Group label="المندوب معاك طول الطريق" heading={order.courierName}>
            <Facts items={[
                { label: 'الاسم', value: order.courierName },
                { label: 'الحالة', value: statusAr(order.status) },
            ]} />
            <div className="nexus-card-actions">
                <FileButton variant="secondary" compact pill onClick={() => onChat(order.courierName as string, COURIER_CHAT_SUGGESTIONS, orderChannelId(order.id))}>ابعتله رسالة</FileButton>
            </div>
            <Caption>الشات مع المندوب حقيقي على السيرفر، بيوصله في نفس اللحظة.</Caption>
        </Group>}
    </>;
}

function ActiveRental({ rental, onReturn, returnCheck, onReturnCheck, onChat }: { rental: Rental; onReturn: () => void; returnCheck: CondState; onReturnCheck: (v: CondState) => void; onChat: (name: string, suggestions?: string[], channelId?: string) => void }) {
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
            <Callout title="طلب الإرجاع اتسجل" tone="note">المندوب جاي يستلم الجهاز منك، بيتشيك عليه وبيشيل الـ AirTag قدامك ويرجعه للمالك. لو رجعت بدري المفروض يرجعلك حوالي {refund} ج.م فرق الأيام الباقية، والتأمين المحجوز بيرجع كامل بعد المعاينة.</Callout>
        </> : <>
            <CountdownRing frac={frac} label={remainLabel} sub="فاضل على الإرجاع" />
            <Facts items={[
                { label: 'المالك', value: rental.owner },
                ...(rental.ownerPhone ? [{ label: 'موبايل المالك', value: rental.ownerPhone }] : []),
                { label: 'المدة', value: yom(rental.days) },
                { label: 'التتبع', value: 'وافقت على جهاز التتبع ضد السرقة' },
            ]} />
            <div className="nexus-card-actions">
                {rental.ownerPhone ? <a className="file-button is-compact" data-variant="primary" href={`tel:${rental.ownerPhone}`}>اتصل بالمالك</a> : null}
                <FileButton variant="secondary" compact pill onClick={() => onChat(rental.owner, OWNER_CHAT_SUGGESTIONS, rental.channelId)}>كلم {rental.owner}</FileButton>
            </div>
            <Caption>لو الجهاز محتاج باسورد عشان يتفتح، أو عايز تستأذن تضيف الأكونت بتاعك، كلم المالك من هنا.</Caption>
            <Callout title="لو رجعته بدري" tone="warning">لو سلمته دلوقتي بيرجعلك حوالي {refund} ج.م فرق الأيام الباقية، والتأمين المحجوز عند المنصة بيرجع لك كامل بعد المعاينة. مندوب المنصة بييجي يستلم الجهاز منك، بيتشيك عليه وبيشيل الـ AirTag قدامك ويرجعه للمالك.</Callout>
            <h3 className="nexus-subhead">تشيك ليست حالة الجهاز عند الإرجاع</h3>
            <ConditionChecklist value={returnCheck} onChange={onReturnCheck} />
            <FileButton variant="secondary" compact pill disabled={!condComplete(returnCheck)} onClick={() => { if (condComplete(returnCheck)) onReturn(); }}>سجل الإرجاع واطلب المندوب</FileButton>
            {!condComplete(returnCheck) && <Caption>كمّل تشيك ليست الإرجاع وضيف صورة واحدة على الأقل عشان تسجل الإرجاع. المندوب بيشوفها لحظة بلحظة.</Caption>}
        </>}
        <Caption>العداد بيعد لحظة بلحظة من لحظة الاستلام.</Caption>
    </Group>;
}

function UserAvatar({ profile, size }: { profile: UserProfile | null; size?: number }) {
    if (profile && profile.photo) return <img className="nexus-avatar nexus-avatar-photo" style={size ? { width: size, height: size } : undefined} src={profile.photo} alt={`صورة ${profile.name}`} />;
    return <Avatar char={profile?.avatar || '🎮'} size={size} />;
}

function ProfileForm({ initial, submitLabel, onSave }: { initial: UserProfile | null; submitLabel: string; onSave: (p: UserProfile) => void }) {
    const [name, setName] = useState(initial?.name || '');
    const [age, setAge] = useState(initial?.age || '');
    const [phone, setPhone] = useState(initial?.phone || '');
    const [address, setAddress] = useState(initial?.address || '');
    const [photo, setPhoto] = useState(initial?.photo || '');
    const [idPhoto, setIdPhoto] = useState(initial?.idPhoto || '');
    const [error, setError] = useState('');
    const pickIdPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 480, setIdPhoto);
    };
    const pickProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 480, setPhoto);
    };
    const save = () => {
        const a = parseInt(age, 10);
        if (name.trim().length < 2) { setError('اكتب اسمك الأول.'); return; }
        if (!Number.isFinite(a) || a < 10 || a > 100) { setError('اكتب سنك بالأرقام.'); return; }
        if (phone.replace(/\D/g, '').length < 10) { setError('اكتب رقم موبايل صحيح من 11 رقم.'); return; }
        if (address.trim().length < 3) { setError('اكتب عنوانك (المنطقة والحي).' ); return; }
        if (!photo) { setError('ضيف صورتك الشخصية الأول، مطلوبة للأمان.'); return; }
        if (!idPhoto) { setError('ضيف صورة البطاقة كمان، مطلوبة للأمان.'); return; }
        setError('');
        onSave({ name: name.trim(), age: String(a), phone: phone.trim(), avatar: initial?.avatar || AVATARS[0], address: address.trim(), photo, idPhoto });
    };
    return <>
        <div className="nexus-idphoto">
            <span className="nexus-idphoto-label">صورتك الشخصية (سيلفي واضح)</span>
            <label className="nexus-idphoto-drop">
              {photo ? "غيّر صورتك" : "ارفع صورتك من موبايلك"}
              <input type="file" accept="image/*" onChange={pickProfilePhoto} aria-label="ارفع صورتك الشخصية" style={{ display: "none" }} />
            </label>
            {photo ? <img className="nexus-avatar nexus-avatar-photo nexus-avatar-lg" src={photo} alt="صورتك الشخصية" /> : null}
        </div>
        <Caption>صورتك مطلوبة عشان الإدارة تقارنها بصورة البطاقة وتتأكد إنك صاحب الحساب فعلًا. مبتظهرش لأي مستخدم تاني.</Caption>
        <TextField label="اسمك" value={name} onChange={(v: string) => setName(v)} />
        <TextField label="سنك" value={age} onChange={(v: string) => setAge(v)} />
        <TextField label="رقم موبايلك" value={phone} onChange={(v: string) => setPhone(v)} />
        <TextField label="عنوانك (المنطقة والحي)" value={address} onChange={(v: string) => setAddress(v)} />
        <div className="nexus-idphoto">
            <span className="nexus-idphoto-label">صورة البطاقة (إثبات شخصية)</span>
            <label className="nexus-idphoto-drop">
              {idPhoto ? "غيّر صورة البطاقة" : "ارفع صورة البطاقة من موبايلك"}
              <input type="file" accept="image/*" onChange={pickIdPhoto} aria-label="ارفع صورة البطاقة" style={{ display: "none" }} />
            </label>
            {idPhoto ? <img className="nexus-idphoto-preview" src={idPhoto} alt="صورة البطاقة اللي رفعتها" /> : null}
        </div>
        <Caption>صورة البطاقة مطلوبة عشان الأمان، ومبيشوفهاش أي مستخدم خالص - إدارة التطبيق بس اللي بتشوفها.</Caption>
        {error && <Callout title="راجع البيانات" tone="danger">{error}</Callout>}
        <FileButton variant="primary" pill onClick={save}>{submitLabel}</FileButton>
        <Caption>بياناتك بتتحفظ على سيرفر Firebase بأمان. صورتك وصورة بطاقتك مبيشوفهمش أي مستخدم، إدارة التطبيق بس.</Caption>
    </>;
}

function ProfilePage({ profile, myUid, email, myOrders, incoming, myListings, orders, rentalOrder, chats, onEditProfile, onReturn, onReturnCheck, onCancelRequest, onDeleteListing, onChat, onTrack, onOwnerAnswer, onOpenChat, onSupport, onComplain, onSignOut }: {
    profile: UserProfile; myUid: string; email: string; myOrders: OrderDoc[]; incoming: OrderDoc[]; myListings: ConsoleListing[]; orders: OrderDoc[]; rentalOrder: OrderDoc | null; chats: ChatDoc[];
    onEditProfile: () => void; onReturn: () => void; onReturnCheck: (v: CondState) => void; onCancelRequest: (id: string) => void;
    onDeleteListing: (id: string) => void; onChat: (name: string, suggestions?: string[], channelId?: string) => void; onTrack: (l: ConsoleListing) => void;
    onOwnerAnswer: (o: OrderDoc, ok: boolean) => void; onOpenChat: (c: ChatDoc) => void; onSupport: () => void; onComplain: () => void; onSignOut: () => void;
}) {
    const doneCount = myOrders.filter(o => o.status === 'returned').length;
    const openRequests = myOrders.filter(o => o.status === 'requested');
    const declined = myOrders.filter(o => o.status === 'declined');
    const chatName = (c: ChatDoc) => myUid === c.ownerId ? (c.renterName || 'مستأجر') : (c.kind === 'order' ? (c.courierName || 'المندوب') : (c.ownerName || 'المالك'));
    return <>
        <Group label="حسابك" heading={`أهلًا ${profile.name}`}>
            <div className="nexus-me">
                <UserAvatar profile={profile} size={56} />
                <div className="nexus-me-info">
                    <div className="nexus-card-title">{profile.name}</div>
                    <div className="nexus-muted">{profile.age} سنة · <bdi>{profile.phone}</bdi></div>
                    <div className="nexus-muted">{profile.address}</div>
                    <div className="nexus-muted"><bdi>{email}</bdi></div>
                </div>
                <FileButton variant="secondary" compact pill onClick={onEditProfile}>عدل بياناتك</FileButton>
            </div>
            <Facts items={[
                { label: 'إيجاراتك المكتملة', value: `${doneCount}` },
                { label: 'مستواك', value: 'برونزي' },
                { label: 'الباقي على فضي', value: `${Math.max(0, 5 - doneCount)} إيجارات` },
            ]} />
            <div className="nexus-progress" role="img" aria-label="تقدمك ناحية المستوى الفضي"><div style={{ width: `${Math.min(100, (doneCount / 5) * 100)}%` }} /></div>
        </Group>
        {rentalOrder && <ActiveRental
            rental={{ title: rentalOrder.title, owner: rentalOrder.ownerName, ownerPhone: rentalOrder.ownerPhone || '', pricePerDay: rentalOrder.pricePerDay, days: rentalOrder.days, startMs: rentalOrder.deliveredAt || rentalOrder.createdMs, returned: rentalOrder.status === 'returning', channelId: rentalOrder.deviceId ? dmChannelId(rentalOrder.deviceId, myUid) : undefined }}
            onReturn={onReturn} returnCheck={rentalOrder.returnCheck || EMPTY_COND} onReturnCheck={onReturnCheck} onChat={onChat} />}
        {declined.length > 0 && <Group label="طلبات اترفضت" heading>
            {declined.map(o => <div key={o.id} className="nexus-card"><div className="nexus-card-body">
                <div className="nexus-card-title">{o.title}</div>
                <div className="nexus-muted">{o.ownerName} اعتذر عن الطلب ده. جهاز تاني؟</div>
                <div className="nexus-card-actions">
                    <Link className="file-button is-compact" data-variant="secondary" to="/">شوف الإعلانات</Link>
                    <FileButton variant="ghost" compact onClick={() => onCancelRequest(o.id)}>امسح الطلب</FileButton>
                </div>
            </div></div>)}
        </Group>}
        {openRequests.length > 0 && <Group label="طلباتك المفتوحة" heading>
            {openRequests.map(r => <div key={r.id} className="nexus-card">
                <div className="nexus-card-body">
                    <div className="nexus-card-title">{r.title}</div>
                    <div className="nexus-muted">{r.ownerName} · {yom(r.days)} · إيجار <bdi>{r.rent}</bdi> ج.م وتأمين <bdi>{r.deposit}</bdi> ج.م</div>
                    <div className="nexus-status-line"><span className="nexus-dot nexus-dot-grey" />{statusAr(r.status)}</div>
                    <div className="nexus-card-actions">
                        <Link className="file-button is-compact" data-variant="primary" to="/order">تابع طلبك</Link>
                        {r.deviceId && <FileButton variant="secondary" compact pill onClick={() => onChat(r.ownerName, undefined, dmChannelId(r.deviceId as string, myUid))}>كلم {r.ownerName}</FileButton>}
                        <FileButton variant="ghost" compact onClick={() => onCancelRequest(r.id)}>الغي الطلب</FileButton>
                    </div>
                </div>
            </div>)}
            <Caption>الطلب بيتسجل على السيرفر والمالك بيشوفه في حسابه في نفس اللحظة.</Caption>
        </Group>}
        {incoming.length > 0 && <Group label="طلبات على أجهزتك" heading>
            {incoming.map(o => <div key={o.id} className="nexus-notice">
                <div className="nexus-card-title">حد عايز يأجر جهازك</div>
                <div className="nexus-muted">{o.renterName} طلب {o.title} لمدة {yom(o.days)} · إيجار <bdi>{o.rent}</bdi> ج.م{o.fromMs ? ` · يستلم يوم ${new Date(o.fromMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}</div>
                <div className="nexus-muted">جهازك متاح للإيجار دلوقتي؟</div>
                <div className="nexus-card-actions">
                    <FileButton variant="primary" compact pill onClick={() => onOwnerAnswer(o, true)}>متاح</FileButton>
                    <FileButton variant="ghost" compact onClick={() => onOwnerAnswer(o, false)}>مش متاح دلوقتي</FileButton>
                    {o.deviceId && <FileButton variant="secondary" compact pill onClick={() => onChat(o.renterName, undefined, dmChannelId(o.deviceId as string, o.renterId))}>كلم {o.renterName}</FileButton>}
                </div>
            </div>)}
        </Group>}
        {myListings.length > 0 && <Group label="إعلاناتك" heading>
            {myListings.map(l => {
                const active = orders.find(o => o.deviceId === l.id && ORDER_BUSY.includes(o.status));
                return <div key={l.id}>
                    <ConsoleCard listing={l} onDelete={l.status === 'rented' ? undefined : onDeleteListing} onTrack={() => onTrack(l)} />
                    {l.status === 'rented' && <div className="nexus-status-line"><span className="nexus-dot nexus-dot-red" />قيد الإيجار{active ? ` · ${statusAr(active.status)}` : ''}</div>}
                    {active && l.status !== 'rented' && <div className="nexus-status-line"><span className="nexus-dot nexus-dot-pink" />{statusAr(active.status)} · المستأجر: {active.renterName}</div>}
                </div>;
            })}
            <Caption>الإعلان المؤجر بيختفي من صفحة الإعلانات العامة، وانت بس اللي شايفه هنا. تقدر تتبع مكان جهازك طول ما هو بره.</Caption>
        </Group>}
        {(() => { const visibleChats = chats.filter(c => !c.id.startsWith('order_') || orders.some(o => o.id === c.id.slice(6))); return visibleChats.length > 0 && <Group label="الرسايل" heading>
            {visibleChats.map(c => <div key={c.id} className="nexus-card nexus-user-row" role="button" tabIndex={0} onClick={() => onOpenChat(c)} onKeyDown={e => { if (e.key === 'Enter') onOpenChat(c); }}>
                <div className="nexus-card-body">
                    <div className="nexus-card-title">{chatName(c)}</div>
                    <div className="nexus-muted">{c.deviceTitle || 'محادثة'}{c.lastText ? ` · ${c.lastText}` : ''}</div>
                </div>
            </div>)}
        </Group>; })()}
        <Group label="طبقات النجوم" heading="كل ما تأجر أكتر، تكسب أكتر">
            <Rows>
                <Row number={1} name="برونزي" detail="من أول إيجار" value="شارة مؤجر جديد" />
                <Row number={2} name="فضي" detail="خمس إيجارات مكتملة" value="خصم 5 في المية من العمولة" />
                <Row number={3} name="دهبي" detail="خمستاشر إيجار مكتمل" value="خصم 10 في المية وأولوية ظهور" />
            </Rows>
            <Caption>التقييمات بتظهر بعد أول إيجار مكتمل.</Caption>
        </Group>
        <Group label="خدمة العملاء" heading>
            <Paragraph>عندك مشكلة أو سؤال؟ كلم الدعم في أي وقت، أو قدم شكوى رسمية والإدارة تراجعها.</Paragraph>
            <div className="nexus-card-actions">
                <FileButton variant="secondary" compact pill onClick={onSupport}>كلم الدعم</FileButton>
                <FileButton variant="ghost" compact onClick={onComplain}>قدم شكوى</FileButton>
            </div>
        </Group>
        <div className="nexus-card-actions">
            <FileButton variant="ghost" compact onClick={onSignOut}>سجل خروج من الحساب</FileButton>
        </div>
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
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="تقديم شكوى">
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            <h2 className="nexus-sheet-title">قدم شكوى</h2>
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

function AdminGateDialog({ step, onRole, onClose }: { step: 'password' | 'role'; onRole: (r: 'courier' | 'admin') => void; onClose: () => void }) {
    const [pw, setPw] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState(false);
    const submit = async () => {
        if (busy) return;
        setBusy(true);
        const good = await checkAdminPassword(pw);
        setBusy(false);
        if (good) { setOk(true); }
        else { setError('الباسورد ده مش صحيح. حاول تاني.'); setPw(''); }
    };
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="دخول لوحة الإدارة">
        <div className="nexus-sheet">
            <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={onClose} /></div>
            {step === 'password' && !ok ? <>
                <h2 className="nexus-sheet-title">منطقة للإدارة بس</h2>
                <Paragraph>اكتب باسورد الإدارة عشان تكمل.</Paragraph>
                <input className="nexus-chat-input" dir="ltr" type="password" autoComplete="off" value={pw}
                    onChange={e => { setPw(e.target.value); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                    placeholder="password" aria-label="باسورد الإدارة" />
                {error && <Caption>{error}</Caption>}
                <div className="nexus-card-actions">
                    <FileButton variant="primary" compact pill disabled={!pw.trim() || busy} onClick={submit}>{busy ? 'بنراجع...' : 'دخول'}</FileButton>
                </div>
                <Caption>البوابة دي حماية مبدئية على المتصفح. الحماية الكاملة هتبقى على السيرفر.</Caption>
            </> : <>
                <h2 className="nexus-sheet-title">تدخل كإيه؟</h2>
                <div className="nexus-circles">
                    <button type="button" className="nexus-circle nexus-circle-icon" onClick={() => onRole('courier')}><Icon name="package" size={30} /><span>مندوب</span></button>
                    <button type="button" className="nexus-circle nexus-circle-icon" onClick={() => onRole('admin')}><Icon name="shield" size={30} /><span>إدارة</span></button>
                </div>
                <Caption>المندوب بيشوف طلبات التوصيل ويأكد التسليم. الإدارة بتشوف المستخدمين والشكاوى والسجلات.</Caption>
            </>}
        </div>
    </div>;
}

function CourierPanel({ feed, myUid, myName, exactLoc, onTake, onPickedUp, onArrived, onDeliver, onReturnDone, onChat, onExit }: {
    feed: OrderDoc[]; myUid: string; myName: string; exactLoc: Record<string, LatLng>;
    onTake: (o: OrderDoc) => void; onPickedUp: (o: OrderDoc) => void; onArrived: (o: OrderDoc) => void;
    onDeliver: (o: OrderDoc) => void; onReturnDone: (o: OrderDoc) => void;
    onChat: (name: string, suggestions: string[], channelId: string) => void; onExit: () => void;
}) {
    const mine = feed.filter(o => o.courierId === myUid && o.status !== 'accepted');
    return <>
        <Group label="لوحة المندوب" heading={`أهلًا ${myName}`}>
            <Facts items={[
                { label: 'الدور', value: 'مندوب توصيل' },
                { label: 'طلبات جاهزة تستلمها', value: `${feed.filter(o => o.status === 'accepted').length}` },
                { label: 'طلبات معاك دلوقتي', value: `${mine.length}` },
            ]} />
            <Callout title="لوحة مندوب حقيقية" tone="note">الطلبات دي لايف من السيرفر: أي طلب المالك وافق عليه بيظهر هنا في نفس اللحظة، والمستأجر بيشوف تحديثاتك أول بأول.</Callout>
        </Group>
        {feed.length === 0 && <Group label="الطلبات" heading="مفيش طلبات دلوقتي">
            <Callout title="استنى طلبات جديدة" tone="note">أول ما مالك يوافق على طلب إيجار، الطلب هيظهر هنا على طول.</Callout>
        </Group>}
        {feed.map(o => <Group key={o.id} label={o.courierId === myUid ? 'طلب معاك' : 'طلب جديد'} heading={o.title}>
            <div className="nexus-card"><div className="nexus-card-body">
                <div className="nexus-card-title">{o.title}</div>
                <div className="nexus-muted">المالك: {o.ownerName}{o.ownerPhone ? <> · <bdi>{o.ownerPhone}</bdi></> : null}</div>
                <div className="nexus-muted">المستأجر: {o.renterName}{o.renterPhone ? <> · <bdi>{o.renterPhone}</bdi></> : null}</div>
                <div className="nexus-muted">{yom(o.days)} · المطلوب عند الاستلام {o.rent + o.deposit + (o.deliveryFee || 0) - (o.discount || 0)} ج.م</div>
                <div className="nexus-status-line"><span className="nexus-dot nexus-dot-pink" />{statusAr(o.status)}</div>
                {o.courierId === myUid && (o.status === 'taken' || o.status === 'returning') && o.deviceId && exactLoc[o.deviceId] && <>
                    <a className="file-button is-compact" data-variant="secondary" href={`https://www.google.com/maps?q=${exactLoc[o.deviceId].lat},${exactLoc[o.deviceId].lng}`} target="_blank" rel="noreferrer">افتح مكان المالك الدقيق في الخريطة</a>
                    <Caption>المكان الدقيق ده للمندوب بس، متشاركوش مع حد تاني.</Caption>
                </>}
                {o.status === 'accepted' && <div className="nexus-card-actions">
                    <FileButton variant="primary" compact pill onClick={() => onTake(o)}>استلم الطلب ده</FileButton>
                </div>}
                {o.status === 'taken' && <>
                    <Caption>روح للمالك، راجع الجهاز قدامه، ركّب الـ AirTag، وبعدين أكد الاستلام.</Caption>
                    <div className="nexus-card-actions">
                        <FileButton variant="primary" compact pill onClick={() => onPickedUp(o)}>استلمت الجهاز من المالك</FileButton>
                    </div>
                </>}
                {o.status === 'pickedup' && <>
                    <Caption>اتحرك للمستأجر. لما توصل لبابه دوس وصلت.</Caption>
                    <div className="nexus-card-actions">
                        <FileButton variant="primary" compact pill onClick={() => onArrived(o)}>وصلت عند المستأجر</FileButton>
                        <FileButton variant="secondary" compact pill onClick={() => onChat(o.renterName, COURIER_CHAT_SUGGESTIONS, orderChannelId(o.id))}>كلم المستأجر</FileButton>
                    </div>
                </>}
                {o.status === 'arrived' && <>
                    {condComplete(o.handoverCheck || null)
                        ? <div className="nexus-card-actions"><FileButton variant="primary" compact pill onClick={() => onDeliver(o)}>تأكيد التسليم للمستأجر</FileButton></div>
                        : <>
                            <div className="nexus-card-actions"><FileButton variant="primary" compact pill disabled>تأكيد التسليم للمستأجر</FileButton></div>
                            <Caption>المستأجر لسه بيراجع الجهاز: التشيك ليست لازم تتكمل بصورة واحدة على الأقل قبل ما تأكد التسليم.</Caption>
                        </>}
                    <div className="nexus-card-actions">
                        <FileButton variant="secondary" compact pill onClick={() => onChat(o.renterName, COURIER_CHAT_SUGGESTIONS, orderChannelId(o.id))}>كلم المستأجر</FileButton>
                    </div>
                </>}
                {o.status === 'returning' && <>
                    <Caption>المستأجر خلص: روح استلم الجهاز منه، اتشيك عليه وشيل الـ AirTag قدامه، وارجعه للمالك، وبعدين أكد الإرجاع.</Caption>
                    <div className="nexus-card-actions">
                        <FileButton variant="primary" compact pill onClick={() => onReturnDone(o)}>استلمت الجهاز وأنهيت الإيجار</FileButton>
                        <FileButton variant="secondary" compact pill onClick={() => onChat(o.renterName, COURIER_CHAT_SUGGESTIONS, orderChannelId(o.id))}>كلم المستأجر</FileButton>
                    </div>
                </>}
            </div></div>
        </Group>)}
        <div className="nexus-card-actions">
            <FileButton variant="ghost" compact onClick={onExit}>خروج من لوحة المندوب</FileButton>
        </div>
    </>;
}

function AdminPage({ users, complaints, orders, devices, onCloseComplaint, onDeleteUser }: {
    users: AdminUserDoc[]; complaints: ComplaintDoc[]; orders: OrderDoc[]; devices: DeviceDoc[];
    onCloseComplaint: (id: string) => void; onDeleteUser: (id: string) => void;
}) {
    const [selected, setSelected] = useState<AdminUserDoc | null>(null);
    const activeOrders = orders.filter(o => ORDER_BUSY.includes(o.status) || o.status === 'requested');
    const rentedCount = devices.filter(d => d.status === 'rented').length;
    const openComplaints = complaints.filter(c => c.status === 'مفتوحة');
    return <>
        <Group label="لوحة الإدارة" heading="نظرة عامة">
            <Facts items={[
                { label: 'المستخدمين المسجلين', value: `${users.length}` },
                { label: 'الإعلانات المنشورة', value: `${devices.length}` },
                { label: 'طلبات شغالة دلوقتي', value: `${activeOrders.length}` },
                { label: 'أجهزة قيد الإيجار', value: `${rentedCount}` },
                { label: 'شكاوى مفتوحة', value: `${openComplaints.length}` },
            ]} />
            <Callout title="الأرقام دي حقيقية" tone="note">كل الأرقام والمستخدمين والطلبات هنا لايف من السيرفر، بتتحدث لحظة بلحظة.</Callout>
        </Group>
        <Group label="المستخدمين" heading={`${users.length} مسجل`}>
            {users.map(u => <div key={u.id} className="nexus-card nexus-user-row" role="button" tabIndex={0} onClick={() => setSelected(u)} onKeyDown={e => { if (e.key === 'Enter') setSelected(u); }}>
                <div className="nexus-card-body">
                    <div className="nexus-card-title">{u.name}</div>
                    <div className="nexus-muted"><bdi>{u.phone}</bdi> · {u.address}</div>
                    <div className="nexus-muted"><bdi>{u.email || ''}</bdi> · {devices.filter(d => d.ownerId === u.id).length} إعلان</div>
                </div>
            </div>)}
        </Group>
        <Group label="الطلبات والإيجارات الحالية" heading>
            {activeOrders.length === 0 && <Caption>مفيش طلبات شغالة دلوقتي.</Caption>}
            <Rows>
                {activeOrders.map((o, i) => <Row key={o.id} number={i + 1} name={o.title} detail={`المستأجر: ${o.renterName} · المالك: ${o.ownerName}`} value={statusAr(o.status)} valueKnown />)}
            </Rows>
        </Group>
        <Group label="الشكاوى" heading={`${complaints.length} شكوى`}>
            {complaints.length === 0 && <Caption>مفيش شكاوى لحد دلوقتي.</Caption>}
            {complaints.map(c => {
                const closed = c.status !== 'مفتوحة';
                return <div key={c.id} className="nexus-card"><div className="nexus-card-body">
                    <div className="nexus-card-title">{c.subject}</div>
                    <div className="nexus-muted">من {c.from} · {new Date(c.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</div>
                    <div className="nexus-muted">{c.detail}</div>
                    <div className="nexus-card-actions">
                        <span className={closed ? 'nexus-chip' : 'nexus-chip nexus-chip-open'}>{closed ? 'مقفولة' : 'مفتوحة'}</span>
                        {!closed && <FileButton variant="ghost" compact onClick={() => onCloseComplaint(c.id)}>اقفل الشكوى</FileButton>}
                    </div>
                </div></div>;
            })}
        </Group>
        {selected !== null && <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="بيانات المستخدم" onClick={() => setSelected(null)}>
            <div className="nexus-sheet" onClick={e => e.stopPropagation()}>
                <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={() => setSelected(null)} /></div>
                <h2 className="nexus-sheet-title">{selected.name}</h2>
                <Facts items={[
                    { label: 'الموبايل', value: selected.phone },
                    { label: 'الإيميل', value: selected.email || '—' },
                    { label: 'السن', value: `${selected.age} سنة` },
                    { label: 'العنوان', value: selected.address },
                    { label: 'إعلاناته', value: `${devices.filter(d => d.ownerId === selected.id).length}` },
                    { label: 'طلباته', value: `${orders.filter(o => o.renterId === selected.id || o.ownerId === selected.id).length}` },
                ]} />
                <div className="nexus-photo-compare">
                    <div>
                        <div className="nexus-idphoto-label">صورته الشخصية</div>
                        {selected.photo ? <img className="nexus-idphoto-full" src={selected.photo} alt="الصورة الشخصية للمستخدم" /> : <div className="nexus-idphoto-empty">لسه ما رفعش صورة شخصية</div>}
                    </div>
                    <div>
                        <div className="nexus-idphoto-label">صورة البطاقة</div>
                        {selected.idPhoto ? <img className="nexus-idphoto-full" src={selected.idPhoto} alt="صورة بطاقة المستخدم" /> : <div className="nexus-idphoto-empty">لسه ما رفعش صورة بطاقة</div>}
                    </div>
                </div>
                <Caption>قارن الصورتين عشان تتأكد إن صاحب الحساب هو صاحب البطاقة. الصور دي بتظهر في لوحة الإدارة بس.</Caption>
                <div className="nexus-card-actions">
                    <FileButton variant="ghost" compact onClick={() => { onDeleteUser(selected.id); setSelected(null); }}>احذف الحساب</FileButton>
                </div>
            </div>
        </div>}
    </>;
}

function Drawer({ open, profile, myCount, email, onClose, onGuide, onSupport, onSignOut }: { open: boolean; profile: UserProfile | null; myCount: number; email?: string; onClose: () => void; onGuide: () => void; onSupport: () => void; onSignOut?: () => void }) {
    if (!open) return null;
    const item = (to: string, icon: IconName, label: string, end?: boolean) => <NavLink to={to} end={end} onClick={onClose} className="nexus-drawer-link"><Icon name={icon} size={24} /><span>{label}</span></NavLink>;
    return <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="القائمة" onClick={onClose}>
        <div className="nexus-drawer" onClick={e => e.stopPropagation()}>
            <div className="nexus-sheet-close"><CloseButton label="إغلاق القائمة" onClick={onClose} /></div>
            <NavLink to="/profile" onClick={onClose} className="nexus-drawer-me">
                <UserAvatar profile={profile} size={48} />
                <span>
                    <span className="nexus-card-title">{profile ? profile.name : 'ضيف'}</span>
                    <span className="nexus-muted">دوس علشان تشوف وتعدل بياناتك</span>
                </span>
            </NavLink>
            <nav className="nexus-drawer-nav" aria-label="صفحات التطبيق">
                {item('/', 'grid', 'الإعلانات', true)}
                {item('/map', 'map', 'الخريطة')}
                {item('/order', 'package', 'تتبع طلبك')}
                {item('/add', 'plus', 'أضف إعلانك')}
                {item('/profile', 'list', `إعلاناتي${myCount ? ` (${myCount})` : ''}`)}
                {item('/profile', 'user', 'حسابك')}
                <button type="button" className="nexus-drawer-link nexus-drawer-btn" onClick={() => { onClose(); onSupport(); }}><Icon name="headset" size={24} /><span>خدمة العملاء</span></button>
                <button type="button" className="nexus-drawer-link nexus-drawer-btn" onClick={() => { onClose(); onGuide(); }}><Icon name="help" size={24} /><span>طريقة الاستخدام</span></button>
                {onSignOut && <button type="button" className="nexus-drawer-link nexus-drawer-btn" onClick={() => { onClose(); onSignOut(); }}><Icon name="user" size={24} /><span>سجل خروج{email ? ` (${email})` : ''}</span></button>}
            </nav>
        </div>
    </div>;
}

const SHOT = typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_SHOT === '1';

function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [email, setEmail] = useState('');
    const [pw, setPw] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    const submit = async () => {
        if (busy) return;
        const e = email.trim();
        if (!e.includes('@')) { setErr('اكتب إيميل صحيح.'); return; }
        if (pw.length < 6) { setErr('الباسورد لازم 6 حروف أو أرقام على الأقل.'); return; }
        setBusy(true); setErr('');
        try { if (mode === 'signup') await fbSignUp(e, pw); else await fbSignIn(e, pw); }
        catch (x) { setErr(authErrorAr(x)); }
        setBusy(false);
    };
    return <FileCard lang="ar" dir="rtl"><div className="nexus-app">
        <Header title="NEXUS" fact="نسخة 1.6" intro="وسيط بين اللي عنده بلايستيشن أو إكس بوكس واللي عايز يلعب: اختار أقرب جهاز، والمندوب يوصله لحد بابك." />
        <Group label={mode === 'signup' ? 'حساب جديد' : 'تسجيل دخول'} heading={mode === 'signup' ? 'اعمل حسابك في دقيقة' : 'أهلًا برجوعك'}>
            <span className="nexus-idphoto-label">الإيميل</span>
            <input className="nexus-chat-input" dir="ltr" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="name@gmail.com" aria-label="الإيميل" />
            <span className="nexus-idphoto-label">الباسورد</span>
            <input className="nexus-chat-input" dir="ltr" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="٦ حروف أو أرقام على الأقل" aria-label="الباسورد" />
            {err && <Callout title="راجع البيانات" tone="danger">{err}</Callout>}
            <FileButton variant="primary" pill disabled={busy} onClick={submit}>{busy ? 'ثواني...' : mode === 'signup' ? 'اعمل الحساب' : 'ادخل'}</FileButton>
            <button type="button" className="nexus-linklike" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); }}>
                {mode === 'signup' ? 'عندك حساب بالفعل؟ سجل دخولك' : 'أول مرة هنا؟ اعمل حساب جديد'}
            </button>
            <Caption>حسابك بيتسجل على سيرفر Firebase. بعد ما تعمل الحساب هنطلب صورتك الشخصية وصورة بطاقتك، وده مطلوب للأمان عشان كل طرف يبقى معروف.</Caption>
        </Group>
    </div></FileCard>;
}

function withDefaults(l: any): ConsoleListing {
    const { ownerKind, shopId, ...rest } = l;
    return { model: 'ستاندارد', storage: '825GB', controllers: 2, games: [], includes: '', ...rest };
}

export function App() {
    const [requestTarget, setRequestTarget] = useState<{ title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number; deviceId?: string; ownerId?: string } | null>(null);
    const [chatWith, setChatWith] = useState<ChatTarget | null>(null);
    const [tracking, setTracking] = useState<ConsoleListing | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [detail, setDetail] = useState<ConsoleListing | null>(null);
    const [editProfile, setEditProfile] = useState(false);
    const [complaintOpen, setComplaintOpen] = useState(false);
    const [gateStep, setGateStep] = useState<'none' | 'password' | 'role'>('none');
    const [adminRole, setAdminRole] = useState<null | 'courier' | 'admin'>(null);
    const [errNote, setErrNote] = useState('');
    const user = useAuthUser();
    const profileDoc = useProfile(user ? user.uid : undefined);
    const devices = useDevices();
    const ordersAll = useOrders();
    const chats = useMyChats(user ? user.uid : undefined);
    const adminUsers = useAllUsers(adminRole === 'admin');
    const adminComplaints = useComplaints(adminRole === 'admin');
    const lpTimer = useRef<number | null>(null);

    const run = (p: Promise<any>, msg: string) => p.catch((e) => { console.warn(e); setErrNote(msg); });

    useEffect(() => {
        if (!SHOT) return;
        const q = new URLSearchParams(window.location.search);
        if (q.get('shot_menu') === '1') setMenuOpen(true);
        if (q.get('shot_gate') === 'password') setGateStep('password');
        const ch = q.get('shot_chat');
        if (ch) setChatWith({ name: q.get('shot_chatname') || 'محادثة', channelId: ch });
        const sr = q.get('shot_role');
        if (sr === 'courier' || sr === 'admin') setAdminRole(sr);
        if (q.get('shot_track') === '1') {
            setTracking({
                id: 'shot-dev', number: 1, kind: 'Xbox', title: 'Xbox Series X', owner: 'نور',
                area: 'أكتوبر', district: 'الحي الثالث', pricePerDay: 150, deposit: 2000, rating: 4.8, reviews: 12,
                delivery: true, model: 'Series X', storage: '1TB', controllers: 1, games: [], includes: '',
                lat: 29.9625, lng: 30.9275,
            });
        }
    }, []);
    useEffect(() => {
        if (!SHOT || user !== null) return;
        const q = new URLSearchParams(window.location.search);
        const e = q.get('shot_email');
        const p = q.get('shot_pw');
        if (e && p) fbSignIn(e, p).catch((x) => console.warn('shot signin', x));
    }, [user]);

    const lpStart = (e: React.PointerEvent) => {
        if (!(e.target as HTMLElement).closest('.file-title')) return;
        lpCancel();
        lpTimer.current = window.setTimeout(() => { lpTimer.current = null; setGateStep('password'); }, 650);
    };
    const lpCancel = () => { if (lpTimer.current !== null) { clearTimeout(lpTimer.current); lpTimer.current = null; } };
    const pickRole = (r: 'courier' | 'admin') => {
        setAdminRole(r);
        setGateStep('none');
        window.location.hash = '/admin';
    };

    const uid = user ? user.uid : '';
    const orders = ordersAll || [];
    const profile: UserProfile | null = profileDoc ? { name: profileDoc.name, age: profileDoc.age, phone: profileDoc.phone, avatar: profileDoc.avatar, address: profileDoc.address, photo: profileDoc.photo, idPhoto: profileDoc.idPhoto } : null;
    const devList = devices || [];
    const realListings: ConsoleListing[] = devList.map((d, i) => ({
        id: d.id, number: 100 + (devList.length - i), kind: d.kind, title: d.title, owner: d.ownerName, ownerId: d.ownerId,
        area: d.area, district: d.district, pricePerDay: d.pricePerDay, deposit: d.deposit, rating: d.rating, reviews: d.reviews,
        delivery: d.delivery, model: d.model, storage: d.storage, controllers: d.controllers, games: d.games, includes: d.includes,
        photoKey: d.photoKey, photoData: d.photoData, mine: d.ownerId === uid, status: d.status, createdAt: d.createdAt,
        lat: d.lat, lng: d.lng,
    }));
    const consoles: ConsoleListing[] = realListings.filter(l => l.status !== 'rented');
    const myListings = realListings.filter(l => l.ownerId === uid);
    const myOrders = orders.filter(o => o.renterId === uid);
    const incoming = orders.filter(o => o.ownerId === uid && o.status === 'requested');
    const currentOrder = myOrders.find(o => ['accepted', 'taken', 'pickedup', 'arrived'].includes(o.status)) || null;
    const rentalOrder = myOrders.find(o => o.status === 'delivered' || o.status === 'returning') || null;
    const courierFeed = orders.filter(o => o.status === 'accepted' || (o.courierId === uid && [...ORDER_BUSY, 'returning' as OrderStatus].includes(o.status)));
    const exactLoc = useExactLocations(devList, uid);

    const requestConsole = (l: ConsoleListing) => {
        setRequestTarget({ title: l.title, owner: l.owner, ownerLine: `${l.owner} · ${areaName(l.area)}، ${l.district}`, pricePerDay: l.pricePerDay, deposit: l.deposit, number: l.number, deviceId: l.id, ownerId: l.ownerId });
    };

    const ensureDm = (channelId: string) => {
        if (!user || !profile) return;
        const parts = channelId.split('_');
        const deviceId = parts[1];
        const renterUid = parts.slice(2).join('_');
        const d = devList.find(x => x.id === deviceId);
        const chat: ChatDoc = {
            id: channelId, kind: 'dm', deviceId, deviceTitle: d ? d.title : 'جهاز',
            ownerId: d ? d.ownerId : (uid === renterUid ? '' : uid),
            ownerName: d ? d.ownerName : (uid === renterUid ? 'المالك' : profile.name),
            renterId: renterUid, renterName: uid === renterUid ? profile.name : (d ? '' : profile.name),
            updatedAt: Date.now(),
        };
        run(fbOpenChat(chat), 'المحادثة ماتفتحتش. جرب تاني.');
    };
    const ensureOrderChat = (channelId: string) => {
        if (!user || !profile) return;
        const o = orders.find(x => orderChannelId(x.id) === channelId);
        if (!o) return;
        run(fbOpenChat({ id: channelId, kind: 'order', orderId: o.id, deviceTitle: o.title, renterId: o.renterId, renterName: o.renterName, courierId: o.courierId, courierName: o.courierName, updatedAt: Date.now() }), 'المحادثة ماتفتحتش. جرب تاني.');
    };
    const handleChat = (name: string, suggestions?: string[], channelId?: string) => {
        if (channelId) {
            if (channelId.startsWith('dm_')) ensureDm(channelId);
            else ensureOrderChat(channelId);
        }
        setChatWith({ name, suggestions, channelId });
    };
    const openDmFor = (l: ConsoleListing) => handleChat(l.owner, undefined, dmChannelId(l.id, uid));
    const chatNameOf = (c: ChatDoc) => uid === c.ownerId ? (c.renterName || 'مستأجر') : (c.kind === 'order' ? (c.courierName || 'المندوب') : (c.ownerName || 'المالك'));

    const addListing = (data: { kind: 'PS5' | 'PS4' | 'Xbox'; model: string; storage: string; controllers: number; area: 'زايد' | 'أكتوبر'; district: string; games: string[]; includes: string; pricePerDay: number; deposit: number; photoKey?: string; photoData?: string; lat: number; lng: number }) => {
        if (!user || !profile) return;
        const ang = Math.random() * 2 * Math.PI;
        const r = 0.0022 + Math.random() * 0.0014;
        const fuzzLoc: [number, number] = [r * Math.sin(ang), r * Math.cos(ang)];
        run(fbAddDevice({
            kind: data.kind, title: `${KIND_TITLE[data.kind] || data.kind} ${data.model}`,
            ownerId: uid, ownerName: profile.name, area: data.area, district: data.district,
            pricePerDay: data.pricePerDay, deposit: data.deposit, rating: 0, reviews: 0, delivery: true,
            model: data.model, storage: data.storage, controllers: data.controllers, games: data.games, includes: data.includes,
            photoKey: data.photoKey, photoData: data.photoData,
            // النسخة العامة مموّهة: إزاحة عشوائية ٢٥٠-٤٠٠ متر من النقطة الحقيقية. الدقيق بيتخزن منفصل وخاص.
            lat: data.lat + fuzzLoc[0], lng: data.lng + fuzzLoc[1], status: 'open', createdAt: Date.now(),
        }, { lat: data.lat, lng: data.lng }), 'الإعلان ماتنشرش. اتأكد من النت وجرب تاني.');
    };
    const confirmRequest = (r: { days: number; rent: number; deposit: number; fromMs: number; deliveryFee: number; promo: string; discount: number; payMethod: string }) => {
        if (!requestTarget || !user || !profile || !requestTarget.deviceId || !requestTarget.ownerId) return;
        run(fbCreateOrder({
            deviceId: requestTarget.deviceId, listingNumber: requestTarget.number, title: requestTarget.title,
            ownerId: requestTarget.ownerId, ownerName: requestTarget.owner,
            renterId: uid, renterName: profile.name, renterPhone: profile.phone,
            pricePerDay: requestTarget.pricePerDay, days: r.days, rent: r.rent, deposit: r.deposit,
            fromMs: r.fromMs, deliveryFee: r.deliveryFee, promo: r.promo, discount: r.discount, payMethod: r.payMethod,
            status: 'requested', createdMs: Date.now(), handoverCheck: null, returnCheck: null,
        }), 'الطلب ماتبعتش. اتأكد من النت وجرب تاني.');
    };
    const ownerAnswer = (o: OrderDoc, ok: boolean) => {
        if (!profile) return;
        run(fbUpdateOrder(o.id, ok ? { status: 'accepted', ownerPhone: profile.phone } : { status: 'declined' }), 'الرد ماتسجلش. جرب تاني.');
    };
    const courierTake = (o: OrderDoc) => {
        profile && run(fbUpdateOrder(o.id, { status: 'taken', courierId: uid, courierName: profile.name }), 'ماتسجلش. جرب تاني.');
        if (o.deviceId) run(fbUpdateDevice(o.deviceId, { activeCourierId: uid }), '');
    };
    const courierPickedUp = (o: OrderDoc) => run(fbUpdateOrder(o.id, { status: 'pickedup' }), 'ماتسجلش. جرب تاني.');
    const courierArrived = (o: OrderDoc) => run(fbUpdateOrder(o.id, { status: 'arrived' }), 'ماتسجلش. جرب تاني.');
    const courierDeliver = (o: OrderDoc) => {
        run(fbUpdateOrder(o.id, { status: 'delivered', deliveredAt: Date.now() }), 'ماتسجلش. جرب تاني.');
        if (o.deviceId) run(fbUpdateDevice(o.deviceId, { status: 'rented', activeCourierId: '' }), '');
    };
    const renterReturn = () => { if (rentalOrder) run(fbUpdateOrder(rentalOrder.id, { status: 'returning' }), 'ماتسجلش. جرب تاني.'); };
    const courierReturnDone = (o: OrderDoc) => {
        run(fbUpdateOrder(o.id, { status: 'returned' }), 'ماتسجلش. جرب تاني.');
        if (o.deviceId) run(fbUpdateDevice(o.deviceId, { status: 'open', activeCourierId: '' }), '');
    };
    const saveProfile = (p: UserProfile) => {
        if (!user) return;
        run(fbSaveProfile(uid, { ...p, email: user.email || '' }), 'البيانات ماتحفظتش. اتأكد من النت وجرب تاني.');
        setEditProfile(false);
    };
    const submitComplaint = (subject: string, detailText: string) => {
        if (!user || !profile) return;
        run(fbAddComplaint({ uid, from: profile.name, subject, detail: detailText, status: 'مفتوحة', createdAt: Date.now() }), 'الشكوى ماتبعتتش. جرب تاني.');
    };
    const openSupport = () => setChatWith({ name: SUPPORT_NAME, suggestions: SUPPORT_SUGGESTIONS });

    const busyForTarget = requestTarget
        ? busyDaysFor(consoles.find(c => c.id === requestTarget.deviceId) || ({ id: requestTarget.deviceId || '', number: requestTarget.number, ownerId: requestTarget.ownerId } as ConsoleListing), orders)
        : new Set<number>();

    if (user === undefined || (user && profileDoc === undefined) || devices === undefined || ordersAll === undefined) {
        return <FileCard lang="ar" dir="rtl"><div className="nexus-app">
            <Header title="NEXUS" fact="نسخة 1.6" intro="ثواني وبنجهز حسابك من السيرفر..." />
        </div></FileCard>;
    }
    if (!user) return <> <AuthPage /> {SHOT && tracking && (() => {
        const lat = typeof tracking.lat === 'number' ? (tracking.lat as number) : AREA_CENTER['زايد'][0];
        const lng = typeof tracking.lng === 'number' ? (tracking.lng as number) : AREA_CENTER['زايد'][1];
        return <TrackingDialog title={tracking.title} lat={lat} lng={lng} exact={false} place={[tracking.district, areaName(tracking.area)].filter(Boolean).join('، ')} onClose={() => setTracking(null)} />;
    })()} </>;
    if (!profile) {
        return <FileCard lang="ar" dir="rtl"><div className="nexus-app">
            <Header title="NEXUS" fact="نسخة 1.6" intro="آخر خطوة: عرفنا بنفسك. بياناتك بتتحفظ على السيرفر بأمان، وصورتك وصورة بطاقتك للإدارة بس." />
            <Group label="بياناتك" heading="معلوماتك الأساسية">
                <ProfileForm initial={null} submitLabel="احفظ وابدأ" onSave={saveProfile} />
            </Group>
        </div></FileCard>;
    }
    return <FileCard lang="ar" dir="rtl">
        <div className="nexus-app">
        <div className="nexus-topbar">
            <button type="button" className="nexus-menu-btn" aria-label="افتح القائمة" onClick={() => setMenuOpen(true)}>⋮</button>
        </div>
        <div onPointerDown={lpStart} onPointerUp={lpCancel} onPointerMove={lpCancel} onPointerLeave={lpCancel} onPointerCancel={lpCancel}
            onContextMenu={e => { if ((e.target as HTMLElement).closest('.file-title')) e.preventDefault(); }}>
            <Header title="NEXUS" fact="نسخة 1.6" intro="وسيط بين اللي عنده بلايستيشن أو إكس بوكس واللي عايز يلعب: اختار أقرب جهاز، كلم صاحبها، وادفع كاش عند الاستلام." />
        </div>
        <Callout title="متصل بسيرفر حقيقي" tone="note">الإعلانات والطلبات والشات حقيقية وبتتحفظ على السيرفر لحظة بلحظة، والدفع كاش عند الاستلام مع المندوب.</Callout>
        <Drawer open={menuOpen} profile={profile} myCount={myListings.length} email={user.email || ''} onClose={() => setMenuOpen(false)} onGuide={() => setGuideOpen(true)} onSupport={openSupport} onSignOut={() => { fbSignOut().catch(() => {}); }} />
        <Routes>
            <Route path="/" element={<Home consoles={consoles} onOpenConsole={setDetail} />} />
            <Route path="/map" element={<MapPage consoles={consoles} onRequest={requestConsole} exactLoc={exactLoc} />} />
            <Route path="/add" element={<AddPage onAdd={addListing} blocked={!!rentalOrder} profile={profile} />} />
            <Route path="/admin" element={adminRole === 'courier'
                ? <CourierPanel feed={courierFeed} myUid={uid} myName={profile.name} exactLoc={exactLoc}
                    onTake={courierTake} onPickedUp={courierPickedUp} onArrived={courierArrived} onDeliver={courierDeliver} onReturnDone={courierReturnDone}
                    onChat={(n, s, ch) => handleChat(n, s, ch)} onExit={() => { setAdminRole(null); window.location.hash = '/'; }} />
                : adminRole === 'admin'
                    ? <>
                        <AdminPage users={adminUsers || []} complaints={adminComplaints || []} orders={orders} devices={devList}
                            onCloseComplaint={(id) => run(fbCloseComplaint(id), 'ماتقفلتش. جرب تاني.')}
                            onDeleteUser={(id) => run(fbDeleteUser(id), 'ماتمسحش. جرب تاني.')} />
                        <div className="nexus-card-actions"><FileButton variant="ghost" compact onClick={() => { setAdminRole(null); window.location.hash = '/'; }}>خروج من لوحة الإدارة</FileButton></div>
                    </>
                    : <Group label="الصفحة دي مش موجودة" heading="اتوجهت غلط"><Callout title="مفيش حاجة هنا" tone="note">الصفحة دي مش متاحة. ارجع للإعلانات.</Callout><Link className="file-button is-compact" data-variant="secondary" to="/">ارجع للإعلانات</Link></Group>} />
            <Route path="/detail" element={<ConsoleDetailPage listing={detail} busy={busyDaysFor(detail, orders)} onRequest={() => detail && requestConsole(detail)} onChat={() => detail && openDmFor(detail)} />} />
            <Route path="/order" element={<OrderPage order={currentOrder} onHandoverCheck={(v) => currentOrder && run(fbUpdateOrder(currentOrder.id, { handoverCheck: v }), 'ماتحفظتش. جرب تاني.')} onChat={handleChat} />} />
            <Route path="/request" element={<RequestPage target={requestTarget} hasOpenRequest={myOrders.some(o => o.status === 'requested')} busy={busyForTarget} onConfirm={confirmRequest} />} />
            <Route path="/profile" element={<ProfilePage profile={profile} myUid={uid} email={user.email || ''} myOrders={myOrders} incoming={incoming} myListings={myListings} orders={orders} rentalOrder={rentalOrder} chats={chats || []}
                onEditProfile={() => setEditProfile(true)}
                onReturn={renterReturn}
                onReturnCheck={(v) => rentalOrder && run(fbUpdateOrder(rentalOrder.id, { returnCheck: v }), 'ماتحفظتش. جرب تاني.')}
                onCancelRequest={(id) => run(fbDeleteOrder(id), 'الطلب ماتلغاش. جرب تاني.')}
                onDeleteListing={(id) => run(fbDeleteDevice(id), 'الإعلان ماتمسحش. جرب تاني.')}
                onChat={handleChat} onTrack={setTracking} onOwnerAnswer={ownerAnswer}
                onOpenChat={(c) => setChatWith({ name: chatNameOf(c), channelId: c.id })}
                onSupport={openSupport} onComplain={() => setComplaintOpen(true)}
                onSignOut={() => { fbSignOut().catch(() => {}); }} />} />
        </Routes>
        <BottomNav onGuide={() => setGuideOpen(true)} />
        {guideOpen && <GuideDialog onClose={() => setGuideOpen(false)} />}
        {complaintOpen && <ComplaintDialog from={profile.name} onSubmit={submitComplaint} onClose={() => setComplaintOpen(false)} />}
        {gateStep !== 'none' && <AdminGateDialog step={gateStep} onRole={pickRole} onClose={() => setGateStep('none')} />}
        {chatWith && <ChatDialog name={chatWith.name} suggestions={chatWith.suggestions} channelId={chatWith.channelId} meUid={uid} meName={profile.name} onClose={() => setChatWith(null)} />}
        {tracking && (() => {
            const ex = exactLoc[tracking.id];
            const hasExact = !!ex;
            const lat = ex ? ex.lat : (typeof tracking.lat === 'number' ? (tracking.lat as number) : (AREA_CENTER[tracking.area] || AREA_CENTER['زايد'])[0]);
            const lng = ex ? ex.lng : (typeof tracking.lng === 'number' ? (tracking.lng as number) : (AREA_CENTER[tracking.area] || AREA_CENTER['زايد'])[1]);
            const place = [tracking.district, areaName(tracking.area)].filter(Boolean).join('، ');
            return <TrackingDialog title={tracking.title} lat={lat} lng={lng} exact={hasExact} place={place} onClose={() => setTracking(null)} />;
        })()}
        {editProfile && <div className="nexus-overlay" role="dialog" aria-modal="true" aria-label="تعديل بياناتك">
            <div className="nexus-sheet">
                <div className="nexus-sheet-close"><CloseButton label="إغلاق" onClick={() => setEditProfile(false)} /></div>
                <h2 className="nexus-sheet-title">عدل بياناتك</h2>
                <ProfileForm initial={profile} submitLabel="احفظ التعديل" onSave={saveProfile} />
            </div>
        </div>}
        {errNote && <Callout title="حصلت مشكلة" tone="danger">{errNote}</Callout>}
        <Caption>صور الأجهزة: بلايستيشن 5 بواسطة Soberian وبلايستيشن 4 بواسطة Evan-Amos ودراع بلايستيشن بواسطة Viper polo وإكس بوكس سيريس إكس بواسطة epredator ودراع إكس بوكس بواسطة UKER، عبر ويكيميديا كومنز. أغلفة الألعاب رسوم توضيحية.</Caption>
        <Closing>نسخة 1.6، متصلة بسيرفر Firebase حقيقي.</Closing>
        </div>
    </FileCard>;
}
