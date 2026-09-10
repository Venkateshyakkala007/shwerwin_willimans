'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  BarChart3,
  Users,
  Wallet,
  Award,
  RefreshCw,
  ShieldCheck,
  Download,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import './v3.css';

type Profile = { id: string; name: string; role: string };
type Session = {
  user: { id: string; display_name: string; employment_type: string };
  scopes: { id: string; name: string; kind: string; permissions: string[] }[];
};
type Publication = {
  id: string;
  published_at: string;
  manifest_hash: string;
  source: string;
  fixture_version: string;
};
type Metric = {
  id: string;
  name: string;
  group_code: string;
  weight_bps: number;
  unit: string;
  description: string;
  raw_value: string | null;
  normalized_score: string | null;
  contribution: string | null;
  status: string;
  sample_size: number;
  evidence: string;
  period_start: string;
  period_end: string;
};
type Scorecard = {
  publication: Publication | null;
  suppressed: boolean;
  groups: { group_code: string; score: string | null; status: string }[];
  metrics: Metric[];
};
type Course = {
  id: string;
  title: string;
  provider: string;
  provider_url: string | null;
  access_tier: string;
  version_number: number;
  required: boolean;
  due_at: string;
  enrollment_id: string | null;
  status: string | null;
  percentage: number;
  version: number;
  attempt_number: number;
  attempt_count: number;
  legacy_completion: boolean;
};
type Evidence = {
  kind: string;
  statement: string;
  claimed_at: string;
  received_at: string;
};
type Assessment = {
  id: string;
  title: string;
  passingScore: number;
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
  }[];
};
type Recognition = {
  points: number;
  badges: { name: string; description: string; awarded_at: string }[];
  certifications: {
    certification_name: string;
    issuer: string;
    verification_status: string;
  }[];
};
type Consumption = {
  record: {
    tokens: string | null;
    credits: string | null;
    allocation: string | null;
    remaining: string | null;
    cost: string | null;
    currency: string | null;
    authority: string;
    coverage: string;
  } | null;
  publication: Publication | null;
};
type Operations = {
  jobs: {
    id: string;
    kind: string;
    status: string;
    attempts: number;
    error: string | null;
  }[];
  receiptCount: number;
  champions: number;
  scheduler: string;
  publication: Publication | null;
};
type Person = { id: string; display_name: string; employment_type: string };
const groups: Record<string, string> = {
  E: 'Enablement',
  A: 'Adoption',
  T: 'Throughput',
  F: 'Efficiency',
  Q: 'Quality',
};
const firstUser = '7c986e20-43a2-4a86-817d-6effc840ca91';
const date = (s: string) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(s));
const value = (v: string | number | null | undefined) =>
  v === null || v === undefined
    ? 'Unavailable'
    : Number(v).toLocaleString('en', { maximumFractionDigits: 2 });
const status = (s: string) => s.replaceAll('_', ' ');
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
async function request<T>(
  user: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('content-type', 'application/json');
  headers.set('x-demo-user-id', user);
  const r = await fetch('/api/v1' + path, {
    ...options,
    cache: 'no-store',
    headers,
  });
  const body = (await r.json()) as {
    data: T;
    detail?: string;
    error?: { message: string };
  };
  if (!r.ok)
    throw new Error(body.detail ?? body.error?.message ?? 'Request failed.');
  return body.data as T;
}
function Scores({
  data,
  onDetail,
}: {
  data: Scorecard;
  onDetail: (m: Metric) => void;
}) {
  const [group, setGroup] = useState('E');
  return (
    <>
      <div className="v3-group-grid">
        {data.groups.map((g) => (
          <button
            key={g.group_code}
            className={`v3-group ${group === g.group_code ? 'selected' : ''}`}
            onClick={() => setGroup(g.group_code)}
            aria-pressed={group === g.group_code}
          >
            <span>{groups[g.group_code]}</span>
            <strong>
              {g.score === null ? '—' : value(g.score)}
              <small>{g.score === null ? 'Unavailable' : '/ 100'}</small>
            </strong>
            <span className="v3-muted">
              {g.score === null ? status(g.status) : 'Sample score'}
            </span>
          </button>
        ))}
      </div>
      <div className="v3-section-title">
        <div>
          <h2>{groups[group]} metrics</h2>
          <p>Five independent groups. No overall score or employee ranking.</p>
        </div>
        <span className="v3-pill">M25.1 · sample policy</span>
      </div>
      {data.suppressed && (
        <p className="v3-notice">This cohort is too small to display safely.</p>
      )}
      <div className="v3-table-wrap">
        <table>
          <caption className="sr-only">
            {groups[group]} raw metrics, weights and scores
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Raw value</th>
              <th>Weight</th>
              <th>Normalized score</th>
              <th>Contribution</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics
              .filter((m) => m.group_code === group)
              .map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="v3-code">{m.id}</span>
                    <strong>{m.name}</strong>
                    {m.weight_bps === 0 && (
                      <span className="v3-muted">
                        Visible diagnostic · does not affect score
                      </span>
                    )}
                  </td>
                  <td>
                    {value(m.raw_value)}
                    {m.raw_value !== null && <small> {m.unit}</small>}
                  </td>
                  <td>{m.weight_bps / 100}%</td>
                  <td>
                    {m.weight_bps === 0
                      ? 'Not scored'
                      : value(m.normalized_score)}
                  </td>
                  <td>{m.weight_bps === 0 ? '0' : value(m.contribution)}</td>
                  <td>
                    <Button variant="outline" onClick={() => onDetail(m)}>
                      Explain
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="v3-muted v3-footnote">
        Missing weighted evidence blocks only its group. Zero-weight diagnostics
        never block a score. Scores and baseline references are synthetic
        fixtures, not approved production measures.
      </p>
      {data.publication ? (
        <div className="v3-publication">
          <ShieldCheck size={17} />
          <span>
            Coherent sample publication · {date(data.publication.published_at)}{' '}
            · <code>{data.publication.id.slice(0, 8)}</code>
          </span>
        </div>
      ) : (
        <p className="v3-notice">
          The first sample publication is pending. Refresh after the worker
          completes.
        </p>
      )}
    </>
  );
}
export default function Home() {
  const [user, setUser] = useState(firstUser);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState('scores');
  const [scores, setScores] = useState<Scorecard | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [checks, setChecks] = useState<Assessment[]>([]);
  const [recognition, setRecognition] = useState<Recognition | null>(null);
  const [consumption, setConsumption] = useState<Consumption | null>(null);
  const [ops, setOps] = useState<Operations | null>(null);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('2026-09');
  const [scope, setScope] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [scopeScores, setScopeScores] = useState<Scorecard | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [metric, setMetric] = useState<Metric | null>(null);
  const [attest, setAttest] = useState<Course | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [claimedAt, setClaimedAt] = useState('');
  const [evidence, setEvidence] = useState<Evidence[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [offline, setOffline] = useState(false);
  const epoch = useRef(0);
  const commandRef = useRef<{ signature: string; id: string } | null>(null);
  useEffect(() => {
    let live = true;
    request<Profile[]>(firstUser, '/demo/profiles')
      .then((p) => {
        if (live) setProfiles(p);
      })
      .catch(() => {});
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      live = false;
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    let live = true;
    const current = ++epoch.current;
    queueMicrotask(() => {
      if (!live) return;
      setLoading(true);
      setError('');
      setSession(null);
      setScores(null);
      setCourses([]);
      setScopeScores(null);
      setPeople([]);
      setOps(null);
      setRecognition(null);
      setConsumption(null);
      setChecks([]);
      setAnswers({});
      setAttest(null);
      setEvidence(null);
      setMetric(null);
      commandRef.current = null;
    });
    request<Session>(user, '/session')
      .then(async (s) => {
        const [sc, co, ch, re, con] = await Promise.all([
          request<Scorecard>(user, '/me/scorecard'),
          request<Course[]>(user, '/me/courses'),
          request<Assessment[]>(user, '/me/assessments'),
          request<Recognition>(user, '/me/recognition'),
          request<Consumption>(user, '/me/consumption?month=2026-09'),
        ]);
        if (!live || current !== epoch.current) return;
        setSession(s);
        setScores(sc);
        setCourses(co);
        setChecks(ch);
        setRecognition(re);
        setConsumption(con);
        setScope(s.scopes[0]?.id ?? '');
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [user, revision]); // month is refreshed independently below
  useEffect(() => {
    if (!session) return;
    let live = true;
    const timer = setTimeout(() => {
      request<Course[]>(user, `/me/courses?q=${encodeURIComponent(search)}`)
        .then((r) => {
          if (live) setCourses(r);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [search, session, user]);
  useEffect(() => {
    if (!session) return;
    let live = true;
    queueMicrotask(() => {
      if (live) setConsumption(null);
    });
    request<Consumption>(user, `/me/consumption?month=${month}`)
      .then((r) => {
        if (live) setConsumption(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [month, session, user]);
  useEffect(() => {
    if (!session || !scope || tab !== 'scope') return;
    let live = true;
    queueMicrotask(() => {
      if (live) {
        setScopeScores(null);
        setPeople([]);
        setSubjectName('');
      }
    });
    request<Scorecard>(user, `/scopes/${scope}/scorecard`)
      .then((r) => {
        if (live) setScopeScores(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    if (
      session.scopes.find((s) => s.id === scope)?.permissions.includes('people')
    )
      request<{ rows: Person[] }>(user, `/scopes/${scope}/people`)
        .then((r) => {
          if (live) setPeople(r.rows);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [scope, tab, session, user]);
  useEffect(() => {
    if (tab !== 'operations' || !session) return;
    let live = true;
    const load = () =>
      request<Operations>(user, '/operations')
        .then((r) => {
          if (live) setOps(r);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [tab, user, session]);
  const command = useCallback(
    async (action: string, body: Record<string, unknown>, version?: number) => {
      setBusy(true);
      setError('');
      setNotice('');
      const current = epoch.current;
      const signature = JSON.stringify({ user, action, body, version });
      if (commandRef.current?.signature !== signature)
        commandRef.current = { signature, id: crypto.randomUUID() };
      try {
        const result = await request<Record<string, unknown>>(
          user,
          `/commands/${action}`,
          {
            method: 'POST',
            headers: {
              'x-client-operation-id': commandRef.current.id,
              ...(version === undefined ? {} : { 'if-match': String(version) }),
            },
            body: JSON.stringify(body),
          },
        );
        commandRef.current = null;
        if (current !== epoch.current) return null;
        setNotice(
          action === 'attest'
            ? 'Completion recorded as self-attested. Sample analytics remain unchanged until a future source-backed pipeline is connected.'
            : action === 'assessment'
              ? `Assessment submitted: ${String(result.score)}% · ${result.passed ? 'Passed' : 'Not passed'}.`
              : 'Saved successfully.',
        );
        return result;
      } catch (e) {
        if (current === epoch.current)
          setError(e instanceof Error ? e.message : 'Unable to save.');
        return null;
      } finally {
        if (current === epoch.current) setBusy(false);
      }
    },
    [user],
  );
  async function learningCommand(
    action: string,
    c: Course,
    extra: Record<string, unknown> = {},
  ) {
    const r = await command(
      action,
      action === 'enroll'
        ? { courseVersionId: c.id }
        : { enrollmentId: c.enrollment_id, ...extra },
      action === 'enroll' ? undefined : c.version,
    );
    if (r) {
      setAttest(null);
      setRevision((n) => n + 1);
    }
  }
  async function viewEvidence(c: Course) {
    try {
      setEvidence(
        await request<Evidence[]>(
          user,
          `/enrollments/${c.enrollment_id}/evidence`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function exportScores() {
    const r = await command('export', {});
    if (!r) return;
    const current = epoch.current;
    setBusy(true);
    try {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        if (current !== epoch.current) return;
        const job = await request<{
          status: string;
          result: unknown;
          error: string;
        }>(user, `/jobs/${String(r.jobId)}`);
        if (job.status === 'failed') throw new Error(job.error);
        if (job.status === 'succeeded') {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(job.result, null, 2)], {
              type: 'application/json',
            }),
          );
          const a = document.createElement('a');
          a.href = url;
          a.download = 'cover-codebase-sample-scorecard.json';
          a.click();
          URL.revokeObjectURL(url);
          setNotice('Your publication-pinned sample export is ready.');
          return;
        }
      }
      setNotice(
        'Export is still processing. Check the worker before trying again.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const tabs = [
    { id: 'scores', label: 'My scorecards', icon: BarChart3 },
    { id: 'learning', label: 'Learning', icon: BookOpen },
    { id: 'scope', label: 'Team & organization', icon: Users },
    { id: 'consumption', label: 'Consumption', icon: Wallet },
    { id: 'recognition', label: 'Recognition', icon: Award },
    ...(session?.scopes.some((s) => s.permissions.includes('operate'))
      ? [{ id: 'operations', label: 'Operations', icon: Settings }]
      : []),
  ];
  const completedCourses = courses.filter(
    (c) => c.status === 'completed',
  ).length;
  return (
    <div className="v3-app">
      <a className="v3-skip" href="#main">
        Skip to content
      </a>
      <div className="v3-demo-banner">
        <span>Sherwin-Williams · Internal</span>
        <span>Local demo · Synthetic data · Q3 2026</span>
      </div>
      <header className="v3-header">
        <div className="v3-brand">
          <span className="v3-kicker">AI adoption scoreboard</span>
          <h1>
            Cover the
            <br />
            Codebase
          </h1>
          <span className="v3-brush" aria-hidden="true" />
          <p>Your learning, activity and recognition—one standard of finish.</p>
        </div>
        <div className="v3-hero-stats" aria-label="Personal summary">
          <div>
            <strong>
              {scores?.groups.find((g) => g.group_code === 'E')?.score === null
                ? '—'
                : value(
                    scores?.groups.find((g) => g.group_code === 'E')?.score,
                  )}
            </strong>
            <span>Enablement</span>
          </div>
          <div>
            <strong>
              {scores?.groups.find((g) => g.group_code === 'A')?.score === null
                ? '—'
                : value(
                    scores?.groups.find((g) => g.group_code === 'A')?.score,
                  )}
            </strong>
            <span>Adoption</span>
          </div>
          <div>
            <strong>{completedCourses}</strong>
            <span>Courses</span>
          </div>
          <div>
            <strong>{value(recognition?.points)}</strong>
            <span>Points</span>
          </div>
        </div>
        <label className="v3-profile">
          Test as
          <select
            value={user}
            disabled={busy}
            onChange={(e) => {
              setSession(null);
              setLoading(true);
              setUser(e.target.value);
              setNotice('');
              setTab('scores');
              setSearch('');
            }}
          >
            {(profiles.length
              ? profiles
              : [{ id: firstUser, name: 'Priya Kowalski', role: 'Employee' }]
            ).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.role}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="v3-layout">
        <nav aria-label="Main navigation">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError('');
              }}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <t.icon size={18} />
              {t.label}
            </button>
          ))}
          <div className="v3-nav-note">
            <ShieldCheck size={20} />
            <p>
              Five group scores.
              <br />
              No overall ranking.
            </p>
            <small>Sample weights and references are for testing only.</small>
          </div>
        </nav>
        <main id="main">
          <div className="v3-toolbar">
            <div className="v3-person">
              <span className="v3-avatar">
                {session ? initials(session.user.display_name) : 'SW'}
              </span>
              <div>
                <span className="v3-kicker">Welcome back</span>
                <h2>
                  {session?.user.display_name ??
                    tabs.find((t) => t.id === tab)?.label ??
                    'My dashboard'}
                </h2>
                <p>
                  {session
                    ? `${session.user.employment_type} · ${tabs.find((t) => t.id === tab)?.label}`
                    : 'Your development workspace'}
                </p>
                <span className="v3-status">
                  <ShieldCheck size={13} /> Authorized profile
                </span>
              </div>
            </div>
            <div className="v3-finish">
              <span className="v3-paint-chip" />
              <div>
                <small>Current finish</small>
                <strong>{completedCourses ? 'In progress' : 'Primer'}</strong>
                <p>{completedCourses} learning completions</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setRevision((n) => n + 1)}
              disabled={loading || busy}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </div>
          {offline && (
            <output className="v3-notice">
              You’re offline. Reconnect before submitting changes. No completion
              is recorded until the server confirms it.
            </output>
          )}
          {error && (
            <p className="v3-error" role="alert">
              {error}
            </p>
          )}
          {notice && <output className="v3-success">{notice}</output>}
          {loading ? (
            <output className="v3-loading">Loading your workspace…</output>
          ) : !session ? (
            <div className="v3-empty">
              <ShieldCheck size={32} />
              <h3>Access unavailable</h3>
              <p>
                Select an active demo profile, or check that the API and
                database are running.
              </p>
            </div>
          ) : (
            <>
              {tab === 'scores' && scores && (
                <>
                  <Scores data={scores} onDetail={setMetric} />
                  <Button
                    variant="outline"
                    disabled={busy || !scores.publication}
                    onClick={() => void exportScores()}
                  >
                    <Download size={16} />
                    Export my sample metrics
                  </Button>
                </>
              )}
              {tab === 'learning' && (
                <>
                  <div className="v3-notice">
                    Completion is self-attested. Pluralsight and ESI APIs are
                    disabled. Contractor content is limited to the public
                    catalogue. Existing demo completion history is preserved
                    separately.
                  </div>
                  <label className="v3-search">
                    Search eligible learning
                    <input
                      type="search"
                      value={search}
                      maxLength={100}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Course or provider"
                    />
                  </label>
                  <div className="v3-course-grid">
                    {courses.map((c) => (
                      <article className="v3-card" key={c.id}>
                        <div className="v3-card-top">
                          <span className="v3-pill">{c.provider}</span>
                          <span>{c.required ? 'Required' : 'Elective'}</span>
                        </div>
                        <h3>{c.title}</h3>
                        <p className="v3-muted">
                          Version {c.version_number} · {c.access_tier} · Due{' '}
                          {date(c.due_at)}
                        </p>
                        <p>
                          Attempt {c.attempt_number ?? 'not started'} ·{' '}
                          {status(c.status ?? 'not enrolled')}
                        </p>
                        <progress
                          aria-label={`${c.title} progress`}
                          max={100}
                          value={c.percentage ?? 0}
                        />
                        <small>
                          {c.percentage ?? 0}% ·{' '}
                          {c.status === 'completed'
                            ? 'Self-attested completion'
                            : 'Progress is separate from completion evidence'}
                        </small>
                        {c.legacy_completion && (
                          <p className="v3-legacy">
                            Legacy sample completion retained. A new explicit
                            attestation is needed for this attempt.
                          </p>
                        )}
                        <div className="v3-actions">
                          {c.provider_url && (
                            <a
                              className="v3-link"
                              href={c.provider_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open learning ↗
                            </a>
                          )}
                          {!c.enrollment_id ||
                          ['completed', 'withdrawn'].includes(
                            c.status ?? '',
                          ) ? (
                            <Button
                              variant="outline"
                              disabled={busy || offline}
                              onClick={() => void learningCommand('enroll', c)}
                            >
                              New attempt
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                disabled={busy || offline}
                                onClick={() =>
                                  void learningCommand(
                                    c.status === 'enrolled'
                                      ? 'start'
                                      : 'progress',
                                    c,
                                    {
                                      percentage: Math.min(
                                        99,
                                        (c.percentage ?? 0) + 10,
                                      ),
                                    },
                                  )
                                }
                              >
                                {c.status === 'enrolled'
                                  ? 'Start learning'
                                  : 'Add 10% progress'}
                              </Button>
                              <Button
                                disabled={busy || offline}
                                onClick={() => {
                                  setConfirmed(false);
                                  setClaimedAt(new Date().toISOString());
                                  setAttest(c);
                                }}
                              >
                                Attest completion
                              </Button>
                              <Button
                                variant="ghost"
                                disabled={busy || offline}
                                onClick={() =>
                                  void learningCommand('withdraw', c)
                                }
                              >
                                Withdraw
                              </Button>
                            </>
                          )}
                          {c.status === 'completed' && (
                            <Button
                              variant="outline"
                              disabled={busy || offline}
                              onClick={() => void learningCommand('retract', c)}
                            >
                              Retract completion
                            </Button>
                          )}
                          {c.enrollment_id && (
                            <Button
                              variant="ghost"
                              onClick={() => void viewEvidence(c)}
                            >
                              Evidence history
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  {!courses.length && (
                    <p className="v3-empty">
                      No eligible courses match your search.
                    </p>
                  )}
                  <div className="v3-section-title">
                    <h2>Knowledge checks</h2>
                  </div>
                  {checks.length ? (
                    checks.map((check) => (
                      <form
                        className="v3-card"
                        key={check.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          void command('assessment', {
                            assessmentId: check.id,
                            answers,
                          });
                        }}
                      >
                        <h3>{check.title}</h3>
                        <p>
                          Sample assessment · passing score {check.passingScore}
                          %
                        </p>
                        {check.questions.map((q) => (
                          <fieldset key={q.id}>
                            <legend>{q.text}</legend>
                            {q.options.map((o) => (
                              <label className="v3-radio" key={o.id}>
                                <input
                                  type="radio"
                                  name={`${check.id}-${q.id}`}
                                  value={o.id}
                                  checked={answers[q.id] === o.id}
                                  required
                                  onChange={() =>
                                    setAnswers((a) => ({ ...a, [q.id]: o.id }))
                                  }
                                />
                                {o.text}
                              </label>
                            ))}
                          </fieldset>
                        ))}
                        <Button disabled={busy || offline} type="submit">
                          Submit assessment
                        </Button>
                      </form>
                    ))
                  ) : (
                    <p className="v3-muted">
                      No assessments are assigned to your eligible courses.
                    </p>
                  )}
                </>
              )}
              {tab === 'scope' && (
                <>
                  {session.scopes.length ? (
                    <>
                      <label className="v3-search">
                        Authorized scope
                        <select
                          value={scope}
                          onChange={(e) => setScope(e.target.value)}
                        >
                          {session.scopes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.kind} · {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {subjectName && (
                        <p className="v3-notice">
                          Authorized individual view: {subjectName}.{' '}
                          <button
                            onClick={() => {
                              setSubjectName('');
                              void request<Scorecard>(
                                user,
                                `/scopes/${scope}/scorecard`,
                              )
                                .then(setScopeScores)
                                .catch((e) => setError(e.message));
                            }}
                          >
                            Return to aggregate
                          </button>
                        </p>
                      )}
                      {scopeScores ? (
                        <Scores data={scopeScores} onDetail={setMetric} />
                      ) : (
                        <p>Loading scope…</p>
                      )}
                      {people.length > 0 && (
                        <>
                          <h3>Authorized people</h3>
                          <div className="v3-people">
                            {people.map((p) => (
                              <Button
                                key={p.id}
                                variant="outline"
                                onClick={() => {
                                  void request<Scorecard>(
                                    user,
                                    `/people/${p.id}/scorecard`,
                                  )
                                    .then((r) => {
                                      setScopeScores(r);
                                      setSubjectName(p.display_name);
                                    })
                                    .catch((e) => setError(e.message));
                                }}
                              >
                                {p.display_name} · {p.employment_type}
                              </Button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="v3-empty">
                      No scope access has been granted to this account.
                    </p>
                  )}
                  <p className="v3-muted">
                    Scope fixtures are independently published samples. They are
                    not calculated by averaging employee scores. Aggregate
                    access does not grant employee detail.
                  </p>
                </>
              )}
              {tab === 'consumption' && (
                <>
                  <label className="v3-search">
                    UTC calendar month
                    <input
                      type="month"
                      value={month}
                      onChange={(e) => {
                        if (e.target.value) setMonth(e.target.value);
                      }}
                    />
                  </label>
                  <p className="v3-notice">
                    Sample September 2026 data is available. Other months show
                    unavailable. Tokens, credits and currency are separate
                    units; this is not real-time spend control.
                  </p>
                  {consumption?.record ? (
                    <>
                      <div className="v3-consumption-grid">
                        {[
                          ['Tokens', consumption.record.tokens],
                          ['Credits used', consumption.record.credits],
                          ['Allocated credits', consumption.record.allocation],
                          ['Remaining credits', consumption.record.remaining],
                          ['Billed cost', consumption.record.cost],
                        ].map(([label, n]) => (
                          <article className="v3-card" key={label}>
                            <p>{label}</p>
                            <strong className="v3-big">{value(n)}</strong>
                          </article>
                        ))}
                      </div>
                      <p>{consumption.record.authority}</p>
                      <p className="v3-muted">{consumption.record.coverage}</p>
                    </>
                  ) : (
                    <div className="v3-empty">
                      No consumption evidence is available for this month.
                      Unknown allocation does not mean unlimited.
                    </div>
                  )}
                </>
              )}
              {tab === 'recognition' && recognition && (
                <>
                  <p className="v3-notice">
                    Preserved synthetic recognition from the earlier demo. These
                    records are separate from the five metric groups and do not
                    verify real credentials.
                  </p>
                  <article className="v3-card v3-points-card">
                    <span className="v3-kicker">Points ledger</span>
                    <strong className="v3-big">
                      {value(recognition.points)}
                    </strong>
                    <p>
                      No new reward policy has been invented for V3 completion.
                    </p>
                  </article>
                  <div className="v3-section-title">
                    <h2>My badge wall</h2>
                  </div>
                  <div className="v3-recognition-rack">
                    {recognition.badges.map((b, i) => (
                      <article className="v3-badge-card" key={b.name}>
                        <div className={`v3-badge-swatch swatch-${i % 6}`}>
                          <Award />
                          <strong>{b.name}</strong>
                        </div>
                        <div>
                          <p>{b.description}</p>
                          <small>{date(b.awarded_at)} · synthetic award</small>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="v3-section-title">
                    <h2>My certifications</h2>
                  </div>
                  <div className="v3-cert-list">
                    {recognition.certifications.map((c, i) => (
                      <article
                        className="v3-cert-card"
                        key={c.certification_name}
                      >
                        <span className={`v3-cert-band band-${i % 4}`} />
                        <div>
                          <strong>{c.certification_name}</strong>
                          <p>{c.issuer}</p>
                        </div>
                        <span>{c.verification_status}</span>
                      </article>
                    ))}
                  </div>
                  {!recognition.badges.length && (
                    <p>No recognition records for this demo profile.</p>
                  )}
                </>
              )}
              {tab === 'operations' && ops && (
                <>
                  <p className="v3-notice">
                    Synthetic pipeline only. Learning events are acknowledged by
                    a local sink; no external system receives them. Republishing
                    imports the same fixed analytical fixtures and does not
                    infer metrics from learning checkboxes.
                  </p>
                  <div className="v3-consumption-grid">
                    <article className="v3-card">
                      <h3>Scheduler</h3>
                      <p>{ops.scheduler}</p>
                    </article>
                    <article className="v3-card">
                      <h3>Event receipts</h3>
                      <strong className="v3-big">{ops.receiptCount}</strong>
                    </article>
                    <article className="v3-card">
                      <h3>Sample champions</h3>
                      <strong className="v3-big">{ops.champions}</strong>
                      <p>The production 50-person roster is still pending.</p>
                    </article>
                  </div>
                  <Button
                    disabled={busy || offline}
                    onClick={() => void command('publish', {})}
                  >
                    Publish synthetic fixture
                  </Button>
                  <div className="v3-table-wrap">
                    <table>
                      <caption>
                        Recent durable jobs · refreshes every five seconds
                      </caption>
                      <thead>
                        <tr>
                          <th>Kind</th>
                          <th>Status</th>
                          <th>Attempts</th>
                          <th>Issue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ops.jobs.map((j) => (
                          <tr key={j.id}>
                            <td>{status(j.kind)}</td>
                            <td>{j.status}</td>
                            <td>{j.attempts}</td>
                            <td>{j.error ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <Dialog
        open={metric !== null}
        onOpenChange={(open) => {
          if (!open) setMetric(null);
        }}
      >
        <DialogContent className="v3-dialog">
          <DialogTitle>
            {metric?.id} · {metric?.name}
          </DialogTitle>
          <DialogDescription>{metric?.description}</DialogDescription>
          {metric && (
            <>
              <dl>
                <dt>Evidence state</dt>
                <dd>{status(metric.status)}</dd>
                <dt>Sample size</dt>
                <dd>{metric.sample_size}</dd>
                <dt>Period (UTC, end exclusive)</dt>
                <dd>
                  {metric.period_start
                    ? `${date(metric.period_start)} – ${date(metric.period_end)}`
                    : 'Unavailable'}
                </dd>
                <dt>Contribution</dt>
                <dd>
                  {metric.weight_bps === 0
                    ? '0 · diagnostic'
                    : `${value(metric.normalized_score)} × ${metric.weight_bps / 100}% = ${value(metric.contribution)}`}
                </dd>
              </dl>
              <p>{metric.evidence}</p>
              <p className="v3-muted">
                The same publication supplies the raw value, score and
                explanation. This is a directional programme signal, not proof
                of AI causation or productivity.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={attest !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setAttest(null);
        }}
      >
        <DialogContent className="v3-dialog">
          <DialogTitle>Attest completion</DialogTitle>
          <DialogDescription>
            {attest?.title} · attempt {attest?.attempt_number}. Your
            confirmation and its receipt time will be recorded.
          </DialogDescription>
          <label className="v3-radio">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I confirm that I completed this learning. This is self-attested, not
            provider-verified.
          </label>
          <Button
            disabled={!confirmed || busy || offline}
            onClick={() => {
              if (attest)
                void learningCommand('attest', attest, {
                  confirmed: true,
                  claimedAt,
                });
            }}
          >
            {busy ? 'Saving…' : 'Confirm completion'}
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={evidence !== null}
        onOpenChange={(open) => {
          if (!open) setEvidence(null);
        }}
      >
        <DialogContent className="v3-dialog">
          <DialogTitle>Completion evidence history</DialogTitle>
          <DialogDescription>
            Original evidence is preserved when a completion is retracted.
          </DialogDescription>
          {evidence?.length ? (
            evidence.map((e, i) => (
              <article key={i}>
                <strong>{status(e.kind)}</strong>
                <p>{e.statement}</p>
                <small>
                  Claimed {date(e.claimed_at)} · received {date(e.received_at)}
                </small>
              </article>
            ))
          ) : (
            <p>No explicit attestations have been recorded for this attempt.</p>
          )}
        </DialogContent>
      </Dialog>
      <footer className="v3-footer">
        Cover the Codebase · V3 / M25.1 local development · Production
        integrations and approvals remain pending
      </footer>
    </div>
  );
}
