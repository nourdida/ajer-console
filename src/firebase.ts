// إعدادات الاتصال بمشروع Firebase بتاع NEXUS.
// القيم دي مش سرية: دي عنوان المشروع بس، والأمان الحقيقي في قوانين Firestore (Rules).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyCe88mPhC6eM0ydU8umlhJi46fbnKyYWXM',
    authDomain: 'nexus-b2890.firebaseapp.com',
    projectId: 'nexus-b2890',
    storageBucket: 'nexus-b2890.firebasestorage.app',
    messagingSenderId: '161485603754',
    appId: '1:161485603754:web:f5aee375f17f33d041e1d3',
};

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export const db = getFirestore(fbApp);
