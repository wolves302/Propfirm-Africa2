import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, SlidersHorizontal, ShieldCheck, TrendingUp, Users, ExternalLink,
  Menu, X, LockKeyhole, Plus, Pencil, Trash2, LogOut, LayoutDashboard,
  Building2, MousePointerClick, Tag, Star, CircleAlert, CheckCircle2
} from 'lucide-react';
import { isConfigured, supabase } from './supabase';

const money = (v) => v == null || v === '' ? '—' : `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const blankFirm = {
  name: '', website: '', description: '', country: '', account_sizes: '',
  challenge_type: '2-step', profit_split: '80', min_days: '', daily_drawdown: '',
  max_drawdown: '', challenge_fee: '', payout_frequency: '', platform: '',
  discount_code: '', affiliate_url: '', status: 'active', featured: false
};

function App() {
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('featured');
  const [adminOpen, setAdminOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('firms');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankFirm);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
const [memberOpen, setMemberOpen] = useState(false);
const [memberMode, setMemberMode] = useState('login');
const [memberName, setMemberName] = useState('');
  async function loadFirms() {
    if (!supabase) { setFirms([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from('firms_public').select('*').order('featured', { ascending: false }).order('name');
    if (error) setNotice(error.message);
    else setFirms(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadFirms();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      if (!session || !supabase) { setIsAdmin(false); return; }
      const { data, error } = await supabase.rpc('is_admin');
      setIsAdmin(!error && data === true);
    }
    checkAdmin();
  }, [session]);

  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  const visibleFirms = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = firms.filter(f => {
      const hay = [f.name, f.country, f.description, f.challenge_type, f.platform].join(' ').toLowerCase();
      return (!q || hay.includes(q));
    });
    if (sort === 'fee-low') rows.sort((a,b) => (a.challenge_fee ?? 1e9) - (b.challenge_fee ?? 1e9));
    if (sort === 'split-high') rows.sort((a,b) => (b.profit_split ?? 0) - (a.profit_split ?? 0));
    if (sort === 'name') rows.sort((a,b) => a.name.localeCompare(b.name));
    if (sort === 'featured') rows.sort((a,b) => Number(b.featured) - Number(a.featured));
    return rows;
  }, [firms, query, sort]);

  async function signIn(e) {
    e.preventDefault(); setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthBusy(false);
    setNotice(error ? error.message : 'Signed in. Checking administrator access…');
  }
  
async function memberSignUp(e) {
  e.preventDefault();
  setAuthBusy(true);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { display_name: memberName }
    }
  });

  setAuthBusy(false);
  setNotice(error ? error.message : 'Account created! Please check your email to verify your account.');
}

async function memberSignIn(e) {
  e.preventDefault();
  setAuthBusy(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  setAuthBusy(false);

  if (error) {
    setNotice(error.message);
  } else {
    setMemberOpen(false);
    setNotice('Welcome back!');
  }
}

async function memberResetPassword() {
  if (!email) {
    setNotice('Enter your email address first.');
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });

  setNotice(error ? error.message : 'Password reset instructions sent. Check your email.');
}
  
  async function signOut() {
    await supabase.auth.signOut(); setAdminOpen(false); setNotice('Signed out.');
  }
  function startAdd() { setEditing(null); setForm(blankFirm); }
  function startEdit(f) {
    setEditing(f.id);
    setForm({ ...blankFirm, ...f, account_sizes: (f.account_sizes || []).join(', ') });
  }
  async function saveFirm(e) {
    e.preventDefault();
    const payload = {
      ...form,
      account_sizes: String(form.account_sizes || '').split(',').map(s => s.trim()).filter(Boolean),
      profit_split: form.profit_split === '' ? null : Number(form.profit_split),
      min_days: form.min_days === '' ? null : Number(form.min_days),
      daily_drawdown: form.daily_drawdown === '' ? null : Number(form.daily_drawdown),
      max_drawdown: form.max_drawdown === '' ? null : Number(form.max_drawdown),
      challenge_fee: form.challenge_fee === '' ? null : Number(form.challenge_fee),
      featured: Boolean(form.featured)
    };
    delete payload.id;
    const result = editing
      ? await supabase.from('firms').update(payload).eq('id', editing)
      : await supabase.from('firms').insert(payload);
    if (result.error) { setNotice(result.error.message); return; }
    setNotice(editing ? 'Prop firm updated.' : 'Prop firm added.');
    startAdd(); await loadFirms();
  }
  async function deleteFirm(id) {
    if (!confirm('Delete this prop firm? This cannot be undone.')) return;
    const { error } = await supabase.from('firms').delete().eq('id', id);
    setNotice(error ? error.message : 'Prop firm deleted.');
    if (!error) await loadFirms();
  }
  async function openAffiliate(firm) {
    if (!firm.affiliate_url) { setNotice('This firm has not added an affiliate destination yet.'); return; }
    if (supabase) {
      await supabase.from('affiliate_clicks').insert({ firm_id: firm.id, page: window.location.pathname });
    }
    window.open(firm.affiliate_url, '_blank', 'noopener,noreferrer');
  }
  async function submitReview(e, firmId) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const review = {
      firm_id: firmId,
      reviewer_name: String(fd.get('reviewer_name') || '').slice(0, 60),
      rating: Number(fd.get('rating')),
      body: String(fd.get('body') || '').slice(0, 1500),
      status: 'pending'
    };
    const { error } = await supabase.from('reviews').insert(review);
    setNotice(error ? error.message : 'Thanks! Your review has been submitted for moderation.');
    e.currentTarget.reset();
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark">PF</span><span>PROPFIRM<span className="brand-accent"> AFRICA</span><small>THE PROP FIRM DIRECTORY</small></span></a>
      <nav className={mobileNav ? 'nav nav-open' : 'nav'}>
        <a href="#compare" onClick={() => setMobileNav(false)}>Compare firms</a>
        <a href="#how" onClick={() => setMobileNav(false)}>How it works</a>
        <a href="#disclaimer" onClick={() => setMobileNav(false)}>Disclosure</a>
      </nav>
      <div className="top-actions">
        <button className="btn btn-ghost admin-trigger" onClick={() => setAdminOpen(true)}><LockKeyhole size={16}/> Admin</button>
        <button className="btn btn-primary" onClick={() => setMemberOpen(true)}>
  <Users size={16}/> Members
</button>
        <button className="icon-btn mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">{mobileNav ? <X/> : <Menu/>}</button>
      </div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot"></span> YOUR PROP FIRM RESEARCH HUB</div>
          <h1>Find the right prop firm.<br/><em>Trade with a plan.</em></h1>
          <p>Compare challenge fees, account sizes, trading rules and payout terms — all in one place.</p>
          <div className="hero-actions"><a className="btn btn-primary" href="#compare">Explore prop firms <ExternalLink size={16}/></a><span className="hero-note"><ShieldCheck size={15}/> Independent comparison. Always verify firm rules.</span></div>
        </div>
        <div className="hero-stats">
          <div><strong>{firms.length}</strong><span>Firms listed</span></div>
          <div><strong>Global</strong><span>Firm coverage</span></div>
          <div><strong>Free</strong><span>To compare</span></div>
        </div>
   s   </section>

      <section className="trust-strip">
        <span><ShieldCheck size={17}/> Compare key rules</span><span><TrendingUp size={17}/> Review account options</span><span><Tag size={17}/> Find available offers</span><span><Users size={17}/> Trader-led feedback</span>
      </section>

      <section className="section compare-section" id="compare">
        <div className="section-heading">
          <div><div className="eyebrow">THE DIRECTORY</div><h2>Compare prop firms</h2><p>Use the filters to narrow down your options.</p></div>
          <div className="firm-count">{visibleFirms.length} RESULTS</div>
        </div>
        <div className="filter-bar">
          <label className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search firm, country, platform…"/></label>
          <label className="sort-box"><SlidersHorizontal size={17}/><select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured first</option><option value="fee-low">Lowest challenge fee</option><option value="split-high">Highest profit split</option><option value="name">Name A–Z</option></select></label>
        </div>
        {!isConfigured && <div className="setup-banner"><CircleAlert size={19}/><div><strong>Demo mode — database not connected</strong><span>Add your Supabase project details in the .env file and follow SETUP.md to publish your directory.</span></div></div>}
        {loading ? <div className="empty-state">Loading directory…</div> :
          visibleFirms.length === 0 ? <div className="empty-state"><Building2 size={34}/><h3>Your directory starts here</h3><p>No firms have been published yet. Once your database is connected, add firms from your private admin dashboard.</p><button className="btn btn-secondary" onClick={() => setAdminOpen(true)}>Open admin dashboard</button></div> :
          <div className="firm-grid">{visibleFirms.map(f => <article className="firm-card" key={f.id}>
            <div className="firm-card-top"><div className="firm-avatar">{(f.name || 'P').slice(0,1).toUpperCase()}</div><div className="firm-title"><h3>{f.name}</h3><span>{f.country || 'Global'} {f.featured && <b className="featured-tag">FEATURED</b>}</span></div><span className="status-dot" title="Listed"></span></div>
            <p className="firm-description">{f.description || 'Prop firm details and trading conditions.'}</p>
            <div className="metrics">
              <div><span>Profit split</span><strong>{f.profit_split ? `${f.profit_split}%` : '—'}</strong></div>
              <div><span>Challenge fee</span><strong>{money(f.challenge_fee)}</strong></div>
              <div><span>Max drawdown</span><strong>{f.max_drawdown != null ? `${f.max_drawdown}%` : '—'}</strong></div>
            </div>
            <div className="firm-facts"><span><b>Account sizes</b>{(f.account_sizes || []).join(' · ') || 'Not specified'}</span><span><b>Challenge</b>{f.challenge_type || 'Not specified'}</span><span><b>Payouts</b>{f.payout_frequency || 'Check firm'}</span></div>
            {f.discount_code && <div className="discount"><Tag size={15}/><span>Discount code: <strong>{f.discount_code}</strong></span></div>}
            <div className="card-actions"><button className="btn btn-primary btn-full" onClick={() => openAffiliate(f)}>{f.affiliate_url ? 'Visit firm / Get offer' : 'Firm details unavailable'} <ExternalLink size={15}/></button><button className="text-button" onClick={() => document.getElementById(`review-${f.id}`)?.classList.toggle('hidden')}><Star size={14}/> Leave a review</button></div>
            <form id={`review-${f.id}`} className="review-form hidden" onSubmit={e => submitReview(e, f.id)}>
              <input name="reviewer_name" placeholder="Your name" required maxLength="60"/>
              <select name="rating" defaultValue="5"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
              <textarea name="body" placeholder="Share your experience…" required maxLength="1500"/>
              <button className="btn btn-secondary" type="submit">Submit review</button>
            </form>
          </article>)}</div>}
      </section>

      <section className="section how-section" id="how">
        <div className="section-heading"><div><div className="eyebrow">A CLEARER WAY TO COMPARE</div><h2>Choose with confidence</h2><p>Use the directory as a research starting point, not a guarantee of results.</p></div></div>
        <div className="how-grid">
          <div className="how-card"><span>01</span><Search/><h3>Compare the rules</h3><p>Check fees, profit targets, drawdown limits, minimum trading days and payout conditions.</p></div>
          <div className="how-card"><span>02</span><SlidersHorizontal/><h3>Check the details</h3><p>Read each firm's current terms and make sure its rules fit your strategy and risk limits.</p></div>
          <div className="how-card"><span>03</span><ShieldCheck/><h3>Make an informed choice</h3><p>Only proceed after verifying the firm, its terms, and any promotional offer directly.</p></div>
        </div>
      </section>
      <section className="disclosure" id="disclaimer"><div><ShieldCheck size={22}/><div><strong>Affiliate and risk disclosure</strong><p>Some links on this website may be affiliate links. If you use them, the website owner may earn a commission at no additional cost to you. Sponsored placements and affiliate relationships should be clearly identified. Prop trading involves risk; challenge fees may be lost. Firm rules, prices, offers and payout terms can change. Always verify information directly with the provider. This directory does not provide financial advice and does not guarantee funding or payouts.</p></div></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark">PF</span><span>PROPFIRM<span className="brand-accent"> AFRICA</span><small>THE PROP FIRM DIRECTORY</small></span></a><span>© {new Date().getFullYear()} PropFirm Africa. Independent comparison platform.</span></footer>

    {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}

    {adminOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAdminOpen(false); }}>
      <section className="admin-modal">
        <div className="admin-header"><div><div className="eyebrow">PRIVATE CONTROL CENTRE</div><h2>Admin dashboard</h2></div><button className="icon-btn" onClick={() => setAdminOpen(false)}><X/></button></div>
        {!session ? <form className="login-form" onSubmit={signIn}>
          <div className="login-icon"><LockKeyhole size={25}/></div><h3>Administrator sign in</h3><p>Use the administrator account you create in Supabase.</p>
          {!isConfigured && <div className="inline-warning">Connect Supabase first. See SETUP.md.</div>}
          <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/></label>
          <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Your password"/></label>
          <button className="btn btn-primary btn-full" disabled={!isConfigured || authBusy}>{authBusy ? 'Signing in…' : 'Sign in securely'}</button>
        </form> : !isAdmin ? <div className="empty-state"><CircleAlert/><h3>Admin access not enabled</h3><p>This account is signed in but has not been assigned the admin role. Follow the secure role setup in SETUP.md.</p><button className="btn btn-secondary" onClick={signOut}>Sign out</button></div> :
        <div className="admin-layout">
          <aside className="admin-side">
            <button className={tab === 'firms' ? 'active' : ''} onClick={() => {setTab('firms');startAdd();}}><Building2 size={17}/> Prop firms</button>
            <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}><LayoutDashboard size={17}/> Overview</button>
            <button onClick={signOut}><LogOut size={17}/> Sign out</button>
          </aside>
          <div className="admin-main">
            {tab === 'stats' ? <Stats firms={firms}/> : <>
              <div className="admin-toolbar"><div><h3>Prop firm listings</h3><p>Add and manage firms and your own affiliate destinations.</p></div><button className="btn btn-primary" onClick={startAdd}><Plus size={16}/> Add firm</button></div>
              <div className="admin-list">{firms.map(f => <div className="admin-list-row" key={f.id}><div className="firm-avatar small">{f.name.slice(0,1).toUpperCase()}</div><div className="admin-firm-name"><strong>{f.name}</strong><span>{f.status} · {f.affiliate_url ? 'Affiliate link added' : 'No affiliate link yet'}</span></div><button className="icon-btn" onClick={() => startEdit(f)} title="Edit"><Pencil size={16}/></button><button className="icon-btn danger" onClick={() => deleteFirm(f.id)} title="Delete"><Trash2 size={16}/></button></div>)}</div>
              <form className="firm-editor" onSubmit={saveFirm}>
                <h3>{editing ? 'Edit prop firm' : 'Add a prop firm'}</h3>
                <div className="form-grid">
                  <label>Firm name *<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label>
                  <label>Website URL<input type="url" value={form.website || ''} onChange={e => setForm({...form,website:e.target.value})} placeholder="https://example.com"/></label>
                  <label>Country / coverage<input value={form.country || ''} onChange={e => setForm({...form,country:e.target.value})} placeholder="Global"/></label>
                  <label>Challenge type<input value={form.challenge_type || ''} onChange={e => setForm({...form,challenge_type:e.target.value})} placeholder="1-step, 2-step, instant"/></label>
                  <label>Account sizes<input value={form.account_sizes || ''} onChange={e => setForm({...form,account_sizes:e.target.value})} placeholder="5k, 10k, 25k, 50k"/></label>
                  <label>Profit split (%)<input type="number" min="0" max="100" value={form.profit_split ?? ''} onChange={e => setForm({...form,profit_split:e.target.value})}/></label>
                  <label>Challenge fee (USD)<input type="number" min="0" step="0.01" value={form.challenge_fee ?? ''} onChange={e => setForm({...form,challenge_fee:e.target.value})}/></label>
                  <label>Minimum trading days<input type="number" min="0" value={form.min_days ?? ''} onChange={e => setForm({...form,min_days:e.target.value})}/></label>
                  <label>Daily drawdown (%)<input type="number" min="0" step="0.01" value={form.daily_drawdown ?? ''} onChange={e => setForm({...form,daily_drawdown:e.target.value})}/></label>
                  <label>Maximum drawdown (%)<input type="number" min="0" step="0.01" value={form.max_drawdown ?? ''} onChange={e => setForm({...form,max_drawdown:e.target.value})}/></label>
                  <label>Payout frequency<input value={form.payout_frequency || ''} onChange={e => setForm({...form,payout_frequency:e.target.value})} placeholder="Biweekly, on demand…"/></label>
                  <label>Trading platform<input value={form.platform || ''} onChange={e => setForm({...form,platform:e.target.value})} placeholder="MT5, cTrader…"/></label>
                  <label className="full-field">Description<textarea value={form.description || ''} onChange={e => setForm({...form,description:e.target.value})}/></label>
                  <label>My affiliate URL<input type="url" value={form.affiliate_url || ''} onChange={e => setForm({...form,affiliate_url:e.target.value})} placeholder="https://your-tracking-link…"/></label>
                  <label>My discount code<input value={form.discount_code || ''} onChange={e => setForm({...form,discount_code:e.target.value})} placeholder="YOURCODE"/></label>
                  <label>Status<select value={form.status || 'active'} onChange={e => setForm({...form,status:e.target.value})}><option value="active">Active / visible</option><option value="draft">Draft / hidden</option></select></label>
                  <label className="check-label"><input type="checkbox" checked={Boolean(form.featured)} onChange={e => setForm({...form,featured:e.target.checked})}/> Feature this firm</label>
                </div>
                <div className="editor-actions"><button type="button" className="btn btn-ghost" onClick={startAdd}>Clear</button><button className="btn btn-primary" type="submit">{editing ? 'Save changes' : 'Add prop firm'}</button></div>
              </form>
            </>}
          </div>
        </div>}
      </section>
    </div>}
  </div>;
}

function Stats({firms}) {
  const [clicks, setClicks] = useState(0);
  useEffect(() => { if (supabase) supabase.from('affiliate_clicks').select('*', {count:'exact',head:true}).then(({count}) => setClicks(count || 0)); }, []);
  return <div className="stats-panel"><h3>Platform overview</h3><p>Basic activity counters from your database.</p><div className="stats-cards"><div><Building2/><strong>{firms.length}</strong><span>Visible firms</span></div><div><MousePointerClick/><strong>{clicks}</strong><span>Recorded affiliate clicks</span></div><div><Tag/><strong>{firms.filter(f=>f.discount_code).length}</strong><span>Firms with codes</span></div></div><p className="muted">Affiliate purchases and commissions are not automatically confirmed here. Reconcile those figures with each affiliate provider's reporting dashboard.</p></div>;
}

export default App;
