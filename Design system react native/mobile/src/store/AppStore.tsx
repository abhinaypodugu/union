import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, ToastData } from '../components/Toast';
import { CASES, Case, COMMITTEE, CommitteeMember, ISSUES, Issue, NOTIFICATIONS } from '../data/mock';

interface Store {
  issues: Issue[];
  cases: Case[];
  members: CommitteeMember[];
  readIds: Set<string>;
  unreadCount: number;
  liked: Record<string, boolean>;
  toggleLike: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addIssue: (v: { title: string; category: string; desc: string }) => Issue;
  replyToIssue: (id: string) => void;
  updateCase: (id: string, patch: Partial<Case>) => void;
  setMembers: React.Dispatch<React.SetStateAction<CommitteeMember[]>>;
  toast: (t: ToastData) => void;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside <AppStoreProvider>');
  return s;
}

/** Demo state. Replace with Supabase queries + server-side authorization in production. */
export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [issues, setIssues] = React.useState(ISSUES);
  const [cases, setCases] = React.useState(CASES);
  const [members, setMembers] = React.useState(COMMITTEE.members);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [liked, setLiked] = React.useState<Record<string, boolean>>({});
  const [toastData, setToast] = React.useState<(ToastData & { key: number }) | null>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!toastData) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toastData]);

  const store: Store = {
    issues, cases, members, readIds, liked, setMembers,
    unreadCount: NOTIFICATIONS.filter((n) => n.unread && !readIds.has(n.id)).length,
    toggleLike: (id) => setLiked((l) => ({ ...l, [id]: !l[id] })),
    markRead: (id) => setReadIds((s) => new Set(s).add(id)),
    markAllRead: () => setReadIds(new Set(NOTIFICATIONS.map((n) => n.id))),
    addIssue: (v) => {
      const committee = v.category.startsWith('Harassment') ? 'Confidential handlers · Telangana' : v.category === 'Facilities' ? 'Hyderabad General Committee' : 'Hyderabad IT Workers Committee';
      const issue: Issue = {
        id: 'CASE-' + (2093 + issues.length), title: v.title, status: 'submitted', category: v.category, location: 'Hyderabad', committee,
        nextAction: 'Committee acknowledges your issue', due: 'Within 2 days', opened: 'Today',
        stages: [{ name: committee, state: 'current', levelShort: 'L1', sub: 'City level · just submitted', events: [{ time: 'Today', text: 'Submitted and routed' }] }],
      };
      setIssues((list) => [issue, ...list]);
      return issue;
    },
    replyToIssue: (id) => setIssues((list) => list.map((i): Issue => i.id === id ? { ...i, status: 'in_progress', statusLabel: 'Reply sent', nextAction: 'Committee reviews your reply', due: undefined, dueState: undefined } : i)),
    updateCase: (id, patch) => setCases((list) => list.map((c): Case => c.id === id ? { ...c, ...patch } : c)),
    toast: (t) => setToast({ ...t, key: Date.now() }),
  };

  return (
    <Ctx.Provider value={store}>
      {children}
      {toastData ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 72 }}>
          <Toast key={toastData.key} {...toastData} onClose={() => setToast(null)} onAction={() => { toastData.onAction?.(); setToast(null); }} />
        </View>
      ) : null}
    </Ctx.Provider>
  );
}
