import React, { useState, FC, FormEvent, useMemo, useRef, useEffect, ChangeEvent } from 'react';
import { createRoot } from 'react-dom/client';



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
const EXPERT_LEVEL: Level = { id: 100, name: 'Experte', imageUrl: 'https://hundezentrum-bayerischer-wald.de/wp-content/uploads/2025/08/Experten_Badge.png' };


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
  { id: 'user-customer-2', name: 'Tom Test', email: 'tom@mail.de', role: 'customer', customerId: 'cust-3', createdAt: new Date('2024-01-10')},
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
  2: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
  3: [{ id: 'group_class', name: 'Gruppenstunde', required: 6 }, { id: 'exam', name: 'Prüfung', required: 1 }],
  4: [{ id: 'social_walk', name: 'Social Walk', required: 6 }, { id: 'tavern_training', name: 'Wirtshaustraining', required: 2 }, { id: 'exam', name: 'Prüfung', required: 1 }],
  5: [{ id: 'exam', name: 'Prüfung', required: 1 }],
};
const DOGLICENSE_PREREQS = [
  { id: 'lecture_bonding', name: 'Vortrag Bindung & Beziehung', required: 1 },
  { id: 'lecture_hunting', name: 'Vortrag Jagdverhalten', required: 1 },
  { id: 'ws_communication', name: 'WS Kommunikation & Körpersprache', required: 1 },
  { id: 'ws_stress', name: 'WS Stress- & Impulskontrolle', required: 1 },
  { id: 'theory_license', name: 'Theorieabend Hundeführerschein', required: 1 },
  { id: 'first_aid', name: 'Erste-Hilfe-Kurs', required: 1},
];

const getProgressForLevel = (
    customerId: string,
    levelId: number,
    allTransactions: Transaction[],
    levelUpHistory: { [key: number]: Date }
) => {
    const progress: { [key: string]: number } = {};
    const requirements = LEVEL_REQUIREMENTS[levelId] || [];
    if (requirements.length === 0) return progress;

    const levelStartDate = levelUpHistory[levelId];
    if (!levelStartDate) return progress; // Level not yet unlocked

    const nextLevelStartDate = levelUpHistory[levelId + 1];

    const relevantTransactions = allTransactions.filter(t => 
        t.customerId === customerId &&
        t.createdAt >= levelStartDate &&
        (!nextLevelStartDate || t.createdAt < nextLevelStartDate)
    );

    if (levelId === 5) {
        // For Level 5, an exam only counts if all prerequisites were met AT THE TIME of the exam.
        relevantTransactions.forEach(tx => {
            if (tx.meta?.requirementId) {
                if (tx.meta.requirementId === 'exam') {
                    // Check prereq status at the time of this specific exam transaction.
                    const prereqProgressAtExamTime = getPrereqProgress(customerId, allTransactions, tx.createdAt);
                    const allPrereqsMetAtExamTime = DOGLICENSE_PREREQS.every(req => (prereqProgressAtExamTime[req.id] || 0) >= req.required);
                    
                    if (allPrereqsMetAtExamTime) {
                        progress[tx.meta.requirementId] = (progress[tx.meta.requirementId] || 0) + 1;
                    }
                }
            }
        });
    } else {
        // Original logic for all other levels
        relevantTransactions.forEach(tx => {
            if (tx.meta?.requirementId) {
                progress[tx.meta.requirementId] = (progress[tx.meta.requirementId] || 0) + 1;
            }
        });
    }

    return progress;
};

const getPrereqProgress = (customerId: string, allTransactions: Transaction[], untilDate?: Date) => {
    const progress: { [key: string]: number } = {};
    const prereqIds = new Set(DOGLICENSE_PREREQS.map(p => p.id));
    
    let transactionsToConsider = allTransactions
        .filter(t => t.customerId === customerId && t.meta?.requirementId && prereqIds.has(t.meta.requirementId));

    if (untilDate) {
        transactionsToConsider = transactionsToConsider.filter(t => t.createdAt <= untilDate);
    }
        
    transactionsToConsider.forEach(tx => {
        if (tx.meta?.requirementId) {
            progress[tx.meta.requirementId] = (progress[tx.meta.requirementId] || 0) + 1;
        }
    });

    return progress;
}


const areLevelRequirementsMet = (customer: Customer, transactions: Transaction[]): boolean => {
    if (customer.levelId === 1) return true;

    const currentLevelProgress = getProgressForLevel(customer.id, customer.levelId, transactions, customer.levelUpHistory);
    
    if (customer.levelId === 5) {
        const prereqProgress = getPrereqProgress(customer.id, transactions);
        const mainReqMet = (LEVEL_REQUIREMENTS[5] || []).every(req => (currentLevelProgress[req.id] || 0) >= req.required);
        const prereqsMet = DOGLICENSE_PREREQS.every(req => (prereqProgress[req.id] || 0) >= req.required);
        return mainReqMet && prereqsMet;
    }
    
    const requirements = LEVEL_REQUIREMENTS[customer.levelId];
    if (!requirements) return false;

    return requirements.every(req => {
        const currentCount = currentLevelProgress[req.id] || 0;
        return currentCount >= req.required;
    });
};


// --- ICONS ---
const Icon = ({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) => {
    const icons: { [key: string]: React.ReactNode } = {
      dashboard: <><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></>,
      customers: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
      reports: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></>,
      users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
      user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
      mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
      phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
      calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></>,
      logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
      arrowLeft: <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
      arrowRight: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
      arrowDown: <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>,
      check: <path d="M20 6 9 17l-5-5"/>,
      x: <path d="M18 6 6 18"/><path d="m6 6 12 12"/>,
      paw: <path fill="currentColor" stroke="none" d="M12.98 3.25a2.25 2.25 0 0 0-2.12 1.5L9.5 9.25a3.75 3.75 0 0 1-6.94-.25L1.5 3.5a2.25 2.25 0 0 0-2.12-1.5c-1.3 0-2.38 1.12-2.38 2.5v.5a2.25 2.25 0 0 0 1.13 2c1.4.93 3.38 2.5 3.38 2.5s2.05-1.5 3.5-2.5a2.25 2.25 0 0 0 1.12-2v-.5c0-1.38-1.07-2.5-2.37-2.5Z M22.5 3.5a2.25 2.25 0 0 0-2.13-1.5c-1.3 0-2.37 1.12-2.37 2.5v.5a2.25 2.25 0 0 0 1.12 2c1.46.94 3.44 2.5 3.44 2.5s1.98-1.56 3.38-2.5a2.25 2.25 0 0 0 1.13-2v-.5c0-1.38-1.08-2.5-2.38-2.5s-2.38 1.12-2.38 2.5Z"/>,
      creditCard: <><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>,
      heart: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></>,
      trendingUp: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
      edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
      trash: <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
      file: <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></>,
      share: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></>,
      upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>,
      download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
      printer: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
      wifi: <><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/></>,
      refresh: <><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.2"/></>,
      menu: <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></>,
    };
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>{icons[name] || null}</svg>;
};

// --- AUTH KOMPONENTE ---
const AuthScreen: FC<{ users: User[], onLogin: (user: User) => void }> = ({ users, onLogin }) => {
    const [selectedUserId, setSelectedUserId] = useState<string>(users[0].id);
    const handleLogin = (e: FormEvent) => {
        e.preventDefault();
        const user = users.find(u => u.id === selectedUserId);
        if (user) onLogin(user);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>PfotenCard</h1>
                <p className="subtitle">Hundeschul-Verwaltung</p>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="user-select">Anmelden als (Test-Auswahl)</label>
                        <select id="user-select" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="form-input">
                            {users.map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
                        </select>
                    </div>
                    <button type="submit" className="button button-primary" style={{ marginTop: '1rem', width: '100%' }}>Anmelden</button>
                </form>
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
            window.removeEventListener('offline',handleOffline);
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
                <Icon name="paw" className="logo" />
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

const CustomerSidebar: FC<{ user: User; onLogout: () => void; setSidebarOpen: (isOpen: boolean) => void; }> = ({ user, onLogout, setSidebarOpen }) => {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Icon name="paw" className="logo" />
                <h2>PfotenCard</h2>
                <button className="sidebar-close-button" onClick={() => setSidebarOpen(false)} aria-label="Menü schließen">
                    <Icon name="x" />
                </button>
            </div>
            <OnlineStatusIndicator />
            <nav className="sidebar-nav">
                <a href="#" className="nav-link active" onClick={(e) => e.preventDefault()}>
                    <Icon name="user" />
                    <span>Meine Karte</span>
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

const AddCustomerModal: FC<{ onClose: () => void, onAddCustomer: (newCustomer: Omit<Customer, 'id'|'createdBy'|'createdAt'|'levelId'|'balance'|'levelUpHistory'>) => void }> = ({ onClose, onAddCustomer }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dogName, setDogName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [chip, setChip] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!firstName || !lastName || !dogName) {
            alert('Bitte füllen Sie alle Pflichtfelder aus.');
            return;
        }
        onAddCustomer({
            firstName,
            lastName,
            dogName,
            isVip: false,
            isExpert: false,
            email,
            phone,
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
                        <div className="form-grid">
                            <div className="form-group"><label>Vorname*</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                            <div className="form-group"><label>Nachname*</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
                            <div className="form-group"><label>E-Mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                            <div className="form-group"><label>Telefon</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
                            <div className="form-group"><label>Hundename*</label><input type="text" value={dogName} onChange={e => setDogName(e.target.value)} required /></div>
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
    customers: Customer[], 
    transactions: Transaction[], 
    currentUser: User,
    onKpiClick: (type: string, color: string) => void,
    setView: (view: View) => void,
}> = ({ customers, transactions, currentUser, onKpiClick, setView }) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersThisMonth = useMemo(() => customers.filter(c => transactions.some(t => t.customerId === c.id && t.createdAt >= startOfMonth)), [customers, transactions, startOfMonth]);
    const recentTransactions = [...transactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const today = new Date().toDateString();
    const transactionsToday = transactions.filter(t => t.createdAt.toDateString() === today).length;
    const transactionsMonth = transactions.filter(t => t.createdAt >= startOfMonth).length;

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
                        {activeCustomersThisMonth.slice(0, 4).map(cust => (
                            <li key={cust.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: cust.id })} className="clickable">
                                <div className={`initials-avatar ${getAvatarColorClass(cust.firstName)}`}>
                                    {getInitials(cust.firstName, cust.lastName)}
                                </div>
                                <div className="info">
                                    <div className="customer-name">{cust.firstName} {cust.lastName}</div>
                                    <div className="dog-name">{cust.dogName}</div>
                                </div>
                                <div className="balance">{Math.floor(cust.balance).toLocaleString('de-DE')} €</div>
                            </li>
                        ))}
                    </ul>
                 </div>
                 <div className="content-box">
                    <h2>Letzte Transaktionen</h2>
                    <ul className="transaction-list">
                        {recentTransactions.map(tx => {
                            const customer = customers.find(c => c.id === tx.customerId);
                            return (
                                <li key={tx.id}>
                                    <div className={`icon ${tx.amount < 0 ? 'down' : 'up'}`}><Icon name="arrowDown" /></div>
                                    <div className="info">
                                        <div className="customer">{customer?.firstName} {customer?.lastName}</div>
                                        <div className="details">{tx.createdAt.toLocaleDateString('de-DE')} - {tx.title}</div>
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
    onAddCustomerClick: () => void 
}> = ({ customers, transactions, setView, onKpiClick, onAddCustomerClick }) => {
    const [filterLetter, setFilterLetter] = useState('Alle');
    
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const activeCustomersCount = useMemo(() => new Set(transactions.filter(tx => tx.createdAt >= startOfMonth).map(tx => tx.customerId)).size, [transactions, startOfMonth]);
    const totalCredit = customers.reduce((sum, cust) => sum + cust.balance, 0);
    const transactionsMonthCount = transactions.filter(tx => tx.createdAt >= startOfMonth).length;

    const filteredCustomers = useMemo(() => {
        if (filterLetter === 'Alle') return customers;
        return customers.filter(c => c.lastName.toUpperCase().startsWith(filterLetter));
    }, [customers, filterLetter]);

    return (
        <>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Kundenverwaltung</h1>
                    <p>Verwalten Sie alle Ihre Kunden an einem Ort</p>
                </div>
                <div className="header-actions">
                    <button className="button button-primary" onClick={onAddCustomerClick}>+ Neuer Kunde</button>
                </div>
            </header>
            <div className="kpi-grid">
                 <KpiCard title="Kunden Gesamt" value={customers.length.toString()} icon="customers" bgIcon="customers" color="green" onClick={() => onKpiClick('allCustomers', 'green')}/>
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
                            const level = LEVELS.find(l => l.id === customer.levelId);
                            return (
                                <tr key={customer.id} onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: customer.id })}>
                                    <td data-label="Kunde">
                                        <div className="customer-info">
                                            <div className={`initials-avatar ${getAvatarColorClass(customer.firstName)}`}>
                                                {getInitials(customer.firstName, customer.lastName)}
                                            </div>
                                            <div>
                                                <div className="name">{customer.firstName} {customer.lastName}</div>
                                                <div className="id">{customer.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td data-label="Hund">{customer.dogName}</td>
                                    <td data-label="Guthaben">€ {Math.floor(customer.balance).toLocaleString('de-DE')}</td>
                                    <td data-label="Level"><span className="level-badge">{level?.name}</span></td>
                                    <td data-label="Erstellt">{customer.createdAt.toLocaleDateString('de-DE')}</td>
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
    customer: Customer; 
    transactions: Transaction[]; 
    setView: (view: View) => void;
    handleLevelUp: (customerId: string, newLevelId: number) => void;
    onUpdateCustomer: (updatedCustomer: Customer) => void;
    onToggleVipStatus: (customerId: string) => void;
    onPromoteToExpert: (customerId: string) => void;
    currentUser: User;
    users: User[];
    documents: DocumentFile[];
    onUploadDocuments: (files: FileList, customerId: string) => void;
    onDeleteDocument: (documentId: string) => void;
}> = ({ customer, transactions, setView, handleLevelUp, onUpdateCustomer, onToggleVipStatus, onPromoteToExpert, currentUser, users, documents, onUploadDocuments, onDeleteDocument }) => {
    let displayLevel: Level | undefined | null = null;
    if (customer.isVip) {
        displayLevel = VIP_LEVEL;
    } else if (customer.isExpert) {
        displayLevel = EXPERT_LEVEL;
    } else {
        displayLevel = LEVELS.find(l => l.id === customer.levelId);
    }
    
    const creator = users.find(u => u.id === customer.createdBy);
    const canLevelUp = areLevelRequirementsMet(customer, transactions);
    const showLevelUpButton = (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') && canLevelUp && !customer.isVip && !customer.isExpert && customer.levelId < LEVELS.length;
    
    const showPromoteToExpertButton = (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
      customer.levelId === 5 &&
      canLevelUp &&
      !customer.isExpert &&
      !customer.isVip;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [canShare, setCanShare] = useState(false);
    const [viewingDocument, setViewingDocument] = useState<DocumentFile | null>(null);
    const [deletingDocument, setDeletingDocument] = useState<DocumentFile | null>(null);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const customerTransactions = transactions.filter(t => t.customerId === customer.id);

    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer>(customer);

    useEffect(() => {
        setEditedCustomer(customer);
    }, [customer]);

    useEffect(() => {
        if (navigator.share && typeof File === 'function') {
            setCanShare(true);
        }
    }, []);

    const handleSave = () => {
        onUpdateCustomer(editedCustomer);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedCustomer(customer);
        setIsEditing(false);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedCustomer(prev => ({ ...prev, [name]: value }));
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onUploadDocuments(event.target.files, customer.id);
            event.target.value = ''; // Reset file input to allow re-uploading the same file
        }
    };

    const handleShare = async (doc: DocumentFile) => {
        if (navigator.share && doc.file) {
            try {
                await navigator.share({ files: [doc.file], title: doc.name });
            } catch (error) {
                console.error('Error sharing file:', error);
            }
        }
    };

    const renderRequirement = (req: { id: string; name: string; required: number }, levelIdForProgress: number | null = null) => {
        let progress = 0;
        
        if (levelIdForProgress) { // Core level requirement
            const levelProgress = getProgressForLevel(customer.id, levelIdForProgress, transactions, customer.levelUpHistory);
            progress = levelProgress[req.id] || 0;
        } else { // Prereq, can be done anytime
            const prereqProgress = getPrereqProgress(customer.id, transactions);
            progress = prereqProgress[req.id] || 0;
        }

        const currentCount = Math.min(progress, req.required);
        const isCompleted = currentCount >= req.required;

        return (
            <li key={`${req.id}-${levelIdForProgress}`}>
                <div className={`req-icon ${isCompleted ? 'completed' : 'incomplete'}`} >
                    <Icon name={isCompleted ? "check" : "x"} />
                </div>
                <span className="req-text">{req.name}</span>
                <span className="req-progress">{currentCount} / {req.required}</span>
            </li>
        );
    };

    const LevelUpButton = ({ customerId, nextLevelId }: { customerId: string, nextLevelId: number}) => (
        <div className="level-up-button-container">
            <button className="button button-secondary" onClick={() => handleLevelUp(customerId, nextLevelId)}>
                <Icon name="trendingUp" /> Ins nächste Level freischalten
            </button>
        </div>
    );

    return (
        <>
            <header className="detail-header">
               { (currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
                 <button className="back-button" onClick={() => setView({ page: 'customers' })}>
                    <Icon name="arrowLeft" />
                </button>
               }
                <div className="detail-header-info">
                    <h1>{customer.firstName} {customer.lastName}</h1>
                    <p>Kundendetails & Übersicht</p>
                </div>
                <div className="header-actions" style={{ marginLeft: 'auto' }}>
                   {(currentUser.role === 'admin' || currentUser.role === 'mitarbeiter') &&
                    <>
                        {isEditing ? (
                            <>
                                <button className="button button-outline" onClick={handleCancelEdit}>Abbrechen</button>
                                <button className="button button-secondary" onClick={handleSave}>Speichern</button>
                            </>
                        ) : (
                            <>
                                <button className="button button-outline" onClick={() => setIsEditing(true)}>Stammdaten</button>
                                {currentUser.role === 'admin' && (
                                  customer.isVip ? (
                                      <button className="button button-outline" onClick={() => onToggleVipStatus(customer.id)}>VIP-Status aberkennen</button>
                                  ) : (
                                      <button className="button button-secondary" onClick={() => onToggleVipStatus(customer.id)}>Zum VIP ernennen</button>
                                  )
                                )}
                                <button className="button button-primary" onClick={() => setView({ page: 'customers', subPage: 'transactions', customerId: customer.id })}>Guthaben verwalten</button>
                            </>
                        )}
                    </>
                    }
                    {(currentUser.role === 'customer') &&
                        <>
                            {isEditing ? (
                                <>
                                    <button className="button button-outline" onClick={handleCancelEdit}>Abbrechen</button>
                                    <button className="button button-secondary" onClick={handleSave}>Speichern</button>
                                </>
                            ) : (
                                <button className="button button-primary" onClick={() => setIsEditing(true)}>Daten bearbeiten</button>
                            )}
                        </>
                    }
                </div>
            </header>
            <div className="detail-grid">
                <div className="main-col">
                    <div className="content-box">
                        <h2 style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)'}}>Persönliche Daten</h2>
                        <div className="personal-data-container">
                             <div className={`personal-data-avatar ${getAvatarColorClass(customer.firstName)}`}>
                                {getInitials(customer.firstName, customer.lastName)}
                            </div>
                            <div className="personal-data-fields">
                                <div className="data-field">
                                    <Icon name="user" />
                                    <div className="field-content">
                                        <label>Vorname</label>
                                        {isEditing ? <input type="text" name="firstName" value={editedCustomer.firstName} onChange={handleInputChange} disabled /> : <p>{customer.firstName}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="user" />
                                    <div className="field-content">
                                        <label>Nachname</label>
                                        {isEditing ? <input type="text" name="lastName" value={editedCustomer.lastName} onChange={handleInputChange} disabled /> : <p>{customer.lastName}</p>}
                                    </div>
                                </div>
                                 <div className="data-field">
                                    <Icon name="mail" />
                                    <div className="field-content">
                                        <label>E-Mail</label>
                                        {isEditing ? <input type="email" name="email" value={editedCustomer.email || ''} onChange={handleInputChange} /> : <p>{customer.email || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="phone" />
                                    <div className="field-content">
                                        <label>Telefon</label>
                                        {isEditing ? <input type="tel" name="phone" value={editedCustomer.phone || ''} onChange={handleInputChange} /> : <p>{customer.phone || '-'}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="heart" />
                                    <div className="field-content">
                                        <label>Hund</label>
                                        {isEditing ? <input type="text" name="dogName" value={editedCustomer.dogName} onChange={handleInputChange} /> : <p>{customer.dogName}</p>}
                                    </div>
                                </div>
                                <div className="data-field">
                                    <Icon name="calendar" />
                                    <div className="field-content">
                                        <label>Chipnummer</label>
                                        {isEditing ? <input type="text" name="chip" value={editedCustomer.chip || ''} onChange={handleInputChange} /> : <p>{customer.chip || '-'}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="content-box account-overview-box">
                        <h2>Konto-Übersicht</h2>
                        <div className="overview-tile-grid">
                            <div className="overview-tile balance">
                                <div className="tile-content">
                                    <span className="label">Aktuelles Guthaben</span>
                                    <span className="value">{customer.balance.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                                </div>
                            </div>
                            <button className="overview-tile clickable transactions" onClick={() => setIsTxModalOpen(true)}>
                                <div className="tile-content">
                                    <span className="label">Transaktionen gesamt</span>
                                    <span className="value">{customerTransactions.length}</span>
                                </div>
                            </button>
                            <div className="overview-tile level">
                                <div className="tile-content">
                                    <span className="label">{customer.isVip || customer.isExpert ? 'Status' : displayLevel?.name}</span>
                                    <span className="value">{customer.isVip ? 'VIP-Kunde' : customer.isExpert ? 'Experte' : `Level ${customer.levelId}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="level-progress-container">
                        <h2>Level-Fortschritt</h2>
                        <div className="level-accordion">
                             <div className={`level-item state-${customer.levelId === 1 && !customer.isVip ? 'active' : 'completed'}`}>
                                <div className={`level-header header-level-1`}>
                                    <div className="level-number level-1">1</div>
                                    <div className="level-title">{LEVELS.find(l => l.id === 1)?.name}</div>
                                    <span className="level-status-badge">{customer.levelId > 1 || customer.isVip ? 'Abgeschlossen' : 'Aktuell'}</span>
                                </div>
                                <div className="level-content">
                                    <p className="no-requirements">Keine Voraussetzungen zum Aufsteigen nötig.</p>
                                </div>
                            </div>
                            {showLevelUpButton && customer.levelId === 1 && (
                                <LevelUpButton customerId={customer.id} nextLevelId={2} />
                            )}

                            {Object.entries(LEVEL_REQUIREMENTS).map(([levelIdStr, reqs]) => {
                                const levelId = parseInt(levelIdStr);
                                const isCompleted = levelId < customer.levelId || customer.isVip || (levelId === 5 && customer.isExpert);
                                const isActive = levelId === customer.levelId && !customer.isVip && !customer.isExpert;
                                const state = isCompleted ? 'completed' : isActive ? 'active' : 'locked';
                                const levelInfo = LEVELS.find(l => l.id === levelId);
                                return (
                                    <React.Fragment key={levelId}>
                                        <div className={`level-item state-${state}`}>
                                            <div className={`level-header header-level-${levelId}`}>
                                                <div className={`level-number level-${levelId}`}>{levelId}</div>
                                                <div className="level-title">{levelInfo?.name}</div>
                                                {showPromoteToExpertButton && levelId === 5 && (
                                                    <button className="button button-secondary button-small" onClick={() => onPromoteToExpert(customer.id)}>
                                                        Zum Experten ernennen
                                                    </button>
                                                )}
                                                <span className="level-status-badge">{isCompleted ? 'Abgeschlossen' : isActive ? 'Aktuell' : 'Gesperrt'}</span>
                                            </div>
                                            <div className="level-content">
                                                <ul>{reqs.map(r => renderRequirement(r, levelId))}</ul>
                                            </div>
                                        </div>
                                        {showLevelUpButton && isActive && (
                                            <LevelUpButton customerId={customer.id} nextLevelId={levelId + 1} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                     <div className="level-progress-container" style={{marginTop: '1.5rem'}}>
                        <h2>Zusatz-Veranstaltungen (für Hundeführerschein)</h2>
                        <div className="level-content" style={{padding: 0}}><ul>{DOGLICENSE_PREREQS.map(r => renderRequirement(r))}</ul></div>
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
                            <li><span className="label">Transaktionen</span><span className="value">{transactions.filter(t => t.customerId === customer.id).length}</span></li>
                            <li><span className="label">Erstellt am</span><span className="value">{customer.createdAt.toLocaleDateString('de-DE')}</span></li>
                            <li><span className="label">Erstellt von</span><span className="value">{creator?.name}</span></li>
                        </ul>
                    </div>
                    <div className="side-card qr-code-container">
                         <h2>QR-Code</h2>
                         <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${customer.id}`} alt="QR Code" />
                         <p>Scannen, um diese Kundenkarte schnell aufzurufen.</p>
                    </div>
                    <div className="side-card">
                        <h2 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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
                        {documents.length > 0 ? (
                            <ul className="document-list">
                                {documents.map(doc => (
                                    <li key={doc.id}>
                                        <Icon name="file" className="doc-icon" />
                                        <div className="doc-info" onClick={() => setViewingDocument(doc)} role="button" tabIndex={0}>
                                            <div className="doc-name">{doc.name}</div>
                                            <div className="doc-size">{(doc.size / 1024).toFixed(1)} KB</div>
                                        </div>
                                        <div className="doc-actions">
                                            {canShare && <button className="action-icon-btn" onClick={() => handleShare(doc)} aria-label="Teilen"><Icon name="share" /></button>}
                                            <button className="action-icon-btn delete" onClick={() => setDeletingDocument(doc)} aria-label="Löschen"><Icon name="trash" /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                           <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Keine Dokumente vorhanden.</p>
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
                        {customerTransactions.length > 0 ? (
                            customerTransactions
                                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                                .map(t => (
                                    <li key={t.id}>
                                        <span>
                                            {t.createdAt.toLocaleDateString('de-DE')} - {t.title}
                                        </span>
                                        <span style={{ fontWeight: 600, color: t.amount < 0 ? 'var(--brand-red)' : 'var(--brand-green)'}}>
                                            € {t.amount.toLocaleString('de-DE')}
                                        </span>
                                    </li>
                                ))
                        ) : (
                            <li>
                                <p style={{textAlign: 'center', padding: '1rem 0', width: '100%'}}>Keine Transaktionen vorhanden.</p>
                            </li>
                        )}
                    </ul>
                </InfoModal>
            )}
        </>
    );
};

const TransactionManagementPage: FC<{ customer: Customer; setView: (view: View) => void, onConfirmTransaction: (tx: any) => void, currentUser: User }> = ({ customer, setView, onConfirmTransaction, currentUser }) => {
    const [modalData, setModalData] = useState<(Omit<Transaction, 'id'|'createdAt'|'customerId'|'createdBy'> & { baseAmount?: number, bonus?: number }) | null>(null);

    const topups = [
      { title: 'Aufladung 15€', amount: 15, bonus: 0 }, { title: 'Aufladung 50€', amount: 50, bonus: 5 }, { title: 'Aufladung 100€', amount: 100, bonus: 20 },
      { title: 'Aufladung 150€', amount: 150, bonus: 35 }, { title: 'Aufladung 300€', amount: 300, bonus: 75 }, { title: 'Aufladung 500€', amount: 500, bonus: 150 },
    ];
    const debits = [
      { title: 'Gruppenstunde', amount: -12, reqId: 'group_class' },
      { title: 'Trail', amount: -18, reqId: 'trail' },
      { title: 'Prüfungsstunde', amount: -12, reqId: 'exam' },
      { title: 'Social Walk', amount: -12, reqId: 'social_walk' },
      { title: 'Wirtshaustraining', amount: -12, reqId: 'tavern_training' },
      { title: 'Erste Hilfe Kurs', amount: -50, reqId: 'first_aid' },
      { title: 'Vortrag Bindung & Beziehung', amount: -12, reqId: 'lecture_bonding' },
      { title: 'Vortrag Jagdverhalten', amount: -12, reqId: 'lecture_hunting' },
      { title: 'WS Kommunikation & Körpersprache', amount: -12, reqId: 'ws_communication' },
      { title: 'WS Stress & Impulskontrolle', amount: -12, reqId: 'ws_stress' },
      { title: 'Theorieabend Hundeführerschein', amount: -24, reqId: 'theory_license' },
    ];

    const handleTxClick = (data: {title: string, amount: number, bonus?: number, reqId?: string}) => {
         if (data.bonus !== undefined) { 
            const totalAmount = data.amount + data.bonus;
            setModalData({ title: data.title, amount: totalAmount, type: 'topup', baseAmount: data.amount, bonus: data.bonus });
        } else {
            setModalData({ title: data.title, amount: data.amount, type: 'debit', meta: { requirementId: data.reqId } });
        }
    }
    
    return (
        <>
            <header className="detail-header">
                <button className="back-button" onClick={() => setView({ page: 'customers', subPage: 'detail', customerId: customer.id })}>
                    <Icon name="arrowLeft" />
                </button>
                <div className="detail-header-info">
                    <h1>Transaktionen verwalten</h1>
                    <p>für {customer.firstName} {customer.lastName}</p>
                </div>
            </header>
            <div className="tx-header-card">
                <p>Aktuelles Guthaben</p>
                <h2>€ {Math.floor(customer.balance).toLocaleString('de-DE')}</h2>
            </div>
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
            </div>
             <div className="tx-section debits">
                <h3>Abbuchungen (Training & Kurse)</h3>
                 <div className="tx-grid">
                    {debits.map(d => (
                        <button 
                          key={d.title} 
                          className="tx-button debit" 
                          onClick={() => handleTxClick(d)}
                          disabled={customer.balance + d.amount < 0}
                          title={customer.balance + d.amount < 0 ? 'Guthaben nicht ausreichend' : ''}
                        >
                            <div className="info"><div className="title">{d.title}</div></div>
                            <div className="amount">{d.amount.toFixed(0)} €</div>
                        </button>
                    ))}
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
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '1rem', flexGrow: 1}}>
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

const BerichtePage: FC<{
    transactions: Transaction[], 
    customers: Customer[], 
    users: User[], 
    currentUser: User
}> = ({ transactions, customers, users, currentUser }) => {
    const now = new Date();
    const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
    
    // For admin, default to all, for mitarbeiter, default to self
    const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<string>(
      currentUser.role === 'admin' ? 'all' : currentUser.id
    );

    // Dynamic period initialization
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');

    const availablePeriods = useMemo(() => {
        const periods: { monthly: Set<string>, yearly: Set<string> } = { monthly: new Set(), yearly: new Set() };
        transactions.forEach(tx => {
            const date = tx.createdAt;
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
        if (!selectedPeriod) { // Set initial period only once
            if (reportType === 'monthly' && availablePeriods.monthly.length > 0) {
                setSelectedPeriod(availablePeriods.monthly[0]);
            } else if (reportType === 'yearly' && availablePeriods.yearly.length > 0) {
                setSelectedPeriod(availablePeriods.yearly[0]);
            }
        }
    }, [reportType, availablePeriods, selectedPeriod]);
    
    const filteredTransactions = useMemo(() => {
        if (!selectedPeriod) return [];
        return transactions.filter(tx => {
            const txDate = tx.createdAt;
            const year = txDate.getFullYear().toString();
            const month = `${year}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            
            const periodMatch = (reportType === 'yearly') ? (year === selectedPeriod) : (month === selectedPeriod);
            const mitarbeiterMatch = (selectedMitarbeiter === 'all') || (tx.createdBy === selectedMitarbeiter);
            
            return periodMatch && mitarbeiterMatch;
        });
    }, [transactions, reportType, selectedPeriod, selectedMitarbeiter]);

    const revenue = filteredTransactions.filter(t => t.type !== 'debit').reduce((sum, tx) => sum + tx.amount, 0);
    const debits = filteredTransactions.filter(t => t.type === 'debit').reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const topCustomers = useMemo(() => {
        const customerSpending: {[key: string]: {customer: Customer, count: number, total: number}} = {};
        filteredTransactions.filter(tx => tx.type === 'debit').forEach(tx => {
            const cust = customers.find(c => c.id === tx.customerId);
            if (!cust) return;
            const key = cust.id;
            if (!customerSpending[key]) customerSpending[key] = { customer: cust, count: 0, total: 0};
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
        const headers = ["Datum", "Kunde", "Hund", "Titel", "Typ", "Betrag", "Erstellt von"];
        const rows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.customerId);
            const creator = users.find(u => u.id === tx.createdBy);
            return [
                tx.createdAt.toLocaleString('de-DE'),
                `${customer?.firstName || ''} ${customer?.lastName || ''}`,
                customer?.dogName || '',
                tx.title,
                tx.type,
                tx.amount,
                creator?.name || 'Unbekannt'
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `bericht_${selectedPeriod}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const reportTitle = `Bericht für ${formatPeriodForDisplay(selectedPeriod, reportType)}`;
        const mitarbeiter = selectedMitarbeiter === 'all' ? 'Alle Mitarbeiter' : users.find(u => u.id === selectedMitarbeiter)?.name;
        
        let tableRows = filteredTransactions.map(tx => {
            const customer = customers.find(c => c.id === tx.customerId);
            const creator = users.find(u => u.id === tx.createdBy);
            return `
                <tr>
                    <td>${tx.createdAt.toLocaleDateString('de-DE')}</td>
                    <td>${customer?.firstName} ${customer?.lastName}</td>
                    <td>${tx.title}</td>
                    <td>${creator?.name}</td>
                    <td style="text-align: right; color: ${tx.amount < 0 ? 'red' : 'green'};">${tx.amount.toLocaleString('de-DE')} €</td>
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
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    <h3>Mitarbeiter: ${mitarbeiter}</h3>
                    <div class="summary">
                        <div class="summary-item">
                            <div class="label">Gesamteinnahmen</div>
                            <div class="value" style="color: green;">${revenue.toLocaleString('de-DE')} €</div>
                        </div>
                        <div class="summary-item">
                            <div class="label">Gesamtabbuchungen</div>
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
                                <th style="text-align: right;">Betrag</th>
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
                <p>Analysieren und exportieren Sie Ihre Geschäftsdaten</p>
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
                                {users.filter(u => u.role !== 'customer').map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
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
                <KpiCard title={`Gesamtaufladungen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`} value={`€ ${Math.floor(revenue).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="green" />
                <KpiCard title={`Abbuchungen (${reportType === 'monthly' ? 'Monat' : 'Jahr'})`} value={`€ ${Math.floor(debits).toLocaleString('de-DE')}`} icon="creditCard" bgIcon="creditCard" color="orange" />
                <KpiCard title="Transaktionen" value={filteredTransactions.length.toString()} icon="trendingUp" bgIcon="trendingUp" color="blue" />
                <KpiCard title="Aktive Kunden" value={new Set(filteredTransactions.map(tx => tx.customerId)).size.toString()} icon="customers" bgIcon="customers" color="purple" />
            </div>
            <div className="dashboard-bottom-grid">
                <div className="content-box">
                    <h2>Transaktionen im Zeitraum ({filteredTransactions.length})</h2>
                    <ul className="detailed-transaction-list">
                         {filteredTransactions.length > 0 ? filteredTransactions.map(tx => {
                            const customer = customers.find(c => c.id === tx.customerId);
                            const creator = users.find(u => u.id === tx.createdBy);
                            return (
                                <li key={tx.id}>
                                    <div className={`tx-icon ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        <Icon name={tx.amount < 0 ? 'arrowDown' : 'trendingUp'} />
                                    </div>
                                    <div className="tx-details">
                                        <div className="tx-line-1">
                                            <span className="tx-title">{tx.title}</span>
                                            <span className="tx-customer">für {customer?.firstName} {customer?.lastName}</span>
                                        </div>
                                        <div className="tx-line-2">
                                            <span>{tx.createdAt.toLocaleDateString('de-DE')}</span>
                                            {creator && <span className="tx-creator">&bull; von {creator.name}</span>}
                                        </div>
                                    </div>
                                    <div className={`tx-amount ${tx.amount < 0 ? 'debit' : 'topup'}`}>
                                        € {Math.floor(tx.amount).toLocaleString('de-DE')}
                                    </div>
                                </li>
                            );
                        }) : <p style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0'}}>Keine Transaktionen für den gewählten Filter.</p>}
                    </ul>
                </div>
                <div className="content-box">
                    <h2>Top Kunden im Zeitraum</h2>
                     <ul className="top-customer-list">
                       {topCustomers.length > 0 ? topCustomers.map((custData, index) => (
                            <li key={custData.customer.id}>
                                <div className="rank">{index + 1}</div>
                                <div className={`initials-avatar ${getAvatarColorClass(custData.customer.firstName)}`}>
                                    {getInitials(custData.customer.firstName, custData.customer.lastName)}
                                </div>
                                <div className="info">
                                    <div className="name">{custData.customer.firstName} {custData.customer.lastName}</div>
                                    <div className="tx-count">{custData.customer.dogName} &bull; {custData.count} Transaktionen</div>
                                </div>
                                <div className="amount">€ {Math.floor(custData.total).toLocaleString('de-DE')}</div>
                            </li>
                        )) : <p style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0'}}>Keine Kundendaten für den gewählten Filter.</p>}
                    </ul>
                </div>
            </div>
        </>
    );
};

const UserFormModal: FC<{ 
    user?: User | null;
    onClose: () => void;
    onSave: (userData: Omit<User, 'id' | 'createdAt'>) => void;
}> = ({ user, onClose, onSave }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState<UserRole>(user?.role || 'mitarbeiter');
    const isEditing = !!user;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            alert('Bitte füllen Sie alle Felder aus.');
            return;
        }
        onSave({ name, email, role });
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
                        <div className="form-group">
                            <label>E-Mail*</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Rolle</label>
                            <select value={role} onChange={e => setRole(e.target.value as UserRole)} className="form-input">
                                <option value="admin">Admin</option>
                                <option value="mitarbeiter">Mitarbeiter</option>
                            </select>
                        </div>
                    </div>
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

const DeleteDocumentModal: FC<{ document: DocumentFile; onClose: () => void; onConfirm: () => void; }> = ({ document, onClose, onConfirm }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <div className="modal-header red">
                <h2>Dokument löschen</h2>
                <button onClick={onClose} className="modal-close-button">&times;</button>
            </div>
            <div className="modal-body">
                <p>Möchten Sie das Dokument <strong>{document.name}</strong> wirklich endgültig löschen?</p>
                <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            </div>
            <div className="modal-footer">
                <button type="button" className="button button-outline" onClick={onClose}>Abbrechen</button>
                <button type="button" className="button button-danger" onClick={onConfirm}>Endgültig löschen</button>
            </div>
        </div>
    </div>
);


const BenutzerPage: FC<{
    users: User[];
    onAddUserClick: () => void;
    onEditUserClick: (user: User) => void;
    onDeleteUserClick: (user: User) => void;
}> = ({ users, onAddUserClick, onEditUserClick, onDeleteUserClick }) => {
    
    const systemUsers = users.filter(u => u.role !== 'customer');

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
                               const [firstName, ...lastNameParts] = user.name.split(' ');
                               const lastName = lastNameParts.join(' ');
                               return (
                                   <tr key={user.id}>
                                       <td data-label="Benutzer">
                                           <div className="user-cell">
                                                <div className={`initials-avatar ${getAvatarColorClass(firstName)}`}>
                                                    {getInitials(firstName, lastName)}
                                                </div>
                                                <div>
                                                    <div className="user-fullname">{firstName}</div>
                                                    <div className="user-subname">{lastName}</div>
                                                </div>
                                           </div>
                                       </td>
                                       <td data-label="E-Mail">{user.email}</td>
                                       <td data-label="Rolle"><span className={`role-badge ${user.role}`}>{user.role === 'admin' ? 'Admin' : 'Mitarbeiter'}</span></td>
                                       <td data-label="Erstellt">{user.createdAt.toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: '2-digit'})}</td>
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
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [view, setView] = useState<View>({ page: 'dashboard' });
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode; color: string; }>({ isOpen: false, title: '', content: null, color: 'green' });
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 992);

  // User Management Modals State
  const [userModal, setUserModal] = useState<{isOpen: boolean; user: User | null}>({isOpen: false, user: null});
  const [deleteUserModal, setDeleteUserModal] = useState<User | null>(null);

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
  
  const handleConfirmTransaction = (txData: {
      title: string;
      amount: number; // Total amount to add to balance
      type: 'topup' | 'debit';
      meta?: { requirementId?: string };
      baseAmount?: number;
      bonus?: number;
  }) => {
      if (!view.customerId || !loggedInUser) return;
      const transactionDate = new Date();
      const newTransactions: Transaction[] = [];

      if (txData.type === 'topup' && txData.bonus && txData.bonus > 0 && txData.baseAmount) {
          newTransactions.push({
              id: `tx-${Date.now()}`,
              customerId: view.customerId,
              createdBy: loggedInUser.id,
              createdAt: transactionDate,
              type: 'topup',
              title: txData.title,
              amount: txData.baseAmount,
          });
          newTransactions.push({
              id: `tx-${Date.now() + 1}`,
              customerId: view.customerId,
              createdBy: loggedInUser.id,
              createdAt: transactionDate,
              type: 'bonus',
              title: 'Bonus',
              amount: txData.bonus,
          });
      } else {
          newTransactions.push({
              id: `tx-${Date.now()}`,
              customerId: view.customerId,
              createdBy: loggedInUser.id,
              createdAt: transactionDate,
              type: txData.type,
              title: txData.title,
              amount: txData.amount,
              meta: txData.meta
          });
      }

      setTransactions(prev => [...prev, ...newTransactions]);
      setCustomers(prev => prev.map(c =>
          c.id === view.customerId ? { ...c, balance: c.balance + txData.amount } : c
      ));
  };


  const handleAddCustomer = (newCustomerData: Omit<Customer, 'id'|'createdBy'|'createdAt'|'levelId'|'balance'|'levelUpHistory'>) => {
    if(!loggedInUser) return;
    const newCustomer: Customer = {
        ...newCustomerData,
        id: `cust-${Date.now()}`,
        createdBy: loggedInUser.id,
        createdAt: new Date(),
        levelId: 1,
        balance: 0,
        levelUpHistory: {}
    };
    setCustomers(prev => [...prev, newCustomer]);
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };
  
  const handleLevelUp = (customerId: string, newLevelId: number) => {
    setCustomers(prev => prev.map(c => {
        if (c.id === customerId && newLevelId <= LEVELS.length) {
            const newHistory = { ...c.levelUpHistory, [newLevelId]: new Date() };
            return { ...c, levelId: newLevelId, levelUpHistory: newHistory };
        }
        return c;
    }));
  };

  const handleToggleVipStatus = (customerId: string) => {
    setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
            return { ...c, isVip: !c.isVip };
        }
        return c;
    }));
  };

  const handlePromoteToExpert = (customerId: string) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, isExpert: true } : c
    ));
  };
  
  const handleSaveUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (userModal.user) { // Editing existing user
      setUsers(prevUsers => prevUsers.map(u => u.id === userModal.user!.id ? { ...u, ...userData } : u));
    } else { // Adding new user
      const newUser: User = { ...userData, id: `user-${Date.now()}`, createdAt: new Date() };
      setUsers(prevUsers => [...prevUsers, newUser]);
    }
    setUserModal({ isOpen: false, user: null });
  };

  const handleDeleteUser = () => {
    if (deleteUserModal) {
      setUsers(prevUsers => prevUsers.filter(u => u.id !== deleteUserModal.id));
      setDeleteUserModal(null);
    }
  };

  const handleUploadDocuments = (files: FileList, customerId: string) => {
    const newDocuments: DocumentFile[] = Array.from(files).map(file => ({
        id: `doc-${Date.now()}-${Math.random()}`,
        customerId,
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
    }));
    setDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => {
        const docToDelete = prev.find(d => d.id === documentId);
        if (docToDelete) {
            URL.revokeObjectURL(docToDelete.url);
        }
        return prev.filter(d => d.id !== documentId);
    });
  };
  
  const handleKpiClick = (type: string, color: string, data: { customers: Customer[]; transactions: Transaction[] }) => {
    let title = '';
    let content: React.ReactNode = null;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toDateString();

    const renderCustomerList = (customerList: Customer[]) => (
         <ul className="info-modal-list">
            {customerList.map(c => <li key={c.id}><span>{c.firstName} {c.lastName} ({c.dogName})</span> <span>€ {Math.floor(c.balance).toLocaleString('de-DE')}</span></li>)}
        </ul>
    );
    const renderTransactionList = (txList: Transaction[]) => (
        <ul className="info-modal-list">
            {txList.map(t => {
                const cust = data.customers.find(c => c.id === t.customerId);
                return <li key={t.id}><span>{t.title} - {cust?.firstName} {cust?.lastName}</span> <span>€ {Math.floor(t.amount).toLocaleString('de-DE')}</span></li>
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
            content = renderTransactionList(data.transactions.filter(t => t.createdAt.toDateString() === today));
            break;
        case 'transactionsMonth':
            title = 'Transaktionen im Monat';
            content = renderTransactionList(data.transactions.filter(t => t.createdAt >= startOfMonth));
            break;
        case 'activeCustomersMonth':
            title = 'Aktive Kunden im Monat';
            const activeCustomerIds = new Set(data.transactions.filter(tx => tx.createdAt >= startOfMonth).map(tx => tx.customerId));
            content = renderCustomerList(data.customers.filter(c => activeCustomerIds.has(c.id)));
            break;
    }
    setModal({ isOpen: true, title, content, color });
  };

  // --- Data Scoping for Mitarbeiter ---
  const { visibleCustomers, visibleTransactions } = useMemo(() => {
    if (!loggedInUser || loggedInUser.role === 'admin' || loggedInUser.role === 'customer') {
      return { visibleCustomers: customers, visibleTransactions: transactions };
    }

    // For 'mitarbeiter'
    const mitarbeiterTransactions = transactions.filter(tx => tx.createdBy === loggedInUser.id);
    const customerIdsForMitarbeiter = new Set(mitarbeiterTransactions.map(tx => tx.customerId));
    const mitarbeiterCustomers = customers.filter(c => customerIdsForMitarbeiter.has(c.id));
    
    return { visibleCustomers: mitarbeiterCustomers, visibleTransactions: mitarbeiterTransactions };

  }, [loggedInUser, customers, transactions]);


  if (!loggedInUser) {
    return <AuthScreen users={users} onLogin={setLoggedInUser} />;
  }

  // --- Role-based rendering ---
  if (loggedInUser.role === 'customer') {
      const customer = customers.find(c => c.id === loggedInUser.customerId);
      if (customer) {
        return (
             <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
                <CustomerSidebar user={loggedInUser} onLogout={() => setLoggedInUser(null)} setSidebarOpen={setIsSidebarOpen} />
                <main className="main-content">
                    {isMobileView && (
                        <header className="mobile-header">
                            <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                                <Icon name="menu" />
                            </button>
                            <div className="mobile-header-logo">
                                <Icon name="paw" className="logo" />
                                <h2>PfotenCard</h2>
                            </div>
                        </header>
                    )}
                    <CustomerDetailPage 
                        customer={customer} 
                        transactions={transactions.filter(t => t.customerId === customer.id)} 
                        setView={setView} 
                        handleLevelUp={handleLevelUp}
                        onUpdateCustomer={handleUpdateCustomer}
                        onToggleVipStatus={handleToggleVipStatus}
                        onPromoteToExpert={handlePromoteToExpert}
                        currentUser={loggedInUser}
                        users={users}
                        documents={documents.filter(d => d.customerId === customer.id)}
                        onUploadDocuments={handleUploadDocuments}
                        onDeleteDocument={handleDeleteDocument}
                    />
                </main>
                {isMobileView && isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}
             </div>
        );
      }
      return <div>Kundenprofil nicht gefunden.</div>;
  }
  
  const renderContent = () => {
    const kpiClickHandler = (type: string, color: string) => handleKpiClick(type, color, { customers: visibleCustomers, transactions: visibleTransactions });

    if (view.page === 'customers' && view.subPage === 'detail' && view.customerId) {
        const customer = visibleCustomers.find(c => c.id === view.customerId);
        if (customer) return <CustomerDetailPage 
            customer={customer} 
            transactions={transactions} // Pass all transactions for progress calculation
            setView={setView} 
            handleLevelUp={handleLevelUp} 
            onUpdateCustomer={handleUpdateCustomer}
            onToggleVipStatus={handleToggleVipStatus}
            onPromoteToExpert={handlePromoteToExpert}
            currentUser={loggedInUser} 
            users={users}
            documents={documents.filter(d => d.customerId === customer.id)}
            onUploadDocuments={handleUploadDocuments}
            onDeleteDocument={handleDeleteDocument}
        />;
    }
    if (view.page === 'customers' && view.subPage === 'transactions' && view.customerId) {
        const customer = visibleCustomers.find(c => c.id === view.customerId);
        if (customer) return <TransactionManagementPage customer={customer} setView={setView} onConfirmTransaction={handleConfirmTransaction} currentUser={loggedInUser} />;
    }

    switch (view.page) {
      case 'customers': return <KundenPage customers={visibleCustomers} transactions={visibleTransactions} setView={setView} onKpiClick={kpiClickHandler} onAddCustomerClick={() => setAddCustomerModalOpen(true)} />;
      case 'reports': return <BerichtePage transactions={visibleTransactions} customers={visibleCustomers} users={users} currentUser={loggedInUser} />;
      case 'users': return loggedInUser.role === 'admin' 
        ? <BenutzerPage 
            users={users} 
            onAddUserClick={() => setUserModal({ isOpen: true, user: null })}
            onEditUserClick={(user) => setUserModal({ isOpen: true, user })}
            onDeleteUserClick={(user) => setDeleteUserModal(user)}
          /> 
        : <DashboardPage customers={visibleCustomers} transactions={visibleTransactions} currentUser={loggedInUser} onKpiClick={kpiClickHandler} setView={setView} />;
      case 'dashboard':
      default:
        return <DashboardPage customers={visibleCustomers} transactions={visibleTransactions} currentUser={loggedInUser} onKpiClick={kpiClickHandler} setView={setView} />;
    }
  };

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
      <Sidebar user={loggedInUser} activePage={view.page} setView={setView} onLogout={() => setLoggedInUser(null)} setSidebarOpen={setIsSidebarOpen} />
      <main className="main-content">
        {isMobileView && (
            <header className="mobile-header">
                <button className="mobile-menu-button" onClick={() => setIsSidebarOpen(true)} aria-label="Menü öffnen">
                    <Icon name="menu" />
                </button>
                 <div className="mobile-header-logo">
                    <Icon name="paw" className="logo" />
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
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}