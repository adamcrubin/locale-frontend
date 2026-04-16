import { useState } from 'react';

export default function LoginScreen({ onSignIn, onSignUp, error, loading }) {
  const [mode,     setMode]     = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [done,     setDone]     = useState(false);

  const handleSubmit = async () => {
    if (mode === 'signin')  await onSignIn(email, password);
    if (mode === 'signup') { const ok = await onSignUp(email, password); if (ok) setDone(true); }
    if (mode === 'reset')  { await onSignIn(email, ''); setDone(true); }
  };

  const inp = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '0.5px solid rgba(255,255,255,.15)',
    background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.9)',
    fontSize: 14, fontFamily: 'DM Sans, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  };

  if (done && mode === 'signup') return (
    <div style={{ position:'fixed', inset:0, background:'#0f0d0b', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>📬</div>
        <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:24, color:'rgba(255,255,255,.9)', marginBottom:10 }}>Check your email</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,.45)', lineHeight:1.6 }}>
          We sent a confirmation link to <strong style={{ color:'rgba(255,255,255,.7)' }}>{email}</strong>. Click it to activate your account.
        </div>
        <button onClick={() => { setMode('signin'); setDone(false); }} style={{ marginTop:24, padding:'10px 24px', borderRadius:99, background:'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.3)', color:'#C9A84C', fontSize:13, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
          Back to sign in
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:'#0f0d0b', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'DM Sans, sans-serif' }}>
      {/* Background gradient */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,.08) 0%, transparent 60%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:360, position:'relative' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:36, fontWeight:300, color:'rgba(255,255,255,.9)', letterSpacing:'.1em', marginBottom:6 }}>Locale</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.3)', letterSpacing:'.12em', textTransform:'uppercase' }}>
            {mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your household' : 'Reset password'}
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:28 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>Email</div>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={inp}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="email"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6 }}>Password</div>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Choose a password' : '••••••••'} style={inp}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            {error && (
              <div style={{ fontSize:12, color:'#FDA4AF', padding:'8px 12px', background:'rgba(159,18,57,.15)', borderRadius:8, border:'0.5px solid rgba(253,164,175,.2)' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !email || (mode !== 'reset' && !password)}
              style={{
                width:'100%', padding:'12px', borderRadius:10, marginTop:4,
                background: 'rgba(201,168,76,.25)', border:'0.5px solid rgba(201,168,76,.4)',
                color:'#C9A84C', fontSize:14, fontWeight:600, cursor:'pointer',
                fontFamily:'DM Sans, sans-serif', transition:'all .15s',
                opacity: (loading || !email || (mode !== 'reset' && !password)) ? 0.5 : 1,
              }}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </button>
          </div>

          {/* Mode switcher */}
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('signup')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
                  New household? <span style={{ color:'rgba(255,255,255,.7)' }}>Create account →</span>
                </button>
                <button onClick={() => setMode('reset')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.25)', fontSize:11, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
                  Forgot password?
                </button>
              </>
            )}
            {mode !== 'signin' && (
              <button onClick={() => setMode('signin')} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,.2)' }}>
          Your household · Falls Church, VA
        </div>
      </div>
    </div>
  );
}
