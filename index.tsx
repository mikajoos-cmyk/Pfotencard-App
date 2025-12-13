import React, { useState, FC, FormEvent, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

// Konfiguration aus .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase URL or Anon Key is missing in environment variables');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// --- TYPEN & INTERFACES ---
type UserRole = 'admin' | 'mitarbeiter' | 'customer';
type Page = 'dashboard' | 'customers' | 'reports' | 'users';
type View = { page: Page; customerId?: string, subPage?: 'detail' | 'transactions' };

interface User { id: string; name: string; email: string; role: UserRole; customerId?: string; createdAt: Date; }
interface Level { id: number; name: string; imageUrl: string; }
interface Customer {
    id: string; firstName: string; lastName: string; dogName: string; balance: number;
    levelId: number; createdBy: string; createdAt: Date; isVip?: boolean; isExpert?: boolean;
    levelUpHistory: { [key: number]: Date };
    email?: string;
    phone?: string;
    chip?: string;
}
interface Transaction {
    id: string; customerId: string; createdBy: string;
    type: 'topup' | 'bonus' | 'debit' | 'event';
    title: string; amount: number; createdAt: Date;
    meta?: { requirementId?: string; };
}
interface DocumentFile {
    id: string;
    customerId: string;
    file: File;
    name: string;
    type: string;
    size: number;
    url: string;
}


// --- HILFSFUNKTIONEN ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
console.log(API_BASE_URL);
// Neuer API-Helfer
const apiClient = {
    get: async (path: string, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);
        return response.json();
    },
    post: async (path: string, data: any, token: string | null) => {
        // HIER WAR DER FEHLER: Die Prüfung "if (!token)..." wurde entfernt.

        const headers: any = {
            'Content-Type': 'application/json',
        };

        // Nur wenn ein Token da ist, fügen wir ihn hinzu
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },
    put: async (path: string, data: any, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed: ${response.statusText}`);
        }
        return response.json();
    },
    setVipStatus: async (userId: string, isVip: boolean, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        return apiClient.put(`/api/users/${userId}/vip`, { is_vip: isVip }, token);
    },
    setExpertStatus: async (userId: string, isExpert: boolean, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        return apiClient.put(`/api/users/${userId}/expert`, { is_expert: isExpert }, token);
    },
    delete: async (path: string, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `API request failed`);
        }
        return response.json();
    },
    upload: async (path: string, file: File, token: string | null) => {
        if (!token) throw new Error("No auth token provided");
        const formData = new FormData();
        formData.append("upload_file", file); // Muss zum Backend-Parameter "upload_file" passen

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }, // KEIN Content-Type, Browser setzt ihn
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `File upload failed`);
        }
        return response.json();
    },
};

const getInitials = (firstName: string, lastName: string = '') => {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return `${first}${last}`.toUpperCase();
};

const getAvatarColorClass = (name: string) => {
    const colors = ['blue', 'purple', 'green', 'orange', 'red'];
    if (!name) return 'avatar-gray';
    const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorIndex = Math.abs(charCodeSum) % colors.length;
    return `avatar-${colors[colorIndex]}`;
};

// --- MOCK DATEN ---
const VIP_LEVEL: Level = { id: 99, name: 'VIP-Kunde', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/VIP.png' };
const EXPERT_LEVEL: Level = { id: 100, name: 'Experte', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/09/DZKB-Experte.png' };

const LEVELS: Level[] = [
    { id: 1, name: 'Welpen', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L1.png' },
    { id: 2, name: 'Grundlagen', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L2.png' },
    { id: 3, name: 'Fortgeschrittene', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L3.png' },
    { id: 4, name: 'Masterclass', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L4.png' },
    { id: 5, name: 'Hundeführerschein', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/L5.png' },
];

let CUSTOMERS: Customer[] = [
    { id: 'cust-anna', firstName: 'Anna-Maria', lastName: 'Schoss', dogName: 'Banu', balance: 229.00, levelId: 1, createdBy: 'user-admin-1', createdAt: new Date('2025-02-09'), isVip: false, isExpert: false, levelUpHistory: {}, email: 'anna.schoss@email.de', phone: '+49 123 456789', chip: '987000012345678' },
    { id: 'cust-1', firstName: 'Jörg', lastName: 'Jäger', dogName: 'Hasso', balance: 10.00, levelId: 1, createdBy: 'user-staff-2', createdAt: new Date('2023-11-20'), isVip: false, isExpert: false, levelUpHistory: {} },
    { id: 'cust-2', firstName: 'Sabine', lastName: 'Sonne', dogName: 'Luna', balance: 25.00, levelId: 1, createdBy: 'user-staff-1', createdAt: new Date('2023-12-01'), isVip: false, isExpert: false, levelUpHistory: {} },
    { id: 'cust-3', firstName: 'Tom', lastName: 'Test', dogName: 'Rocky', balance: 300.00, levelId: 1, createdBy: 'user-staff-2', createdAt: new Date('2024-01-10'), isVip: false, isExpert: false, levelUpHistory: {}, email: 'tom@mail.de' },
];

const INITIAL_USERS: User[] = [
    { id: 'user-admin-1', name: 'Christian Christian', email: 'christian@dogslife.de', role: 'admin', createdAt: new Date('2025-08-12') },
    { id: 'user-staff-1', name: 'Sophie Sophie', email: 'sophie@dogslife.de', role: 'mitarbeiter', createdAt: new Date('2025-08-12') },
    { id: 'user-staff-2', name: 'Sandra Sandra', email: 'sandra@dogslife.de', role: 'mitarbeiter', createdAt: new Date('2025-08-12') },
    { id: 'user-staff-3', name: 'Susi Susi', email: 'susi@dogslife.de', role: 'mitarbeiter', createdAt: new Date('2025-08-12') },
    { id: 'user-staff-4', name: 'Petra Petra', email: 'petra@dogslife.de', role: 'mitarbeiter', createdAt: new Date('2025-08-12') },
    { id: 'user-customer-1', name: 'Anna-Maria Schoss', email: 'anna.schoss@email.de', role: 'customer', customerId: 'cust-anna', createdAt: new Date('2025-02-09') },
    { id: 'user-customer-2', name: 'Tom Test', email: 'tom@mail.de', role: 'customer', customerId: 'cust-3', createdAt: new Date('2024-01-10') },
];


let TRANSACTIONS: Transaction[] = [
    { id: 'tx-anna-1', customerId: 'cust-anna', createdBy: 'user-admin-1', type: 'topup', title: 'Aufladung 100€', amount: 100, createdAt: new Date('2025-02-09') },
    { id: 'tx-anna-2', customerId: 'cust-anna', createdBy: 'user-admin-1', type: 'bonus', title: 'Bonus', amount: 20, createdAt: new Date('2025-02-09') },
    { id: 'tx-anna-3', customerId: 'cust-anna', createdBy: 'user-admin-1', type: 'topup', title: 'Aufladung 150€', amount: 150, createdAt: new Date('2025-02-20') },
    { id: 'tx-anna-4', customerId: 'cust-anna', createdBy: 'user-admin-1', type: 'bonus', title: 'Bonus', amount: 35, createdAt: new Date('2025-02-20') },
    { id: 'tx-1', customerId: 'cust-1', createdBy: 'user-staff-2', type: 'topup', title: 'Aufladung', amount: 100, createdAt: new Date() },
    { id: 'tx-2', customerId: 'cust-1', createdBy: 'user-staff-1', type: 'debit', title: 'Gruppenstunde', amount: -12, createdAt: new Date() },
    { id: 'tx-3', customerId: 'cust-2', createdBy: 'user-staff-1', type: 'topup', title: 'Aufladung', amount: 25, createdAt: new Date('2023-12-01') },
];

// --- LOGIK & KONSTANTEN ---
const LEVEL_REQUIREMENTS: { [key: number]: { id: string; name: string; required: number }[] } = {
    //   1: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    2: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    3: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    4: [{ id: 'social_walk', name: 'Social Walk', required: 6 }, { id: 'tavern_training', name: 'Wirtshaustraining', required: 2 }, { id: 'exam', name: 'Prüfung', required: 1 }],
    5: [{ id: 'exam', name: 'Prüfung', required: 1 }],
};
// In frontend/index.tsx

const DOGLICENSE_PREREQS = [
    { id: 'lecture_bonding', name: 'Vortrag Bindung & Beziehung', required: 1 },
    { id: 'lecture_hunting', name: 'Vortrag Jagdverhalten', required: 1 },
    { id: 'ws_communication', name: 'WS Kommunikation & Körpersprache', required: 1 },
    { id: 'ws_stress', name: 'WS Stress & Impulskontrolle', required: 1 },
    { id: 'theory_license', name: 'Theorieabend Hundeführerschein', required: 1 },
    { id: 'first_aid', name: 'Erste-Hilfe-Kurs', required: 1 },
];

// In frontend/index.tsx (ersetzt die bisherigen Level-Funktionen)

const getPrereqProgress = (customer: any, untilDate?: Date) => {
    const progress: { [key: string]: number } = {};
    const prereqIds = new Set(DOGLICENSE_PREREQS.map(p => p.id));
    let achievementsToConsider = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    // Filtere Achievements bis zu einem bestimmten Datum, wenn angegeben
    if (untilDate) {
        achievementsToConsider = achievementsToConsider.filter((ach: any) => new Date(ach.date_achieved) <= untilDate);
    }

    achievementsToConsider.forEach((ach: any) => {
        if (prereqIds.has(ach.requirement_id)) {
            progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
        }
    });
    return progress;
};

// In frontend/index.tsx

const getProgressForLevel = (customer: any, levelId: number) => {
    const progress: { [key: string]: number } = {};
    // Wähle die richtigen Anforderungen: normale Level oder die Zusatzveranstaltungen für Level 5
    const requirements = levelId === 5 ? DOGLICENSE_PREREQS : (LEVEL_REQUIREMENTS[levelId] || []);
    if (requirements.length === 0) return progress;

    const unconsumedAchievements = (customer.achievements || []).filter((ach: any) => !ach.is_consumed);

    unconsumedAchievements.forEach((ach: any) => {
        progress[ach.requirement_id] = (progress[ach.requirement_id] || 0) + 1;
    });

    return progress;
};

const areLevelRequirementsMet = (customer: any): boolean => {
    const currentLevelId = customer.level_id || 1;

    // Fall 1: Kunde ist in Level 5 (Hundeführerschein)
    // Wir prüfen, ob er die Prüfung UND alle Zusatzveranstaltungen hat.
    if (currentLevelId === 5) {
        const examReqs = LEVEL_REQUIREMENTS[5];
        const examProgress = getProgressForLevel(customer, 5); // Prüft nur 'exam'
        const prereqProgress = getProgressForLevel(customer, 5); // Prüft die Zusatzveranstaltungen

        const examMet = examReqs.every(req => (examProgress[req.id] || 0) >= req.required);
        const prereqsMet = DOGLICENSE_PREREQS.every(req => (prereqProgress[req.id] || 0) >= req.required);

        return examMet && prereqsMet;
    }

    // Fall 2: Kunde ist in Level 1-4
    // Wir prüfen die Anforderungen des aktuellen Levels, um zu sehen, ob er aufsteigen kann.
    const requirements = LEVEL_REQUIREMENTS[currentLevelId];
    if (!requirements) return true; // Level 1 hat keine Anforderungen zum Abschluss

    const progress = getProgressForLevel(customer, currentLevelId);

    // Prüfen, ob alle Voraussetzungen für eine Prüfung in diesem Level erfüllt sind
    const examRequirement = requirements.find(r => r.id === 'exam');
    if (examRequirement) {
        const otherRequirements = requirements.filter(r => r.id !== 'exam');
        const nonExamReqsMet = otherRequirements.every(req => (progress[req.id] || 0) >= req.required);
        // Wenn die normalen Anforderungen UND die Prüfung erfüllt sind
        return nonExamReqsMet && (progress['exam'] || 0) >= examRequirement.required;
    }

    // Wenn es keine Prüfung gibt, einfach alle Anforderungen prüfen
    return requirements.every(req => (progress[req.id] || 0) >= req.required);
};


// --- ICONS ---
const Icon = ({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) => {
    const icons: { [key: string]: { path: React.ReactNode; customProps?: any } } = {
        dashboard: { path: <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></> },
        customers: { path: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
        reports: { path: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" /></> },
        users: { path: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
        user: { path: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
        mail: { path: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></> },
        phone: { path: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></> },
        calendar: { path: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></> },
        logout: { path: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></> },
        arrowLeft: { path: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></> },
        arrowRight: { path: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></> },
        arrowDown: { path: <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></> },
        check: { path: <><path d="M20 6 9 17l-5-5" /></> },
        x: { path: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> },
        // KORRIGIERTES PAW-ICON
        paw: {
            path: <path d="M12 5.6a3.2 3.2 0 0 0-3.2 3.2c0 2.4 2.2 4.9 2.9 5.5.1.1.3.1.4 0 .7-.6 2.9-3.1 2.9-5.5A3.2 3.2 0 0 0 12 5.6Z M4.7 9.8a2.1 2.1 0 0 0-2.1 2.1c0 1.6 1.5 3.2 1.9 3.6.1.1.3.1.4 0 .4-.4 1.9-2 1.9-3.6a2.1 2.1 0 0 0-2.1-2.1Z M19.3 9.8a2.1 2.1 0 0 0-2.1 2.1c0 1.6 1.5 3.2 1.9 3.6.1.1.3.1.4 0 .4-.4 1.9-2 1.9-3.6a2.1 2.1 0 0 0-2.1-2.1Z M8.3 4.2a2.3 2.3 0 0 0-2.3 2.3c0 1.7 1.6 3.5 2.1 4 .1.1.3.1.4 0 .5-.5 2.1-2.3 2.1-4a2.3 2.3 0 0 0-2.3-2.3Z M15.7 4.2a2.3 2.3 0 0 0-2.3 2.3c0 1.7 1.6 3.5 2.1 4 .1.1.3.1.4 0 .5-.5 2.1-2.3 2.1-4a2.3 2.3 0 0 0-2.3-2.3Z" />,
            customProps: { fill: "currentColor", stroke: "none" }
        },
        creditCard: { path: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></> },
        heart: { path: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></> },
        trendingUp: { path: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></> },
        edit: { path: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></> },
        trash: { path: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></> },
        file: { path: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></> },
        share: { path: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" x2="12" y1="2" y2="15" /></> },
        upload: { path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></> },
        download: { path: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></> },
        printer: { path: <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></> },
        wifi: { path: <><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" x2="12.01" y1="20" y2="20" /></> },
        refresh: { path: <><path d="M21.5 2v6h-6" /><path d="M2.5 22v-6h6" /><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2" /></> },
        menu: { path: <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></> },
        eye: { path: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></> },
        'eye-off': { path: <><path d="m9.9 9.9 4.2 4.2" /><path d="M10.7 15.3a7 7 0 0 1-8.1-8.1l9.8 9.8" /><path d="M7.5 4.2C9.2 3.3 11.2 3 13 3s3.8.3 5.5 1.2l-2.2 2.2" /><path d="M19.8 17.8a14 14 0 0 1-11.2-4.3l1.5-1.5" /><path d="m2.2 2.2 20 20" /></> },
    };

    const selectedIcon = icons[name];
    if (!selectedIcon) return null;

    const defaultProps = {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
    };

    const finalProps = { ...defaultProps, ...props, ...selectedIcon.customProps };

    const customClassName = props.className || '';

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"  // DIESE ZEILE WIEDER HINZUFÜGEN
            height="24" // DIESE ZEILE WIEDER HINZUFÜGEN
            className={`icon icon-${name} ${customClassName}`.trim()}
            {...finalProps}
        >
            {selectedIcon.path}
        </svg>
    );
};

// --- NEUE LADE-KOMPONENTE ---
const LoadingSpinner: FC<{ message: string }> = ({ message }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        zIndex: 9999,
    }}>
        <svg width="60" height="60" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#16a34a">
            <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" />
            <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.75s" repeatCount="indefinite" />
            </path>
        </svg>
        <p style={{ marginTop: '1rem', fontSize: '1.1rem', fontWeight: 500, color: '#334155' }}>{message}</p>
    </div>
);

// --- AUTH KOMPONENTE ---
// In frontend/index.tsx in der AuthScreen Komponente

// --- AUTH KOMPONENTE ---
const AuthScreen: FC<{
    onLoginStart: () => void;
    onLoginEnd: () => void;
    onLoginSuccess: (token: string, user: any) => void;
}> = ({ onLoginStart, onLoginEnd, onLoginSuccess }) => {
    // State erweitert um 'verify'
    const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [dogName, setDogName] = useState('');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // --- LOGIN ---
    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        onLoginStart();

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            const token = data.session.access_token;
            const userResponse = await apiClient.get('/api/users/me', token);

            onLoginSuccess(token, userResponse);

        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: 'Login fehlgeschlagen: ' + err.message });
        } finally {
            onLoginEnd();
        }
    };

    // --- REGISTRIERUNG ---
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        onLoginStart();

        try {
            // 1. Supabase Auth Registrierung (Löst E-Mail-Versand aus!)
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });

            if (authError) throw authError;

            // Schutz: Wenn keine User-ID zurückkommt, brechen wir ab (verhindert "User in DB aber nicht Auth")
            if (!authData.user) {
                throw new Error("Fehler bei der Authentifizierung. Bitte versuchen Sie es erneut.");
            }

            // 2. Profil im Backend anlegen (Nur wenn Schritt 1 erfolgreich war)
            await apiClient.post('/api/register', {
                name: name,
                email: email,
                password: password, // Wird für die DB als Hash gespeichert
                role: "kunde",
                dogs: [{ name: dogName }]
            }, null);

            // 3. Erfolgsfall
            if (authData.session) {
                // Falls Auto-Confirm an ist (passiert selten bei E-Mail-Zwang)
                onLoginSuccess(authData.session.access_token, await apiClient.get('/api/users/me', authData.session.access_token));
            } else {
                // Standardfall: E-Mail muss bestätigt werden
                setMessage({ type: 'success', text: 'Konto erstellt! Bitte bestätigen Sie Ihre E-Mail.' });
                setView('verify');
            }

        } catch (err: any) {
            console.error(err);
            // Falls der User in Supabase schon existiert (Fehler 400/422), geben wir das aus
            setMessage({ type: 'error', text: 'Registrierung fehlgeschlagen: ' + (err.message || 'Unbekannter Fehler') });
        } finally {
            onLoginEnd();
        }
    };
    // --- PASSWORT VERGESSEN ---
    const handleForgot = async (e: FormEvent) => {
        e.preventDefault();
        setMessage(null);
        onLoginStart();

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Link zum Zurücksetzen wurde gesendet!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            onLoginEnd();
        }
    };

    // --- E-MAIL ERNEUT SENDEN ---
    const handleResendMail = async () => {
        setMessage(null);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'E-Mail wurde erneut gesendet!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <img src="/paw.png" alt="PfotenCard Logo" style={{ width: '100px', height: '100px', margin: '0 auto 1rem', display: 'block' }} />
                <h1>PfotenCard</h1>
                <p className="subtitle">
                    {view === 'login' && 'Anmelden'}
                    {view === 'register' && 'Neues Konto erstellen'}
                    {view === 'forgot' && 'Passwort zurücksetzen'}
                    {view === 'verify' && 'E-Mail Bestätigung'}
                </p>

                {message && (
                    <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        backgroundColor: message.type === 'error' ? '#fee2e2' : '#dcfce7',
                        color: message.type === 'error' ? '#991b1b' : '#166534',
                        textAlign: 'center'
                    }}>
                        {message.text}
                    </div>
                )}

                {view === 'verify' ? (
                    /* --- VERIFY SCREEN --- */
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ margin: '2rem 0', color: 'var(--brand-green)', display: 'flex', justifyContent: 'center' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                            Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet.
                            Bitte klicken Sie auf den Link in der E-Mail, um Ihr Konto zu aktivieren.
                        </p>
                        <button type="button" onClick={handleResendMail} className="button button-outline" style={{ width: '100%', marginBottom: '1rem' }}>
                            E-Mail erneut senden
                        </button>
                        <button type="button" onClick={() => setView('login')} className="button button-primary" style={{ width: '100%' }}>
                            Zum Login
                        </button>
                    </div>
                ) : (
                    /* --- FORMULAR FÜR LOGIN / REGISTER / FORGOT --- */
                    <form onSubmit={view === 'login' ? handleLogin : (view === 'register' ? handleRegister : handleForgot)}>

                        {view === 'register' && (
                            <>
                                <div className="form-group"><label>Ihr Name</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required /></div>
                                <div className="form-group"><label>Hundename</label><input type="text" className="form-input" value={dogName} onChange={e => setDogName(e.target.value)} required /></div>
                            </>
                        )}

                        <div className="form-group">
                            <label>E-Mail</label>
                            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        {view !== 'forgot' && (
                            <div className="form-group">
                                <label>Passwort</label>
                                <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                        )}

                        <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '1rem' }}>
                            {view === 'login' ? 'Anmelden' : (view === 'register' ? 'Registrieren' : 'Link senden')}
                        </button>
                    </form>
                )}

                {/* --- NAVIGATION LINKS (nur wenn nicht im Verify-Modus) --- */}
                {view !== 'verify' && (
                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        {view === 'login' && (
                            <>
                                <button className="button-as-link" onClick={() => setView('forgot')}>Passwort vergessen?</button>
                                <button className="button-as-link" onClick={() => setView('register')}>Noch kein Konto? Jetzt registrieren</button>
                            </>
                        )}
                        {view !== 'login' && (
                            <button className="button-as-link" onClick={() => setView('login')}>Zurück zum Login</button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LAYOUT & UI KOMPONENTEN ---
const OnlineStatusIndicator: FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastSyncText, setLastSyncText] = useState('nie');

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastSyncText('Gerade eben');
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (isOnline) {
            setLastSyncText('Gerade eben');
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOnline]);

    return (
        <div className="status-indicator">
            <div className={`status-item online-status ${isOnline ? 'online' : 'offline'}`}>
                <Icon name="wifi" />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {isOnline && (
                <div className="status-item sync-status">
                    <Icon name="refresh" />
                    <span>Sync: {lastSyncText}</span>
                </div>
            )}
        </div>
    );
};


const Sidebar: FC<{ user: User; activePage: Page; setView: (view: View) => void; onLogout: () => void; setSidebarOpen: (isOpen: boolean) => void; }> = ({ user, activePage, setView, onLogout, setSidebarOpen }) => {
    const navItems = [
        { id: 'dashboard', label: 'Übersicht', icon: 'dashboard', roles: ['admin', 'mitarbeiter'] },
        { id: 'customers', label: 'Kunden', icon: 'customers', roles: ['admin', 'mitarbeiter'] },
        { id: 'reports', label: 'Berichte', icon: 'reports', roles: ['admin', 'mitarbeiter'] },
        { id: 'users', label: 'Benutzer', icon: 'users', roles: ['admin'] },
    ];

    const handleNavClick = (view: View) => {
        setView(view);
        if (window.innerWidth <= 992) {
            setSidebarOpen(false);
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src="/paw.png" alt="PfotenCard Logo" className="logo" width="40" height="40" />
                <h2>PfotenCard</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatusIndicator />
            <nav className="sidebar-nav">
                {navItems.filter(item => item.roles.includes(user.role)).map(item => (
                    <a key={item.id} href="#" className={`nav-link ${activePage === item.id ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); handleNavClick({ page: item.id as Page }); }}>
                        <Icon name={item.icon} />
                        <span>{item.label}</span>
                    </a>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="user-profile-container">
                    <div className="user-profile">
                        <div className={`initials-avatar small ${getAvatarColorClass(user.name)}`}>
                            {getInitials(user.name.split(' ')[0], user.name.split(' ')[1])}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">{user.role}</span>
                        </div>
                    </div>
                </div>
                <button className="logout-button" onClick={onLogout} aria-label="Abmelden">
                    <Icon name="logout" />
                    <span>Abmelden</span>
                </button>
            </div>
        </aside>
    );
};


const CustomerSidebar: FC<{
    user: User;
    onLogout: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
    activePage: 'overview' | 'transactions'; // NEU
    setPage: (page: 'overview' | 'transactions') => void; // NEU
}> = ({ user, onLogout, setSidebarOpen, activePage, setPage }) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src="/paw.png" alt="PfotenCard Logo" className="logo" width="40" height="40" />
                <h2>PfotenCard</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatusIndicator />
            <nav className="sidebar-nav">
                {/* Link zur Haupt-Übersicht */}
                <a href="#" className={`nav-link ${activePage === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setPage('overview'); }}>
                    <Icon name="user" />
                    <span>Meine Karte</span>
                </a>
                {/* NEUER Link zur Transaktionsseite */}
                <a href="#" className={`nav-link ${activePage === 'transactions' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setPage('transactions'); }}>
                    <Icon name="creditCard" />
                    <span>Meine Transaktionen</span>
                </a>
            </nav>
            <div className="sidebar-footer">
                <div className="user-profile-container">
                    <div className="user-profile">
                        <div className={`initials-avatar small ${getAvatarColorClass(user.name)}`}>
                            {getInitials(user.name.split(' ')[0], user.name.split(' ')[1] || '')}
                        </div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role">Kunde</span>
                        </div>
                    </div>
                </div>
                <button className="logout-button" onClick={onLogout} aria-label="Abmelden">
                    <Icon name="logout" />
                    <span>Abmelden</span>
                </button>
            </div>
        </aside>
    );
};


interface KpiCardProps { title: string; value: string; icon: string; bgIcon: string; color: 'green' | 'orange' | 'blue' | 'purple'; onClick?: () => void; }
const KpiCard: FC<KpiCardProps> = ({ title, value, icon, bgIcon, color, onClick }) => {
    const cardContent = (
        <article className={`kpi-card ${color}`}>
            <div className={`icon-bg ${color}`}><Icon name={icon} /></div>
            <div className="text">
                <h3>{title}</h3>
                <p className="value">{value}</p>
            </div>
        </article>
    );

    return onClick ? <button onClick={onClick} className="kpi-card-button">{cardContent}</button> : cardContent;
};

const AddCustomerModal: FC<{ onClose: () => void, onAddCustomer: (newCustomer: Omit<Customer, 'id' | 'createdBy' | 'createdAt' | 'levelId' | 'balance' | 'levelUpHistory'>) => void }> = ({ onClose, onAddCustomer }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dogName, setDogName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dogBreed, setDogBreed] = useState('');
    const [dogBirthDate, setDogBirthDate] = useState('');
    const [chip, setChip] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !dogName) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }
        // Übergibt jetzt alle gesammelten Daten
        onAddCustomer({
            firstName,
            lastName,
            email,
            phone,
            dogName,
            dogBreed,
            dogBirthDate,
            chip
        });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content add-customer-modal">
                <div className="modal-header green">
                    <h2>Neuen Kunden anlegen</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <h4>Kundendaten</h4>
                        <div className="form-grid">
                            <div className="form-group"><label>Vorname*</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                            <div className="form-group"><label>Nachname*</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
                            <div className="form-group"><label>E-Mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                            <div className="form-group"><label>Telefon</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                        </div>
                        <h4 style={{ marginTop: '1.5rem' }}>Hundedaten</h4>
                        <div className="form-grid">
                            <div className="form-group"><label>Hundename*</label><input type="text" value={dogName} onChange={e => setDogName(e.target.value)} required /></div>
                            {/* NEU: Input-Felder für Rasse und Geburtsdatum */}
                            <div className="form-group"><label>Rasse</label><input type="text" value={dogBreed} onChange={e => setDogBreed(e.target.value)} /></div>
                            <div className="form-group"><label>Geburtsdatum</label><input type="date" value={dogBirthDate} onChange={e => setDogBirthDate(e.target.value)} /></div>
                            <div className="form-group"><label>Chipnummer</label><input type="text" value={chip} onChange={e => setChip(e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                        <button type="submit" className="button button-primary">Kunde anlegen</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const DocumentViewerModal: FC<{ document: DocumentFile; onClose: () => void; }> = ({ document, onClose }) => {
    const isImage = document.type.startsWith('image/');
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content document-viewer-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{document.name}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    {isImage ? (
                        <img src={document.url} alt={document.name} className="preview" />
                    ) : (
                        <p>Vorschau für diesen Dateityp nicht verfügbar.</p>
                    )}
                </div>
                <div className="modal-footer">
                    <button type="button" className="button button-outline" onClick={onClose}>Schließen</button>
                    <a href={document.url} download={document.name} className="button button-primary">
                        Herunterladen
                    </a>
                </div>
            </div>
        </div>
    );
};


// --- SEITEN-KOMPONENTEN ---
const DashboardPage: FC<{
    customers: any[],
    transactions: any[],
    currentUser: any,
    onKpiClick: (type: string, color: string) => void,
    setView: (view: View) => void,
}> = ({ customers, transactions, currentUser, onKpiClick, setView }) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersThisMonth = useMemo(() => {
        const activeIds = new Set(transactions.filter(t => new Date(t.date) >= startOfMonth).map(t => t.user_id));
        return customers.filter(c => activeIds.has(c.id));
    }, [customers, transactions, startOfMonth]);

    // KORREKTUR: createdAt -> date
    const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const today = new Date().toDateString();
    // KORREKTUR: createdAt -> date (hier war der Absturz)
    const transactionsToday = transactions.filter(t => t.date && new Date(t.date).toDateString() === today).length;
    const transactionsMonth = transactions.filter(t => t.date && new Date(t.date) >= startOfMonth).length;

    return (
        <>
            <header className="page-header">
                <h1>Willkommen, {currentUser.name}!</h1>
                <p>Übersicht Ihrer Hundeschul-Wertkarten</p>
            </header>
            <div className="kpi-grid">
                <KpiCard title="Kunden gesamt" value={customers.length.toString()} icon="customers" bgIcon="customers" color="green" onClick={() => onKpiClick('allCustomers', 'green')} />
                <KpiCard title="Guthaben gesamt" value={`€ ${Math.floor(totalCredit).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="orange" onClick={() => onKpiClick('customersWithBalance', 'orange')} />
                <KpiCard title="Transaktionen Heute" value={transactionsToday.toString()} icon="creditCard" bgIcon="creditCard" color="blue" onClick={() => onKpiClick('transactionsToday', 'blue')} />
                <KpiCard title="Transaktionen Monat" value={transactionsMonth.toString()} icon="trendingUp" bgIcon="trendingUp" color="purple" onClick={() => onKpiClick('transactionsMonth', 'purple')} />
            </div>
            <div className="dashboard-bottom-grid">
                <div className="content-box">
                    <h2>Aktuelle Kunden</h2>
                    <ul className="active-customer-list">
                        {activeCustomersThisMonth.slice(0, 4).map(cust => {
                            // NEU: Den Namen hier genauso aufteilen
                            const nameParts = cust.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');


                            return (
                                <li key={cust.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: cust.id })} className="clickable">
                                    {/* KORREKTUR: Die neuen Namensvariablen verwenden */}
                                    <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                        {getInitials(firstName, lastName)}
                                    </div>
                                    <div className="info">
                                        {/* KORREKTUR: Die neuen Namensvariablen verwenden */}
                                        <div className="customer-name">{firstName} {lastName}</div>
                                        {/* KORREKTUR: Den ersten Hund aus der Liste anzeigen */}
                                        <div className="dog-name">{cust.dogs[0]?.name || '-'}</div>
                                    </div>
                                    <div className="balance">{Math.floor(cust.balance).toLocaleString('de-DE')} €</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="content-box">
                    <h2>Letzte Transaktionen</h2>
                    <ul className="transaction-list">
                        {recentTransactions.map(tx => {
                            const customer = customers.find(c => c.id === tx.user_id);
                            return (
                                <li key={tx.id}>
                                    <div className={`icon ${tx.amount < 0 ? 'down' : 'up'}`}><Icon name="arrowDown" /></div>
                                    <div className="info">
                                        <div className="customer">{customer?.name}</div>
                                        {/* KORREKTUR: createdAt -> date */}
                                        <div className="details">{new Date(tx.date).toLocaleDateString('de-DE')} - {tx.description}</div>
                                    </div>
                                    <div className="amount">{Math.floor(tx.amount).toLocaleString('de-DE')} €</div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </>
    );
};

const KundenPage: FC<{
    customers: Customer[],
    transactions: Transaction[],
    setView: (view: View) => void,
    onKpiClick: (type: string, color: string) => void,
    onAddCustomerClick: () => void,
    currentUser: any; /* <-- DIESE ZEILE WURDE HINZUGEFÜGT */
}> = ({ customers, transactions, setView, onKpiClick, onAddCustomerClick, currentUser }) => {
    const [filterLetter, setFilterLetter] = useState('Alle');

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersCount = useMemo(() => new Set(transactions.filter(tx => new Date(tx.date) >= startOfMonth).map(tx => tx.user_id)).size, [transactions, startOfMonth]);
    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const transactionsMonthCount = transactions.filter(tx => new Date(tx.date) >= startOfMonth).length;

    const filteredCustomers = useMemo(() => {
        if (filterLetter === 'Alle') return customers;

        // ERSETZE die alte return-Zeile durch diese Logik:
        return customers.filter(c => {
            if (!c.name) return false; // Sicherheitsabfrage, falls ein Name fehlt
            const nameParts = c.name.split(' ');
            const lastName = nameParts[nameParts.length - 1]; // Nimm den letzten Teil des Namens als Nachnamen
            return lastName.toUpperCase().startsWith(filterLetter);
        });
    }, [customers, filterLetter]);

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Kundenverwaltung</h1>
                    <p>Verwalten Sie alle Ihre Kunden an einem Ort</p>
                </div>
                {/* <div className="header-actions">
    {currentUser.role === 'admin' && (
        <button className="button button-primary" onClick={onAddCustomerClick}>+ Neuer Kunde</button>
    )}
</div> */}
            </header>
            <div className="kpi-grid">
                <KpiCard title="Kunden Gesamt" value={customers.length.toString()} icon="customers" bgIcon="customers" color="green" onClick={() => onKpiClick('allCustomers', 'green')} />
                <KpiCard title="Aktiv" value={activeCustomersCount.toString()} icon="heart" bgIcon="heart" color="orange" onClick={() => onKpiClick('activeCustomersMonth', 'orange')} />
                <KpiCard title="Guthaben" value={`€ ${Math.floor(totalCredit).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="blue" onClick={() => onKpiClick('customersWithBalance', 'blue')} />
                <KpiCard title="Transaktionen Monat" value={transactionsMonthCount.toString()} icon="trendingUp" bgIcon="trendingUp" color="purple" onClick={() => onKpiClick('transactionsMonth', 'purple')} />
            </div>
            <div className="filter-bar">
                {'Alle,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z'.split(',').map(letter => (
                    <button key={letter} className={filterLetter === letter ? 'active' : ''} onClick={() => setFilterLetter(letter)}>{letter}</button>
                ))}
            </div>
            <div className="content-box customer-list">
                <h2>Kundenliste ({filteredCustomers.length})</h2>
                <table>
                    <thead>
                        <tr><th>Kunde</th><th>Hund</th><th>Guthaben</th><th>Level</th><th>Erstellt</th><th></th></tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map(customer => {
                            const level = LEVELS.find(l => l.id === customer.level_id);

                            // NEU: Teile den Namen aus dem Backend hier auf
                            const nameParts = customer.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');

                            return (
                                <tr key={customer.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: customer.id })}>
                                    <td data-label="Kunde">
                                        <div className="customer-info">
                                            {/* KORREKTUR: Verwende die neuen Namensvariablen */}
                                            <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                                {getInitials(firstName, lastName)}
                                            </div>
                                            <div>
                                                {/* KORREKTUR: Zeige die neuen Namensvariablen an */}
                                                <div className="name">{firstName} {lastName}</div>
                                                <div className="id">ID: {customer.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* ... der Rest der Tabellenzeile bleibt gleich ... */}
                                    <td data-label="Hund">{customer.dogs[0]?.name || '-'}</td>
                                    <td data-label="Guthaben">€ {Math.floor(customer.balance).toLocaleString('de-DE')}</td>
                                    <td data-label="Level"><span className="level-badge">{level?.name}</span></td>
                                    <td data-label="Erstellt">{new Date(customer.customer_since).toLocaleDateString('de-DE')}</td>
                                    <td data-label="Aktion">&gt;</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const CustomerDetailPage: FC<{
    customer: any;
    transactions: any[];
    setView: (view: View) => void;
    handleLevelUp: (customerId: string, newLevelId: number) => void;
    onSave: (user: any, dog: any) => Promise<void>;
    currentUser: any;
    users: any[];
    onUploadDocuments: (files: FileList, customerId: string) => void;
    onDeleteDocument: (document: any) => void;
    fetchAppData: () => Promise<void>;
    authToken: string | null;
    onDeleteUserClick: (user: any) => void;
    onToggleVipStatus: (customer: any) => void;
    onToggleExpertStatus: (customer: any) => void;
    onUpdateStatus: (userId: string, statusType: 'vip' | 'expert', value: boolean) => void;
    setDogFormModal: (modalState: { isOpen: boolean; dog: any | null }) => void;
    setDeletingDog: (dog: any | null) => void;
}> = ({ customer, transactions, setView, handleLevelUp, onSave, currentUser, users, documents, onUploadDocuments, onDeleteDocument, fetchAppData, onDeleteUserClick, onUpdateStatus, onToggleVipStatus, onToggleExpertStatus, setDogFormModal, setDeletingDog }) => {

    // === DATENAUFBEREITUNG ===
    const nameParts = customer.name ? customer.name.split(' ') : [''];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const dog = customer.dogs && customer.dogs.length > 0 ? customer.dogs[0] : null;
    const dogName = dog?.name || '-';

    // === STATE DEFINITIONEN ===
    const [isEditing, setIsEditing] = useState(false);
    // KORREKTUR: Die fehlende State-Definition für das Bearbeiten-Formular
    const [editedData, setEditedData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dogName: '',
        chip: '',
        breed: '',
        birth_date: ''
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<DocumentFile | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [canShare, setCanShare] = useState(false);

    useEffect(() => {
        if (navigator.share) {
            setCanShare(true);
        }
    }, []);

    // === HANDLER FUNKTIONEN ===
    const handleStartEditing = () => {
        // DEBUG: Zeigt uns die Daten, mit denen die Funktion arbeitet
        console.log("Daten für Bearbeitungsformular:", {
            firstName: firstName,
            lastName: lastName,
            email: customer.email || '',
            phone: customer.phone || '',
            dogName: dog?.name || '',
            chip: dog?.chip || '',
            breed: dog?.breed || '',
            birth_date: dog?.birth_date || ''
        });

        setEditedData({
            firstName: firstName,
            lastName: lastName,
            email: customer.email || '',
            phone: customer.phone || '',
            dogName: dog?.name || '',
            chip: dog?.chip || '',
            breed: dog?.breed || '',
            birth_date: dog?.birth_date || ''
        });
        setIsEditing(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEditedData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCancelEdit = () => setIsEditing(false);

    // Innerhalb von CustomerDetailPage in index.tsx

    const handleSave = () => {
        // 1. User-Daten vorbereiten
        const userPayload = {
            ...customer,
            name: `${editedData.firstName} ${editedData.lastName}`.trim(),
            email: editedData.email,
            phone: editedData.phone
        };

        // 2. Hunde-Daten vorbereiten
        let dogPayload = null;

        // Prüfen, ob überhaupt ein Hundename eingegeben wurde
        if (editedData.dogName) {
            if (dog) {
                // Fall A: Hund existiert bereits -> Update
                dogPayload = {
                    ...dog,
                    name: editedData.dogName,
                    chip: editedData.chip,
                    breed: editedData.breed,
                    birth_date: editedData.birth_date,
                };
            } else {
                // Fall B: Kein Hund vorhanden -> Neuer Hund (ohne ID)
                dogPayload = {
                    name: editedData.dogName,
                    chip: editedData.chip,
                    breed: editedData.breed,
                    birth_date: editedData.birth_date,
                    // Wichtig: Keine ID übergeben, damit die App weiß, dass es ein neuer Hund ist
                };
            }
        }

        // Ruft die zentrale Speicherfunktion auf
        onSave(userPayload, dogPayload).then(() => {
            setIsEditing(false);
        });
    };

    const handleUploadClick = () => fileInputRef.current?.click();
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            // KORREKTUR: Wandle die "live" FileList in ein stabiles Array um.
            const filesArray = Array.from(event.target.files);

            // Übergib jetzt das neue Array an die Upload-Funktion
            onUploadDocuments(filesArray, String(customer.id));

            event.target.value = '';
        }
    };

    // === LOGIK FÜR LEVEL-ANZEIGE ===
    const canLevelUp = areLevelRequirementsMet(customer);
    const customerTransactions = transactions.filter(t => t.user_id === customer.id);
    const creator = users.find(u => u.id === customer.createdBy);
    const currentLevelId = customer.level_id || 1;
    const showLevelUpButton = canLevelUp && (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && currentLevelId < 5;

    const showPromoteToExpertButton = (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
        currentLevelId === 5 &&
        canLevelUp &&
        !customer.is_expert &&
        !customer.is_vip;

    let displayLevel = LEVELS.find(l => l.id === currentLevelId) || LEVELS[0];
    if (customer.is_vip) { displayLevel = VIP_LEVEL; }
    if (customer.is_expert) { displayLevel = EXPERT_LEVEL; }

    // === RENDER FUNKTIONEN FÜR LEVEL ===
    const renderRequirement = (req: { id: string; name: string; required: number }, progressProvider: () => { [key: string]: number }) => {
        const progress = progressProvider();
        const currentCount = Math.min(progress[req.id] || 0, req.required);
        const isCompleted = currentCount >= req.required;
        return (
            <li key={req.id}>
                <div className={`req-icon ${isCompleted ? 'completed' : 'incomplete'}`}><Icon name={isCompleted ? "check" : "x"} /></div>
                <span className="req-text">{req.name}</span>
                <span className="req-progress">{currentCount} / {req.required}</span>
            </li>
        );
    };
    const LevelUpButtonComponent = ({ customerId, nextLevelId }: { customerId: string, nextLevelId: number }) => (
        <div className="level-up-button-container">
            <button className="button button-secondary" onClick={() => handleLevelUp(customerId, nextLevelId)}><Icon name="trendingUp" /> Ins nächste Level freischalten</button>
        </div>
    );
    const customerDocuments = customer.documents || [];
    // ==================================================================
    // === FINALES LAYOUT (JSX) ===
    // ==================================================================
    return (
        <>
            <header className="detail-header">
                {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
                    <button className="back-button" onClick={() => setView({ page: 'customers' })}><Icon name="arrowLeft" /></button>
                }
                <div className="detail-header-info">
                    <h1>{firstName} {lastName}</h1>
                    <p>Kundendetails & Übersicht</p>
                </div>
                <div className="header-actions" style={{ marginLeft: 'auto' }}>
                    {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter' || currentUser.id === customer.id) &&
                        <>
                            {isEditing ? (
                                <>
                                    <button className="button button-outline" onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className="button button-secondary" onClick={handleSave}>Speichern</button>
                                </>
                            ) : (
                                <>
                                    <button className="button button-outline" onClick={handleStartEditing}>Stammdaten bearbeiten</button>
                                    {currentUser.role === 'admin' && (
                                        customer.is_vip ? (
                                            <button className="button button-outline" onClick={() => onToggleVipStatus(customer)}>VIP-Status aberkennen</button>
                                        ) : (
                                            <button className="button button-secondary" onClick={() => onToggleVipStatus(customer)}>Zum VIP ernennen</button>
                                        )
                                    )}
                                    {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && (
                                        <>
                                            <button
                                                className="button button-outline"
                                                style={{ borderColor: 'var(--brand-red)', color: 'var(--brand-red)' }}
                                                onClick={() => onDeleteUserClick(customer)}>
                                                Kunde löschen
                                            </button>
                                            <button className="button button-primary" onClick={() => setView({ page: 'customers', subPage: 'transactions', customerId: String(customer.id) })}>Guthaben verwalten</button>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    }
                </div>
            </header>

            <div className="detail-grid">
                <div className="main-col">
                    <div className="content-box">
                        <h2 style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>Persönliche Daten</h2>
                        <div className="personal-data-container">
                            <div className={`personal-data-avatar ${getAvatarColorClass(firstName)}`}>
                                {getInitials(firstName, lastName)}
                            </div>
                            <div className="personal-data-fields">
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Vorname</label>{isEditing ? <input type="text" name="firstName" value={editedData.firstName} onChange={handleInputChange} disabled /> : <p>{firstName}</p>}</div></div>
                                <div className="data-field"><Icon name="user" /><div className="field-content"><label>Nachname</label>{isEditing ? <input type="text" name="lastName" value={editedData.lastName} onChange={handleInputChange} disabled /> : <p>{lastName}</p>}</div></div>

                                <div className="data-field">
                                    <Icon name="mail" />
                                    <div className="field-content">
                                        <label>E-Mail</label>
                                        {isEditing ? (
                                            <input
                                                type="email"
                                                name="email"
                                                value={editedData.email}
                                                onChange={handleInputChange}
                                                // NEU: Nur Admins dürfen das Feld bearbeiten
                                                disabled={currentUser.role !== 'admin'}
                                                style={currentUser.role !== 'admin' ? { color: 'var(--text-secondary)', cursor: 'not-allowed' } : {}}
                                            />
                                        ) : (
                                            <p>{customer.email || '-'}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="phone" />
                                    <div className="field-content">
                                        <label>Telefon</label>
                                        {isEditing ? <input type="tel" name="phone" value={editedData.phone} onChange={handleInputChange} /> : <p>{customer.phone || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="heart" />
                                    <div className="field-content">
                                        <label>Hund</label>
                                        {isEditing ? <input type="text" name="dogName" value={editedData.dogName} onChange={handleInputChange} /> : <p>{dogName}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <img src="/paw.png" alt="Paw" style={{ width: '24px', height: '24px' }} />
                                    <div className="field-content">
                                        <label>Rasse</label>
                                        {isEditing ? <input type="text" name="breed" value={editedData.breed} onChange={handleInputChange} /> : <p>{dog?.breed || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Geburtstag</label>
                                        {isEditing ? <input type="date" name="birth_date" value={editedData.birth_date} onChange={handleInputChange} /> : <p>{dog?.birth_date || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Chipnummer</label>
                                        {isEditing ? <input type="text" name="chip" value={editedData.chip} onChange={handleInputChange} /> : <p>{dog?.chip || '-'}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="content-box account-overview-box">
                        <h2>Konto-Übersicht</h2>
                        <div className="overview-tile-grid">
                            <div className="overview-tile balance"><div className="tile-content"><span className="label">Aktuelles Guthaben</span><span className="value">{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span></div></div>
                            <button className="overview-tile clickable transactions" onClick={() => setIsTxModalOpen(true)}><div className="tile-content"><span className="label">Transaktionen gesamt</span><span className="value">{customerTransactions.length}</span></div></button>
                            <div className="overview-tile level"><div className="tile-content"><span className="label">{displayLevel?.name}</span><span className="value">{`Level ${customer.level_id || 1}`}</span></div></div>
                        </div>
                    </div>

                    <div className="level-progress-container">
                        <h2>Level-Fortschritt</h2>
                        <div className="level-accordion">
                            {LEVELS.map(level => {
                                const currentLevelId = customer.level_id || 1;
                                const isActive = currentLevelId === level.id;
                                const isCompleted = currentLevelId > level.id;
                                const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
                                const requirements = LEVEL_REQUIREMENTS[level.id] || [];
                                const canBecomeExpert = areLevelRequirementsMet(customer) && currentLevelId === 5;
                                return (
                                    <React.Fragment key={level.id}>
                                        <div className={`level-item state-${state}`}>
                                            <div className={`level-header header-level-${level.id}`}>
                                                <div className={`level-number level-${level.id}`}>{level.id}</div>
                                                <div className="level-title">{level.name}</div>
                                                <span className="level-status-badge">{isCompleted ? 'Abgeschlossen' : isActive ? 'Aktuell' : 'Gesperrt'}</span>
                                            </div>

                                            {(isActive) && (
                                                <div className="level-content">
                                                    {requirements.length > 0 ? (
                                                        <ul>{requirements.map(r => renderRequirement(r, () => getProgressForLevel(customer, level.id)))}</ul>
                                                    ) : (
                                                        <p className="no-requirements">Keine besonderen Anforderungen in diesem Level.</p>
                                                    )}

                                                    {/* NEUE POSITION & LOGIK FÜR DEN EXPERTEN-BUTTON */}
                                                    {/* Wird nur angezeigt, wenn es sich um Level 5 handelt */}
                                                    {level.id === 5 && (canBecomeExpert || customer.is_expert) && (
                                                        <div className="level-up-button-container">
                                                            {customer.is_expert ? (
                                                                <button className="button button-outline button-small" onClick={() => onToggleExpertStatus(customer)}>
                                                                    Experten-Status aberkennen
                                                                </button>
                                                            ) : (
                                                                <button className="button button-secondary button-small" onClick={() => onToggleExpertStatus(customer)}>
                                                                    Zum Experten ernennen
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {isActive && showLevelUpButton && <LevelUpButtonComponent customerId={String(customer.id)} nextLevelId={level.id + 1} />}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                    <div className="level-progress-container" style={{ marginTop: '1.5rem' }}>
                        <h2>Zusatz-Veranstaltungen (für Hundeführerschein)</h2>
                        <div className="level-content" style={{ padding: 0 }}><ul>{DOGLICENSE_PREREQS.map(r => renderRequirement(r, () => getPrereqProgress(customer)))}</ul></div>
                    </div>
                </div>

                <div className="side-col">
                    <div className="side-card status-card">
                        <img src={displayLevel?.imageUrl} alt={displayLevel?.name} />
                        <h3>{displayLevel?.name}</h3>
                        <p>Aktueller Status des Kunden</p>
                    </div>
                    <div className="side-card">
                        <h2>Konto-Übersicht</h2>
                        <ul className="info-list">
                            <li><span className="label">Guthaben</span><span className="value">€ {Math.floor(customer.balance).toLocaleString('de-DE')}</span></li>
                            <li><span className="label">Transaktionen</span><span className="value">{customerTransactions.length}</span></li>
                            <li><span className="label">Kunde seit</span><span className="value">{new Date(customer.customer_since).toLocaleDateString('de-DE')}</span></li>
                            <li><span className="label">Erstellt von</span><span className="value">{creator?.name || '-'}</span></li>
                        </ul>
                    </div>
                    <div className="side-card qr-code-container">
                        <h2>QR-Code</h2>
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/customer/${customer.id}`} alt="QR Code" />
                        <p>Scannen, um diese Kundenkarte schnell aufzurufen.</p>
                    </div>
                    <div className="side-card">
                        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Dokumentenverwaltung
                            <button onClick={handleUploadClick} className="button-as-link" aria-label="Dokument hochladen">
                                + Hochladen
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                multiple
                                accept="image/*,.pdf"
                            />
                        </h2>
                        {customerDocuments.length > 0 ? (
                            <ul className="document-list">
                                {customerDocuments.map((doc: any) => (
                                    <li key={doc.id}>
                                        <Icon name="file" className="doc-icon" />
                                        <div className="doc-info" onClick={() => {
                                            // Erstellt eine URL, um das Dokument vom Backend zu laden
                                            const docUrl = `${API_BASE_URL}/api/documents/${doc.id}`;
                                            // Wir simulieren das DocumentFile-Objekt für den Viewer
                                            setViewingDocument({ name: doc.file_name, type: doc.file_type, url: docUrl, id: doc.id, customerId: String(customer.id), file: new File([], doc.file_name), size: 0 });
                                        }} role="button" tabIndex={0}>
                                            {/* KORREKTUR: Verwendet Backend-Feldnamen `file_name` */}
                                            <div className="doc-name">{doc.file_name}</div>
                                            <div className="doc-size">{doc.file_type}</div>
                                        </div>
                                        <div className="doc-actions">
                                            {/* (Share-Button bleibt gleich) */}
                                            {/* KORREKTUR: Übergibt die ID als String */}
                                            <button className="action-icon-btn delete" onClick={() => onDeleteDocument(doc)} aria-label="Löschen"><Icon name="trash" /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Keine Dokumente vorhanden.</p>
                        )}
                    </div>
                </div>
            </div>
            {viewingDocument && <DocumentViewerModal document={viewingDocument} onClose={() => setViewingDocument(null)} />}
            {deletingDocument && (
                <DeleteDocumentModal
                    document={deletingDocument}
                    onClose={() => setDeletingDocument(null)}
                    onConfirm={() => {
                        onDeleteDocument(deletingDocument.id);
                        setDeletingDocument(null);
                    }}
                />
            )}
            {isTxModalOpen && (
                <InfoModal
                    title={`Transaktionen für ${customer.firstName} ${customer.lastName}`}
                    color="blue"
                    onClose={() => setIsTxModalOpen(false)}
                >
                    <ul className="info-modal-list">
                        {customerTransactions
                            // KORREKTUR: createdAt -> date
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(t => (
                                <li key={t.id}>
                                    <span>
                                        {/* KORREKTUR: createdAt -> date */}
                                        {new Date(t.date).toLocaleDateString('de-DE')} - {t.description}
                                    </span>
                                    <span style={{ fontWeight: 600, color: t.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)' }}>
                                        € {t.amount.toLocaleString('de-DE')}
                                    </span>
                                </li>
                            ))
                        }
                    </ul>
                </InfoModal>
            )}
        </>
    );
};



const TransactionManagementPage: FC<{ customer: Customer; setView: (view: View) => void, onConfirmTransaction: (tx: any) => void, currentUser: User }> = ({ customer, setView, onConfirmTransaction, currentUser }) => {
    const [modalData, setModalData] = useState<(Omit<Transaction, 'id' | 'createdAt' | 'customerId' | 'createdBy'> & { baseAmount?: number, bonus?: number }) | null>(null);

    const [customTopup, setCustomTopup] = useState('');
    const [customDebitAmount, setCustomDebitAmount] = useState('');
    const [customDebitDesc, setCustomDebitDesc] = useState('');

    const topups = [
        { title: 'Aufladung 50€', amount: 50, bonus: 5 },
        { title: 'Aufladung 100€', amount: 100, bonus: 15 },
        { title: 'Aufladung 150€', amount: 150, bonus: 30 },
        { title: 'Aufladung 300€', amount: 300, bonus: 150 },
        // Die 500€ Stufe ist entfernt
    ];


    const debits = [
        { title: 'Gruppenstunde', amount: -15, reqId: 'group_class' },
        { title: 'Trail', amount: -18, reqId: 'trail' },
        { title: 'Prüfungsstunde', amount: -15, reqId: 'exam' },
        { title: 'Social Walk', amount: -15, reqId: 'social_walk' },
        { title: 'Wirtshaustraining', amount: -15, reqId: 'tavern_training' },
        { title: 'Erste Hilfe Kurs', amount: -50, reqId: 'first_aid' },
        { title: 'Vortrag Bindung & Beziehung', amount: -15, reqId: 'lecture_bonding' },
        { title: 'Vortrag Jagdverhalten', amount: -15, reqId: 'lecture_hunting' },
        { title: 'WS Kommunikation & Körpersprache', amount: -15, reqId: 'ws_communication' },
        { title: 'WS Stress & Impulskontrolle', amount: -15, reqId: 'ws_stress' },
        { title: 'Theorieabend Hundeführerschein', amount: -25, reqId: 'theory_license' },
    ];

    const handleTxClick = (data: { title: string, amount: number, bonus?: number, reqId?: string }) => {
        if (data.bonus !== undefined) {
            const totalAmount = data.amount + data.bonus;
            setModalData({ title: data.title, amount: totalAmount, type: 'topup', baseAmount: data.amount, bonus: data.bonus });
        } else {
            setModalData({ title: data.title, amount: data.amount, type: 'debit', meta: { requirementId: data.reqId } });
        }
    };

    // NEU: Handler für individuelle Aufladung
    const handleCustomTopup = () => {
        const amount = parseFloat(customTopup);
        if (!amount || amount <= 0) {
            alert("Bitte geben Sie einen gültigen Betrag ein.");
            return;
        }
        let bonus = 0;
        if (amount >= 300) { bonus = 150 }
        else if (amount >= 150) { bonus = 30 }
        else if (amount >= 100) { bonus = 15 }
        else if (amount >= 50) { bonus = 5 }
        // Für individuelle Beträge gibt es keinen Bonus
        setModalData({ title: `Individuelle Aufladung`, amount, type: 'topup', baseAmount: amount, bonus: bonus });
        setCustomTopup(''); // Feld zurücksetzen
    };

    // NEU: Handler für individuelle Abbuchung
    const handleCustomDebit = () => {
        const amount = parseFloat(customDebitAmount);
        if (!amount || amount <= 0 || !customDebitDesc) {
            alert("Bitte geben Sie einen gültigen Betrag und eine Beschreibung ein.");
            return;
        }
        setModalData({ title: customDebitDesc, amount: -amount, type: 'debit' });
        setCustomDebitAmount(''); // Felder zurücksetzen
        setCustomDebitDesc('');
    };

    return (
        <>
            <header className="detail-header">
                <button className="back-button" onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: String(customer.id) })}>
                    <Icon name="arrowLeft" />
                </button>
                <div className="detail-header-info">
                    <h1>Transaktionen verwalten</h1>
                    <p>für {customer.name}</p>
                </div>
            </header>
            <div className="tx-header-card">
                <p>Aktuelles Guthaben</p>
                <h2>{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</h2>
            </div>

            {/* Aufladungen */}
            <div className="tx-section">
                <h3>Aufladungen</h3>
                <div className="tx-grid">
                    {topups.map(t => (
                        <button key={t.amount} className="tx-button topup" onClick={() => handleTxClick(t)}>
                            <div className="info">
                                <div className="title">{t.title}</div>
                                {t.bonus > 0 && <div className="bonus">(+ {t.bonus.toFixed(0)} € Bonus)</div>}
                            </div>
                            <div className="amount">+ {(t.amount + t.bonus).toFixed(0)} €</div>
                        </button>
                    ))}
                </div>
                {/* NEUES FORMULAR FÜR INDIVIDUELLE AUFLADUNG */}
                <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="Individueller Betrag"
                        value={customTopup}
                        onChange={e => setCustomTopup(e.target.value)}
                    />
                    <button className="button button-primary" onClick={handleCustomTopup}>Aufladen</button>
                </div>
            </div>

            {/* Abbuchungen */}
            <div className="tx-section debits">
                <h3>Abbuchungen (Training & Kurse)</h3>
                <div className="tx-grid">
                    {debits.map(d => (
                        <button key={d.title} className="tx-button debit" onClick={() => handleTxClick(d)} disabled={customer.balance + d.amount < 0}>
                            <div className="info"><div className="title">{d.title}</div></div>
                            <div className="amount">{d.amount.toFixed(0)} €</div>
                        </button>
                    ))}
                </div>
                {/* NEUES FORMULAR FÜR INDIVIDUELLE ABBUCHUNG */}
                <div className="custom-entry-form" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input type="text" className="form-input" placeholder="Beschreibung (z.B. 'Sonder-Event')" style={{ flexGrow: 2 }} value={customDebitDesc} onChange={e => setCustomDebitDesc(e.target.value)} />
                    <input type="number" className="form-input" placeholder="Betrag" style={{ flexGrow: 1 }} value={customDebitAmount} onChange={e => setCustomDebitAmount(e.target.value)} />
                    <button className="button button-danger" onClick={handleCustomDebit}>Abbuchen</button>
                </div>
            </div>

            {modalData && <ConfirmationModal
                customer={customer}
                transaction={modalData}
                onClose={() => setModalData(null)}
                onConfirm={() => { onConfirmTransaction(modalData); setModalData(null); }}
                currentUser={currentUser}
            />}
        </>
    );
};

const ConfirmationModal: FC<{
    customer: Customer,
    transaction: any,
    onClose: () => void,
    onConfirm: () => void,
    currentUser: User
}> = ({ customer, transaction, onClose, onConfirm, currentUser }) => {
    const finalBalance = customer.balance + transaction.amount;
    const isTopup = transaction.type === 'topup';

    return (
        <div className="modal-overlay">
            <div className="modal-content confirmation-modal-content">
                <div className="modal-header green">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexGrow: 1 }}>
                        <div className="confirmation-header-icon"><Icon name="check" /></div>
                        <div className="confirmation-header-text">
                            <h2>Transaktion bestätigen</h2>
                            <p>Bitte bestätigen Sie die Transaktion für <strong>{customer.firstName} {customer.lastName}</strong>.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>

                <div className="modal-body">
                    <div className="confirmation-box employee-box">
                        <Icon name="user" />
                        <span>Mitarbeiter: <strong>{currentUser.name}</strong></span>
                    </div>

                    {isTopup ? (
                        <div className="confirmation-box topup-box">
                            <div className="topup-line">
                                <span>Aufladung</span>
                                <span className="amount">{transaction.baseAmount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            {transaction.bonus > 0 &&
                                <div className="topup-line">
                                    <span>Bonus</span>
                                    <span className="amount bonus">+ {transaction.bonus.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                </div>
                            }
                            <hr />
                            <div className="topup-line total">
                                <span>Gesamt gutgeschrieben</span>
                                <span className="amount">{transaction.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <p className="description">Beschreibung: {transaction.title} {transaction.bonus > 0 ? `+ ${transaction.bonus.toFixed(2)}€ Bonus` : ''}</p>
                        </div>
                    ) : (
                        <div className="confirmation-box debit-box">
                            <div className="debit-header">
                                <h3>Abbuchung</h3>
                                <span className="amount">{transaction.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                            <p className="description">Beschreibung: {transaction.title}</p>
                        </div>
                    )}

                    <div className="confirmation-box balance-box">
                        <div className="balance-col">
                            <span>Alter Saldo</span>
                            <p>{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                        </div>
                        <div className="balance-arrow">
                            <Icon name="arrowRight" />
                        </div>
                        <div className="balance-col">
                            <span>Neuer Saldo</span>
                            <p className="final-balance">{finalBalance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</p>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                    <button className="button button-primary" onClick={onConfirm}><Icon name="check" /> Bestätigen und Buchen</button>
                </div>
            </div>
        </div>
    );
}

const InfoModal: FC<{ title: string; color: string; children: React.ReactNode; onClose: () => void; }> = ({ title, color, children, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content info-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`modal-header ${color}`}>
                    <h2>{title}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body scrollable">
                    {children}
                </div>
            </div>
        </div>
    );
};
const DogFormModal: FC<{
    dog?: any | null; // Optional: Der Hund, der bearbeitet wird
    onClose: () => void;
    onSave: (dogData: any) => void;
}> = ({ dog, onClose, onSave }) => {
    const [name, setName] = useState(dog?.name || '');
    const [breed, setBreed] = useState(dog?.breed || '');
    const [birth_date, setBirthDate] = useState(dog?.birth_date || '');
    const [chip, setChip] = useState(dog?.chip || '');
    const isEditing = !!dog;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Bitte geben Sie einen Namen für den Hund an.');
            return;
        }
        onSave({ id: dog?.id, name, breed, birth_date, chip });
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content add-customer-modal">
                <div className={`modal-header ${isEditing ? 'blue' : 'green'}`}>
                    <h2>{isEditing ? 'Hund bearbeiten' : 'Neuen Hund hinzufügen'}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group"><label>Name*</label><input type="text" value={name} onChange={e => setName(e.target.value)} required /></div>
                            <div className="form-group"><label>Rasse</label><input type="text" value={breed} onChange={e => setBreed(e.target.value)} /></div>
                            <div className="form-group"><label>Geburtsdatum</label><input type="date" value={birth_date} onChange={e => setBirthDate(e.target.value)} /></div>
                            <div className="form-group"><label>Chipnummer</label><input type="text" value={chip} onChange={e => setChip(e.target.value)} /></div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                        <button type="submit" className="button button-primary">{isEditing ? 'Änderungen speichern' : 'Hund hinzufügen'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteDogModal: FC<{ dog: any; onClose: () => void; onConfirm: () => void; }> = ({ dog, onClose, onConfirm }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header red">
                <h2>Hund löschen</h2>
                <button onClick={onClose} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
                <p>Möchten Sie den Hund <strong>{dog.name}</strong> wirklich endgültig löschen?</p>
            </div>
            <div className="modal-footer">
                <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                <button type="button" className="button button-danger" onClick={onConfirm}>Endgültig löschen</button>
            </div>
        </div>
    </div>
);
// Suchen Sie in index.tsx nach der Komponente "BerichtePage" und ersetzen Sie sie durch diesen Code:

const BerichtePage: FC<{
    transactions: any[],
    customers: any[],
    users: any[],
    currentUser: any
}> = ({ transactions, customers, users, currentUser }) => {
    const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<string>(
        currentUser.role === 'admin' ? 'all' : String(currentUser.id)
    );
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    // --- NEU: Hilfsfunktion zum Berechnen des echten Umsatzes (ohne Bonus) ---
    const getRealAmount = (tx: any) => {
        // Abbuchungen (negative Beträge) bleiben unverändert
        if (tx.amount <= 0) return tx.amount;

        // Nur bei Aufladungen wurde potenziell ein Bonus gewährt
        // Wir prüfen auf "Aufladung" (Backend-Name) oder "topup" (falls Mocks verwendet werden)
        if (tx.type === 'Aufladung' || tx.type === 'topup') {
            // Logik rückwärts gerechnet basierend auf crud.py:
            // >= 300€ Einzahlung (+150 Bonus) = >= 450€ Gesamt
            if (tx.amount >= 450) return tx.amount - 150;
            // >= 150€ Einzahlung (+30 Bonus) = >= 180€ Gesamt
            if (tx.amount >= 180) return tx.amount - 30;
            // >= 100€ Einzahlung (+15 Bonus) = >= 115€ Gesamt
            if (tx.amount >= 115) return tx.amount - 15;
            // >= 50€ Einzahlung (+5 Bonus) = >= 55€ Gesamt
            if (tx.amount >= 55) return tx.amount - 5;
        }

        // Keine Bonus-Stufe erreicht oder anderer Transaktionstyp -> Betrag ist der echte Umsatz
        return tx.amount;
    };

    const availablePeriods = useMemo(() => {
        const periods: { monthly: Set<string>, yearly: Set<string> } = { monthly: new Set(), yearly: new Set() };
        transactions.forEach(tx => {
            if (!tx.date) return;
            const date = new Date(tx.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            periods.monthly.add(`${year}-${month}`);
            periods.yearly.add(String(year));
        });
        return {
            monthly: Array.from(periods.monthly).sort((a, b) => b.localeCompare(a)),
            yearly: Array.from(periods.yearly).sort((a, b) => b.localeCompare(a)),
        };
    }, [transactions]);

    useEffect(() => {
        if (reportType === 'monthly' && availablePeriods.monthly.length > 0) {
            setSelectedPeriod(availablePeriods.monthly[0]);
        } else if (reportType === 'yearly' && availablePeriods.yearly.length > 0) {
            setSelectedPeriod(availablePeriods.yearly[0]);
        } else {
            setSelectedPeriod('');
        }
    }, [reportType, availablePeriods]);

    const filteredTransactions = useMemo(() => {
        if (!selectedPeriod) return [];
        return transactions.filter(tx => {
            if (!tx.date) return false;
            const txDate = new Date(tx.date);
            const year = txDate.getFullYear().toString();
            const month = `${year}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            const periodMatch = (reportType === 'yearly') ? (year === selectedPeriod) : (month === selectedPeriod);
            const mitarbeiterMatch = (selectedMitarbeiter === 'all') || (String(tx.booked_by_id) === selectedMitarbeiter);
            return periodMatch && mitarbeiterMatch;
        });
    }, [transactions, reportType, selectedPeriod, selectedMitarbeiter]);

    // --- ÄNDERUNG: Berechnung des Umsatzes mit getRealAmount ---
    const revenue = filteredTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, tx) => sum + getRealAmount(tx), 0);

    const debits = filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const topCustomers = useMemo(() => {
        const customerSpending: { [key: string]: { customer: any, count: number, total: number } } = {};

        filteredTransactions.filter(tx => tx.amount < 0).forEach(tx => {
            const cust = customers.find(c => c.id === tx.user_id);
            if (!cust) return;
            const key = cust.id;
            if (!customerSpending[key]) customerSpending[key] = { customer: cust, count: 0, total: 0 };
            customerSpending[key].count++;
            customerSpending[key].total += Math.abs(tx.amount);
        });

        return Object.values(customerSpending).sort((a, b) => b.total - a.total).slice(0, 5);
    }, [filteredTransactions, customers]);

    const formatPeriodForDisplay = (period: string, type: 'monthly' | 'yearly') => {
        if (!period) return '';
        if (type === 'yearly') return period;
        const [year, month] = period.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' });
    };

    const handleExportCSV = () => {
        const escapeCSV = (value: any) => {
            const stringValue = String(value ?? '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        // Header angepasst: "Echter Betrag" statt nur "Betrag" um Verwirrung zu vermeiden
        const headers = ["Datum", "Kunde", "Hund", "Titel", "Typ", "Echter Betrag (ohne Bonus)", "Gebuchter Betrag (inkl. Bonus)", "Erstellt von"];

        const rows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.user_id);
            const creator = users.find(u => u.id === tx.booked_by_id);
            const realAmount = getRealAmount(tx);

            const rowData = [
                new Date(tx.date).toLocaleString('de-DE'),
                customer?.name || 'Unbekannt',
                customer?.dogs[0]?.name || '',
                tx.description,
                tx.type,
                realAmount, // Hier der echte Geldbetrag
                tx.amount,  // Zum Vergleich der gebuchte Betrag
                creator?.name || 'Unbekannt'
            ];

            return rowData.map(escapeCSV).join(',');
        });

        const bom = '\uFEFF';
        const csvContent = "data:text/csv;charset=utf-8," + bom + [headers.join(','), ...rows].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bericht_umsatz_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const reportTitle = `Umsatzbericht für ${formatPeriodForDisplay(selectedPeriod, reportType)}`;
        const mitarbeiter = selectedMitarbeiter === 'all' ? 'Alle Mitarbeiter' : users.find(u => u.id === selectedMitarbeiter)?.name;

        let tableRows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.user_id);
            const creator = users.find(u => u.id === tx.booked_by_id);
            const realAmount = getRealAmount(tx);

            // Logik für die Anzeige: Wenn Bonus dabei war, zeigen wir das an
            const isTopupWithBonus = tx.amount > realAmount;
            const displayAmount = isTopupWithBonus
                ? `${realAmount.toLocaleString('de-DE')} € <br><span style="font-size:0.8em; color:#666">(+${(tx.amount - realAmount).toLocaleString('de-DE')} Bonus)</span>`
                : `${tx.amount.toLocaleString('de-DE')} €`;

            return `
                <tr>
                    <td>${new Date(tx.date).toLocaleDateString('de-DE')}</td>
                    <td>${customer?.name || 'Unbekannt'}</td>
                    <td>${tx.description}</td>
                    <td>${creator?.name || 'Unbekannt'}</td>
                    <td style="text-align: right; color: ${tx.amount < 0 ? 'red' : 'green'};">${displayAmount}</td>
                </tr>
            `;
        }).join('');

        const printContent = `
            <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: sans-serif; margin: 2rem; }
                        h1, h2, h3 { color: #333; }
                        h1 { font-size: 1.5rem; }
                        h2 { font-size: 1.2rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-top: 2rem; }
                        .summary { display: flex; gap: 2rem; margin-bottom: 2rem; }
                        .summary-item { padding: 1rem; border: 1px solid #eee; border-radius: 8px; }
                        .summary-item .label { font-size: 0.9rem; color: #666; }
                        .summary-item .value { font-size: 1.5rem; font-weight: bold; }
                        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <h3>Mitarbeiter: ${mitarbeiter}</h3>
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Tatsächliche Einnahmen (ohne Bonus)</div>
                            <div class="value" style="color: green;">${revenue.toLocaleString('de-DE')} €</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Gesamtabbuchungen (Leistungen)</div>
                            <div class="value" style="color: red;">${debits.toLocaleString('de-DE')} €</div>
                        </div>
                    </div>
                    <h2>Transaktionsdetails</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Kunde</th>
                                <th>Titel</th>
                                <th>Erstellt von</th>
                                <th style="text-align: right;">Einnahme / Abbuchung</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow?.document.write(printContent);
        printWindow?.document.close();
        printWindow?.focus();
        printWindow?.print();
        printWindow?.close();
    };

    return (
        <>
            <header className="page-header">
                <h1>Berichte & Statistiken</h1>
                <p>Analysieren und exportieren Sie Ihre echten Umsätze</p>
            </header>

            <div className="content-box filter-export-panel">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label>Berichtstyp</label>
                        <select className="form-input" value={reportType} onChange={e => setReportType(e.target.value as 'monthly' | 'yearly')}>
                            <option value="monthly">Monatlich</option>
                            <option value="yearly">Jährlich</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Zeitraum</label>
                        <select className="form-input" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                            {(reportType === 'monthly' ? availablePeriods.monthly : availablePeriods.yearly).map(p => (
                                <option key={p} value={p}>{formatPeriodForDisplay(p, reportType)}</option>
                            ))}
                        </select>
                    </div>
                    {currentUser.role === 'admin' && (
                        <div className="filter-group">
                            <label>Mitarbeiter</label>
                            <select className="form-input" value={selectedMitarbeiter} onChange={e => setSelectedMitarbeiter(e.target.value)}>
                                <option value="all">Alle Mitarbeiter</option>
                                {users.filter(u => u.role !== 'kunde').map(u => (
                                    <option key={u.id} value={String(u.id)}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="export-actions">
                    <button className="button button-outline" onClick={handleExportCSV}>
                        <Icon name="download" /> Als CSV exportieren
                    </button>
                    <button className="button button-secondary" onClick={handleExportPDF}>
                        <Icon name="printer" /> Als PDF exportieren
                    </button>
                </div>
            </div>

            <div className="kpi-grid">
                {/* Titel angepasst auf "Echte Einnahmen" */}
                <KpiCard title={`Echte Einnahmen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`} value={`€ ${Math.floor(revenue).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="green" />
                <KpiCard title={`Abbuchungen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`} value={`€ ${Math.floor(debits).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="orange" />
                <KpiCard title="Transaktionen" value={filteredTransactions.length.toString()} icon="trendingUp" bgIcon="trendingUp" color="blue" />
                <KpiCard title="Aktive Kunden" value={new Set(filteredTransactions.map(tx => tx.user_id)).size.toString()} icon="customers" bgIcon="customers" color="purple" />
            </div>
            <div className="dashboard-bottom-grid">
                <div className="content-box">
                    <h2>Transaktionen im Zeitraum ({filteredTransactions.length})</h2>
                    <ul className="detailed-transaction-list">
                        {filteredTransactions.length > 0 ? filteredTransactions.map(tx => {
                            const customer = customers.find(c => c.id === tx.user_id);
                            const creator = users.find(u => u.id === tx.booked_by_id);
                            // Auch in der Liste zeigen wir den gebuchten Betrag an, aber man könnte hier auch den echten Betrag anzeigen
                            // Ich lasse hier den gebuchten Betrag, damit es mit dem Kontostand des Kunden übereinstimmt,
                            // aber die KPI oben zeigt den echten Umsatz.
                            return (
                                <li key={tx.id}>
                                    <div className={`tx-icon ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        <Icon name={tx.amount < 0 ? 'arrowDown' : 'trendingUp'} />
                                    </div>
                                    <div className="tx-details">
                                        <div className="tx-line-1">
                                            <span className="tx-title">{tx.description}</span>
                                            <span className="tx-customer">für {customer?.name}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{new Date(tx.date).toLocaleDateString('de-DE')}</span>
                                            {creator && <span className="tx-creator">&bull; von {creator.name}</span>}
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        € {Math.floor(tx.amount).toLocaleString('de-DE')}
                                    </div>
                                </li>
                            );
                        }) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Transaktionen für den gewählten Filter.</p>}
                    </ul>
                </div>
                <div className="content-box">
                    <h2>Top Kunden im Zeitraum</h2>
                    <ul className="top-customer-list">
                        {topCustomers.length > 0 ? topCustomers.map((custData, index) => {
                            const nameParts = custData.customer.name.split(' ');
                            const firstName = nameParts[0] || '';
                            const lastName = nameParts.slice(1).join(' ');
                            const dogName = custData.customer.dogs[0]?.name || '-';

                            return (
                                <li key={custData.customer.id}>
                                    <div className="rank">{index + 1}</div>
                                    <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                        {getInitials(firstName, lastName)}
                                    </div>
                                    <div className="info">
                                        <div className="name">{custData.customer.name}</div>
                                        <div className="tx-count">{dogName} &bull; {custData.count} Transaktionen</div>
                                    </div>
                                    <div className="amount">€ {Math.floor(custData.total).toLocaleString('de-DE')}</div>
                                </li>
                            );
                        }) : <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Keine Kundendaten für den gewählten Filter.</p>}
                    </ul>
                </div>
            </div>
        </>
    );
};

const UserFormModal: FC<{
    user?: any | null;
    onClose: () => void;
    onSave: (userData: any) => void;
}> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<UserRole>(user?.role || 'mitarbeiter');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const isEditing = !!user;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if ((!isEditing && !password) || !name || !email) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }
        const dataToSend = { name, email, role, password: password || undefined };
        onSave(dataToSend);
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content add-customer-modal">
                <div className={`modal-header ${isEditing ? 'blue' : 'green'}`}>
                    <h2>{isEditing ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}</h2>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Name*</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group"><label>E-Mail*</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                        <div className="form-group">
                            <label>{isEditing ? 'Neues Passwort (optional)' : 'Passwort*'}</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required={!isEditing}
                                    className="form-input"
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                    aria-label="Passwort anzeigen/verbergen"
                                >
                                    <Icon name={showPassword ? 'eye-off' : 'eye'} />
                                </button>
                            </div>
                        </div>
                        {/* KORREKTUR: Fehlendes Rollen-Dropdown wiederhergestellt */}
                        <div className="form-group">
                            <label>Rolle</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="form-input">
                                <option value="admin">Admin</option>
                                <option value="mitarbeiter">Mitarbeiter</option>
                            </select>
                        </div>
                    </div>
                    {/* KORREKTUR: Vollständiger Footer mit korrekter Button-Anzeige */}
                    <div className="modal-footer">
                        <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                        <button type="submit" className={`button ${isEditing ? 'button-secondary' : 'button-primary'}`}>
                            {isEditing ? 'Änderungen speichern' : 'Benutzer anlegen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DeleteUserModal: FC<{ user: User; onClose: () => void; onConfirm: () => void; }> = ({ user, onClose, onConfirm }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header red">
                <h2>Benutzer löschen</h2>
                <button onClick={onClose} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
                <p>Möchten Sie den Benutzer <strong>{user.name}</strong> wirklich endgültig löschen?</p>
                <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="modal-footer">
                <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                <button type="button" className="button button-danger" onClick={onConfirm}> endgültig löschen</button>
            </div>
        </div>
    </div>
);
const DeleteDocumentModal: FC<{ document: any; onClose: () => void; onConfirm: () => void; }> = ({ document, onClose, onConfirm }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header red">
                <h2>Dokument löschen</h2>
                <button onClick={onClose} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
                <p>Möchten Sie das Dokument <strong>{document.file_name}</strong> wirklich endgültig löschen?</p>
                <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="modal-footer">
                <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                <button type="button" className="button button-danger" onClick={onConfirm}>Endgültig löschen</button>
            </div>
        </div>
    </div>
);

const CustomerTransactionsPage: FC<{ transactions: any[] }> = ({ transactions }) => {
    return (
        <>
            <header className="page-header">
                <h1>Meine Transaktionen</h1>
                <p>Hier sehen Sie eine Übersicht aller Ihrer Buchungen.</p>
            </header>
            <div className="content-box">
                <ul className="detailed-transaction-list">
                    {transactions.length > 0 ? (
                        transactions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(tx => (
                                <li key={tx.id}>
                                    <div className={`tx-icon ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        <Icon name={tx.amount < 0 ? 'arrowDown' : 'trendingUp'} />
                                    </div>
                                    <div className="tx-details">
                                        <div className="tx-line-1">
                                            <span className="tx-title">{tx.description}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{new Date(tx.date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        {tx.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                                    </div>
                                </li>
                            ))
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                            Sie haben noch keine Transaktionen.
                        </p>
                    )}
                </ul>
            </div>
        </>
    );
};

const BenutzerPage: FC<{
    users: User[];
    onAddUserClick: () => void;
    onEditUserClick: (user: User) => void;
    onDeleteUserClick: (user: User) => void;
}> = ({ users, onAddUserClick, onEditUserClick, onDeleteUserClick }) => {

    const systemUsers = users.filter(u => u.role !== 'kunde');

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Benutzerverwaltung</h1>
                    <p>Verwalten Sie alle Systembenutzer an einem Ort</p>
                </div>
                <div className="header-actions">
                    <button className="button button-primary" onClick={onAddUserClick}>+ Neuer Benutzer</button>

                </div>
            </header>
            <div className="content-box user-list">
                <h2>Systembenutzer ({systemUsers.length})</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Benutzer</th><th>E-Mail</th><th>Rolle</th><th>Erstellt</th><th>Aktionen</th></tr>
                        </thead>
                        <tbody>
                            {systemUsers.map(user => {
                                // KORREKTUR: Namen für jede Zeile neu aufteilen
                                const nameParts = user.name ? user.name.split(' ') : [''];
                                const firstName = nameParts[0];
                                const lastName = nameParts.slice(1).join(' ');

                                return (
                                    <tr key={user.id}>
                                        <td data-label="Benutzer">
                                            <div className="user-cell">
                                                <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                                    {getInitials(firstName, lastName)}
                                                </div>
                                                <div>
                                                    {/* KORREKTUR: Aufgeteilte Namen in den divs verwenden */}
                                                    <div className="user-fullname">{firstName}</div>
                                                    <div className="user-subname">{lastName}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="E-Mail">{user.email}</td>
                                        <td data-label="Rolle"><span className={`role-badge ${user.role}`}>{user.role}</span></td>
                                        <td data-label="Erstellt">{new Date(user.customer_since).toLocaleDateString('de-DE')}</td>
                                        <td data-label="Aktionen">
                                            <div className="actions-cell-wrapper">
                                                <button className="action-icon-btn" onClick={() => onEditUserClick(user)} aria-label="Bearbeiten"><Icon name="edit" /></button>
                                                <button className="action-icon-btn delete" onClick={() => onDeleteUserClick(user)} aria-label="Löschen"><Icon name="trash" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};



// --- HAUPT-APP ---
const App: FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<any | null>(null);
    const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [view, setView] = useState<View>({ page: 'dashboard' });
    const [customers, setCustomers] = useState<any[]>([]); // auf any[] ändern für Backend-Daten
    const [users, setUsers] = useState<any[]>([]); // auf any[] ändern
    const [transactions, setTransactions] = useState<any[]>([]); // auf any[] ändern
    const [isLoading, setIsLoading] = useState(true); // Neuer Lade-Zustand

    const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({ isOpen: false, title: '', content: null, color: 'green' });
    const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 992);

    // User Management Modals State
    const [userModal, setUserModal] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
    const [deleteUserModal, setDeleteUserModal] = useState<User | null>(null);

    const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
    const [dogFormModal, setDogFormModal] = useState<{ isOpen: boolean; dog: any | null }>({ isOpen: false, dog: null }); // <-- NEU
    const [deletingDog, setDeletingDog] = useState<any | null>(null); // <-- NEU

    const [isServerLoading, setServerLoading] = useState<{ active: boolean; message: string }>({ active: false, message: '' });
    const [customerPage, setCustomerPage] = useState<'overview' | 'transactions'>('overview');
    const [directAccessedCustomer, setDirectAccessedCustomer] = useState<any | null>(null);
    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 992;
            setIsMobileView(isMobile);
            if (!isMobile) {
                setIsSidebarOpen(true); // Always open on desktop
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // Diese Logik wird ausgeführt, wenn die App lädt oder der Nutzer sich einloggt.
        if (loggedInUser && loggedInUser.role !== 'kunde') {
            const path = window.location.pathname;
            const match = path.match(/customer\/(\d+)/); // Passt auf URLs wie /customer/123

            // Wenn eine Kunden-ID in der URL gefunden wird (durch QR-Scan)
            if (match && match[1]) {
                const customerId = parseInt(match[1]);

                // Lade den Kunden direkt vom Server, um das Portfolio zu umgehen
                setServerLoading({ active: true, message: 'Lade Kundendaten...' });
                apiClient.get(`/api/users/${customerId}`, authToken)
                    .then(customerData => {
                        setDirectAccessedCustomer(customerData); // Speichere den Kunden in unserem neuen State
                        setView({ page: 'customers', subPage: 'detail', customerId: String(customerId) });
                    })
                    .catch(err => {
                        console.error("Fehler beim Laden des Kunden via QR-Code:", err);
                        alert("Kunde konnte nicht gefunden oder geladen werden.");
                        window.history.pushState({}, '', '/'); // URL zurücksetzen
                    })
                    .finally(() => {
                        setServerLoading({ active: false, message: '' });
                    });
            }
        }
    }, [loggedInUser]); // Abhängig vom Login-Status

    // State für Passwort-Update Modal
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        // Supabase Listener: Horcht auf Passwort-Reset Events
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setShowPasswordReset(true);
            }
        });
        return () => { authListener.subscription.unsubscribe(); };
    }, []);

    const handlePasswordUpdate = async () => {
        if (!newPassword) return alert("Bitte Passwort eingeben");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (!error) {
            alert("Passwort erfolgreich geändert!");
            setShowPasswordReset(false);
            setNewPassword('');
            // Optional: User direkt einloggen oder Token nutzen
        } else {
            alert("Fehler: " + error.message);
        }
    };

    const handleSetView = (newView: View) => {
        // Wenn wir von einer Detailansicht (Kunde oder Transaktion) wegnavigieren...
        if (view.customerId && newView.customerId !== view.customerId) {
            setDirectAccessedCustomer(null);
            // Bereinigt die URL in der Adressleiste des Browsers ohne Neuladen.
            window.history.pushState({}, '', '/');
        }
        setView(newView);
    };

    const fetchAppData = async () => {
        if (!authToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const currentUser = await apiClient.get('/api/users/me', authToken);
            setLoggedInUser(currentUser);

            if (currentUser.role === 'kunde') {
                // Ein Kunde holt NUR seine eigenen Transaktionen.
                // Der Aufruf von /api/users wird bewusst ausgelassen, um einen 403-Fehler zu vermeiden.
                const transactionsResponse = await apiClient.get('/api/transactions', authToken);
                setTransactions(transactionsResponse);
                setCustomers([currentUser]);
                setUsers([currentUser]);
            } else {
                // Admins und Mitarbeiter laden alles wie bisher.
                const [usersResponse, transactionsResponse] = await Promise.all([
                    apiClient.get('/api/users', authToken),
                    apiClient.get('/api/transactions', authToken)
                ]);
                setCustomers(usersResponse.filter((user: any) => user.role === 'kunde'));
                setUsers(usersResponse);
                setTransactions(transactionsResponse);
            }

        } catch (error) {
            console.error("Authentifizierung oder Datenabruf fehlgeschlagen, logge aus:", error);
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };

    // Der useEffect-Hook ruft jetzt nur noch diese eine Funktion auf
    useEffect(() => {
        fetchAppData(); // initializeApp wurde zu fetchAppData umbenannt, also hier anpassen
    }, [authToken]);

    // Funktion, die beim Login aufgerufen wird
    const handleLoginSuccess = (token: string, user: any) => {
        localStorage.setItem('authToken', token); // Token im localStorage speichern
        setAuthToken(token);
        setLoggedInUser(user);
        setServerLoading({ active: false, message: '' });
    };

    // Funktion zum Ausloggen
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setLoggedInUser(null);
        setDirectAccessedCustomer(null);
        window.history.pushState({}, '', '/');
    };

    const handleUpdateStatus = async (userId: string, statusType: 'vip' | 'expert', value: boolean) => {
        if (!authToken) return;
        try {
            if (statusType === 'vip') {
                await apiClient.setVipStatus(userId, value, authToken);
            } else {
                await apiClient.setExpertStatus(userId, value, authToken);
            }
            await fetchAppData();
        } catch (error) {
            console.error(`Fehler beim Aktualisieren des ${statusType}-Status:`, error);
            alert(`Fehler: ${error}`);
        }
    };

    // In der App-Komponente in frontend/index.tsx

    const handleConfirmTransaction = async (txData: {
        title: string;
        amount: number; // Dies ist der Betrag, der verbucht wird (z.B. -12 für Abbuchung)
        type: 'topup' | 'debit';
        meta?: { requirementId?: string };
        baseAmount?: number; // Dies ist der reine Aufladebetrag (z.B. 100)
    }) => {
        if (!view.customerId || !authToken) return;

        // Das Datenobjekt, das wir an das Backend senden.
        // Es muss dem "TransactionCreate"-Schema aus `schemas.py` entsprechen.
        const transactionPayload = {
            user_id: parseInt(view.customerId.replace('cust-', ''), 10), // Backend erwartet eine Zahl, z.B. 1 statt "cust-1"
            type: txData.type === 'topup' ? 'Aufladung' : txData.title, // Backend-Typen anpassen
            description: txData.title,
            amount: txData.baseAmount || txData.amount, // Bei Aufladung nur den Basisbetrag senden
            requirement_id: txData.meta?.requirementId || null
        };

        try {
            // Sende die Daten an das Backend
            await apiClient.post('/api/transactions', transactionPayload, authToken);

            // Einfachste Methode, um die UI zu aktualisieren: die Seite neu laden.
            // So werden die neuen Kontostände und Transaktionslisten vom Server geholt.
            console.log('Transaktion erfolgreich gebucht!');
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Buchen der Transaktion:", error);
            alert(`Fehler: ${error}`);
        }
    };

    const handleAddCustomer = async (newCustomerData: any) => {
        if (!loggedInUser) return;

        // 1. Daten für das Backend-Schema "UserCreate" vorbereiten
        const payload = {
            name: `${newCustomerData.firstName} ${newCustomerData.lastName}`.trim(),
            email: newCustomerData.email,
            role: "kunde",
            is_active: true,
            balance: 0.0,
            phone: newCustomerData.phone,
            dogs: [ // Das Backend kann direkt einen Hund mit anlegen
                {
                    name: newCustomerData.dogName,
                    breed: newCustomerData.dogBreed || null,
                    birth_date: newCustomerData.dogBirthDate || null,
                    chip: newCustomerData.chip || null
                }
            ]
        };

        try {
            // 2. API-Aufruf zum Erstellen des neuen Benutzers
            await apiClient.post('/api/users', payload, authToken);

            // 3. App-Daten neu laden, um den neuen Kunden in der Liste anzuzeigen
            await fetchAppData();
            console.log('Kunde erfolgreich angelegt!');

        } catch (error) {
            console.error("Fehler beim Anlegen des Kunden:", error);
            alert(`Fehler: ${error}`);
        }
    };

    const handleUpdateCustomer = (updatedCustomer: Customer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    };

    // In der App-Komponente in frontend/index.tsx

    const handleLevelUp = async (customerId: string, newLevelId: number) => {
        try {
            await apiClient.put(`/api/users/${customerId}/level`, { level_id: newLevelId }, authToken);
            console.log(`Kunde erfolgreich auf Level ${newLevelId} hochgestuft!`);
            await fetchAppData(); // Daten neu laden, um die UI zu aktualisieren
        } catch (error) {
            console.error("Fehler beim Level-Up:", error);
            alert(`Fehler: ${error}`);
        }
    };

    const onToggleVipStatus = async (customer: any) => {
        const newStatus = !customer.is_vip;
        // Sende immer beide Werte, um den anderen Status zurückzusetzen
        const payload = { is_vip: newStatus, is_expert: false };
        try {
            await apiClient.put(`/api/users/${customer.id}/status`, payload, authToken);
            await fetchAppData();
            console.log(`VIP Status für ${customer.name} auf ${newStatus} gesetzt.`);
        } catch (error) {
            console.error("Fehler beim Ändern des VIP Status:", error);
        }
    };

    // Umbenannt zu "onToggleExpertStatus"
    const onToggleExpertStatus = async (customer: any) => {
        const newStatus = !customer.is_expert;
        // Sende immer beide Werte, um den anderen Status zurückzusetzen
        const payload = { is_expert: newStatus, is_vip: false };
        try {
            await apiClient.put(`/api/users/${customer.id}/status`, payload, authToken);
            await fetchAppData();
            console.log(`Experten-Status für ${customer.name} auf ${newStatus} gesetzt.`);
        } catch (error) {
            console.error("Fehler beim Ändern des Experten-Status:", error);
        }
    };
    const handleSaveUser = async (userData: any) => {
        if (userModal.user) { // Bearbeiten eines bestehenden Benutzers
            try {
                await apiClient.put(`/api/users/${userModal.user.id}`, userData, authToken);
                await fetchAppData();
                console.log('Benutzer erfolgreich aktualisiert!');
            } catch (error) {
                console.error("Fehler beim Aktualisieren des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
        } else { // Hinzufügen eines neuen Benutzers
            try {
                // Das userData-Objekt enthält jetzt das Passwort aus dem Formular
                await apiClient.post('/api/users', userData, authToken);
                await fetchAppData();
                console.log('Benutzer erfolgreich angelegt!');
            } catch (error) {
                console.error("Fehler beim Anlegen des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
        }
        setUserModal({ isOpen: false, user: null });
    };

    const handleDeleteUser = async () => {
        if (deleteUserModal) {
            try {
                await apiClient.delete(`/api/users/${deleteUserModal.id}`, authToken);
                await fetchAppData(); // Lade die Benutzerliste neu
                console.log('Benutzer erfolgreich gelöscht!');
            } catch (error) {
                console.error("Fehler beim Löschen des Benutzers:", error);
                alert(`Fehler: ${error}`);
            }
            setDeleteUserModal(null); // Schließe das Modal in jedem Fall
        }
    };
    // Innerhalb von App in index.tsx

    const handleSaveCustomerDetails = async (userToUpdate: any, dogToUpdate: any) => {
        try {
            // 1. Benutzerdaten aktualisieren
            const userPayload = {
                name: userToUpdate.name,
                email: userToUpdate.email || null,
                role: userToUpdate.role,
                level_id: userToUpdate.level_id,
                is_active: userToUpdate.is_active,
                balance: userToUpdate.balance,
                phone: userToUpdate.phone || null,
            };
            await apiClient.put(`/api/users/${userToUpdate.id}`, userPayload, authToken);

            // 2. Hundedaten verarbeiten (Update oder Neu)
            if (dogToUpdate) {
                // Daten bereinigen (leere Strings zu null)
                const cleanDogData = {
                    name: dogToUpdate.name,
                    chip: dogToUpdate.chip || null,
                    breed: dogToUpdate.breed || null,
                    birth_date: dogToUpdate.birth_date || null,
                };

                if (dogToUpdate.id) {
                    // Fall A: Hund hat eine ID -> UPDATE (PUT)
                    await apiClient.put(`/api/dogs/${dogToUpdate.id}`, cleanDogData, authToken);
                    console.log('Hund aktualisiert');
                } else {
                    // Fall B: Hund hat KEINE ID -> NEU ANLEGEN (POST)
                    // Wir nutzen den User-ID aus userToUpdate
                    await apiClient.post(`/api/users/${userToUpdate.id}/dogs`, cleanDogData, authToken);
                    console.log('Neuer Hund angelegt');
                }
            }

            // 3. App-Daten neu laden
            await fetchAppData();
            console.log('Daten erfolgreich gespeichert!');

        } catch (error) {
            console.error("Fehler beim Speichern der Details:", error);
            alert(`Ein Fehler ist aufgetreten: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
        }
    };
    const handleSaveDog = async (dogData: any) => {
        const customerId = view.customerId;
        if (!customerId) return;

        // Daten bereinigen: Leere Strings zu null konvertieren
        const cleanDogData = {
            ...dogData,
            birth_date: dogData.birth_date || null,
            breed: dogData.breed || null,
            chip: dogData.chip || null
        };

        try {
            if (dogData.id) {
                // Benutze cleanDogData statt dogData
                await apiClient.put(`/api/dogs/${dogData.id}`, cleanDogData, authToken);
            } else {
                // Benutze cleanDogData statt dogData
                await apiClient.post(`/api/users/${customerId}/dogs`, cleanDogData, authToken);
            }
            await fetchAppData();
            console.log("Hundedaten erfolgreich gespeichert.");
        } catch (error) {
            console.error("Fehler beim Speichern des Hundes:", error);
            alert("Fehler beim Speichern: " + (error instanceof Error ? error.message : "Unbekannter Fehler"));
        }
    };

    const handleConfirmDeleteDog = async () => {
        if (!deletingDog) return;
        try {
            await apiClient.delete(`/api/dogs/${deletingDog.id}`, authToken);
            await fetchAppData();
            console.log("Hund erfolgreich gelöscht.");
        } catch (error) {
            console.error("Fehler beim Löschen des Hundes:", error);
        }
        setDeletingDog(null);
    };
    const onUploadDocuments = async (files: File[], customerId: string) => {
        // NEU: Lade-Spinner mit einer passenden Nachricht aktivieren
        setServerLoading({ active: true, message: 'Lade Dokumente hoch...' });

        try {
            // Lade jede ausgewählte Datei hoch
            for (const file of Array.from(files)) {
                await apiClient.upload(`/api/users/${customerId}/documents`, file, authToken);
            }
            console.log(`${files.length} Dokument(e) erfolgreich hochgeladen.`);
            await fetchAppData(); // Lade die Daten neu, um die Liste zu aktualisieren
        } catch (error) {
            console.error("Fehler beim Dokumenten-Upload:", error);
            // Optional: Zeigen Sie eine Fehlermeldung an
            alert(`Fehler beim Upload: ${error}`);
        } finally {
            // NEU: Lade-Spinner in jedem Fall wieder ausblenden
            setServerLoading({ active: false, message: '' });
        }
    };

    const handleConfirmDeleteDocument = async () => {
        if (!deletingDocument) return;
        try {
            await apiClient.delete(`/api/documents/${deletingDocument.id}`, authToken);
            console.log("Dokument erfolgreich gelöscht.");
            await fetchAppData();
        } catch (error) {
            console.error("Fehler beim Löschen des Dokuments:", error);
        }
        setDeletingDocument(null); // Modal nach der Aktion schließen
    };
    const handleKpiClick = (type: string, color: string, data: { customers: any[]; transactions: any[] }) => {
        let title = '';
        let content: React.ReactNode = null;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const today = now.toDateString();

        const renderCustomerList = (customerList: any[]) => (
            <ul className="info-modal-list">
                {customerList.map(c => {
                    const nameParts = c.name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ');
                    const dogName = c.dogs && c.dogs.length > 0 ? c.dogs[0].name : '-';

                    return (
                        <li key={c.id}>
                            <span>{firstName} {lastName} ({dogName})</span>
                            <span>€ {Math.floor(c.balance).toLocaleString('de-DE')}</span>
                        </li>
                    );
                })}
            </ul>
        );
        const renderTransactionList = (txList: any[]) => (
            <ul className="info-modal-list">
                {txList.map(t => {
                    const cust = data.customers.find(c => c.id === t.user_id);
                    return <li key={t.id}><span>{t.description} - {cust?.name}</span> <span>€ {Math.floor(t.amount).toLocaleString('de-DE')}</span></li>
                })}
            </ul>
        );

        switch (type) {
            case 'allCustomers':
                title = 'Alle Kunden';
                content = renderCustomerList(data.customers);
                break;
            case 'customersWithBalance':
                title = 'Kunden mit Guthaben';
                content = renderCustomerList(data.customers.filter(c => c.balance > 0));
                break;
            case 'transactionsToday':
                title = 'Heutige Transaktionen';
                // KORREKTUR: createdAt -> date (hier war der Absturz)
                content = renderTransactionList(data.transactions.filter(t => new Date(t.date).toDateString() === today));
                break;
            case 'transactionsMonth':
                title = 'Transaktionen im Monat';
                // KORREKTUR: createdAt -> date
                content = renderTransactionList(data.transactions.filter(t => new Date(t.date) >= startOfMonth));
                break;
            case 'activeCustomersMonth':
                title = 'Aktive Kunden im Monat';
                // KORREKTUR: createdAt -> date
                const activeCustomerIds = new Set(data.transactions.filter(tx => new Date(tx.date) >= startOfMonth).map(tx => tx.user_id));
                content = renderCustomerList(data.customers.filter(c => activeCustomerIds.has(c.id)));
                break;
        }
        setModal({ isOpen: true, title, content, color });
    };

    // --- Data Scoping for Mitarbeiter ---
    // In frontend/index.tsx in der App-Komponente

    // --- Data Scoping for Mitarbeiter ---
    const { visibleCustomers, visibleTransactions } = useMemo(() => {
        // Admins sehen immer alles
        if (loggedInUser?.role === 'admin') {
            return { visibleCustomers: customers, visibleTransactions: transactions };
        }

        // Mitarbeiter sehen nur die von ihnen gebuchten Transaktionen
        // und nur die Kunden, die in diesen Transaktionen vorkommen.
        if (loggedInUser?.role === 'mitarbeiter') {
            const staffTransactions = transactions.filter(tx => tx.booked_by_id === loggedInUser.id);
            const customerIdsInPortfolio = new Set(staffTransactions.map(tx => tx.user_id));
            const portfolioCustomers = customers.filter(c => customerIdsInPortfolio.has(c.id));

            return { visibleCustomers: portfolioCustomers, visibleTransactions: staffTransactions };
        }

        // Kunden sehen nur ihre eigenen Daten
        if (loggedInUser?.role === 'kunde') {
            // Die API liefert bereits nur die eigenen Transaktionen
            return { visibleCustomers: customers, visibleTransactions: transactions };
        }

        // Fallback
        return { visibleCustomers: [], visibleTransactions: [] };

    }, [loggedInUser, customers, transactions]);
    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Lade App...</div>;
    }

    if (!authToken || !loggedInUser) {
        return (
            <>
                {isServerLoading.active && <LoadingSpinner message={isServerLoading.message} />}
                <AuthScreen
                    onLoginStart={() => setServerLoading({ active: true, message: 'Verbinde mit Server...' })}
                    onLoginEnd={() => setServerLoading({ active: false, message: '' })}
                    onLoginSuccess={handleLoginSuccess}
                />

                {/* HIER IST DIE KORREKTUR: Das Modal muss auch hier verfügbar sein! */}
                {showPasswordReset && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header blue"><h2>Neues Passwort vergeben</h2></div>
                            <div className="modal-body">
                                <p>Geben Sie hier Ihr neues Passwort ein.</p>
                                <div className="form-group">
                                    <label>Neues Passwort</label>
                                    <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="button button-primary" onClick={handlePasswordUpdate}>Speichern</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (loggedInUser.role === 'kunde') {
        const customer = customers.find(c => c.id === loggedInUser.id);
        // NEU: State, um zwischen den Kundenseiten zu wechseln

        if (customer) {
            return (
                <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
                    <CustomerSidebar
                        user={loggedInUser}
                        onLogout={handleLogout}
                        setSidebarOpen={setIsSidebarOpen}
                        activePage={customerPage} // Wichtig: State übergeben
                        setPage={setCustomerPage}  // Wichtig: Funktion zum Ändern übergeben
                    />

                    <main className="main-content">
                        {isMobileView && (
                            <header className="mobile-header">
                                <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                                    <Icon name="menu" />
                                </button>
                                <div className="mobile-header-logo">
                                    <img src="/paw.png" alt="PfotenCard Logo" className="logo" style={{ width: '32px', height: '32px' }} />
                                    <h2>PfotenCard</h2>
                                </div>
                            </header>
                        )}

                        {/* NEU: Hier wird je nach State die richtige Seite angezeigt */}
                        {customerPage === 'overview' ? (
                            <CustomerDetailPage
                                customer={customer}
                                transactions={transactions}
                                setView={handleSetView}
                                handleLevelUp={handleLevelUp}
                                onSave={handleSaveCustomerDetails}
                                onToggleVipStatus={onToggleVipStatus}
                                onToggleExpertStatus={onToggleExpertStatus}
                                currentUser={loggedInUser}
                                users={users}
                                onUploadDocuments={(files) => onUploadDocuments(files, String(customer.id))}
                                onDeleteDocument={setDeletingDocument}
                                fetchAppData={fetchAppData}
                                authToken={authToken}
                                onDeleteUserClick={setDeleteUserModal}
                                setDogFormModal={setDogFormModal}
                                setDeletingDog={setDeletingDog}
                            />
                        ) : (
                            <CustomerTransactionsPage transactions={transactions} />
                        )}
                    </main>
                    {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
                </div>
            );
        }
        return <div>Kundenprofil konnte nicht geladen werden. Bitte neu anmelden.</div>;
    }


    // Pfad: index.tsx

    const renderContent = () => {
        const kpiClickHandler = (type: string, color: string) => handleKpiClick(type, color, { customers: visibleCustomers, transactions: visibleTransactions });

        if (view.page === 'customers' && view.subPage === 'detail' && view.customerId) {
            const customer = (directAccessedCustomer && String(directAccessedCustomer.id) === view.customerId)
                ? directAccessedCustomer
                : visibleCustomers.find(c => c.id === parseInt(view.customerId));
            if (customer) return <CustomerDetailPage
                customer={customer}
                transactions={transactions}
                setView={handleSetView}
                handleLevelUp={handleLevelUp}
                onSave={handleSaveCustomerDetails}
                fetchAppData={fetchAppData}
                currentUser={loggedInUser}
                users={users}
                onUploadDocuments={onUploadDocuments}
                onDeleteDocument={setDeletingDocument}
                authToken={authToken}
                onDeleteUserClick={setDeleteUserModal}
                onToggleVipStatus={onToggleVipStatus}
                onToggleExpertStatus={onToggleExpertStatus}
                setDogFormModal={setDogFormModal}
                setDeletingDog={setDeletingDog}
            />;
        }
        if (view.page === 'customers' && view.subPage === 'transactions' && view.customerId) {
            const customer = (directAccessedCustomer && String(directAccessedCustomer.id) === view.customerId)
                ? directAccessedCustomer
                : visibleCustomers.find(c => c.id === parseInt(view.customerId));

            if (customer) {
                return <TransactionManagementPage
                    customer={customer}
                    setView={handleSetView}
                    onConfirmTransaction={handleConfirmTransaction}
                    currentUser={loggedInUser}
                />;
            }

            console.error("Fehler: Kunde für die Transaktionsverwaltung konnte nicht gefunden werden.");
            setView({ page: 'dashboard' });
            return null;
        }

        switch (view.page) {
            case 'customers':
                return <KundenPage
                    customers={visibleCustomers}
                    transactions={visibleTransactions}
                    setView={handleSetView}
                    onKpiClick={kpiClickHandler}
                    onAddCustomerClick={() => setAddCustomerModalOpen(true)}
                    currentUser={loggedInUser}
                />;
            case 'reports':
                return <BerichtePage
                    transactions={visibleTransactions}
                    customers={visibleCustomers}
                    users={users}
                    currentUser={loggedInUser}
                />;
            case 'users':
                return loggedInUser.role === 'admin'
                    ? <BenutzerPage
                        users={users}
                        onAddUserClick={() => setUserModal({ isOpen: true, user: null })}
                        onEditUserClick={(user) => setUserModal({ isOpen: true, user })}
                        onDeleteUserClick={(user) => setDeleteUserModal(user)}
                        currentUser={loggedInUser}
                    />
                    : <DashboardPage
                        customers={visibleCustomers}
                        transactions={visibleTransactions}
                        currentUser={loggedInUser}
                        onKpiClick={kpiClickHandler}
                        setView={handleSetView}
                    />;
            case 'dashboard':
            default:
                return <DashboardPage
                    customers={visibleCustomers}
                    transactions={visibleTransactions}
                    currentUser={loggedInUser}
                    onKpiClick={kpiClickHandler}
                    setView={handleSetView}
                />;
        }
    };
    return (
        <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
            {isServerLoading.active && <LoadingSpinner message={isServerLoading.message} />}
            <Sidebar user={loggedInUser} activePage={view.page} setView={handleSetView} onLogout={() => setLoggedInUser(null)} setSidebarOpen={setIsSidebarOpen} />
            <main className="main-content">
                {isMobileView && (
                    <header className="mobile-header">
                        <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                            <Icon name="menu" />
                        </button>
                        <div className="mobile-header-logo">
                            <img src="/paw.png" alt="PfotenCard Logo" className="logo" width="32" height="32" />
                            <h2>PfotenCard</h2>
                        </div>
                    </header>
                )}
                {renderContent()}
            </main>
            {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
            {modal.isOpen && <InfoModal title={modal.title} color={modal.color} onClose={() => setModal({ isOpen: false, title: '', content: null, color: 'green' })}>{modal.content}</InfoModal>}
            {addCustomerModalOpen && <AddCustomerModal onClose={() => setAddCustomerModalOpen(false)} onAddCustomer={handleAddCustomer} />}

            {/* User Management Modals */}
            {userModal.isOpen && <UserFormModal user={userModal.user} onClose={() => setUserModal({ isOpen: false, user: null })} onSave={handleSaveUser} />}
            {deleteUserModal && <DeleteUserModal user={deleteUserModal} onClose={() => setDeleteUserModal(null)} onConfirm={handleDeleteUser} />}
            {deletingDocument && <DeleteDocumentModal document={deletingDocument} onClose={() => setDeletingDocument(null)} onConfirm={handleConfirmDeleteDocument} />}
            {dogFormModal.isOpen && <DogFormModal dog={dogFormModal.dog} onClose={() => setDogFormModal({ isOpen: false, dog: null })} onSave={handleSaveDog} />}
            {deletingDog && <DeleteDogModal dog={deletingDog} onClose={() => setDeletingDog(null)} onConfirm={handleConfirmDeleteDog} />}

            {/* Passwort-Reset Modal */}
            {showPasswordReset && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header blue"><h2>Neues Passwort vergeben</h2></div>
                        <div className="modal-body">
                            <p>Geben Sie hier Ihr neues Passwort ein.</p>
                            <div className="form-group">
                                <label>Neues Passwort</label>
                                <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="button button-primary" onClick={handlePasswordUpdate}>Speichern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Am Ende der Datei index.tsx

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} // <-- DIESE KLAMMER HINZUFÜGEN
