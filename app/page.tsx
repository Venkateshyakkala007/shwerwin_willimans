'use client';

import { Activity, Award, BookOpen, ChevronRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const weeks = [28, 42, 36, 55, 68, 64, 72, 78, 61, 84, 88, 92];
const badges = [
  ['Primer', 'AI Fundamentals', '#EDEAE0', 'SW 7008'],
  ['First Coat', 'Copilot in the IDE', '#CBD5CC', 'SW 6204'],
  ['Cut In', 'Prompt Engineering', '#D1CBC1', 'SW 7029'],
  ['Second Coat', 'Agent Workflows', '#2E3B4E', 'SW 6244'],
  ['Emerald', 'Library Contributor', '#2F6B4F', 'SW 6454'],
  ['Full Coverage', 'Applied Mastery', '#BC2B36', 'SW 6868'],
] as const;

export default function Home() {
  const [period, setPeriod] = useState('12 weeks');
  const [view, setView] = useState<'personal' | 'benchmark'>('personal');
  const [learningPath, setLearningPath] = useState<'core' | 'electives'>('core');
  const [completed, setCompleted] = useState(7);
  const continueLearning = () => document.getElementById('learning')?.scrollIntoView({ behavior: 'smooth' });
  return (
    <div className="site-shell">
      <div className="utility-bar"><span>Sherwin-Williams · Internal</span><span>Developer AI Enablement · Q3 2026</span></div>
      <header className="hero-band">
        <div><p className="eyebrow">AI Adoption Scoreboard</p><h1>Cover the<br />Codebase</h1><div className="brush" /><p className="hero-copy">Your learning, activity and recognition—one standard of finish.</p></div>
        <div className="hero-stats" aria-label="Personal summary"><div><strong>83%</strong><span>Trained</span></div><div><strong>76%</strong><span>Adopted</span></div><div><strong>12,480</strong><span>Points</span></div></div>
      </header>
      <main className="main-content">
        <nav className="zoom-nav" aria-label="Dashboard level"><span>View</span><button className={view === 'personal' ? 'active' : ''} onClick={() => setView('personal')}>My dashboard</button><button className={view === 'benchmark' ? 'active' : ''} onClick={() => setView('benchmark')}>Team benchmark</button></nav>
        <div className="freshness"><span className="fresh-dot" />All personal data is current <b>·</b> refreshed 2 hours ago <button aria-label="Learn about data freshness">What does this mean?</button></div>
        {view === 'benchmark' ? <section className="benchmark-view" aria-live="polite"><div><p className="eyebrow ink">Privacy-safe benchmark</p><h2>Digital Commerce</h2><p>Your team has 210 eligible developers. Results are anonymized and published only because the cohort exceeds the privacy threshold.</p></div><div className="benchmark-bars"><div><span>You trained <b>83%</b></span><i><em style={{width:'83%'}} /></i></div><div><span>Team trained <b>88%</b></span><i><em style={{width:'88%'}} /></i></div><div><span>You adopted <b>76%</b></span><i><em className="navy-fill" style={{width:'76%'}} /></i></div><div><span>Team adopted <b>76%</b></span><i><em className="navy-fill" style={{width:'76%'}} /></i></div></div></section> : null}
        <section className="profile-grid">
          <div className="profile-card"><div className="profile-heading"><div className="avatar-ring"><div className="avatar">PK</div></div><div><p className="eyebrow ink">Welcome back</p><h2>Priya Kowalski</h2><p>Senior Software Engineer · Digital Commerce</p><span className="status-pill"><ShieldCheck size={14} /> Eligible employee</span></div></div><div className="finish-card"><span className="paint-chip" /><div><small>Current finish</small><strong>Semi-Gloss</strong><p>4 points to High Gloss</p></div></div></div>
          <aside className="next-card"><div className="icon-box"><BookOpen size={22} /></div><p className="eyebrow ink">Continue learning</p><h3>Agent Workflows</h3><p>Claude Code in Action · 2.5 hours</p><div className="progress"><span style={{ width: '62%' }} /></div><button onClick={continueLearning}>Continue course <ChevronRight size={16} /></button></aside>
        </section>
        <section className="metric-row" aria-label="Achievement metrics"><article><Award size={20} /><div><strong>4 of 6</strong><span>Badges earned</span></div></article><article><Activity size={20} /><div><strong>9 of 12</strong><span>Weeks active</span></div></article><article><ShieldCheck size={20} /><div><strong>2</strong><span>Verified certifications</span></div></article><article><BookOpen size={20} /><div><strong>{completed} of 11</strong><span>Courses completed</span></div></article></section>
        <section className="dashboard-grid">
          <article className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow ink">My activity</p><h3>Qualifying AI usage</h3></div><select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Activity period"><option>12 weeks</option><option>6 weeks</option></select></div><div className="week-chart" aria-label="Weekly activity chart">{weeks.map((height, i) => <div key={i}><span style={{ height: `${height}%` }} className={height >= 40 ? 'active-bar' : ''} /></div>)}</div><div className="chart-labels"><span>Week 1</span><span>Weekly active threshold</span><span>Week 12</span></div></article>
          <article className="panel tool-panel"><p className="eyebrow ink">My skill mix</p><h3>Approved tools</h3><div className="donut"><div><strong>42%</strong><span>Copilot</span></div></div><ul><li><i className="blue" />GitHub Copilot <b>42%</b></li><li><i className="navy" />Claude <b>28%</b></li><li><i className="green" />Codex <b>18%</b></li><li><i className="gray" />Other <b>12%</b></li></ul></article>
        </section>
        <section><div className="section-title"><div><h2>My Badge Wall</h2><div className="brush short" /></div><p>Four earned · one in progress</p></div><div className="badge-rack">{badges.map(([name, skill, color, code], index) => <article className={`badge-card ${index > 3 ? 'locked' : ''}`} key={name}><div className="swatch" style={{ background: color, color: index > 2 ? '#fff' : '#2d2d2d' }}><strong>{name}</strong></div><div className="badge-info"><span>{code}</span><h3>{skill}</h3><p>{index < 4 ? 'Earned' : index === 4 ? 'In progress' : 'Locked'}</p></div></article>)}</div></section>
        <section id="learning">
          <div className="section-title"><div><h2>My Learning</h2><div className="brush short" /></div><p>Role-based · version 2026.3</p></div>
          <div className="learning-layout"><div className="path-tabs"><button className={learningPath === 'core' ? 'active' : ''} onClick={() => setLearningPath('core')}><strong>Individual Contributor Path</strong><span>{completed} of 11 complete · your track</span></button><button className={learningPath === 'electives' ? 'active' : ''} onClick={() => setLearningPath('electives')}><strong>Ad Hoc Electives</strong><span>Optional · take any time</span></button></div>
          <div className="course-list">{(learningPath === 'core' ? [['Responsible AI & SW Governance','SW Internal','Complete'],['Introduction to GitHub Copilot','Microsoft Learn','Complete'],['Claude Code in Action','Anthropic Academy','In progress'],['Introduction to Model Context Protocol','Anthropic Academy','Not started']] : [['Building with the Claude API','Anthropic Academy','Not started'],['MCP: Advanced Topics','Anthropic Academy','Not started'],['Applied AI Capstone','SW Internal','Not started']]).map(([title,provider,status], index) => <article key={title}><span className={`course-state ${status.toLowerCase().replace(' ','-')}`}>{status}</span><div><h3>{title}</h3><p>{provider} · {index % 2 ? '2.5 hours' : '1 hour'}</p></div>{status === 'In progress' ? <button onClick={() => setCompleted((value) => Math.min(11,value + 1))}>Mark complete</button> : <ChevronRight size={17} />}</article>)}</div></div>
        </section>
        <section className="bottom-grid"><article className="panel"><p className="eyebrow ink">My certifications</p><div className="cert"><span className="cert-band blue" /><div><strong>GH-300</strong><h3>GitHub Copilot Certification</h3><p>GitHub · Verified</p></div><ShieldCheck size={20} /></div><div className="cert"><span className="cert-band navy" /><div><strong>AI-102</strong><h3>Azure AI Engineer Associate</h3><p>Microsoft · Verified</p></div><ShieldCheck size={20} /></div></article><article className="panel"><p className="eyebrow ink">Knowledge check</p><h3>Responsible AI essentials</h3><p className="knowledge-copy">Your latest result is verified and contributes to the Primer badge.</p><div className="score-row"><strong>92%</strong><span>Passed · Aug 28, 2026</span></div><button className="secondary-action">Review answers</button></article></section>
      </main>
      <footer><span>Cover the Codebase · Internal developer enablement</span><span>Demo data · Updated 2 hours ago</span></footer>
    </div>
  );
}
