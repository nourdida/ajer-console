import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
    useAuthUser, useProfile, useDevices, useOrders, useMyChats, useMessages, useComplaints, useAllUsers,
    fbSignUp, fbSignIn, fbSignOut, fbSaveProfile, fbAddDevice, fbUpdateDevice, fbDeleteDevice, useExactLocations,
    fbCreateOrder, fbUpdateOrder, fbDeleteOrder, fbOpenChat, fbSendMessage, fbAddComplaint, fbCloseComplaint, fbDeleteUser,
    authErrorAr, dmChannelId, orderChannelId, ORDER_BUSY,
    type DeviceDoc, type OrderDoc, type ReviewEntry, type OrderStatus, type ChatDoc, type ProfileDoc, type AdminUserDoc, type ComplaintDoc,
} from './fb';
import themeConfig from '../theme.js';
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
    reviewList?: ReviewEntry[];
    trackNote?: string;
    status?: 'open' | 'courier' | 'rented'; requestAt?: number; courierMs?: number; dueMs?: number;
};

type Request = { id: string; listingNumber: number; title: string; owner: string; days: number; rent: number; deposit: number; fromMs?: number; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string };
type BookingRange = { listingNumber: number; fromMs: number; days: number };
type CondState = { checks: boolean[]; photos: string[] };
type UserProfile = { name: string; age: string; phone: string; avatar: string; address: string; photo?: string; idPhoto?: string; idPhotoBack?: string };
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

const GAME_COLORS = ['#ff2ec4', '#FF7EE3', '#ffd54d', '#C724B1', '#4dc3ff', '#7dff9a'];
function gameChipStyle(i: number): React.CSSProperties {
    const c = GAME_COLORS[i % GAME_COLORS.length];
    return { borderColor: c, color: c, background: `${c}1f` };
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
    if (!reviews) return <span className="nexus-muted">لسه مفيش تقييمات</span>;
    return <span className="nexus-stars"><bdi>★ {rating}</bdi> <span className="nexus-muted">(<bdi>{reviews}</bdi> تقييم)</span></span>;
}

function ConsoleCard({ listing, onOpen, onDelete, onTrack }: { listing: ConsoleListing; onOpen?: () => void; onDelete?: (id: string) => void; onTrack?: () => void }) {
    const inner = <div style={{ display: 'flex', gap: 12, padding: 12 }}>
        <div className="nd-thumb" style={{ width: 72, height: 72, borderRadius: 16 }}><img src={listing.photoData || PHOTOS[listing.photoKey || listing.kind.toLowerCase()]} alt={KIND_ALT[listing.kind] || 'جهاز ألعاب مع ذراع تحكم'} style={{ maxHeight: 56 }} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ fontSize: 14 }}>{listing.title}</b>
            <div className="nd-note" style={{ marginTop: 2 }}>{listing.owner} · {areaName(listing.area)}، {listing.district}</div>
            <div style={{ marginTop: 4 }}><Stars rating={listing.rating} reviews={listing.reviews} /></div>
            <div className="nd-row" style={{ marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--nd-acctext)' }}><bdi>{listing.pricePerDay}</bdi> ج.م / اليوم</span>
                <span className="nd-note" style={{ fontSize: 11.5 }}>تأمين <bdi>{listing.deposit}</bdi> ج.م بيرجع</span>
            </div>
            {listing.games.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{listing.games.map(g => <span key={g} className="nd-chip2">{g}</span>)}</div>}
            {listing.mine && listing.status === 'rented' && <div style={{ marginTop: 6 }}><span className="nd-chip2" style={{ color: '#ff6b6b' }}>قيد الإيجار</span></div>}
            {(onDelete || onTrack) && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {onTrack && <button type="button" className="nd-btn2" style={{ flex: 1, padding: 9 }} onClick={(e) => { e.preventDefault(); onTrack(); }}>تتبع مكانه</button>}
                {onDelete && <button type="button" className="nd-btn2" style={{ flex: 1, padding: 9, color: '#ff6b6b' }} onClick={(e) => { e.preventDefault(); onDelete(listing.id); }}>احذف الإعلان</button>}
            </div>}
        </div>
    </div>;
    if (onOpen) return <Link to="/detail" onClick={onOpen} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
    return inner;
}

function ChatDialog({ name, suggestions, onClose, channelId, meUid, meName }: { name: string; suggestions?: string[]; onClose: () => void; channelId?: string; meUid?: string; meName?: string }) {
    const live = useMessages(channelId);
    const [msgs, setMsgs] = useState<ChatMsg[]>([{ me: false, text: suggestions ? 'أهلًا! اسأل براحتك 🎮' : 'أهلًا! الجهاز متاح، اسأل براحتك 🎮' }]);
    const [text, setText] = useState('');
    const [sendErr, setSendErr] = useState('');
    const listRef = useRef<HTMLDivElement | null>(null);
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
    useEffect(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, [bubbles.length]);
    return <div className="nd-page" role="dialog" aria-modal="true" aria-label={`محادثة مع ${name}`} style={{ position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="nd-topbar">
            <button type="button" className="nd-back" onClick={onClose} aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
            <div className="nd-av" style={{ width: 38, height: 38, fontSize: 15 }}>{name.trim().charAt(0)}</div>
            <div><b style={{ fontSize: 15 }}>{name}</b><div className="nd-note">{real ? 'شات مباشر على السيرفر' : 'محادثة'}</div></div>
            <div style={{ flex: 1 }} />
        </div>
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {real && live === undefined && <div className="nd-note">بنحمّل الرسايل من السيرفر...</div>}
            {real && live !== undefined && live.length === 0 && <div className="nd-note">مفيش رسايل لسه. اكتب أول رسالة.</div>}
            {bubbles.map((m, i) => <div key={i} className={`nd-msg ${m.me ? 'me' : 'in'}`}>{m.text}</div>)}
        </div>
        {suggestions && suggestions.length > 0 && <div style={{ position: 'fixed', bottom: 86, left: 22, right: 22, display: 'flex', gap: 8, overflowX: 'auto', zIndex: 61, scrollbarWidth: 'none' }}>
            {suggestions.map(s => <button key={s} type="button" className="nd-chip2" style={{ cursor: 'pointer', border: 0, fontFamily: 'inherit', flex: 'none' }} onClick={() => sendText(s)}>{s}</button>)}
        </div>}
        <div className="nd-chatbar">
            <button type="button" className="nd-send" onClick={send} aria-label="ابعت"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg></button>
            <input className="nd-in" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="اكتب رسالة..." aria-label="اكتب رسالتك" />
        </div>
        {sendErr && <div className="nd-note" style={{ position: 'fixed', bottom: 140, left: 22, right: 22, zIndex: 61 }}>{sendErr}</div>}
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
            L.circle([lat, lng], { radius: 380, color: '#C724B1', weight: 1, dashArray: '6 6', fillColor: '#C724B1', fillOpacity: 0.06 }).addTo(map);
        }
        const icon = L.divIcon({ className: 'nexus-pin is-selected', html: `<span>جهازك هنا</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
        L.marker([lat, lng], { icon }).addTo(map);
        mapRef.current = map;
        const t1 = setTimeout(() => map.invalidateSize(), 250);
        const t2 = setTimeout(() => map.invalidateSize(), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return <div ref={divRef} className="nexus-map-real nd-mapreal" style={{ width: '100%', height: '100%' }} role="application" aria-label={`خريطة حقيقية بمكان ${title}`} />;
}

function TrackingDialog({ listing, lat, lng, exact, onClose }: { listing: ConsoleListing; lat: number; lng: number; exact: boolean; onClose: () => void }) {
    const photo = listing.photoData || PHOTOS[listing.photoKey || listing.kind.toLowerCase()];
    const place = [listing.district, areaName(listing.area)].filter(Boolean).join('، ');
    return <div className="nd-page" role="dialog" aria-modal="true" aria-label={`تتبع مكان ${listing.title}`} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="nd-topbar">
            <button type="button" className="nd-back" onClick={onClose} aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
            <b>مكان جهازك دلوقتي</b>
            <div style={{ flex: 1 }} />
        </div>
        <div style={{ flex: 1, position: 'relative', margin: '0 -22px' }}>
            <TrackingMap lat={lat} lng={lng} title={listing.title} exact={exact} />
        </div>
        <div className="nd-mapcard" style={{ position: 'absolute', bottom: 18, left: 22, right: 22, zIndex: 61, transform: 'none', width: 'auto' }}>
            <div className="nd-row" style={{ justifyContent: 'flex-start' }}>
                <div className="nd-thumb"><img src={photo} alt={listing.title} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>{listing.title}</b><div className="nd-note">{listing.trackNote || `مع ${listing.owner}`}{place ? ` · ${place}` : ''}</div></div>
                <span className="nd-chip2 on">متعقب</span>
            </div>
            <div className="nd-note" style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 1 }}><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
                {exact ? 'المكان دقيق ومتتبع مباشرة بالـ AirTag طول مدة الإيجار، وبيوقف أول ما الجهاز يرجع.' : 'الموقع تقريبي لحد ما المندوب يسلّم الجهاز، وبعدها التتبع مباشر بالـ AirTag'}
            </div>
        </div>
    </div>;
}

function Avatar({ char, size }: { char: string; size?: number }) {
    return <span className="nexus-avatar" style={size ? { width: size, height: size, fontSize: size * 0.52 } : undefined} aria-hidden="true">{char}</span>;
}

function ThemeBtn() {
    const [light, setLight] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light');
    const toggle = () => { setLight(l => !l); window.dispatchEvent(new CustomEvent('nexus-toggle-theme')); };
    const sun = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    const moon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>;
    return <button type="button" className="nd-theme-btn" onClick={toggle} aria-label={light ? 'بدّل للوضع الداكن' : 'بدّل للوضع الفاتح'}>{light ? moon : sun}</button>;
}

function Home({ consoles, profile, onOpenConsole }: { consoles: ConsoleListing[]; profile: UserProfile | null; onOpenConsole: (l: ConsoleListing) => void }) {
    const [filter, setFilter] = useState<{ kind?: string; area?: 'زايد' | 'أكتوبر' } | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const shown = consoles.filter(l => !filter || ((!filter.kind || l.kind === filter.kind) && (!filter.area || l.area === filter.area)));
    const hour = new Date().getHours();
    const greet = hour >= 5 && hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء الخير';
    const first = (profile?.name || '').trim().split(' ')[0] || 'بيك';
    const hero = shown[0] || null;
    const rest = shown.slice(1);
    const imgOf = (l: ConsoleListing) => l.photoData || PHOTOS[l.photoKey || l.kind.toLowerCase()];
    const rows: ConsoleListing[][] = [];
    for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
    return <div className="nd-page">
        <div className="nd-glow" style={{ width: 280, height: 280, background: 'var(--nd-g1)', top: -90, right: -70 }} />
        <div className="nd-header">
            <div><div className="nd-hi">{greet}</div><div className="nd-name">{first}</div></div>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <ThemeBtn />
                <NavLink to="/profile" className="nd-avatar" aria-label="حسابك">{profile?.photo ? <img src={profile.photo} alt="صورتك" /> : (profile?.avatar || first[0] || 'ن')}</NavLink>
            </span>
        </div>
        {hero && <button type="button" className="nd-hero" onClick={() => onOpenConsole(hero)}>
            <span className="nd-chip">الأقرب ليك</span>
            <h1>{hero.kind} {hero.model}</h1>
            <div className="nd-price">{hero.pricePerDay} ج.م / اليوم</div>
            <span className="nd-cta">احجز دلوقتي</span>
            <span className={imgOf(hero).endsWith('.png') ? 'nd-heroimg' : 'nd-heroimg panel'}><img src={imgOf(hero)} alt={KIND_ALT[hero.kind] || 'جهاز ألعاب'} /></span>
        </button>}
        <div className="nd-sect">
            <b>{filter ? `${shown.length} نتيجة` : 'قريب منك'}</b>
            <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {filter && <button type="button" className="nd-chip2 on" onClick={() => setFilter(null)}>× {filter.kind || 'الكل'} · {areaName(filter.area || 'زايد')}</button>}
                <button type="button" className="nd-linklike" style={{ color: 'var(--nd-mut)', fontWeight: 600 }} onClick={() => setSheetOpen(true)}>{filter ? 'غيّر الفلتر' : 'شوف الكل'}</button>
            </span>
        </div>
        {!hero && <div className="nd-pad"><div className="nd-card nd-note" style={{ fontSize: 13 }}>
            {filter ? 'مفيش أجهزة بالفلتر ده. جرّب فلتر تاني، أو أضف جهازك أنت.' : 'لسه مفيش إعلانات منشورة. كون أول واحد ينزل جهازه: دوس + تحت.'}
        </div></div>}
        {rows.map((row, i) => <div className="nd-tiles" key={i} style={{ marginTop: i === 0 ? 0 : 12 }}>
            {row.map(l => <button type="button" className="nd-tile" key={l.id} onClick={() => onOpenConsole(l)}>
                <div className="nd-imgw"><img src={imgOf(l)} alt={KIND_ALT[l.kind] || 'جهاز ألعاب'} /></div>
                <b>{l.kind} {l.model}</b>
                <span>{[l.district, areaName(l.area)].filter(Boolean).join('، ')}</span>
                <div className="nd-p">{l.pricePerDay} ج.م / اليوم</div>
            </button>)}
            {row.length === 1 && <div style={{ flex: 1 }} />}
        </div>)}
        <div className="nd-pad" style={{ paddingBottom: 120 }}>
            <div className="nd-note" style={{ textAlign: 'center', marginTop: 14 }}>كل الإعلانات هنا حقيقية من مستخدمين زيك، متصلة بالسيرفر لحظة بلحظة، والدفع كاش عند الاستلام مع المندوب.</div>
        </div>
        {sheetOpen && <div className="nd-overlay" role="dialog" aria-modal="true" aria-label="فلتر الإعلانات" onClick={() => setSheetOpen(false)}>
            <div className="nd-card" style={{ margin: '120px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }} onClick={e => e.stopPropagation()}>
                <b style={{ fontSize: 15 }}>فلتر الإعلانات</b>
                <div className="nd-seg">
                    {['الكل', 'PS5', 'PS4', 'Xbox'].map(k => <button key={k} type="button" className={(k === 'الكل' ? !filter?.kind : filter?.kind === k) ? 'on' : ''} onClick={() => setFilter(f => k === 'الكل' ? (f?.area ? { area: f.area } : null) : { kind: k, area: f?.area })}>{k}</button>)}
                </div>
                <div className="nd-seg">
                    {(['الكل', 'زايد', 'أكتوبر'] as const).map(a => <button key={a} type="button" className={(a === 'الكل' ? !filter?.area : filter?.area === a) ? 'on' : ''} onClick={() => setFilter(f => a === 'الكل' ? (f?.kind ? { kind: f.kind } : null) : { kind: f?.kind, area: a })}>{a === 'الكل' ? 'الكل' : areaName(a)}</button>)}
                </div>
                <button type="button" className="nd-btn" onClick={() => setSheetOpen(false)}>تم</button>
            </div>
        </div>}
    </div>;
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
    const boxCheck = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11"/></svg>;
    return <>
        {COND_CHECKS.map((c, i) => {
            const on = value.checks[i];
            return <button key={c} type="button" className="nd-check" aria-pressed={on} style={{ padding: '7px 0', width: '100%', background: 'none', border: 0, color: 'inherit', fontFamily: 'inherit', textAlign: 'start' }}
                onClick={() => { const checks = [...value.checks]; checks[i] = !on; onChange({ ...value, checks }); }}>
                <span className={on ? 'nd-box' : 'nd-box off'}>{on && boxCheck}</span>
                <span>{c}</span>
            </button>;
        })}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {value.photos.map((p, i) => <img key={i} src={p} style={{ width: 62, height: 62, borderRadius: 14, objectFit: 'cover' }} alt={`صورة حالة الجهاز ${i + 1}`} />)}
            {value.photos.length < 3 && <label className="nd-btn2" style={{ width: 62, height: 62, borderRadius: 14, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }}>
                + صورة
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={addPhoto} aria-label="ضيف صورة لحالة الجهاز" />
            </label>}
        </div>
        <div className="nd-note" style={{ marginTop: 8 }}>صور حالة الجهاز بتحميك وتحمي صاحبه لو حصل خلاف على التلف. لازم صورة واحدة على الأقل، وتقدر تضيف لحد 3.</div>
    </>;
}

function DetailStars({ rating, reviews }: { rating: number; reviews: number }) {
    const full = Math.max(0, Math.min(5, Math.round(rating || 0)));
    const star = (on: boolean, key: number) => on
        ? <svg key={key} viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>
        : <svg key={key} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15" style={{ color: 'var(--nd-navmut)' }}><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>;
    return <div style={{ textAlign: 'left' }}>
        <span style={{ color: 'var(--nd-acctext)', display: 'flex', gap: 1.5 }}>{[1, 2, 3, 4, 5].map(i => star(i <= full, i))}</span>
        <div className="nd-note">{reviews ? `${rating} · ${reviews} تقييم` : 'لسه مفيش تقييمات'}</div>
    </div>;
}

function ConsoleDetailPage({ listing, busy, onRequest, onChat }: { listing: ConsoleListing | null; busy: Set<number>; onRequest: () => void; onChat: (name: string) => void }) {
    if (!listing) return <div className="nd-page">
        <div className="nd-topbar"><Link className="nd-back" to="/" aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>تفاصيل الجهاز</b><span style={{ width: 38 }} /></div>
        <div className="nd-card" style={{ margin: '18px 22px' }}><div className="nd-note" style={{ marginBottom: 10 }}>مفيش جهاز متختار. ارجع للإعلانات ودوس على أي جهاز عشان تشوف تفاصيله.</div><Link className="nd-linklike" to="/">شوف الإعلانات</Link></div>
    </div>;
    const photo = listing.photoData || PHOTOS[listing.photoKey || listing.kind.toLowerCase()];
    const facts: { label: string; value: React.ReactNode }[] = [
        { label: 'التخزين', value: listing.storage },
        { label: 'أذرع التحكم', value: `${listing.controllers}` },
        { label: 'الألعاب', value: listing.games.length ? `${listing.games.length} ${listing.games.length === 1 ? 'لعبة' : 'ألعاب'}` : '—' },
        { label: 'التأمين', value: `${listing.deposit} ج.م` },
        { label: 'التوصيل', value: 'بالمندوب' },
        { label: 'الموديل', value: listing.model },
    ];
    return <div className="nd-page" style={{ paddingBottom: 120 }}>
        <div style={{ position: 'relative' }}>
            <div className="nd-dhero">
                <img src={photo} alt={KIND_ALT[listing.kind] || 'جهاز ألعاب مع ذراع تحكم'} className={photo.endsWith('.png') && !listing.photoData ? '' : 'panel'} />
            </div>
            <Link className="nd-back" to="/" aria-label="رجوع للإعلانات" style={{ position: 'absolute', top: 52, right: 22, boxShadow: '0 6px 16px rgba(0,0,0,.35)' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link>
            {busy.size === 0 && <span className="nd-chip2" style={{ position: 'absolute', top: 60, left: 22 }}>متاح دلوقتي</span>}
        </div>
        <div style={{ padding: '14px 22px 0' }}>
            <div className="nd-row"><b style={{ fontSize: 21 }}>{listing.title}</b><b style={{ fontSize: 17, color: 'var(--nd-acctext)', flex: 'none' }}>{listing.pricePerDay} ج.م<span style={{ fontSize: 12, fontWeight: 600, marginInlineStart: 5 }}>/ اليوم</span></b></div>
            <div className="nd-row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="nd-av">{listing.owner.trim().charAt(0)}</div>
                    <div><b style={{ fontSize: 14 }}>{listing.owner}</b><div className="nd-note">{[listing.district, areaName(listing.area)].filter(Boolean).join('، ')}</div></div>
                </div>
                <DetailStars rating={listing.rating} reviews={listing.reviews} />
            </div>
            <div className="nd-card" style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 8px', textAlign: 'center' }}>
                {facts.map(f => <div key={f.label}><div className="nd-note">{f.label}</div><b style={{ fontSize: 13.5 }}>{f.value}</b></div>)}
            </div>
            {listing.includes && <div className="nd-note" style={{ marginTop: 12 }}>ييجي معاه: {listing.includes}. التأمين بيرجعلك كامل بعد فحص الرجوع.</div>}
            {busy.size > 0 && <div className="nd-chip2 warn" style={{ marginTop: 10 }}>فيه أيام محجوزة الفترة الجاية — هتشوف المتاح وانت بتطلب</div>}
            <div className="nd-note" style={{ marginTop: 12 }}>كل جهاز فيه جهاز تتبع ضد السرقة، وهتشوف ده وتوافق عليه قبل ما تأكد الطلب.</div>
        </div>
        <div className="nd-bottombar">
            <Link className="nd-btn" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }} to="/request" onClick={onRequest}>اطلب الجهاز</Link>
            <button type="button" className="nd-btn2" style={{ width: 52, borderRadius: 16, flex: 'none' }} onClick={() => onChat(listing.owner)} aria-label={`كلم ${listing.owner}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="21" height="21"><path d="M4 4h16v12H9l-5 4z"/></svg></button>
        </div>
    </div>;
}

type IconName = 'grid' | 'map' | 'package' | 'plus' | 'list' | 'user' | 'headset' | 'help' | 'shield' | 'sun' | 'moon' | 'home';
const ICON_PATHS: Record<IconName, React.ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></>,
    sun: <><circle cx="12" cy="12" r="4.2" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19" /></>,
    moon: <path d="M20 13.2A8.1 8.1 0 1 1 10.8 4a6.6 6.6 0 0 0 9.2 9.2z" />,
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

const NAV_TABS: { to: string; icon: IconName; label: string; notch: string; bump: number }[] = [
    { to: '/', icon: 'home', label: 'الإعلانات', notch: '87.5%', bump: 84 },
    { to: '/map', icon: 'map', label: 'الخريطة', notch: '62.5%', bump: 59 },
    { to: '/add', icon: 'plus', label: 'أضف إعلانك', notch: '37.5%', bump: 34 },
    { to: '/profile', icon: 'user', label: 'حسابك', notch: '12.5%', bump: 9 },
];

function useHashPath() {
    const [p, setP] = useState<string>(() => window.location.hash.replace(/^#/, '') || '/');
    useEffect(() => {
        const on = () => setP(window.location.hash.replace(/^#/, '') || '/');
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);
    return p;
}

function ReviewPage({ order, consoles, onSubmit }: { order: OrderDoc | null; consoles: ConsoleListing[]; onSubmit: (o: OrderDoc, stars: number, tags: string[], text: string, ownerStars: number) => Promise<any> }) {
    const [stars, setStars] = useState(0);
    const [ownerStars, setOwnerStars] = useState(0);
    const [tags, setTags] = useState<string[]>([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const topbar = <div className="nd-topbar"><Link className="nd-back" to="/orders" aria-label="رجوع لطلباتك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>قيّم تجربتك</b><span style={{ width: 38 }} /></div>;
    const starPath = 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8z';
    const starRow = (val: number, set: (n: number) => void, size: number) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" onClick={() => set(n)} aria-label={`${n} نجوم`}
                style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', width: size, height: size, color: n <= val ? '#FFC93C' : 'var(--nd-navmut)' }}>
                {n <= val
                    ? <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}><path d={starPath} /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width={size} height={size}><path d={starPath} /></svg>}
            </button>)}
        </div>);
    if (!order) return <div className="nd-page">{topbar}
        <div className="nd-card" style={{ margin: '18px 22px' }}><b style={{ fontSize: 14.5 }}>مفيش طلب للتقييم</b><div className="nd-note" style={{ margin: '6px 0 10px' }}>التقييم بيتاح بعد ما طلب يكمل ويرجع.</div><Link className="nd-linklike" to="/orders">طلباتي</Link></div>
    </div>;
    const l = consoles.find(c => c.id === order.deviceId);
    const photo = l ? (l.photoData || PHOTOS[l.photoKey || l.kind.toLowerCase()]) : (PHOTOS[(order.title.split(' ')[0] || '').toLowerCase()] || PHOTOS.ps5);
    const TAGS = ['الجهاز زي الوصف', 'نضيف', 'التسليم كان سريع'];
    const toggleTag = (t: string) => setTags(ts => ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]);
    if (sent) return <div className="nd-page">{topbar}
        <div style={{ padding: '60px 22px 0', textAlign: 'center' }}>
            <div className="nd-logo" style={{ margin: '0 auto' }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>شكرًا! تقييمك وصل</div>
            <div className="nd-note" style={{ marginTop: 8 }}>تقييمك بيساعد الناس تختار صاح وبيرفع مستوى المجتمع.</div>
            <Link className="nd-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 22 }} to="/orders">ارجع لطلباتي</Link>
        </div>
    </div>;
    const submit = async () => {
        if (busy || stars === 0) return;
        setBusy(true);
        await onSubmit(order, stars, tags, text, ownerStars);
        setBusy(false); setSent(true);
    };
    return <div className="nd-page" style={{ paddingBottom: 130 }}>
        {topbar}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
            <div className="nd-thumb" style={{ width: 84, height: 84, margin: '0 auto', borderRadius: 22 }}><img src={photo} alt={order.title} /></div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10 }}>{order.title}</div>
            <div className="nd-note" style={{ marginTop: 2 }}>{yom(order.days)} · من {order.ownerName}</div>
            <div style={{ marginTop: 14 }}>{starRow(stars, setStars, 34)}</div>
        </div>
        <div style={{ padding: '34px 22px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TAGS.map(t => <button key={t} type="button" className={`nd-chip2${tags.includes(t) ? ' on' : ''}`} style={{ cursor: 'pointer', border: 0, fontFamily: 'inherit' }} onClick={() => toggleTag(t)}>{t}</button>)}
            </div>
            <div className="nd-field" style={{ minHeight: 78 }}>
                <label>كلمتين عن تجربتك</label>
                <textarea className="nd-area" value={text} onChange={(e) => setText(e.target.value)} placeholder="مثال: الجهاز كان نضيف وشغال تمام، والمالك كان متعاون" maxLength={300} />
            </div>
            <div className="nd-card nd-row">
                <div><b style={{ fontSize: 13.5 }}>وقيّم {order.ownerName.split(' ')[0]} كمان</b><div className="nd-note">تقييمك بيرفع مستوى المجتمع</div></div>
                {starRow(ownerStars, setOwnerStars, 20)}
            </div>
        </div>
        <div className="nd-bottombar">
            <button type="button" className="nd-btn" disabled={stars === 0 || busy} onClick={submit}>{busy ? 'بنبعت...' : 'ابعت التقييم'}</button>
        </div>
    </div>;
}

function OrdersPage({ myOrders, consoles, onTrack, onCancelRequest, onOpenOrder, onRate }: { myOrders: OrderDoc[]; consoles: ConsoleListing[]; onTrack: (l: ConsoleListing) => void; onCancelRequest: (id: string) => void; onOpenOrder: () => void; onRate: (o: OrderDoc) => void }) {
    const photoFor = (o: OrderDoc) => {
        const l = consoles.find(c => c.id === o.deviceId);
        if (l) return l.photoData || PHOTOS[l.photoKey || l.kind.toLowerCase()];
        const kind = (o.title.split(' ')[0] || '').toLowerCase();
        return PHOTOS[kind] || PHOTOS.ps5;
    };
    const ACTIVE: OrderStatus[] = ['accepted', 'taken', 'pickedup', 'arrived'];
    const live = myOrders.filter(o => ACTIVE.includes(o.status) || o.status === 'delivered' || o.status === 'returning');
    const waiting = myOrders.filter(o => o.status === 'requested');
    const history = myOrders.filter(o => o.status === 'returned' || o.status === 'declined').sort((a, b) => b.createdMs - a.createdMs);
    const remainingDays = (o: OrderDoc) => {
        const start = o.deliveredAt || o.createdMs;
        return Math.max(0, Math.ceil((start + o.days * 86400000 - Date.now()) / 86400000));
    };
    const progressFor = (o: OrderDoc) => {
        if (o.status === 'delivered' || o.status === 'returning') {
            const start = o.deliveredAt || o.createdMs;
            return Math.min(100, Math.max(6, Math.round(((Date.now() - start) / (o.days * 86400000)) * 100)));
        }
        return { accepted: 15, taken: 35, pickedup: 60, arrived: 85 }[o.status as string] || 10;
    };
    const card = (o: OrderDoc) => {
        const isLive = live.includes(o);
        const isRental = o.status === 'delivered' || o.status === 'returning';
        const listing = consoles.find(c => c.id === o.deviceId);
        return <div className="nd-card" key={o.id}>
            <div className="nd-row" style={{ justifyContent: 'flex-start' }}>
                <div className="nd-thumb"><img src={photoFor(o)} alt={o.title} /></div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 14 }}>{o.title}</b><div className="nd-note">من {o.ownerName} · {yom(o.days)}</div></div>
                {o.status === 'requested' && <span className="nd-chip2">في انتظار المالك</span>}
                {isRental && <span className="nd-chip2 ok">نشط</span>}
                {ACTIVE.includes(o.status) && <span className="nd-chip2 on">جاري التوصيل</span>}
                {o.status === 'returned' && <span className="nd-chip2">مكتمل</span>}
                {o.status === 'declined' && <span className="nd-chip2">اترفض</span>}
            </div>
            {isLive && <>
                {ACTIVE.includes(o.status) && <div className="nd-pbar" style={{ marginTop: 12 }}><i style={{ width: `${progressFor(o)}%` }} /></div>}
                <div className="nd-note" style={{ marginTop: 6 }}>{isRental ? `باقي ${yom(remainingDays(o))} على الإرجاع` : statusAr(o.status)}</div>
                {isRental && listing && <button type="button" className="nd-btn2" style={{ marginTop: 12, padding: 10, width: '100%' }} onClick={() => onTrack({ ...listing, trackNote: `مع ${o.ownerName} · باقي ${yom(remainingDays(o))} على الرجوع` })}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-3px', marginInlineEnd: 6 }}><path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
                    مكان جهازك دلوقتي</button>}
            </>}
            {o.status === 'requested' && <>
                <div className="nd-note" style={{ marginTop: 8 }}>المالك لسه مردش. هيوصلك رده هنا وفي حسابك.</div>
                <button type="button" className="nd-btn2" style={{ marginTop: 10, padding: 10, width: '100%' }} onClick={() => onCancelRequest(o.id)}>إلغاء الطلب</button>
            </>}
            {o.status === 'returned' && (o.reviewed
                ? <div style={{ marginTop: 10, fontSize: 13, color: 'var(--nd-acctext)', fontWeight: 700 }}>تم التقييم، شكرًا ✓</div>
                : <button type="button" className="nd-btn2" style={{ marginTop: 12, padding: 10, width: '100%' }} onClick={() => onRate(o)}>قيّم تجربتك ←</button>)}
            {o.status === 'declined' && <div className="nd-note" style={{ marginTop: 8 }}>المالك اعتذر عن الطلب ده. تقدر تطلب جهاز تاني من الإعلانات.</div>}
        </div>;
    };
    return <div className="nd-page" style={{ paddingBottom: 120 }}>
        <div className="nd-topbar"><Link className="nd-back" to="/profile" aria-label="رجوع لحسابك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>طلباتي</b><span style={{ width: 38 }} /></div>
        <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...live, ...waiting, ...history].map(card)}
            {myOrders.length === 0 && <div className="nd-card"><b style={{ fontSize: 14.5 }}>لسه مفيش طلبات</b><div className="nd-note" style={{ marginTop: 6 }}>أول ما تطلب جهاز هيظهر هنا بحالته لايف. <Link className="nd-linklike" to="/">شوف الإعلانات</Link></div></div>}
            {myOrders.length > 0 && <button type="button" className="nd-btn2" style={{ padding: 12, width: '100%' }} onClick={onOpenOrder}>تابع طلبك الحالي بالتفصيل</button>}
        </div>
    </div>;
}

function BottomNav() {
    const path = useHashPath();
    if (!['/', '/map', '/orders', '/profile'].includes(path)) return null;
    let act = NAV_TABS.findIndex(t => t.to === path);
    if (act < 0) act = path === '/orders' ? 3 : 0;
    const t = NAV_TABS[act];
    return <>
        <nav className="nd-nav" style={{ '--nd-notch': t.notch } as React.CSSProperties} aria-label="صفحات التطبيق">
            {NAV_TABS.map((tab, i) => <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} className={i === act ? 'nd-tab on' : 'nd-tab'} aria-label={tab.label}><Icon name={tab.icon} /></NavLink>)}
        </nav>
        <div className="nd-bump" style={{ '--nd-bump': t.bump } as React.CSSProperties} aria-hidden="true"><Icon name={t.icon} /></div>
    </>;
}

function MapPage({ consoles, onOpen, exactLoc }: { consoles: ConsoleListing[]; onOpen: (l: ConsoleListing) => void; exactLoc: Record<string, LatLng> }) {
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
        const map = L.map(mapDivRef.current, { zoomControl: false }).setView([30.0, 30.95], 11);
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
                L.circle(pos, { radius: 380, color: '#C724B1', weight: 1, dashArray: '6 6', fillColor: '#C724B1', fillOpacity: 0.06 }).addTo(group);
            }
            const icon = L.divIcon({
                className: 'nd-leafpin',
                html: `<span class="nd-pin${selected === l.number ? '' : ' grey'}">${l.pricePerDay} ج.م</span>`,
                iconSize: [64, 28],
                iconAnchor: [32, 14],
            });
            const marker = L.marker(pos, { icon, title: `${l.title}: ${l.pricePerDay} ج.م / اليوم` }).addTo(group);
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
                        color: '#FF7EE3', weight: 1, fillColor: '#FF7EE3', fillOpacity: 0.12,
                    }).addTo(map);
                    meRef.current = L.circleMarker([p.coords.latitude, p.coords.longitude], {
                        radius: 9,
                        color: '#FF7EE3',
                        weight: 3,
                        fillColor: '#FF7EE3',
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

    useEffect(() => {
        try {
            if (new URLSearchParams(window.location.search).get('shot_sel') === '1' && selected === null && consoles.length) setSelected(consoles[0].number);
        } catch { /* تجاهل */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consoles]);
    const current = consoles.find(l => l.number === selected);
    return <div className="nd-page">
        <div className="nd-mapwrap"><div ref={mapDivRef} className="nd-mapreal" role="application" aria-label="خريطة أماكن الأجهزة في الشيخ زايد و6 أكتوبر" /></div>
        <button type="button" className="nd-searchpill" onClick={showMyLocation} disabled={locating}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/></svg>
            {locating ? 'بنحدد مكانك...' : 'أظهر مكاني على الخريطة'}
        </button>
        {locNote && <div className="nd-mapcard" style={{ bottom: 104 }}><div className="nd-note">{locNote}</div></div>}
        {!locNote && (current
            ? <div className="nd-mapcard">
                <div className="nd-row" style={{ justifyContent: 'flex-start' }}>
                    <div className="nd-thumb"><img src={current.photoData || PHOTOS[current.photoKey || current.kind.toLowerCase()]} alt={KIND_ALT[current.kind] || 'جهاز ألعاب'} /></div>
                    <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>{current.kind} {current.model}</b><div className="nd-note">{[current.district, areaName(current.area)].filter(Boolean).join('، ')} · المكان تقريبي</div><Stars rating={current.rating} reviews={current.reviews} /></div>
                    <div style={{ textAlign: 'left' }}><b style={{ color: 'var(--nd-acctext)', fontSize: 14 }}>{current.pricePerDay} ج.م</b><div className="nd-note">/ اليوم</div></div>
                </div>
                <button type="button" className="nd-btn" style={{ marginTop: 12, padding: 11 }} onClick={() => onOpen(current)}>عرض التفاصيل</button>
            </div>
            : <div className="nd-mapcard"><div className="nd-note" style={{ fontSize: 12.5 }}>دوس على أي سعر على الخريطة تشوف تفاصيل الجهاز. مكان كل جهاز بيظهر تقريبي جوه دايرة حوالي ٣٥٠ متر — المكان الدقيق محفوظ لوحده على السيرفر، وحدش يقدر يشوفه غير المالك نفسه والمندوب وقت الاستلام.</div></div>)}
    </div>;
}

function RequestPage({ target, hasOpenRequest, busy, onConfirm }: { target: { title: string; owner: string; ownerLine: string; pricePerDay: number; deposit: number; number: number; deviceId?: string; ownerId?: string; kind?: string; photoKey?: string; photoData?: string } | null; hasOpenRequest: boolean; busy: Set<number>; onConfirm: (r: { days: number; rent: number; deposit: number; fromMs: number; deliveryFee: number; promo: string; discount: number; payMethod: string }) => void }) {
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
    const topbar = (title: string) => <div className="nd-topbar"><Link className="nd-back" to="/detail" aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>{title}</b><span style={{ width: 38 }} /></div>;
    if (!target) return <div className="nd-page">{topbar('الحجز')}
        <div className="nd-card" style={{ margin: '18px 22px' }}><div className="nd-note" style={{ marginBottom: 10 }}>مفيش جهاز متختار. ارجع للإعلانات واختار جهاز، وبعدين دوس اطلب الجهاز.</div><Link className="nd-linklike" to="/">شوف الإعلانات</Link></div>
    </div>;
    const rent = days * target.pricePerDay;
    const discount = promo ? Math.round(rent * (PROMO_CODES[promo] || 0)) : 0;
    const deliveryFee = DELIVERY_FEE;
    const total = rent - discount + deliveryFee + target.deposit;
    if (done) return <div className="nd-page">{topbar('الحجز')}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-card"><b style={{ fontSize: 15 }}>طلبك اتسجل واتبعت للمالك على السيرفر</b><div className="nd-note" style={{ marginTop: 6 }}>المالك هيشوف طلبك في حسابه في نفس اللحظة ويرد عليك. تقدر تكلمه من زرار الشات جنب الطلب في صفحة حسابك، وتتابع التحديثات لايف من صفحة طلبك.</div></div>
            <div className="nd-card" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>الحاجة</span><b style={{ fontSize: 13 }}>{target.title}</b></div>
                {fromMs !== null && <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>يوم الاستلام</span><b style={{ fontSize: 13 }}>{new Date(fromMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</b></div>}
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>المدة</span><b style={{ fontSize: 13 }}>{yom(days)}</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>الإيجار</span><b style={{ fontSize: 13 }}>{rent} ج.م</b></div>
                {discount > 0 && <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>خصم كود {promo}</span><b style={{ fontSize: 13, color: '#34d399' }}>−{discount} ج.م</b></div>}
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>التوصيل بالمندوب</span><b style={{ fontSize: 13 }}>{deliveryFee} ج.م</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>التأمين (محجوز عند المنصة)</span><b style={{ fontSize: 13 }}>{target.deposit} ج.م</b></div>
                <div style={{ borderTop: '1px dashed var(--nd-navmut)', opacity: .7 }} />
                <div className="nd-row"><b style={{ fontSize: 14.5 }}>المطلوب عند الاستلام</b><b style={{ fontSize: 16, color: 'var(--nd-acctext)' }}>{total} ج.م</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>طريقة الدفع</span><b style={{ fontSize: 13 }}>{payMethod}</b></div>
            </div>
            <Link className="nd-btn" style={{ textAlign: 'center', textDecoration: 'none' }} to="/order">تابع وصول جهازك لايف</Link>
            <Link className="nd-btn2" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: 13 }} to="/profile">شوف طلبك في حسابك</Link>
        </div>
    </div>;
    if (hasOpenRequest) return <div className="nd-page">{topbar('الحجز')}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-card"><b style={{ fontSize: 15 }}>عندك طلب مفتوح</b><div className="nd-note" style={{ marginTop: 6 }}>مش ممكن تطلب أكتر من طلب في نفس الوقت. خلص أو الغي الطلب اللي عندك من صفحة حسابك، وبعدين اطلب تاني.</div></div>
            <Link className="nd-btn2" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: 13 }} to="/profile">روح لحسابك</Link>
        </div>
    </div>;
    const rangeHasBusy = fromMs !== null && Array.from({ length: days }).some((_, i) => busy.has(dayStamp(fromMs) + i * 86400000));
    const ready = accepted && termsAccepted && fromMs !== null && !rangeHasBusy;
    const applyPromo = () => {
        const code = promoInput.trim().toUpperCase();
        if (!code) { setPromo(''); setPromoError(''); return; }
        if (PROMO_CODES[code]) { setPromo(code); setPromoError(''); }
        else { setPromo(''); setPromoError('الكود ده مش صحيح أو خلص. جرب NEXUS10.'); }
    };
    const photo = target.photoData || (target.photoKey || target.kind ? PHOTOS[target.photoKey || (target.kind || '').toLowerCase()] : '');
    const checkSvg = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>;
    return <div className="nd-page" style={{ paddingBottom: 110 }}>
        {topbar('الحجز')}
        <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-card nd-row" style={{ justifyContent: 'flex-start' }}>
                <div className="nd-thumb">{photo && <img src={photo} alt={target.title} />}</div>
                <div style={{ flex: 1 }}><b style={{ fontSize: 14.5 }}>{target.title}</b><div className="nd-note">{target.ownerLine}</div></div>
                <b style={{ color: 'var(--nd-acctext)', fontSize: 13.5, flex: 'none' }}>{target.pricePerDay} ج.م/يوم</b>
            </div>
            <div className="nd-card">
                <div className="nd-row"><b style={{ fontSize: 14 }}>عدد الأيام</b><b style={{ fontSize: 20, color: 'var(--nd-acctext)' }}>{days}</b></div>
                <input type="range" className="nd-range" min={1} max={7} value={days} onChange={e => setDays(parseInt(e.target.value))} aria-label="عدد الأيام" style={{ marginTop: 12 }} />
                <div className="nd-row" style={{ marginTop: 6 }}><span className="nd-note">يوم</span><span className="nd-note">٧ أيام</span></div>
            </div>
            <div className="nd-card">
                <b style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>يوم الاستلام</b>
                <div className="nd-note" style={{ marginBottom: 6 }}>اختار من التقويم. الأيام الرمادي محجوزة ومش بتتاختار.</div>
                <AvailabilityCalendar busy={busy} fromMs={fromMs} days={days} onPick={setFromMs} />
            </div>
            {rangeHasBusy && <div className="nd-err">المدة دي فيها أيام محجوزة. قلل عدد الأيام أو اختار يوم بداية تاني.</div>}
            <div className="nd-card nd-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg width="20" height="20" style={{ color: 'var(--nd-acctext)', flex: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg><div><b style={{ fontSize: 13.5 }}>توصيل بالمندوب</b><div className="nd-note">الاستلام والرجوع عن طريق مندوبنا بس — مفيش استلام بنفسك</div></div></div>
                <b style={{ fontSize: 13, flex: 'none' }}>+{DELIVERY_FEE} ج.م</b>
            </div>
            <div className="nd-card">
                <b style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>طريقة الدفع</b>
                <div className="nd-seg">{['كاش عند الاستلام', 'فودافون كاش', 'إنستاباي'].map(v => <button key={v} type="button" className={payMethod === v ? 'on' : ''} onClick={() => setPayMethod(v)}>{v}</button>)}</div>
                <div className="nd-note" style={{ marginTop: 8 }}>الدفع بيتم بينك وبين المندوب عند الاستلام (مفيش دفع إلكتروني جوه التطبيق لسه). والتأمين بيتحجز عند المنصة مش عند المالك.</div>
            </div>
            <div className="nd-field" style={{ marginTop: 0 }}>
                <label>كود الخصم</label>
                {promo
                    ? <div className="nd-row" style={{ padding: '12px 0 4px' }}><div style={{ color: 'var(--nd-acctext)', fontWeight: 700 }}>{promo}</div><span className="nd-chip2 ok">اتطبق −{Math.round((PROMO_CODES[promo] || 0) * 100)}٪؜</span></div>
                    : <div className="nd-row" style={{ gap: 8, paddingBottom: 4 }}>
                        <input className="nd-input" dir="ltr" placeholder="NEXUS10" value={promoInput} onChange={e => setPromoInput(e.target.value)} aria-label="كود الخصم" style={{ flex: 1 }} />
                        <button type="button" className="nd-btn2" style={{ padding: '10px 18px', flex: 'none' }} onClick={applyPromo}>طبق</button>
                    </div>}
                {promoError && <div className="nd-err" style={{ marginBottom: 8 }}>{promoError}</div>}
            </div>
            <div className="nd-card" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>الإيجار ({days} × {target.pricePerDay})</span><b style={{ fontSize: 13 }}>{rent} ج.م</b></div>
                {discount > 0 && <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>خصم {promo}</span><b style={{ fontSize: 13, color: '#34d399' }}>−{discount} ج.م</b></div>}
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>التوصيل</span><b style={{ fontSize: 13 }}>{deliveryFee} ج.م</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>تأمين مسترد</span><b style={{ fontSize: 13 }}>{target.deposit} ج.م</b></div>
                <div style={{ borderTop: '1px dashed var(--nd-navmut)', opacity: .7 }} />
                <div className="nd-row"><b style={{ fontSize: 14.5 }}>الإجمالي</b><b style={{ fontSize: 16, color: 'var(--nd-acctext)' }}>{total} ج.م</b></div>
            </div>
            <div className="nd-note">التأمين بيتحجز عند منصة NEXUS طول مدة الإيجار وبيرجعلك كامل بعد ما تسلم الجهاز سليم. لو فيه تلف بيتخصم منه بعد المعاينة، ولو رجعت الجهاز قبل المعاد فرق الأيام بيرجعلك.</div>
            <button type="button" className="nd-check" onClick={() => setAccepted(!accepted)} aria-pressed={accepted}>
                <span className={accepted ? 'nd-box' : 'nd-box off'}>{accepted && checkSvg}</span>
                <span>فاهم وموافق إن الجهاز فيه جهاز تتبع ضد السرقة بيشتغل طول مدة الإيجار، وصاحب الجهاز يقدر يشوف مكانه.</span>
            </button>
            <button type="button" className="nd-check" onClick={() => setTermsAccepted(!termsAccepted)} aria-pressed={termsAccepted}>
                <span className={termsAccepted ? 'nd-box' : 'nd-box off'}>{termsAccepted && checkSvg}</span>
                <span>قريت <span className="nd-linklike" onClick={e => { e.stopPropagation(); setTermsOpen(true); }}>عقد الإيجار والشروط</span> وموافق عليه، بما فيه شروط التلف والتأمين.</span>
            </button>
            <div className="nd-note" style={{ textAlign: 'center' }}>الدفع {payMethod === 'كاش عند الاستلام' ? 'كاش' : payMethod} عند الاستلام · التأمين بيرجع كامل بعد الفحص</div>
            {!ready && <div className="nd-note" style={{ textAlign: 'center' }}>اختار يوم استلام فاضي من التقويم، ووافق على التتبع وعقد الإيجار عشان تقدر تأكد.</div>}
        </div>
        <div className="nd-bottombar">
            <button type="button" className="nd-btn" style={{ flex: 1, border: 0 }} disabled={!ready} onClick={() => { if (!ready) return; onConfirm({ days, rent, deposit: target.deposit, fromMs: fromMs || Date.now(), deliveryFee, promo, discount, payMethod }); setDone(true); }}>أكد الحجز</button>
        </div>
        {termsOpen && <TermsDialog onAccept={() => { setTermsAccepted(true); setTermsOpen(false); }} onClose={() => setTermsOpen(false)} />}
    </div>;
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
    const topbar = <div className="nd-topbar"><Link className="nd-back" to="/" aria-label="رجوع للإعلانات"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>أضف جهازك</b><span style={{ width: 38 }} /></div>;
    if (blocked) return <div className="nd-page">{topbar}
        <div className="nd-card" style={{ margin: '18px 22px' }}>
            <b style={{ fontSize: 14.5 }}>لازم تخلص اللي معاك الأول</b>
            <div className="nd-note" style={{ margin: '6px 0 10px' }}>معاك جهاز مستأجر دلوقتي، ومش ممكن تنزل إعلان لجهازك وانت معاك جهاز تاني. سجل إرجاع الجهاز اللي معاك من صفحة حسابك الأول، وبعدين تعالى أضف إعلانك.</div>
            <Link className="nd-btn2" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: 11 }} to="/profile">روح لحسابك</Link>
        </div>
    </div>;
    if (added) return <div className="nd-page">{topbar}
        <div style={{ padding: '60px 22px 0', textAlign: 'center' }}>
            <div className="nd-logo" style={{ margin: '0 auto' }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 16 }}>إعلانك اتنشر</div>
            <div className="nd-note" style={{ marginTop: 8 }}>إعلانك بقى لايف على السيرفر: كل مستخدم بيفتح التطبيق دلوقتي بيشوفه في القائمة وعلى الخريطة. أول ما حد يطلبه، الطلب هيظهرلك في صفحة حسابك.</div>
            <Link className="nd-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 22 }} to="/">شوف الإعلانات</Link>
        </div>
    </div>;
    const controllersLabel = controllers === 1 ? 'دراع واحد' : controllers === 2 ? 'دراعين' : `${controllers} دراعات`;
    const priceNum = parseInt(price, 10);
    return <div className="nd-page" style={{ paddingBottom: 130 }}>
        {topbar}
        <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="nd-note" style={{ textAlign: 'center' }}>الإعلان هينزل باسمك ورقمك من حسابك: {profile.name} · <bdi>{profile.phone}</bdi></div>
            <label className="nd-up" style={{ height: 92 }}>
                {photoData
                    ? <img src={photoData} style={{ maxHeight: 64, borderRadius: 10 }} alt="صورة الجهاز اللي رفعتها" />
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                <span>{photoData ? 'غيّر صورة الجهاز' : 'صور الجهاز (إجباري)'}</span>
                <input type="file" accept="image/*" onChange={pickPhoto} aria-label="ارفع صورة الجهاز" style={{ display: 'none' }} />
            </label>
            {!photoData && <div className="nd-seg">{[{ v: KIND_PHOTO[kind], l: 'صورة الجهاز' }, { v: KIND_PAD_PHOTO[kind], l: 'صورة دراع' }].map(o => <button key={o.v} type="button" className={photoKey === o.v ? 'on' : ''} onClick={() => setPhotoKey(o.v)}>{o.l}</button>)}</div>}
            <div className="nd-seg">{(['PS5', 'PS4', 'Xbox'] as const).map(k => <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setModel(KIND_DEFAULT_MODEL[k]); setPhotoKey(KIND_PHOTO[k]); }}>{k}</button>)}</div>
            <div className="nd-seg">{modelOptions.map(m => <button key={m.value} type="button" className={model === m.value ? 'on' : ''} onClick={() => setModel(m.value)}>{m.label}</button>)}</div>
            <div className="nd-seg">{[{ value: '500GB', label: '500 جيجا' }, { value: '825GB', label: '825 جيجا' }, { value: '1TB', label: '1 تيرا' }, { value: '2TB', label: '2 تيرا' }].map(o => <button key={o.value} type="button" className={storage === o.value ? 'on' : ''} onClick={() => setStorage(o.value)}>{o.label}</button>)}</div>
            <div className="nd-card" style={{ padding: '12px 14px' }}>
                <div className="nd-row"><b style={{ fontSize: 13 }}>عدد الدراعات</b><span style={{ fontSize: 13, fontWeight: 800, color: 'var(--nd-acctext)' }}>{controllersLabel}</span></div>
                <input type="range" className="nd-range" min={1} max={4} value={controllers} onChange={e => setControllers(parseInt(e.target.value))} aria-label="عدد الدراعات" style={{ marginTop: 8 }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <div className="nd-field" style={{ flex: 1 }}><label>السعر / اليوم</label><input inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} placeholder="٨٠ ج.م" aria-label="سعر اليوم بالجنيه" /></div>
                <div className="nd-field" style={{ flex: 1 }}><label>التأمين المسترد</label><input inputMode="numeric" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="٥٠٠ ج.م" aria-label="التأمين بالجنيه" /></div>
            </div>
            {Number.isFinite(priceNum) && priceNum > 0 && <div className="nd-note">عمولة التطبيق 20٪؜ من سعر الإيجار بس: {Math.round(priceNum * COMMISSION)} ج.م عن كل يوم، وصافيلك {priceNum - Math.round(priceNum * COMMISSION)} ج.م في اليوم. التأمين كله بيرجع للمستأجر.</div>}
            <div className="nd-seg">{(['زايد', 'أكتوبر'] as const).map(a => <button key={a} type="button" className={area === a ? 'on' : ''} onClick={() => setArea(a)}>{a}</button>)}</div>
            <div className="nd-field"><label>الحي</label><input value={district} onChange={e => setDistrict(e.target.value)} placeholder="الحصري" aria-label="الحي أو الكمبوند" /></div>
            <div className="nd-field"><label>الألعاب المشمولة</label><input value={games} onChange={e => setGames(e.target.value)} placeholder="FC 25 + سبايدرمان ٢" aria-label="الألعاب اللي مع الجهاز" /></div>
            <div className="nd-field"><label>إيه اللي بييجي مع الجهاز؟</label><input value={includes} onChange={e => setIncludes(e.target.value)} placeholder="شاحن، كابلات..." aria-label="اللي بييجي مع الجهاز" /></div>
            <div className="nd-card" style={{ padding: 10 }}>
                <LocationPicker area={area} value={loc} onChange={(v: LatLng) => { setLoc(v); setLocNote(''); }} />
                <button type="button" className="nd-btn2" style={{ width: '100%', marginTop: 10, padding: 11 }} onClick={useMyLocation} disabled={locating}>{locating ? 'بنحدد مكانك...' : 'حدد مكان الجهاز على الخريطة'}</button>
            </div>
            {locNote && <div className="nd-note">{locNote}</div>}
            {loc && !locNote && <div className="nd-note">المكان اتحفظ. تقدر تحرك الدبوس بيدك لو عايز تظبطه.</div>}
            <div className="nd-note" style={{ textAlign: 'center' }}>مكانك الدقيق مش بيظهر لحد، اللي يحجز بيشوف منطقة تقريبية بس</div>
            <div className="nd-note">جهازك فيه تتبع ضد السرقة: مندوب المنصة بيركب AirTag في الجهاز وهو واصل للمستأجر وبيشيله عند الإرجاع، والمستأجر بيوافق على ده قبل ما يأكد الطلب.</div>
            {error && <div className="nd-note" style={{ color: '#ff6b6b', fontWeight: 700 }}>{error}</div>}
        </div>
        <div className="nd-bottombar">
            <button type="button" className="nd-btn" onClick={submit}>انشر الجهاز</button>
        </div>
    </div>;
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
                    <stop offset="0%" stopColor="#C724B1" />
                    <stop offset="100%" stopColor="#FF7EE3" />
                </linearGradient>
            </defs>
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--nd-card)" strokeWidth="10" />
            <circle cx="80" cy="80" r={R} fill="none" stroke="url(#nexusGrad)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 80 80)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 17, fontWeight: 800 }}>{label}</span><span className="nd-note" style={{ fontSize: 11.5 }}>{sub}</span></div>
    </div>;
}

function OrderPage({ order, onHandoverCheck, onChat }: { order: OrderDoc | null; onHandoverCheck: (v: CondState) => void; onChat: (name: string, suggestions?: string[], channelId?: string) => void }) {
    const topbar = (t: string) => <div className="nd-topbar"><Link className="nd-back" to="/orders" aria-label="رجوع لطلباتك"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></Link><b>{t}</b><span style={{ width: 38 }} /></div>;
    if (!order) return <div className="nd-page">{topbar('تتبع طلبك')}
        <div className="nd-card" style={{ margin: '18px 22px' }}><b style={{ fontSize: 14.5 }}>مفيش طلب شغال دلوقتي</b><div className="nd-note" style={{ margin: '6px 0 10px' }}>اطلب جهاز من الإعلانات، وأول ما المالك يقبل هتتابع المندوب خطوة بخطوة هنا، لايف.</div><Link className="nd-linklike" to="/">شوف الإعلانات</Link></div>
    </div>;
    if (order.status === 'requested') return <div className="nd-page">{topbar('تتبع طلبك')}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-card"><b style={{ fontSize: 15 }}>{order.title}</b><div className="nd-note" style={{ marginTop: 6 }}>طلبك عند المالك دلوقتي. لو قال متاح، المندوب هيتحرك وهتلاقي الخطوات بتتحدث هنا لايف. لو رفض، تقدر تطلب جهاز تاني.</div></div>
            <div className="nd-card" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>المالك</span><b style={{ fontSize: 13 }}>{order.ownerName}</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>المدة</span><b style={{ fontSize: 13 }}>{yom(order.days)}</b></div>
                <div className="nd-row"><span className="nd-note" style={{ fontSize: 12.5 }}>المطلوب عند الاستلام</span><b style={{ fontSize: 13, color: 'var(--nd-acctext)' }}>{order.rent + order.deposit + (order.deliveryFee || 0) - (order.discount || 0)} ج.م</b></div>
            </div>
        </div>
    </div>;
    const stage = STAGE_OF[order.status] ?? 0;
    const arrived = order.status === 'arrived' || order.status === 'delivered';
    const widths = [12, 40, 70, 100];
    const check = order.handoverCheck || EMPTY_COND;
    const headline: Record<string, string> = { accepted: 'مندوب بيستلم طلبك', taken: 'مندوب بيستلم طلبك', pickedup: 'المندوب في طريقه ليك', arrived: 'المندوب وصل، استلم جهازك', delivered: 'جهازك معاك — إيجارك شغال', returning: 'الإرجاع جاري' };
    const stepState = (i: number) => i < stage ? 'done' : i === stage ? 'active' : 'todo';
    const checkSvg = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-11"/></svg>;
    return <div className="nd-page" style={{ paddingBottom: 40 }}>
        {topbar('طلبك جاري')}
        <div style={{ padding: '4px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-card" style={{ background: 'var(--nd-herobg)' }}>
                <span className="nd-chip2">{statusAr(order.status)}</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 8 }}>{headline[order.status] || statusAr(order.status)}</div>
                <div className="nd-pbar" style={{ marginTop: 12, background: 'rgba(255,255,255,.18)' }}><i style={{ width: `${widths[stage]}%`, background: '#fff' }} /></div>
                <div className="nd-note" style={{ marginTop: 10, color: 'rgba(255,255,255,.85)' }}>{order.ownerName} · {yom(order.days)} · المطلوب عند الاستلام {order.rent + order.deposit + (order.deliveryFee || 0) - (order.discount || 0)} ج.م{!order.payMethod || order.payMethod === 'كاش عند الاستلام' ? ' كاش' : ` (${order.payMethod})`}</div>
            </div>
            <div className="nd-card">
                {ORDER_STEPS.map((s, i) => <div key={i} className={`nd-step ${stepState(i)}`}>
                    <div className="nd-dot">{i < stage && checkSvg}</div>
                    <div><b>{s}</b><span>{i < stage ? 'تمت' : i === stage ? 'دلوقتي' : 'متبقي'}</span></div>
                </div>)}
            </div>
            <div className="nd-note">الخطوات بتتحدث لايف: المندوب بيحدثها من لوحته وانت بتشوفها في نفس اللحظة.</div>
            {order.courierName
                ? <div className="nd-card nd-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="nd-av">{order.courierName.trim().charAt(0)}</div><div><b style={{ fontSize: 14 }}>{order.courierName}</b><div className="nd-note">مندوب نيكسوس</div></div></div>
                    <button type="button" className="nd-btn2" style={{ width: 44, height: 44, borderRadius: 14, padding: 0, flex: 'none' }} onClick={() => onChat(order.courierName as string, COURIER_CHAT_SUGGESTIONS, orderChannelId(order.id))} aria-label={`كلم ${order.courierName}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><path d="M4 4h16v12H9l-5 4z"/></svg></button>
                </div>
                : <div className="nd-card"><div className="nd-note">بنستنى مندوب يستلم طلبك. أول ما مندوب يستلمه هيتاح الشات معاه هنا.</div></div>}
            {arrived && <>
                <div className="nd-card">
                    <b style={{ fontSize: 13.5, display: 'block', marginBottom: 10 }}>فحص الاستلام</b>
                    <div className="nd-note" style={{ marginBottom: 10 }}>استلم جهازك وراجعه كويس قدام المندوب. علم على التشيك ليست وصوّر الجهاز: دي إثبات حالتك. زرار تأكيد التسليم مع المندوب في لوحته، وأول ما يدوسه العداد بتاعك بيبدأ.</div>
                    <ConditionChecklist value={check} onChange={onHandoverCheck} />
                    {!condComplete(check)
                        ? <div className="nd-note" style={{ marginTop: 10 }}>علم على كل نقاط التشيك ليست وضيف صورة واحدة على الأقل للجهاز، وبعدها المندوب يأكد التسليم من لوحته.</div>
                        : <div className="nd-note" style={{ marginTop: 10 }}>التشيك ليست كاملة. المندوب دلوقتي يقدر يأكد التسليم من لوحته.</div>}
                </div>
            </>}
        </div>
    </div>;
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
    return <>
        <div className="nd-card">
            <b style={{ fontSize: 15 }}>إيجارك الحالي · {rental.title}</b>
            {rental.returned
                ? <div className="nd-note" style={{ marginTop: 8 }}>طلب الإرجاع اتسجل. المندوب جاي يستلم الجهاز منك، بيتشيك عليه وبيشيل الـ AirTag قدامك ويرجعه للمالك. لو رجعت بدري المفروض يرجعلك حوالي {refund} ج.م فرق الأيام الباقية، والتأمين المحجوز بيرجع كامل بعد المعاينة.</div>
                : <>
                    <CountdownRing frac={frac} label={remainLabel} sub="فاضل على الإرجاع" />
                    <div className="nd-row" style={{ padding: '6px 0' }}><span className="nd-note" style={{ fontSize: 12.5 }}>المالك</span><b style={{ fontSize: 13 }}>{rental.owner}</b></div>
                    {rental.ownerPhone ? <div className="nd-row" style={{ padding: '6px 0' }}><span className="nd-note" style={{ fontSize: 12.5 }}>موبايل المالك</span><b style={{ fontSize: 13 }}><bdi>{rental.ownerPhone}</bdi></b></div> : null}
                    <div className="nd-row" style={{ padding: '6px 0' }}><span className="nd-note" style={{ fontSize: 12.5 }}>المدة</span><b style={{ fontSize: 13 }}>{yom(rental.days)}</b></div>
                    <div className="nd-row" style={{ padding: '6px 0' }}><span className="nd-note" style={{ fontSize: 12.5 }}>التتبع</span><b style={{ fontSize: 13 }}>وافقت على جهاز التتبع ضد السرقة</b></div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {rental.ownerPhone ? <a className="nd-btn" style={{ flex: 1, padding: 11, textAlign: 'center', textDecoration: 'none' }} href={`tel:${rental.ownerPhone}`}>اتصل بالمالك</a> : null}
                        <button type="button" className="nd-btn2" style={{ flex: 1, padding: 11 }} onClick={() => onChat(rental.owner, OWNER_CHAT_SUGGESTIONS, rental.channelId)}>كلم {rental.owner}</button>
                    </div>
                    <div className="nd-note" style={{ marginTop: 10 }}>لو الجهاز محتاج باسورد عشان يتفتح، أو عايز تستأذن تضيف الأكونت بتاعك، كلم المالك من هنا.</div>
                </>}
        </div>
        {!rental.returned && <>
            <div className="nd-card">
                <b style={{ fontSize: 13.5 }}>لو رجعته بدري</b>
                <div className="nd-note" style={{ marginTop: 6 }}>لو سلمته دلوقتي بيرجعلك حوالي {refund} ج.م فرق الأيام الباقية، والتأمين المحجوز عند المنصة بيرجع لك كامل بعد المعاينة. مندوب المنصة بييجي يستلم الجهاز منك، بيتشيك عليه وبيشيل الـ AirTag قدامك ويرجعه للمالك.</div>
            </div>
            <div className="nd-card">
                <b style={{ fontSize: 13.5, display: 'block', marginBottom: 6 }}>تشيك ليست حالة الجهاز عند الإرجاع</b>
                <ConditionChecklist value={returnCheck} onChange={onReturnCheck} />
                <button type="button" className="nd-btn" style={{ width: '100%', marginTop: 12 }} disabled={!condComplete(returnCheck)} onClick={() => { if (condComplete(returnCheck)) onReturn(); }}>سجل الإرجاع واطلب المندوب</button>
                {!condComplete(returnCheck) && <div className="nd-note" style={{ marginTop: 8 }}>كمّل تشيك ليست الإرجاع وضيف صورة واحدة على الأقل عشان تسجل الإرجاع. المندوب بيشوفها لحظة بلحظة.</div>}
            </div>
        </>}
        <div className="nd-note">العداد بيعد لحظة بلحظة من لحظة الاستلام.</div>
    </>;
}

function UserAvatar({ profile, size }: { profile: UserProfile | null; size?: number }) {
    if (profile && profile.photo) return <img className="nexus-avatar nexus-avatar-photo" style={size ? { width: size, height: size } : undefined} src={profile.photo} alt={`صورة ${profile.name}`} />;
    return <Avatar char={profile?.avatar || '🎮'} size={size} />;
}

function ProfileForm({ initial, submitLabel, onSave, onBack }: { initial: UserProfile | null; submitLabel: string; onSave: (p: UserProfile) => void; onBack?: () => void }) {
    const [name, setName] = useState(initial?.name || '');
    const [age, setAge] = useState(initial?.age || '');
    const [phone, setPhone] = useState(initial?.phone || '');
    const [address, setAddress] = useState(initial?.address || '');
    const [photo, setPhoto] = useState(initial?.photo || '');
    const [idPhoto, setIdPhoto] = useState(initial?.idPhoto || '');
    const [idPhotoBack, setIdPhotoBack] = useState(initial?.idPhotoBack || '');
    const [error, setError] = useState('');
    const pickIdPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 480, setIdPhoto);
    };
    const pickIdPhotoBack = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        fileToSmallDataUrl(f, 480, setIdPhotoBack);
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
        if (address.trim().length < 3) { setError('اكتب عنوانك (المنطقة والحي).'); return; }
        if (!photo) { setError('ضيف صورتك الشخصية الأول، مطلوبة للأمان.'); return; }
        if (!idPhoto || !idPhotoBack) { setError('ضيف صورة البطاقة وش وضهر، الاتنين مطلوبين للأمان.'); return; }
        setError('');
        onSave({ name: name.trim(), age: String(a), phone: phone.trim(), avatar: initial?.avatar || AVATARS[0], address: address.trim(), photo, idPhoto, idPhotoBack });
    };
    const camSvg = <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 7 10 4.5h4L15.5 7"/></svg>;
    return <div className="nd-page">
        <div className="nd-topbar">
            {onBack && <button type="button" className="nd-back" onClick={onBack} aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>}
            <b>{initial ? 'تعديل البروفايل' : 'حساب جديد'}</b>
            <div style={{ flex: 1 }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: 22 }}>
            <label style={{ cursor: 'pointer', display: 'inline-block' }} aria-label="ارفع صورتك الشخصية">
                <input type="file" accept="image/*" onChange={pickProfilePhoto} style={{ display: 'none' }} />
                {photo
                    ? <span style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto', display: 'block', overflow: 'hidden', boxShadow: '0 0 18px var(--nd-accglow)' }}><img src={photo} alt="صورتك الشخصية" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
                    : <span style={{ width: 88, height: 88, borderRadius: '50%', border: '2px dashed var(--nd-navmut)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nd-mut)' }}>{camSvg}</span>}
            </label>
            <div className="nd-note" style={{ marginTop: 8 }}>صورتك الشخصية (مطلوبة)</div>
        </div>
        <div className="nd-pad" style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 120 }}>
            <div className="nd-field"><label>الاسم بالكامل</label><input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك" aria-label="الاسم بالكامل" /></div>
            <div className="nd-row" style={{ gap: 11 }}>
                <div className="nd-field" style={{ flex: 1 }}><label>السن</label><input inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="٢٤" aria-label="السن" /></div>
                <div className="nd-field" style={{ flex: 2 }}><label>رقم الموبايل</label><input dir="ltr" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01xxxxxxxxx" aria-label="رقم الموبايل" /></div>
            </div>
            <div className="nd-field"><label>العنوان بالتفصيل</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="الحي، المنطقة" aria-label="العنوان بالتفصيل" /></div>
            <div>
                <div style={{ fontSize: 12.5, color: 'var(--nd-mut)', marginBottom: 7 }}>البطاقة الشخصية (مطلوبة) — تأمين لأصحاب الأجهزة</div>
                <div className="nd-row" style={{ gap: 11 }}>
                    <label className={idPhoto ? 'nd-idbox has' : 'nd-idbox'}>
                        <input type="file" accept="image/*" onChange={pickIdPhoto} aria-label="ارفع صورة وش البطاقة" style={{ display: 'none' }} />
                        {idPhoto ? <img src={idPhoto} alt="صورة وش البطاقة" /> : camSvg}
                        <div className="t">{idPhoto ? 'غيّر صورة الوش' : 'صورة الوش'}</div>
                    </label>
                    <label className={idPhotoBack ? 'nd-idbox has' : 'nd-idbox'}>
                        <input type="file" accept="image/*" onChange={pickIdPhotoBack} aria-label="ارفع صورة ضهر البطاقة" style={{ display: 'none' }} />
                        {idPhotoBack ? <img src={idPhotoBack} alt="صورة ضهر البطاقة" /> : camSvg}
                        <div className="t">{idPhotoBack ? 'غيّر صورة الضهر' : 'صورة الضهر'}</div>
                    </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', marginTop: 7, color: 'var(--nd-mut)', fontSize: 11.5 }}>
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></svg>
                    <span>الإدارة بس اللي بتشوفها · متشفرة أثناء النقل والتخزين على سيرفرات جوجل</span>
                </div>
            </div>
            {error && <div className="nd-err">{error}</div>}
            <div className="nd-note" style={{ textAlign: 'center' }}>صورتك بتطمن أصحاب الأجهزة إنك شخص حقيقي، ومبيشوفهاش ولا البطاقة أي مستخدم - إدارة التطبيق بس.</div>
        </div>
        <div className="nd-bottombar">
            <button type="button" className="nd-btn" onClick={save}>{submitLabel}</button>
        </div>
    </div>;
}

function ProfilePage({ profile, myUid, email, myOrders, incoming, myListings, orders, rentalOrder, chats, onEditProfile, onReturn, onReturnCheck, onCancelRequest, onDeleteListing, onChat, onTrack, onOwnerAnswer, onOpenChat, onSupport, onComplain, onSignOut }: {
    profile: UserProfile; myUid: string; email: string; myOrders: OrderDoc[]; incoming: OrderDoc[]; myListings: ConsoleListing[]; orders: OrderDoc[]; rentalOrder: OrderDoc | null; chats: ChatDoc[];
    onEditProfile: () => void; onReturn: () => void; onReturnCheck: (v: CondState) => void; onCancelRequest: (id: string) => void;
    onDeleteListing: (id: string) => void; onChat: (name: string, suggestions?: string[], channelId?: string) => void; onTrack: (l: ConsoleListing) => void;
    onOwnerAnswer: (o: OrderDoc, ok: boolean) => void; onOpenChat: (c: ChatDoc) => void; onSupport: () => void; onComplain: () => void; onSignOut: () => void;
}) {
    const doneCount = myOrders.filter(o => o.status === 'returned').length;
    const chatName = (c: ChatDoc) => myUid === c.ownerId ? (c.renterName || 'مستأجر') : (c.kind === 'order' ? (c.courierName || 'المندوب') : (c.ownerName || 'المالك'));
    const rated = myListings.filter(l => l.reviews > 0);
    const myRating = rated.length ? (Math.round(rated.reduce((s, l) => s + l.rating, 0) / rated.length * 10) / 10).toString() : '—';
    const tier = doneCount >= 15 ? { name: 'الذهبي', perk: 'خصم ١٠٪؜' } : doneCount >= 5 ? { name: 'الفضي', perk: 'خصم ٥٪؜ من العمولة' } : { name: 'البرونزي', perk: 'من أول إيجار' };
    const arrow = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>;
    const scrollTo = (id: string) => { try { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* تجاهل */ } };
    const secTitle = (t: string) => <div style={{ fontSize: 15, fontWeight: 800, margin: '4px 2px 0' }}>{t}</div>;
    return <div className="nd-page" style={{ paddingBottom: 120 }}>
        <div style={{ textAlign: 'center', paddingTop: 34 }}>
            <div style={{ margin: '0 auto', width: 78, height: 78, filter: 'drop-shadow(0 12px 26px var(--nd-accglow))' }}><UserAvatar profile={profile} size={78} /></div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{profile.name}</div>
            <div className="nd-note" style={{ marginTop: 2 }}>{profile.address}{profile.address && profile.phone ? ' · ' : ''}<bdi>{profile.phone}</bdi></div>
            <div style={{ marginTop: 10 }}><span className="nd-chip2" style={{ background: 'var(--nd-acc2)', color: '#fff' }}>المستوى {tier.name} · {tier.perk}</span></div>
        </div>
        <div style={{ padding: '18px 22px 0', display: 'flex', gap: 10 }}>
            <div className="nd-stat"><b>{myOrders.filter(o => o.status !== 'declined').length}</b><span>تأجيرات</span></div>
            <div className="nd-stat"><b>{myListings.length}</b><span>أجهزة معروضة</span></div>
            <div className="nd-stat"><b>{myRating}</b><span>تقييمي</span></div>
        </div>
        <div style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link className="nd-mrow" to="/orders" style={{ textDecoration: 'none' }}><div className="nd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg></div><b>طلباتي</b>{arrow}</Link>
            <button type="button" className="nd-mrow" onClick={() => scrollTo('sec-listings')}><div className="nd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M18 11v2"/></svg></div><b>أجهزتي للتأجير</b>{arrow}</button>
            <button type="button" className="nd-mrow" onClick={() => scrollTo('sec-chats')}><div className="nd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H9l-5 4z"/></svg></div><b>المحادثات</b>{arrow}</button>
            <button type="button" className="nd-mrow" onClick={onEditProfile}><div className="nd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></div><b>تعديل البروفايل والبطاقة</b>{arrow}</button>
            <button type="button" className="nd-mrow" onClick={onSignOut}><div className="nd-ic" style={{ color: '#ff6b6b' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></div><b style={{ color: '#ff6b6b' }}>تسجيل خروج</b></button>
        </div>
        <div style={{ padding: '18px 22px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rentalOrder && <>
                <ActiveRental
                    rental={{ title: rentalOrder.title, owner: rentalOrder.ownerName, ownerPhone: rentalOrder.ownerPhone || '', pricePerDay: rentalOrder.pricePerDay, days: rentalOrder.days, startMs: rentalOrder.deliveredAt || rentalOrder.createdMs, returned: rentalOrder.status === 'returning', channelId: rentalOrder.deviceId ? dmChannelId(rentalOrder.deviceId, myUid) : undefined }}
                    onReturn={onReturn} returnCheck={rentalOrder.returnCheck || EMPTY_COND} onReturnCheck={onReturnCheck} onChat={onChat} />
            </>}
            {incoming.length > 0 && <>
                {secTitle('طلبات على أجهزتك')}
                {incoming.map(o => <div key={o.id} className="nd-card">
                    <b style={{ fontSize: 14 }}>حد عايز يأجر جهازك</b>
                    <div className="nd-note" style={{ marginTop: 4 }}>{o.renterName} طلب {o.title} لمدة {yom(o.days)} · إيجار <bdi>{o.rent}</bdi> ج.م{o.fromMs ? ` · يستلم يوم ${new Date(o.fromMs).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}</div>
                    <div className="nd-note" style={{ marginTop: 4 }}>جهازك متاح للإيجار دلوقتي؟</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        <button type="button" className="nd-btn" style={{ flex: 1, minWidth: 110, padding: 11 }} onClick={() => onOwnerAnswer(o, true)}>متاح</button>
                        <button type="button" className="nd-btn2" style={{ flex: 1, minWidth: 110, padding: 11 }} onClick={() => onOwnerAnswer(o, false)}>مش متاح دلوقتي</button>
                        {o.deviceId && <button type="button" className="nd-btn2" style={{ padding: 11 }} onClick={() => onChat(o.renterName, undefined, dmChannelId(o.deviceId as string, o.renterId))}>كلم {o.renterName}</button>}
                    </div>
                </div>)}
            </>}
            <div id="sec-listings" />
            {myListings.length > 0 && <>
                {secTitle('أجهزتي للتأجير')}
                {myListings.map(l => {
                    const active = orders.find(o => o.deviceId === l.id && ORDER_BUSY.includes(o.status));
                    return <div key={l.id} className="nd-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <ConsoleCard listing={l} onDelete={l.status === 'rented' ? undefined : onDeleteListing} onTrack={() => onTrack(l)} />
                        {(l.status === 'rented' || active) && <div className="nd-note" style={{ padding: '0 14px 12px' }}>{l.status === 'rented' ? `قيد الإيجار${active ? ` · ${statusAr(active.status)}` : ''}` : `${statusAr((active as OrderDoc).status)} · المستأجر: ${(active as OrderDoc).renterName}`}</div>}
                    </div>;
                })}
                <div className="nd-note">الإعلان المؤجر بيختفي من صفحة الإعلانات العامة، وانت بس اللي شايفه هنا. تقدر تتبع مكان جهازك طول ما هو بره.</div>
            </>}
            <div id="sec-chats" />
            {(() => { const visibleChats = chats.filter(c => !c.id.startsWith('order_') || orders.some(o => o.id === c.id.slice(6))); return visibleChats.length > 0 && <>
                {secTitle('المحادثات')}
                {visibleChats.map(c => <button key={c.id} type="button" className="nd-mrow" onClick={() => onOpenChat(c)}>
                    <div className="nd-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H9l-5 4z"/></svg></div>
                    <b>{chatName(c)}</b>
                    <span className="nd-note" style={{ fontSize: 11.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastText || c.deviceTitle || 'محادثة'}</span>
                </button>)}
            </>; })()}
            {secTitle('طبقات النجوم')}
            <div className="nd-card">
                <div className="nd-note" style={{ marginBottom: 10 }}>كل ما تأجر أكتر، تكسب أكتر. عندك {doneCount} إيجار مكتمل.</div>
                <div className="nd-row" style={{ padding: '7px 0' }}><span style={{ fontSize: 13, fontWeight: 700 }}>برونزي</span><span className="nd-note" style={{ fontSize: 12 }}>من أول إيجار · شارة مؤجر جديد</span></div>
                <div className="nd-row" style={{ padding: '7px 0' }}><span style={{ fontSize: 13, fontWeight: 700 }}>فضي</span><span className="nd-note" style={{ fontSize: 12 }}>٥ إيجارات مكتملة · خصم ٥٪؜ من العمولة</span></div>
                <div className="nd-row" style={{ padding: '7px 0' }}><span style={{ fontSize: 13, fontWeight: 700 }}>دهبي</span><span className="nd-note" style={{ fontSize: 12 }}>١٥ إيجار مكتمل · خصم ١٠٪؜ وأولوية ظهور</span></div>
                <div className="nd-pbar" style={{ marginTop: 10 }}><i style={{ width: `${Math.min(100, (doneCount / 15) * 100)}%` }} /></div>
            </div>
            {secTitle('خدمة العملاء')}
            <div className="nd-card">
                <div className="nd-note">عندك مشكلة أو سؤال؟ كلم الدعم في أي وقت، أو قدم شكوى رسمية والإدارة تراجعها.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="button" className="nd-btn2" style={{ flex: 1, padding: 11 }} onClick={onSupport}>كلم الدعم</button>
                    <button type="button" className="nd-btn2" style={{ flex: 1, padding: 11 }} onClick={onComplain}>قدم شكوى</button>
                </div>
            </div>
            <div className="nd-note" style={{ textAlign: 'center' }}><bdi>{email}</bdi></div>
        </div>
    </div>;
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

function AdminPage({ users, complaints, orders, devices, onCloseComplaint, onDeleteUser, onExit }: {
    users: AdminUserDoc[]; complaints: ComplaintDoc[]; orders: OrderDoc[]; devices: DeviceDoc[];
    onCloseComplaint: (id: string) => void; onDeleteUser: (id: string) => void; onExit: () => void;
}) {
    const [selected, setSelected] = useState<AdminUserDoc | null>(null);
    const [tab, setTab] = useState<'users' | 'complaints' | 'orders'>('users');
    const activeOrders = orders.filter(o => ORDER_BUSY.includes(o.status) || o.status === 'requested');
    const openComplaints = complaints.filter(c => c.status === 'مفتوحة');
    const trash = <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>;
    return <div className="nd-page">
        <div className="nd-topbar">
            <button type="button" className="nd-back" onClick={onExit} aria-label="خروج من لوحة الإدارة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
            <b>لوحة الإدارة</b><div style={{ flex: 1 }} /><span className="nd-chip2 warn">لايف</span>
        </div>
        <div style={{ padding: '4px 22px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
                <div className="nd-stat"><b>{users.length}</b><span>مستخدم</span></div>
                <div className="nd-stat"><b>{activeOrders.length}</b><span>طلب شغال</span></div>
                <div className="nd-stat"><b>{openComplaints.length}</b><span>شكاوى مفتوحة</span></div>
            </div>
            <div className="nd-note" style={{ textAlign: 'center' }}>كل الأرقام والمستخدمين والطلبات هنا لايف من السيرفر، بتتحدث لحظة بلحظة.</div>
            <div className="nd-seg">
                <button type="button" className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>المستخدمين</button>
                <button type="button" className={tab === 'complaints' ? 'on' : ''} onClick={() => setTab('complaints')}>الشكاوى</button>
                <button type="button" className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>الطلبات</button>
            </div>
            {tab === 'users' && <>
                {users.length === 0 && <div className="nd-note" style={{ textAlign: 'center' }}>مفيش مستخدمين لحد دلوقتي.</div>}
                {users.map(u => <button key={u.id} type="button" className="nd-card nd-row" style={{ width: '100%', textAlign: 'start', cursor: 'pointer', border: 0, fontFamily: 'inherit' }} onClick={() => setSelected(u)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="nd-av">{u.photo ? <img src={u.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name || '؟').trim().charAt(0)}</div>
                        <div><b style={{ fontSize: 13.5, color: 'var(--nd-ink)' }}>{u.name}</b><div className="nd-note"><bdi>{u.phone}</bdi> · {u.address} · {devices.filter(d => d.ownerId === u.id).length} إعلان</div></div>
                    </div>
                    <div style={{ color: '#ff6b6b' }}>{trash}</div>
                </button>)}
            </>}
            {tab === 'complaints' && <>
                {complaints.length === 0 && <div className="nd-note" style={{ textAlign: 'center' }}>مفيش شكاوى لحد دلوقتي.</div>}
                {complaints.map(c => {
                    const closed = c.status !== 'مفتوحة';
                    return <div key={c.id} className="nd-card">
                        <div className="nd-row">
                            <div style={{ flex: 1 }}>
                                <b style={{ fontSize: 13 }}>شكوى: {c.subject}</b>
                                <div className="nd-note">من {c.from} · {new Date(c.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</div>
                            </div>
                            <span className={closed ? 'nd-chip2' : 'nd-chip2 warn'}>{closed ? 'مقفولة' : 'مفتوحة'}</span>
                        </div>
                        <div className="nd-note" style={{ marginTop: 6 }}>{c.detail}</div>
                        {!closed && <button type="button" className="nd-btn2" style={{ width: '100%', marginTop: 10, padding: 10 }} onClick={() => onCloseComplaint(c.id)}>اقفل الشكوى</button>}
                    </div>;
                })}
            </>}
            {tab === 'orders' && <>
                {activeOrders.length === 0 && <div className="nd-note" style={{ textAlign: 'center' }}>مفيش طلبات شغالة دلوقتي.</div>}
                {activeOrders.map(o => <div key={o.id} className="nd-card nd-row">
                    <div>
                        <b style={{ fontSize: 13 }}>{o.title}</b>
                        <div className="nd-note">المستأجر: {o.renterName} · المالك: {o.ownerName}</div>
                    </div>
                    <span className="nd-chip2 on">{statusAr(o.status)}</span>
                </div>)}
            </>}
        </div>
        {selected !== null && <div className="nd-overlay" role="dialog" aria-modal="true" aria-label="بيانات المستخدم">
            <div className="nd-topbar">
                <button type="button" className="nd-back" onClick={() => setSelected(null)} aria-label="رجوع"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
                <b>{selected.name}</b><div style={{ flex: 1 }} />
            </div>
            <div style={{ padding: '4px 22px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div className="nd-stat"><b style={{ fontSize: 13 }}><bdi>{selected.phone}</bdi></b><span>الموبايل</span></div>
                    <div className="nd-stat"><b>{selected.age}</b><span>السن</span></div>
                    <div className="nd-stat"><b>{devices.filter(d => d.ownerId === selected.id).length}</b><span>إعلان</span></div>
                </div>
                <div className="nd-card">
                    <div className="nd-note"><bdi>{selected.email || '—'}</bdi></div>
                    <div className="nd-note">{selected.address}</div>
                    <div className="nd-note">طلباته: {orders.filter(o => o.renterId === selected.id || o.ownerId === selected.id).length}</div>
                </div>
                <div className="nd-card">
                    <b style={{ fontSize: 13 }}>الصورة الشخصية والبطاقة</b>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                        <div>
                            <div className="nd-note">صورته الشخصية</div>
                            {selected.photo ? <img src={selected.photo} alt="الصورة الشخصية للمستخدم" style={{ width: '100%', borderRadius: 12 }} /> : <div className="nd-note">لسه ما رفعش صورة شخصية</div>}
                        </div>
                        <div>
                            <div className="nd-note">البطاقة (الوش)</div>
                            {selected.idPhoto ? <img src={selected.idPhoto} alt="صورة وش بطاقة المستخدم" style={{ width: '100%', borderRadius: 12 }} /> : <div className="nd-note">لسه ما رفعش الوش</div>}
                        </div>
                        <div>
                            <div className="nd-note">البطاقة (الضهر)</div>
                            {selected.idPhotoBack ? <img src={selected.idPhotoBack} alt="صورة ضهر بطاقة المستخدم" style={{ width: '100%', borderRadius: 12 }} /> : <div className="nd-note">لسه ما رفعش الضهر</div>}
                        </div>
                    </div>
                    <div className="nd-note" style={{ marginTop: 8 }}>قارن الصورتين عشان تتأكد إن صاحب الحساب هو صاحب البطاقة. الصور دي بتظهر في لوحة الإدارة بس.</div>
                </div>
                <button type="button" className="nd-btn2" style={{ padding: 12, color: '#ff6b6b', fontWeight: 800 }} onClick={() => { onDeleteUser(selected.id); setSelected(null); }}>احذف الحساب</button>
            </div>
        </div>}
    </div>;
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
    const [mode, setMode] = useState<'login' | 'signup'>(() => {
        try { return new URLSearchParams(window.location.search).get('shot_auth') === 'login' ? 'login' : 'signup'; } catch { return 'signup'; }
    });
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
    return <div className="nd-page">
        <div className="nd-glow" style={{ width: 280, height: 280, background: 'var(--nd-g1)', top: -90, right: -70 }} />
        <div style={{ padding: '96px 22px 0', textAlign: 'center' }}>
            <div className="nd-logo">N</div>
            <div style={{ fontSize: 27, fontWeight: 800, marginTop: 14 }}>نيكسوس</div>
            <div className="nd-note" style={{ marginTop: 4 }}>أجّر كونسول من جارك، بأمان</div>
        </div>
        <div className="nd-pad" style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="nd-field"><label>الإيميل</label><input dir="ltr" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="name@gmail.com" aria-label="الإيميل" /></div>
            <div className="nd-field"><label>الباسورد</label><input dir="ltr" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={pw} onChange={e => { setPw(e.target.value); setErr(''); }} onKeyDown={e => { if (e.key === 'Enter') submit(); }} placeholder="٦ حروف أو أرقام على الأقل" aria-label="الباسورد" /></div>
            {err && <div className="nd-err">{err}</div>}
            <button type="button" className="nd-btn" style={{ marginTop: 6 }} disabled={busy} onClick={submit}>{busy ? 'ثواني...' : mode === 'signup' ? 'اعمل الحساب' : 'دخول'}</button>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--nd-mut)', marginTop: 4 }}>
                {mode === 'signup' ? 'عندك حساب بالفعل؟ ' : 'جديد هنا؟ '}
                <button type="button" className="nd-linklike" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setErr(''); }}>{mode === 'signup' ? 'سجل دخولك' : 'اعمل حساب'}</button>
            </div>
            <div className="nd-note" style={{ textAlign: 'center' }}>حسابك بيتسجل على سيرفر Firebase. بعد إنشاء الحساب هنطلب صورتك الشخصية وصورة بطاقتك (وش وضهر)، وده مطلوب للأمان عشان كل طرف يبقى معروف.</div>
        </div>
    </div>;
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
    const [reviewTarget, setReviewTarget] = useState<OrderDoc | null>(null);
    const [editProfile, setEditProfile] = useState(() => { try { return SHOT && new URLSearchParams(window.location.search).get('shot_edit') === '1'; } catch { return false; } });
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

    const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => (typeof localStorage !== 'undefined' && localStorage.getItem('nexus-theme') === 'light') ? 'light' : 'dark');
    useEffect(() => {
        const root = document.documentElement;
        const t: any = themeConfig || {};
        if (themeMode === 'light') {
            root.dataset.theme = 'light';
            root.style.removeProperty('--ds-teal');
            root.style.removeProperty('--ds-page');
            root.style.removeProperty('--ds-ink');
        } else {
            delete root.dataset.theme;
            if (t.اللون_الأساسي) root.style.setProperty('--ds-teal', t.اللون_الأساسي);
            if (t.لون_الخلفية) root.style.setProperty('--ds-page', t.لون_الخلفية);
            if (t.لون_الكتابة) root.style.setProperty('--ds-ink', t.لون_الكتابة);
        }
        try { localStorage.setItem('nexus-theme', themeMode); } catch { /* خاص */ }
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeMode === 'light' ? '#f4f1fa' : '#0b0920');
    }, [themeMode]);

    useEffect(() => {
        const h = () => setThemeMode(m => (m === 'light' ? 'dark' : 'light'));
        window.addEventListener('nexus-toggle-theme', h);
        return () => window.removeEventListener('nexus-toggle-theme', h);
    }, []);

    useEffect(() => {
        if (!SHOT) return;
        const q = new URLSearchParams(window.location.search);
        if (q.get('shot_menu') === '1') setMenuOpen(true);
        if (q.get('shot_gate') === 'password') setGateStep('password');
        const ch = q.get('shot_chat');
        if (ch) setChatWith({ name: q.get('shot_chatname') || 'محادثة', channelId: ch, suggestions: COURIER_CHAT_SUGGESTIONS });
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
        if (!(e.target as HTMLElement).closest('.nd-name')) return;
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
    const profile: UserProfile | null = profileDoc ? { name: profileDoc.name, age: profileDoc.age, phone: profileDoc.phone, avatar: profileDoc.avatar, address: profileDoc.address, photo: profileDoc.photo, idPhoto: profileDoc.idPhoto, idPhotoBack: profileDoc.idPhotoBack } : null;
    const devList = devices || [];
    const realListings: ConsoleListing[] = devList.map((d, i) => ({
        id: d.id, number: 100 + (devList.length - i), kind: d.kind, title: d.title, owner: d.ownerName, ownerId: d.ownerId,
        area: d.area, district: d.district, pricePerDay: d.pricePerDay, deposit: d.deposit, rating: d.rating, reviews: d.reviews,
        delivery: d.delivery, model: d.model, storage: d.storage, controllers: d.controllers, games: d.games, includes: d.includes,
        photoKey: d.photoKey, photoData: d.photoData, mine: d.ownerId === uid, status: d.status, createdAt: d.createdAt,
        lat: d.lat, lng: d.lng, reviewList: d.reviewList,
    }));
    const consoles: ConsoleListing[] = realListings.filter(l => l.status !== 'rented');
    useEffect(() => {
        try {
            if (!detail && new URLSearchParams(window.location.search).get('shot_detail') === '1' && consoles.length) setDetail(consoles[0]);
        } catch { /* تجاهل */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consoles]);
    const myListings = realListings.filter(l => l.ownerId === uid);
    const myOrders = orders.filter(o => o.renterId === uid);
    useEffect(() => {
        try {
            if (!reviewTarget && new URLSearchParams(window.location.search).get('shot_review') === '1' && myOrders.length) {
                const o = myOrders.find(x => x.status === 'returned') || myOrders[0];
                setReviewTarget(o); window.location.hash = '/review';
            }
        } catch { /* تجاهل */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myOrders]);
    const submitReview = (o: OrderDoc, stars: number, tags: string[], text: string, ownerStars: number) => {
        const l = realListings.find(x => x.id === o.deviceId);
        const jobs: Promise<any>[] = [run(fbUpdateOrder(o.id, { reviewed: true }), 'التقييم ماتحفظش. جرب تاني.')];
        if (l) {
            const entry: ReviewEntry = { name: profile.name, stars, text: text.trim(), tags, ownerStars, ts: Date.now() };
            const list = [...(l.reviewList || []), entry].slice(-20);
            const reviews = (l.reviews || 0) + 1;
            const rating = Math.round((((l.rating || 0) * (l.reviews || 0)) + stars) / reviews * 10) / 10;
            jobs.push(run(fbUpdateDevice(l.id, { rating, reviews, reviewList: list } as any), 'التقييم ماتحفظش. جرب تاني.'));
        }
        return Promise.all(jobs);
    };

    const incoming = orders.filter(o => o.ownerId === uid && o.status === 'requested');
    const currentOrder = myOrders.find(o => ['accepted', 'taken', 'pickedup', 'arrived'].includes(o.status)) || null;
    const rentalOrder = myOrders.find(o => o.status === 'delivered' || o.status === 'returning') || null;
    const courierFeed = orders.filter(o => o.status === 'accepted' || (o.courierId === uid && [...ORDER_BUSY, 'returning' as OrderStatus].includes(o.status)));
    const exactLoc = useExactLocations(devList, uid);

    const requestConsole = (l: ConsoleListing) => {
        setRequestTarget({ title: l.title, owner: l.owner, ownerLine: `${l.owner} · ${areaName(l.area)}، ${l.district}`, pricePerDay: l.pricePerDay, deposit: l.deposit, number: l.number, deviceId: l.id, ownerId: l.ownerId, kind: l.kind, photoKey: l.photoKey, photoData: l.photoData });
    };
    useEffect(() => {
        try {
            if (!requestTarget && new URLSearchParams(window.location.search).get('shot_request') === '1' && consoles.length) requestConsole(consoles[0]);
        } catch { /* تجاهل */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [consoles]);


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
            <Header title="NEXUS" fact="نسخة 1.8" intro="ثواني وبنجهز حسابك من السيرفر..." />
        </div></FileCard>;
    }
    if (!user) return <> <AuthPage /> {SHOT && tracking && (() => {
        const lat = typeof tracking.lat === 'number' ? (tracking.lat as number) : AREA_CENTER['زايد'][0];
        const lng = typeof tracking.lng === 'number' ? (tracking.lng as number) : AREA_CENTER['زايد'][1];
        return <TrackingDialog listing={tracking} lat={lat} lng={lng} exact={false} onClose={() => setTracking(null)} />;
    })()} </>;
    if (!profile) {
        return <ProfileForm initial={null} submitLabel="يلا نبدأ" onSave={saveProfile} />;
    }
    return <FileCard lang="ar" dir="rtl">
        <div className="nexus-app">
        <div onPointerDown={lpStart} onPointerUp={lpCancel} onPointerMove={lpCancel} onPointerLeave={lpCancel} onPointerCancel={lpCancel}
            onContextMenu={e => { if ((e.target as HTMLElement).closest('.nd-name')) e.preventDefault(); }}>
        <Routes>
            <Route path="/" element={<Home consoles={consoles} profile={profile} onOpenConsole={setDetail} />} />
            <Route path="/map" element={<MapPage consoles={consoles} onOpen={setDetail} exactLoc={exactLoc} />} />
            <Route path="/orders" element={<OrdersPage myOrders={myOrders} consoles={consoles} onTrack={setTracking} onCancelRequest={(id) => run(fbDeleteOrder(id), 'الطلب ماتلغاش. جرب تاني.')} onOpenOrder={() => { window.location.hash = '/order'; }} onRate={(o) => { setReviewTarget(o); window.location.hash = '/review'; }} />} />
            <Route path="/add" element={<AddPage onAdd={addListing} blocked={!!rentalOrder} profile={profile} />} />
            <Route path="/admin" element={adminRole === 'courier'
                ? <CourierPanel feed={courierFeed} myUid={uid} myName={profile.name} exactLoc={exactLoc}
                    onTake={courierTake} onPickedUp={courierPickedUp} onArrived={courierArrived} onDeliver={courierDeliver} onReturnDone={courierReturnDone}
                    onChat={(n, s, ch) => handleChat(n, s, ch)} onExit={() => { setAdminRole(null); window.location.hash = '/'; }} />
                : adminRole === 'admin'
                    ? <AdminPage users={adminUsers || []} complaints={adminComplaints || []} orders={orders} devices={devList}
                        onCloseComplaint={(id) => run(fbCloseComplaint(id), 'ماتقفلتش. جرب تاني.')}
                        onDeleteUser={(id) => run(fbDeleteUser(id), 'ماتمسحش. جرب تاني.')}
                        onExit={() => { setAdminRole(null); window.location.hash = '/'; }} />
                    : <Group label="الصفحة دي مش موجودة" heading="اتوجهت غلط"><Callout title="مفيش حاجة هنا" tone="note">الصفحة دي مش متاحة. ارجع للإعلانات.</Callout><Link className="file-button is-compact" data-variant="secondary" to="/">ارجع للإعلانات</Link></Group>} />
            <Route path="/detail" element={<ConsoleDetailPage listing={detail} busy={busyDaysFor(detail, orders)} onRequest={() => detail && requestConsole(detail)} onChat={() => detail && openDmFor(detail)} />} />
            <Route path="/order" element={<OrderPage order={currentOrder} onHandoverCheck={(v) => currentOrder && run(fbUpdateOrder(currentOrder.id, { handoverCheck: v }), 'ماتحفظتش. جرب تاني.')} onChat={handleChat} />} />
            <Route path="/review" element={<ReviewPage order={reviewTarget} consoles={realListings} onSubmit={submitReview} />} />
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
        <BottomNav />
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
            return <TrackingDialog listing={tracking} lat={lat} lng={lng} exact={hasExact} onClose={() => setTracking(null)} />;
        })()}
        {editProfile && <div className="nd-overlay" role="dialog" aria-modal="true" aria-label="تعديل بياناتك">
            <ProfileForm initial={profile} submitLabel="احفظ التعديلات" onSave={saveProfile} onBack={() => setEditProfile(false)} />
        </div>}
        {errNote && <Callout title="حصلت مشكلة" tone="danger">{errNote}</Callout>}
        <div className="nd-note" style={{ textAlign: 'center', padding: '0 22px' }}>صور الأجهزة: بلايستيشن 5 بواسطة Soberian وبلايستيشن 4 بواسطة Evan-Amos ودراع بلايستيشن بواسطة Viper polo وإكس بوكس سيريس إكس بواسطة epredator ودراع إكس بوكس بواسطة UKER، عبر ويكيميديا كومنز. أغلفة الألعاب رسوم توضيحية.</div>
        <div className="nd-note" style={{ textAlign: 'center', marginTop: 6 }}>نسخة 1.8، متصلة بسيرفر Firebase حقيقي.</div>
        </div>
        </div>
    </FileCard>;
}
