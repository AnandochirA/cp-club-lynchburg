'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import '../../app/dash.css';
import '../../app/interview.css';
import '../../app/behavioral.css';
import { apiErrors } from '@/lib/content';
import { apiGet, apiPost } from '@/lib/client-api';
import type { Profile } from '@/lib/bh/model';
import { type BhState, type Tab, prepPath } from '@/lib/bh/path';
import type { ConceptKey } from '@/lib/bh/playbook';
import type { SignalKey } from '@/lib/bh/signals';
import type { Story } from '@/lib/bh/story';
import { Catalog } from './Catalog';
import { Debriefs } from './Debriefs';
import { Playbook } from './Playbook';
import { Practice } from './Practice';
import { PrepPath } from './PrepPath';
import { type Go, bhErrors } from './ui';

const TABS: { key: Tab; title: string }[] = [
  { key: 'path', title: 'Path' },
  { key: 'catalog', title: 'Catalog' },
  { key: 'practice', title: 'Practice' },
  { key: 'playbook', title: 'Playbook' },
  { key: 'debriefs', title: 'Debriefs' },
];

/** What each tab is told when another tab sends you there. `key` changes on every visit so the tab can react. */
export type Nav = { mode?: string; storyId?: number; signal?: SignalKey; concept?: ConceptKey; key: number };

/**
 * The behavioral side, rebuilt around the book's preparation roadmap: a Path
 * that knows what to do next, a story Catalog with the Story Doctor, Practice
 * modes for the Decode → Select → Deliver loop, the Playbook, and Debriefs.
 */
export function BehavioralStudio({ initial }: { initial: BhState }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<Tab>('path');
  const [nav, setNav] = useState<Nav>({ key: 0 });
  /** True while a timed round is running: the tabs hide, like the old studio. */
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const path = useMemo(() => prepPath(state.stories, state.profile, state.stats, state.debriefs.length, now), [state, now]);

  const refresh = useCallback(async () => {
    const res = await apiGet<BhState>('/api/behavioral/state');
    if (res.ok) setState(res.data);
  }, []);

  const go = useCallback((g: Go) => {
    setTab(g.tab);
    setNav({ mode: g.mode, storyId: g.storyId, signal: g.signal, concept: g.concept, key: Date.now() });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setStories = useCallback((fn: (s: Story[]) => Story[]) => setState((st) => ({ ...st, stories: fn(st.stories) })), []);

  const saveProfile = useCallback(
    async (p: Profile) => {
      const before = state.profile;
      setState((st) => ({ ...st, profile: p }));
      setError(null);
      const res = await apiPost<{ profile: Profile }>('/api/behavioral/profile', p);
      if (!res.ok) {
        setState((st) => ({ ...st, profile: before }));
        setError(bhErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
        return false;
      }
      setState((st) => ({ ...st, profile: res.data.profile }));
      return true;
    },
    [state.profile],
  );

  const shared = { state, path, go, refresh, setStories, saveProfile, nav, setFocus, now };

  return (
    <div className="dash" style={{ ['--tier' as string]: '#c89bff' }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
        <b className="hex-bg-ink" />
      </div>
      <header className="dash-bar">
        <Link href="/me" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← My progress
        </Link>
        {!focus && (
          <div role="tablist" aria-label="Behavioral" className="bh-tabs flex gap-2">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => go({ tab: t.key })} className={`bar-btn ${tab === t.key ? 'primary' : ''}`}>
                {t.title}
                {t.key === 'path' && <span className="bh-tab-num font-mono">{path.readiness}%</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="dash-wrap">
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {tab === 'path' && <PrepPath {...shared} />}
        {tab === 'catalog' && <Catalog {...shared} />}
        {tab === 'practice' && <Practice {...shared} />}
        {tab === 'playbook' && <Playbook go={go} nav={nav} />}
        {tab === 'debriefs' && <Debriefs {...shared} />}
      </main>
    </div>
  );
}

export type Shared = {
  state: BhState;
  path: ReturnType<typeof prepPath>;
  go: (g: Go) => void;
  refresh: () => Promise<void>;
  setStories: (fn: (s: Story[]) => Story[]) => void;
  saveProfile: (p: Profile) => Promise<boolean>;
  nav: Nav;
  setFocus: (on: boolean) => void;
  now: Date;
};
