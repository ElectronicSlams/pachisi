/* ============================================================
   eSlams — Auth flow (login / signup)
   SSO: GitHub, Google, or email. Username + email required;
   name + photo optional (photo pulled from SSO).
     #/login   #/signup
   ============================================================ */

function GoogleG({ size=17 }){
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.6-.05-1.2-.16-1.8H12v3.4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.1z"/>
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/>
      <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/>
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6.1 12 6.1z"/>
    </svg>
  );
}

function AuthPage({ mode }){
  const isSignup = mode === 'signup';
  const [method,setMethod] = useState(null); // null | 'email' | sso submitted
  const [form,setForm] = useState({ username:'', email:'', name:'' });
  const [done,setDone] = useState(false);
  const [errors,setErrors] = useState({});
  const set = (k,v)=> setForm(f=>({ ...f, [k]:v }));

  const validate = ()=>{
    const e = {};
    if(!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email='Enter a valid email';
    if(isSignup && !form.username.trim()) e.username='Username is required';
    if(isSignup && form.username && !/^[a-z0-9_-]+$/i.test(form.username)) e.username='Letters, numbers, - and _ only';
    setErrors(e); return Object.keys(e).length===0;
  };
  const submit = (e)=>{ e.preventDefault(); if(validate()) setDone(true); };
  const sso = (provider)=>{ setMethod(provider); setDone(true); };

  return (
    <div className="page authpage">
      <div className="auth-split">
        {/* brand panel */}
        <aside className="auth-aside">
          <a href="#/" className="auth-mark"><Mark size={34} /><span className="mono">eSlams</span></a>
          <div className="auth-asidebody">
            <h2 className="auth-asidetitle">{isSignup ? 'Join the arena.' : 'Welcome back.'}</h2>
            <p className="auth-asidesub">Watch frontier models compete, climb the Human vs Model board, and save every match to your public profile.</p>
            <ul className="auth-points">
              <li><Icon name="check" size={15}/> Play 50 games against any model</li>
              <li><Icon name="check" size={15}/> Public profile at <span className="mono">eslams.com/you</span></li>
              <li><Icon name="check" size={15}/> Upload & share <span className="mono">.eslams</span> artifacts</li>
            </ul>
          </div>
          <div className="auth-asidefoot mono">Open source · MIT</div>
        </aside>

        {/* form panel */}
        <main className="auth-main">
          <div className="auth-card">
            {done ? (
              <div className="auth-done">
                <div className="auth-donei"><Icon name="check" size={26}/></div>
                <h2>{isSignup ? 'Account created' : 'Signed in'}</h2>
                <p>{method && method!=='email' ? <>Authorized with <b style={{textTransform:'capitalize'}}>{method}</b>. </> : null}{isSignup ? <>Your profile is live at <span className="mono">eslams.com/{form.username||'username'}</span>.</> : 'Taking you to your profile…'}</p>
                <Button variant="primary" href="#/u/makriman" iconRight="arrowRight">Go to profile</Button>
              </div>
            ) : (
              <>
                <div className="auth-head">
                  <h1 className="auth-title">{isSignup ? 'Create your account' : 'Sign in to eSlams'}</h1>
                  <p className="auth-sub">{isSignup ? 'Username and email are all you need.' : 'Continue with your provider or email.'}</p>
                </div>

                <div className="auth-sso">
                  <button className="auth-ssobtn" onClick={()=>sso('github')}><Icon name="github" size={18}/> Continue with GitHub</button>
                  <button className="auth-ssobtn" onClick={()=>sso('google')}><GoogleG size={17}/> Continue with Google</button>
                </div>

                <div className="auth-divider"><span>or {isSignup?'sign up':'sign in'} with email</span></div>

                <form className="auth-form" onSubmit={submit} noValidate>
                  {isSignup && (
                    <label className="auth-field">
                      <span className="auth-label">Username <em>required</em></span>
                      <div className="auth-inputwrap"><span className="auth-prefix mono">eslams.com/</span><input className={`input auth-input auth-input-prefixed ${errors.username?'auth-err':''}`} value={form.username} onChange={e=>set('username',e.target.value)} placeholder="yourname" autoComplete="username" /></div>
                      {errors.username && <span className="auth-errmsg">{errors.username}</span>}
                    </label>
                  )}
                  <label className="auth-field">
                    <span className="auth-label">Email <em>required</em></span>
                    <input className={`input auth-input ${errors.email?'auth-err':''}`} type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@lab.ai" autoComplete="email" />
                    {errors.email && <span className="auth-errmsg">{errors.email}</span>}
                  </label>
                  {isSignup && (
                    <>
                      <label className="auth-field">
                        <span className="auth-label">Name <em className="auth-opt">optional</em></span>
                        <input className="input auth-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Display name" autoComplete="name" />
                      </label>
                      <div className="auth-field">
                        <span className="auth-label">Profile photo <em className="auth-opt">optional</em></span>
                        <div className="auth-photo">
                          <span className="auth-photo-av" style={{ background: provColor('anthropic') }}>{(form.username||'?')[0].toUpperCase()}</span>
                          <div className="auth-photo-txt">
                            <button type="button" className="auth-photo-btn"><Icon name="upload" size={13}/> Upload</button>
                            <span className="auth-photo-hint mono">or pulled automatically from GitHub / Google</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <Button variant="primary" size="lg" type="submit" className="auth-submit" iconRight="arrowRight">{isSignup ? 'Create account' : 'Sign in'}</Button>
                </form>

                <div className="auth-switch">
                  {isSignup ? <>Already have an account? <a href="#/login">Sign in</a></> : <>New to eSlams? <a href="#/signup">Create an account</a></>}
                </div>
                {isSignup && <p className="auth-legal mono">By creating an account you agree to the MIT-licensed terms. Profiles are public by default.</p>}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
Object.assign(window, { AuthPage });
