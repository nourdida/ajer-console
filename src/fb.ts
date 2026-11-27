// طبقة البيانات: كل الكلام مع سيرفر Firebase بيعدي من هنا.
// Firestore فيه 5 مجموعات: users (بروفايلات), devices (الإعلانات), orders (الطلبات),
// chats (المحادثات ورسايلها), complaints (الشكاوى).
import { useEffect, useState } from 'react';
import {
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    type User,
} from 'firebase/auth';
import {
    collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export type CondDoc = { checks: boolean[]; photos: string[] };

export type ProfileDoc = {
    name: string; age: string; phone: string; avatar: string; address: string;
    photo?: string; idPhoto?: string; email?: string; createdAt?: number;
};

export type DeviceDoc = {
    id: string; kind: 'PS5' | 'PS4' | 'Xbox'; title: string;
    ownerId: string; ownerName: string;
    area: 'زايد' | 'أكتوبر'; district: string;
    pricePerDay: number; deposit: number; rating: number; reviews: number; delivery: boolean;
    model: string; storage: string; controllers: number; games: string[]; includes: string;
    photoKey?: string; photoData?: string;
    lat?: number; lng?: number;
    status: 'open' | 'rented'; createdAt: number;
};

export type OrderStatus = 'requested' | 'accepted' | 'taken' | 'pickedup' | 'arrived' | 'delivered' | 'returning' | 'returned' | 'declined';

export type OrderDoc = {
    id: string; deviceId?: string; listingNumber?: number; title: string;
    ownerId: string; ownerName: string; ownerPhone?: string;
    renterId: string; renterName: string; renterPhone?: string;
    pricePerDay: number; days: number; rent: number; deposit: number;
    fromMs?: number; deliveryFee?: number; promo?: string; discount?: number; payMethod?: string;
    status: OrderStatus; createdMs: number; deliveredAt?: number;
    courierId?: string; courierName?: string;
    handoverCheck?: CondDoc | null; returnCheck?: CondDoc | null;
};

export type ChatDoc = {
    id: string; kind: 'dm' | 'order';
    deviceId?: string; deviceTitle?: string; orderId?: string;
    ownerId?: string; ownerName?: string;
    renterId?: string; renterName?: string;
    courierId?: string; courierName?: string;
    lastText?: string; updatedAt: number;
};

export type MessageDoc = { id: string; from: string; fromName: string; text: string; ts: number };

export type ComplaintDoc = { id: string; uid: string; from: string; subject: string; detail: string; status: string; createdAt: number };

const ACTIVE_ORDER: OrderStatus[] = ['accepted', 'taken', 'pickedup', 'arrived', 'delivered', 'returning'];
export const ORDER_BUSY: OrderStatus[] = ['accepted', 'taken', 'pickedup', 'arrived', 'delivered', 'returning'];
export const ORDER_OPEN_FOR_RENTER: OrderStatus[] = ['requested', ...ACTIVE_ORDER];

// ---------- حسابات ----------

export function useAuthUser(): User | null | undefined {
    const [u, setU] = useState<User | null | undefined>(undefined);
    useEffect(() => onAuthStateChanged(auth, (x) => setU(x)), []);
    return u;
}

export async function fbSignUp(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email, password);
}

export async function fbSignIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
}

export async function fbSignOut() {
    await signOut(auth);
}

export function authErrorAr(e: any): string {
    const c = String(e && e.code || '');
    if (c.includes('email-already-in-use')) return 'الإيميل ده متسجل قبل كده. جرب تدخل بيه بدل ما تعمل حساب جديد.';
    if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'الإيميل أو الباسورد غلط. راجعهم وجرب تاني.';
    if (c.includes('weak-password')) return 'الباسورد ضعيف: لازم 6 حروف أو أرقام على الأقل.';
    if (c.includes('invalid-email')) return 'الإيميل ده مش صحيح. راجع كتابته.';
    if (c.includes('too-many-requests')) return 'محاولات كتيرة غلط. استنى دقيقة وجرب تاني.';
    if (c.includes('network')) return 'مفيش اتصال بالنت. اتأكد من النت وجرب تاني.';
    if (c.includes('operation-not-allowed')) return 'تسجيل الدخول بالإيميل لسه مش متفعل من لوحة Firebase.';
    return 'حصلت مشكلة في الاتصال بالسيرفر. جرب تاني.';
}

// ---------- بروفايل ----------

export function useProfile(uid: string | undefined): ProfileDoc | null | undefined {
    const [p, setP] = useState<ProfileDoc | null | undefined>(undefined);
    useEffect(() => {
        if (!uid) { setP(null); return; }
        setP(undefined);
        return onSnapshot(doc(db, 'users', uid),
            (s) => setP(s.exists() ? (s.data() as ProfileDoc) : null),
            (err) => { console.warn('profile', err); setP(null); });
    }, [uid]);
    return p;
}

export async function fbSaveProfile(uid: string, p: ProfileDoc) {
    await setDoc(doc(db, 'users', uid), { ...p, createdAt: p.createdAt || Date.now() });
}

// ---------- إعلانات الأجهزة ----------

export function useDevices(): DeviceDoc[] | undefined {
    const [list, setList] = useState<DeviceDoc[] | undefined>(undefined);
    useEffect(() => onSnapshot(query(collection(db, 'devices'), orderBy('createdAt', 'desc')),
        (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeviceDoc, 'id'>) }))),
        (err) => { console.warn('devices', err); setList([]); }), []);
    return list;
}

export async function fbAddDevice(d: Omit<DeviceDoc, 'id'>) {
    await addDoc(collection(db, 'devices'), d);
}

export async function fbUpdateDevice(id: string, patch: Partial<DeviceDoc>) {
    await updateDoc(doc(db, 'devices', id), patch as any);
}

export async function fbDeleteDevice(id: string) {
    await deleteDoc(doc(db, 'devices', id));
}

// ---------- الطلبات ----------

export function useOrders(): OrderDoc[] | undefined {
    const [list, setList] = useState<OrderDoc[] | undefined>(undefined);
    useEffect(() => onSnapshot(query(collection(db, 'orders'), orderBy('createdMs', 'desc')),
        (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderDoc, 'id'>) }))),
        (err) => { console.warn('orders', err); setList([]); }), []);
    return list;
}

export async function fbCreateOrder(o: Omit<OrderDoc, 'id'>) {
    await addDoc(collection(db, 'orders'), o);
}

export async function fbUpdateOrder(id: string, patch: Partial<OrderDoc>) {
    await updateDoc(doc(db, 'orders', id), patch as any);
}

export async function fbDeleteOrder(id: string) {
    await deleteDoc(doc(db, 'orders', id));
}

// ---------- المحادثات ----------

export function dmChannelId(deviceId: string, renterUid: string) { return `dm_${deviceId}_${renterUid}`; }
export function orderChannelId(orderId: string) { return `order_${orderId}`; }

export async function fbOpenChat(chat: ChatDoc) {
    await setDoc(doc(db, 'chats', chat.id), chat, { merge: true });
}

export function useMyChats(uid: string | undefined): ChatDoc[] | undefined {
    const [list, setList] = useState<ChatDoc[] | undefined>(undefined);
    useEffect(() => {
        if (!uid) { setList([]); return; }
        return onSnapshot(query(collection(db, 'chats'), orderBy('updatedAt', 'desc')),
            (s) => setList(s.docs
                .map((d) => ({ id: d.id, ...(d.data() as Omit<ChatDoc, 'id'>) }))
                .filter((c) => c.ownerId === uid || c.renterId === uid || c.courierId === uid)),
            (err) => { console.warn('chats', err); setList([]); });
    }, [uid]);
    return list;
}

export function useMessages(channelId: string | null | undefined): MessageDoc[] | undefined {
    const [list, setList] = useState<MessageDoc[] | undefined>(undefined);
    useEffect(() => {
        if (!channelId) { setList(undefined); return; }
        setList(undefined);
        return onSnapshot(query(collection(db, 'chats', channelId, 'messages'), orderBy('ts', 'asc')),
            (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageDoc, 'id'>) }))),
            (err) => { console.warn('messages', err); setList([]); });
    }, [channelId]);
    return list;
}

export async function fbSendMessage(channelId: string, from: string, fromName: string, text: string) {
    const ts = Date.now();
    await addDoc(collection(db, 'chats', channelId, 'messages'), { from, fromName, text, ts });
    await setDoc(doc(db, 'chats', channelId), { lastText: text, updatedAt: ts }, { merge: true });
}

// ---------- شكاوى وإدارة ----------

export function useComplaints(enabled: boolean): ComplaintDoc[] | undefined {
    const [list, setList] = useState<ComplaintDoc[] | undefined>(undefined);
    useEffect(() => {
        if (!enabled) { setList(undefined); return; }
        return onSnapshot(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')),
            (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ComplaintDoc, 'id'>) }))),
            (err) => { console.warn('complaints', err); setList([]); });
    }, [enabled]);
    return list;
}

export async function fbAddComplaint(c: Omit<ComplaintDoc, 'id'>) {
    await addDoc(collection(db, 'complaints'), c);
}

export async function fbCloseComplaint(id: string) {
    await updateDoc(doc(db, 'complaints', id), { status: 'مقفولة' });
}

export type AdminUserDoc = { id: string } & ProfileDoc;

export function useAllUsers(enabled: boolean): AdminUserDoc[] | undefined {
    const [list, setList] = useState<AdminUserDoc[] | undefined>(undefined);
    useEffect(() => {
        if (!enabled) { setList(undefined); return; }
        return onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')),
            (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as ProfileDoc) }))),
            (err) => { console.warn('users', err); setList([]); });
    }, [enabled]);
    return list;
}

export async function fbDeleteUser(id: string) {
    await deleteDoc(doc(db, 'users', id));
}
