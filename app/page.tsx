'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  LogOut,
  LockKeyhole,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import './v3.css';

type Session = {
  user: {
    id: string;
    display_name: string;
    employment_type: string;
    job_role?: string;
  };
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
const badgePaint = [
  ['Primer', 'SW 7008', 'Alabaster', 'AI Fundamentals', '#edeae0'],
  ['First Coat', 'SW 6204', 'Sea Salt', 'Copilot in the IDE', '#cbd5cc'],
  ['Cut In', 'SW 7029', 'Agreeable Gray', 'Prompt Engineering', '#d1cbc1'],
  ['Second Coat', 'SW 6244', 'Naval', 'Agent Workflows', '#2e3b4e'],
  ['Emerald', 'SW 6454', 'Shamrock', 'Library Contributor', '#2f6b4f'],
  ['Full Coverage', 'SW 6868', 'Real Red', 'Applied Mastery', '#bc2b36'],
] as const;
const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('content-type', 'application/json');
  const r = await fetch(apiBase + path, {
    ...options,
    cache: 'no-store',
    credentials: 'include',
    headers,
  });
  const body = (r.status === 204 ? {} : await r.json()) as {
    data: T;
    detail?: string;
    error?: { message: string };
  };
  if (r.status === 401 && typeof window !== 'undefined')
    window.dispatchEvent(new Event('cover:unauthorized'));
  if (!r.ok) {
    const error = new Error(
      body.detail ?? body.error?.message ?? 'Request failed.',
    ) as Error & { status: number };
    error.status = r.status;
    throw error;
  }
  return body.data as T;
}
function Breadcrumbs({
  level,
  name,
  team,
  onMe,
  onTeam,
  onOrganization,
}: {
  level: 'me' | 'team' | 'organization';
  name: string;
  team: string;
  onMe: () => void;
  onTeam: () => void;
  onOrganization: () => void;
}) {
  return (
    <div className="v3-crumbs" aria-label="Scoreboard zoom">
      <span>Zoom</span>
      <button className={level === 'me' ? 'on' : ''} onClick={onMe}>Me · {name.split(' ')[0]}</button>
      <b>›</b>
      <button className={level === 'team' ? 'on' : ''} onClick={onTeam}>Team · {team}</button>
      <b>›</b>
      <button className={level === 'organization' ? 'on' : ''} onClick={onOrganization}>Organization</button>
    </div>
  );
}
function PaintCan({ percent }: { percent: number | null }) {
  const p = percent === null ? 0 : Math.max(0, Math.min(100, percent));
  return (
    <div className="v3-can" aria-label={percent === null ? 'Coverage unavailable' : `${Math.round(p)}% coverage`}>
      <i />
      <div className="v3-can-body">
        <span style={{ height: `${p}%` }} />
        <strong>{percent === null ? '—' : `${Math.round(p)}%`}</strong>
        <small>Coverage</small>
      </div>
      <em>Trained + Adopted</em>
    </div>
  );
}
function BadgeRack({ earned }: { earned: number }) {
  const unavailable = earned < 0;
  return (
    <div className="v3-badge-rack">
      {badgePaint.map((b, i) => (
        <article className={`v3-paint-card ${unavailable || i >= earned ? 'locked' : ''}`} key={b[0]}>
          <div style={{ background: b[4], color: i > 2 ? '#fff' : '#2d2d2d' }}><strong>{b[0]}</strong></div>
          <footer>
            <span>{b[1]}</span><small>{b[2]}</small>
            <b>{b[3]}</b>
            <em>{unavailable ? 'Unavailable' : i < earned ? 'Earned' : i === earned ? 'In progress' : 'Locked'}</em>
          </footer>
        </article>
      ))}
    </div>
  );
}
function TrendChart({
  values,
  current,
  label = 'Weekly history unavailable',
}: {
  values?: number[];
  current?: number | null;
  label?: string;
}) {
  const points = values?.length
    ? values
        .map((v, i) => `${18 + (i / (values.length - 1)) * 264},${104 - v * 0.86}`)
        .join(' ')
    : '';
  const currentY = current == null ? null : 104 - Math.max(0, Math.min(100, current)) * 0.86;
  return (
    <svg className="v3-trend-chart" viewBox="0 0 300 126" aria-label={label}>
      <title>{label}</title>
      {[25, 50, 75].map((tick) => (
        <g key={tick}>
          <line x1="18" x2="282" y1={104 - tick * 0.86} y2={104 - tick * 0.86} />
          <text x="2" y={107 - tick * 0.86}>{tick}</text>
        </g>
      ))}
      <line x1="18" x2="282" y1="104" y2="104" />
      {points && (
        <>
          <polygon className="area" points={`18,104 ${points} 282,104`} />
          <polyline className="line" points={points} />
        </>
      )}
      {!points && currentY !== null && (
        <>
          <line className="snapshot-guide" x1="282" x2="282" y1="104" y2={currentY} />
          <circle className="snapshot" cx="282" cy={currentY} r="4" />
          <text className="snapshot-label" x="278" y={Math.max(10, currentY - 8)} textAnchor="end">
            {Math.round(current!)}% current
          </text>
        </>
      )}
      <text x="18" y="120">WK 1</text>
      <text x="258" y="120">WK 12</text>
      {!points && <text className="empty-label" x="150" y="61" textAnchor="middle">HISTORY UNAVAILABLE</text>}
    </svg>
  );
}
function Sparkline() {
  return (
    <svg className="v3-sparkline" viewBox="0 0 90 26" aria-label="Activity history unavailable">
      <title>Activity history unavailable</title>
      <line x1="1" x2="89" y1="21" y2="21" />
      <line x1="1" x2="89" y1="13" y2="13" />
      <text x="45" y="11" textAnchor="middle">Unavailable</text>
    </svg>
  );
}
function RailRows({ labels }: { labels: string[] }) {
  return (
    <div className="v3-rail-rows">
      {labels.map((label) => (
        <div className="v3-rail-row" key={label}>
          <span>{label}</span><i><b /></i><em>—</em>
        </div>
      ))}
    </div>
  );
}
function NeutralMixBar({ labels }: { labels: string[] }) {
  return (
    <>
      <div className="v3-mixbar" aria-label="Mix unavailable"><span /></div>
      <div className="v3-mixlegend">
        {labels.map((label, i) => <span key={label}><i className={`mix-${i}`} />{label} <b>—</b></span>)}
      </div>
    </>
  );
}
function NeutralDonut() {
  return (
    <div className="v3-donut-wrap">
      <div className="v3-donut neutral"><span>—<small>Unavailable</small></span></div>
      <div className="v3-donut-legend">
        {['Copilot', 'Claude', 'Codex', 'Cursor', 'Other'].map((tool, i) => (
          <span key={tool}><i className={`mix-${i}`} />{tool}<b>—</b></span>
        ))}
      </div>
    </div>
  );
}
function WeekRail() {
  return (
    <>
      <div className="v3-weekgrid" aria-label="Twelve-week activity unavailable">
        {Array.from({ length: 12 }, (_, i) => <span key={i}><i /></span>)}
        <b />
      </div>
      <div className="v3-weeklabels"><span>WK 1</span><em>HISTORY UNAVAILABLE</em><span>WK 12</span></div>
    </>
  );
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
function DeveloperOverview({
  session,
  scores,
  courses,
  recognition,
  subject,
  hideBreadcrumbs = false,
  onTeam,
  onOrganization,
  onLearning,
}: {
  session: Session;
  scores: Scorecard;
  courses: Course[];
  recognition: Recognition | null;
  subject?: Person;
  hideBreadcrumbs?: boolean;
  onTeam: () => void;
  onOrganization: () => void;
  onLearning: () => void;
}) {
  const team = session.scopes.find((s) => s.kind === 'team')?.name ?? 'Unavailable';
  const [path, setPath] = useState<'ic' | 'lead' | 'elective'>('ic');
  const profileName = subject?.display_name ?? session.user.display_name;
  const profileRole = subject?.employment_type ?? session.user.job_role ?? session.user.employment_type;
  const managerView = Boolean(subject);
  // The approved M25 groups are independent; no blended coverage or finish is inferred.
  const coverage = null;
  const visibleCourses = managerView ? [] : courses;
  const completed = visibleCourses.filter((c) => c.status === 'completed').length;
  const earned = managerView ? 0 : Math.min(6, recognition?.badges.length ?? 0);
  const pathCourses = path === 'elective'
    ? visibleCourses.filter((c) => !c.required)
    : path === 'lead'
      ? []
      : visibleCourses.filter((c) => c.required);
  return (
    <>
      {!hideBreadcrumbs && <Breadcrumbs
        level="me"
        name={profileName}
        team={team}
        onMe={() => {}}
        onTeam={onTeam}
        onOrganization={onOrganization}
      />}
      {managerView && <p className="v3-manager-note">Manager view · Authorized scorecard for {profileName}. Learning and recognition are not exposed by this scope.</p>}
      <div className="v3-developer-grid">
        <div>
          <section className="v3-procard">
            <div className="v3-prohead">
              <div className="v3-proleft">
                <span className="v3-avatar-ring"><span className="v3-avatar">{initials(profileName)}</span></span>
                <div>
                  <h2>{profileName}</h2>
                  <p>{profileRole} · {team}</p>
                  <p className="v3-caslon">Gateway, Copilot &amp; the Skill Library — tools of the trade.</p>
                </div>
              </div>
              <div className="v3-proright">
                <div className="v3-rankplaque">
                  <span className="v3-paint-chip" />
                  <div><small>Current finish</small><strong>{coverage === null ? 'Unavailable' : coverage >= 80 ? 'High Gloss' : coverage >= 60 ? 'Semi-Gloss' : 'Satin'}</strong></div>
                </div>
                <PaintCan percent={coverage} />
              </div>
            </div>
            <div className="v3-achievements">
              <div><strong>{managerView ? '—' : earned} <small>{managerView ? '' : 'of 6'}</small></strong><span>Badges</span></div>
              <div><strong>{managerView ? '—' : value(recognition?.points)}</strong><span>Points</span></div>
              <div><strong>{managerView ? '—' : recognition?.certifications.length ?? 0}</strong><span>Certs</span></div>
              <div><strong>Unavailable</strong><span>Weeks active</span></div>
            </div>
          </section>
          <section className="v3-panel-block">
            <span className="v3-panel-label">My badge wall</span>
            <BadgeRack earned={managerView ? -1 : earned} />
          </section>
          <section className="v3-panel-block">
            <div className="v3-panel-heading">
              <span className="v3-panel-label">My learning · available paths</span>
              {!managerView && <button onClick={onLearning}>Open all learning</button>}
            </div>
            <div className="v3-pathcards">
              <button className={path === 'ic' ? 'on' : ''} onClick={() => setPath('ic')}><strong>Individual Contributor Path</strong><p>Assigned PostgreSQL catalogue · {visibleCourses.filter((c) => c.required).length} courses</p><progress max={visibleCourses.length || 1} value={completed} /><small>{managerView ? 'Unavailable' : `${completed} complete`}</small></button>
              <button className={path === 'lead' ? 'on' : ''} onClick={() => setPath('lead')}><strong>Dev Lead Path</strong><p>Role-specific assignment status</p><span>Unavailable</span></button>
              <button className={path === 'elective' ? 'on' : ''} onClick={() => setPath('elective')}><strong>Ad Hoc Electives</strong><p>Eligible optional catalogue</p><span>{managerView ? 'Unavailable' : `${visibleCourses.filter((c) => !c.required).length} available`}</span></button>
            </div>
            <div className="v3-stagehead"><i /><span>{path === 'elective' ? 'Electives' : path === 'lead' ? 'Dev Lead' : 'Assigned'} · Current catalogue</span><b /></div>
            {pathCourses.slice(0, 6).map((c) => (
              <div className="v3-learning-row" key={c.id}>
                <span className={`v3-course-status ${c.status === 'completed' ? 'done' : ''}`}>{c.status === 'completed' ? 'Complete' : c.status ? status(c.status) : 'Not started'}</span>
                <div><strong>{c.title}</strong><small>{c.provider} · version {c.version_number}</small></div>
                <i style={{ background: badgePaint[Math.min(5, c.required ? 0 : 3)][4] }} />
              </div>
            ))}
            {!pathCourses.length && <p className="v3-muted">Course records for this path are unavailable.</p>}
          </section>
          <section className="v3-panel-block">
            <span className="v3-panel-label">My certifications</span>
            {!managerView && recognition?.certifications.length ? recognition.certifications.map((c, i) => (
              <div className="v3-cert-row" key={c.certification_name}>
                <i style={{ background: badgePaint[(i + 3) % 6][4] }} />
                <div><strong>{c.certification_name}</strong><small>{c.issuer}</small></div>
                <span>{status(c.verification_status)}</span>
              </div>
            )) : <p className="v3-muted">No certification records are available.</p>}
          </section>
          <section className="v3-panel-block">
            <span className="v3-panel-label">My 12-week activity</span>
            <WeekRail />
            <p className="v3-muted">Weekly activity is not present in the authorized API response.</p>
          </section>
        </div>
        <aside>
          <section className="v3-panel-block">
            <span className="v3-panel-label">My skill mix · by tool</span>
            <NeutralDonut />
            <p className="v3-muted">No tool-mix value is inferred.</p>
          </section>
          <section className="v3-panel-block">
            <span className="v3-panel-label">Me vs. {team}</span>
            {['E', 'A', 'T', 'F', 'Q'].map((code) => {
              const score = scores.groups.find((g) => g.group_code === code)?.score;
              return <div className="v3-vsrow" key={code}><div><span>{groups[code]}</span><b>{score === null ? 'Unavailable' : `${value(score)} current`}</b></div><i><span style={{ width: `${score === null ? 0 : Number(score)}%` }} /></i><small>Team comparison unavailable</small></div>;
            })}
            <p className="v3-muted">Five independent M25 groups. No overall score.</p>
          </section>
          <section className="v3-panel-block">
            <span className="v3-panel-label">Team trend · weekly active</span>
            <TrendChart label="Team weekly active history unavailable" />
          </section>
        </aside>
      </div>
    </>
  );
}
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  const [scopeCards, setScopeCards] = useState<Record<string, Scorecard>>({});
  const [subjectName, setSubjectName] = useState('');
  const [subjectPerson, setSubjectPerson] = useState<Person | null>(null);
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
    const update = () => setOffline(!navigator.onLine);
    const unauthorized = () => {
      epoch.current += 1;
      setSession(null);
      setAuthChecked(true);
      setLoading(false);
      setBusy(false);
      setError('');
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener('cover:unauthorized', unauthorized);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener('cover:unauthorized', unauthorized);
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
      setScopeCards({});
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
    request<Session>('/session')
      .then(async (s) => {
        const [sc, co, ch, re, con] = await Promise.all([
          request<Scorecard>('/me/scorecard'),
          request<Course[]>('/me/courses'),
          request<Assessment[]>('/me/assessments'),
          request<Recognition>('/me/recognition'),
          request<Consumption>('/me/consumption?month=2026-09'),
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
        if (live && (e as Error & { status?: number }).status !== 401)
          setError(e.message);
      })
      .finally(() => {
        if (live) {
          setLoading(false);
          setAuthChecked(true);
        }
      });
    return () => {
      live = false;
    };
  }, [revision]); // month is refreshed independently below
  useEffect(() => {
    if (!session) return;
    let live = true;
    const timer = setTimeout(() => {
      request<Course[]>(`/me/courses?q=${encodeURIComponent(search)}`)
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
  }, [search, session]);
  useEffect(() => {
    if (!session) return;
    let live = true;
    queueMicrotask(() => {
      if (live) setConsumption(null);
    });
    request<Consumption>(`/me/consumption?month=${month}`)
      .then((r) => {
        if (live) setConsumption(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [month, session]);
  useEffect(() => {
    if (!session || !scope || tab !== 'scope') return;
    let live = true;
    queueMicrotask(() => {
      if (live) {
        setScopeScores(null);
        setPeople([]);
        setSubjectName('');
        setSubjectPerson(null);
      }
    });
    request<Scorecard>(`/scopes/${scope}/scorecard`)
      .then((r) => {
        if (live) setScopeScores(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    if (
      session.scopes.find((s) => s.id === scope)?.permissions.includes('people')
    )
      request<{ rows: Person[] }>(`/scopes/${scope}/people`)
        .then((r) => {
          if (live) setPeople(r.rows);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    void Promise.all(
      session.scopes
        .filter((s) => s.permissions.includes('aggregate'))
        .map(async (s) => [s.id, await request<Scorecard>(`/scopes/${s.id}/scorecard`)] as const),
    )
      .then((rows) => {
        if (live) setScopeCards(Object.fromEntries(rows));
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [scope, tab, session]);
  useEffect(() => {
    if (tab !== 'operations' || !session) return;
    let live = true;
    const load = () =>
      request<Operations>('/operations')
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
  }, [tab, session]);
  const command = useCallback(
    async (action: string, body: Record<string, unknown>, version?: number) => {
      setBusy(true);
      setError('');
      setNotice('');
      const current = epoch.current;
      const signature = JSON.stringify({ action, body, version });
      if (commandRef.current?.signature !== signature)
        commandRef.current = { signature, id: crypto.randomUUID() };
      try {
        const result = await request<Record<string, unknown>>(
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
    [],
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
        await request<Evidence[]>(`/enrollments/${c.enrollment_id}/evidence`),
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
        }>(`/jobs/${String(r.jobId)}`);
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
  async function signIn(event: { preventDefault(): void }) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request<{ authenticated: boolean }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setPassword('');
      setAuthChecked(false);
      setRevision((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    try {
      await request<void>('/auth/logout', { method: 'POST' });
    } finally {
      epoch.current += 1;
      setSession(null);
      setAuthChecked(true);
      setLoading(false);
      setBusy(false);
      setTab('scores');
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
  const scopeAdoption = scopeScores?.groups.find((g) => g.group_code === 'A')?.score;
  if (authChecked && !session)
    return (
      <div className="v3-login">
        <div className="v3-login-art" aria-hidden="true">
          <span><Image src="/sw-logo.svg" alt="" width={450} height={224} priority /></span>
        </div>
        <main>
          <span className="v3-kicker">Sherwin-Williams · Internal</span>
          <h1>Cover the<br />Codebase</h1>
          <span className="v3-brush" aria-hidden="true" />
          <p className="v3-login-tag">Developer AI enablement, adoption and growth.</p>
          <form onSubmit={signIn}>
            <div>
              <span className="v3-kicker">Secure workspace</span>
              <h2>Sign in</h2>
              <p>Use your authorized email and password.</p>
            </div>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="v3-error" role="alert">{error}</p>}
            <Button type="submit" disabled={busy}>
              <LockKeyhole size={16} />
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </main>
      </div>
    );
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
        <svg className="v3-splat" viewBox="0 0 380 260" aria-hidden="true">
          <circle cx="270" cy="80" r="58" /><circle cx="200" cy="170" r="22" />
          <circle cx="330" cy="180" r="34" /><circle cx="160" cy="60" r="9" />
          <circle cx="345" cy="60" r="7" /><circle cx="240" cy="228" r="8" />
          <path d="M270,138 q6,26 -4,44 q14,-8 12,-44 Z" />
          <path d="M120,110 q30,-18 58,-4 q-24,-26 -58,4 Z" />
        </svg>
        <div className="v3-brand">
          <div className="v3-logo-chip" aria-label="Sherwin-Williams">
            <Image src="/sw-logo.svg" alt="Sherwin-Williams" width={450} height={224} priority />
          </div>
          <span className="v3-kicker">AI adoption scoreboard</span>
          <h1>
            Cover the
            <br />
            Codebase
          </h1>
          <svg className="v3-titlebrush" viewBox="0 0 230 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2,7 C28,2 55,11 85,6 C115,1 145,10 175,5 C198,2 218,9 228,5 L228,8 C205,12 180,7 155,10 C125,13 95,6 65,10 C42,13 18,10 2,10 Z" /></svg>
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
        <div className="v3-header-actions">
          <details className="v3-workspace-menu">
            <summary>Workspace</summary>
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
                  <t.icon size={15} />
                  {t.label}
                </button>
              ))}
            </nav>
          </details>
          <Button className="v3-logout" onClick={() => void signOut()} disabled={busy}>
            <LogOut size={15} /> Logout
          </Button>
        </div>
      </header>
      <svg className="v3-drip" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,0 H1200 V7 C1150,7 1140,20 1110,20 C1080,20 1075,7 1030,7 C980,7 975,24 940,24 C905,24 900,7 850,7 C790,7 785,16 750,16 C715,16 710,7 660,7 C600,7 595,22 560,22 C525,22 520,7 470,7 C410,7 405,14 370,14 C335,14 330,7 280,7 C220,7 215,18 180,18 C145,18 140,7 90,7 C50,7 40,12 0,12 Z" />
      </svg>
      <div className="v3-layout">
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
                  <DeveloperOverview
                    session={session}
                    scores={scores}
                    courses={courses}
                    recognition={recognition}
                    onLearning={() => setTab('learning')}
                    onTeam={() => {
                      const teamScope = session.scopes.find((s) => s.kind === 'team');
                      if (teamScope) setScope(teamScope.id);
                      setTab('scope');
                    }}
                    onOrganization={() => {
                      const orgScope = session.scopes.find((s) => s.kind === 'organization');
                      if (orgScope) setScope(orgScope.id);
                      setTab('scope');
                    }}
                  />
                  <div className="v3-section-title">
                    <div>
                      <h2>M25 scorecard detail</h2>
                      <p>Evidence, definitions and independent group calculations.</p>
                    </div>
                  </div>
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
                      <Breadcrumbs
                        level={session.scopes.find((s) => s.id === scope)?.kind === 'team' ? 'team' : 'organization'}
                        name={session.user.display_name}
                        team={session.scopes.find((s) => s.kind === 'team')?.name ?? 'Unavailable'}
                        onMe={() => setTab('scores')}
                        onTeam={() => {
                          const s = session.scopes.find((item) => item.kind === 'team');
                          if (s) setScope(s.id);
                        }}
                        onOrganization={() => {
                          const s = session.scopes.find((item) => item.kind === 'organization');
                          if (s) setScope(s.id);
                        }}
                      />
                      {!subjectName && <div className="v3-axes">
                        <article><h3>1. Enablement</h3><p>Required learning and assessment evidence from PostgreSQL.</p></article>
                        <article><h3>2. Adoption</h3><p>Authorized adoption projections in the current publication.</p></article>
                        <article><h3>3. Effective</h3><p>Jira baseline summary: <b>Unavailable</b>. No value is inferred.</p></article>
                      </div>}
                      {!subjectName && <div className="v3-coty-banner"><i /><div><strong>2026 Color of the Year · Unavailable</strong><b>Award data unavailable</b><p>No quarterly blended award is inferred from independent score groups.</p></div></div>}
                      {!subjectName && <div className="v3-section-title"><h2>Organization scoreboard</h2></div>}
                      {!subjectName && <div className="v3-org-board">
                        <div className="head"><span>Team</span><span>Enablement</span><span>Adoption</span><span>Effective (vs. baseline)</span><span>Finish</span><span /></div>
                        {session.scopes.filter((s) => s.permissions.includes('aggregate')).map((s) => {
                          const card = scopeCards[s.id];
                          const e = card?.groups.find((g) => g.group_code === 'E')?.score ?? null;
                          const a = card?.groups.find((g) => g.group_code === 'A')?.score ?? null;
                          return (
                            <button key={s.id} onClick={() => setScope(s.id)}>
                              <span><strong>{s.name}</strong><small>{s.kind}</small></span>
                              <span><b className="v3-pct blue">{e === null ? 'Unavailable' : value(e)}</b><i className="v3-track"><em style={{ width: `${e ?? 0}%` }} /></i></span>
                              <span><b className="v3-pct navy">{a === null ? 'Unavailable' : value(a)}</b><i className="v3-track"><em style={{ width: `${a ?? 0}%` }} /></i></span>
                              <span className="v3-muted">Unavailable</span>
                              <span className="v3-sheen">Unavailable</span>
                              <span className="v3-chev">›</span>
                            </button>
                          );
                        })}
                      </div>}
                      {!subjectName && <label className="v3-search">
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
                      </label>}
                      {subjectName && (
                        <p className="v3-notice">
                          Authorized individual view: {subjectName}.{' '}
                          <button
                            onClick={() => {
                              setSubjectName('');
                              setSubjectPerson(null);
                              void request<Scorecard>(
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
                      {subjectPerson && scopeScores && (
                        <DeveloperOverview
                          session={session}
                          scores={scopeScores}
                          courses={[]}
                          recognition={null}
                          subject={subjectPerson}
                          hideBreadcrumbs
                          onLearning={() => {}}
                          onTeam={() => {
                            setSubjectName('');
                            setSubjectPerson(null);
                          }}
                          onOrganization={() => {
                            setSubjectName('');
                            setSubjectPerson(null);
                            const organization = session.scopes.find((s) => s.kind === 'organization');
                            if (organization) setScope(organization.id);
                          }}
                        />
                      )}
                      {!subjectName && session.scopes.find((s) => s.id === scope)?.kind === 'team' && (
                        <>
                          <div className="v3-dethead">
                            <div>
                              <h2>{session.scopes.find((s) => s.id === scope)?.name}</h2>
                              <p>Authorized PostgreSQL roster and aggregate analytics.</p>
                            </div>
                            <div className="v3-detstats">
                              <div><strong>{value(scopeScores?.groups.find((g) => g.group_code === 'E')?.score)}</strong><span>Enablement</span></div>
                              <div><strong>{value(scopeScores?.groups.find((g) => g.group_code === 'A')?.score)}</strong><span>Adoption</span></div>
                              <div><strong>Unavailable</strong><span>Finish</span></div>
                            </div>
                          </div>
                          <div className="v3-team-panels">
                            <article><span>Weekly active adoption · 12 weeks</span><TrendChart current={scopeAdoption === null || scopeAdoption === undefined ? null : Number(scopeAdoption)} label="Weekly history unavailable; current adoption snapshot shown" /></article>
                            <article><span>Badge coverage · team</span><RailRows labels={badgePaint.map((b) => b[0])} /></article>
                            <article><span>Sheen mix · roster</span><NeutralMixBar labels={['Flat', 'Eggshell', 'Satin', 'Semi-Gloss', 'High Gloss']} /></article>
                            <article><span>Certifications · roster</span><RailRows labels={['GH-300', 'AI-102', 'GenAI', 'AIF-C01']} /></article>
                          </div>
                        </>
                      )}
                      {!subjectName && scopeScores ? (
                        <Scores data={scopeScores} onDetail={setMetric} />
                      ) : !subjectName ? (
                        <p>Loading scope…</p>
                      ) : null}
                      {!subjectName && people.length > 0 && (
                        <>
                          <div className="v3-section-title"><h2>The roster</h2></div>
                          <div className="v3-roster">
                            <div className="head"><span>Developer</span><span>Badges</span><span>12-wk activity</span><span>Weekly active</span><span>Finish</span></div>
                            {people.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  void request<Scorecard>(
                                    `/people/${p.id}/scorecard`,
                                  )
                                    .then((r) => {
                                      setScopeScores(r);
                                      setSubjectName(p.display_name);
                                      setSubjectPerson(p);
                                    })
                                    .catch((e) => setError(e.message));
                                }}
                              >
                                <span><strong>{p.display_name}</strong><small>{p.employment_type}</small></span>
                                <span><span className="v3-mini-chips">{badgePaint.map((b) => <i key={b[0]} />)}</span><small>Unavailable</small></span><span><Sparkline /></span><span className="v3-muted">Unavailable</span><span>Unavailable ›</span>
                              </button>
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
