import { useEffect, useMemo, useState } from 'react';
import {
  listProviders, upsertProvider, testLlmConnection, testEmailProvider,
  ProviderConfig, ProviderKind, ProviderName,
} from '../services/adminApi';

type Tab = 'llm' | 'email';

const LLM_MODELS: Record<Exclude<ProviderName, 'sendgrid'>, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-3.5-turbo'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  together: [
    'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    'Qwen/Qwen2.5-72B-Instruct-Turbo',
    'google/gemma-3n-E4B-it',
  ],
};

const LLM_PROVIDER_LABEL: Record<Exclude<ProviderName, 'sendgrid'>, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  together: 'Together AI',
};

const input: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db',
  borderRadius: 8, boxSizing: 'border-box', background: 'white',
};

const fieldLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' };

interface Toast { kind: 'success' | 'error'; text: string }

function Toast({ toast, onClose }: { toast: Toast | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10,
      background: toast.kind === 'success' ? '#ecfdf5' : '#fef2f2',
      color: toast.kind === 'success' ? '#047857' : '#b91c1c',
      border: `1px solid ${toast.kind === 'success' ? '#a7f3d0' : '#fecaca'}`,
      fontSize: 14, fontWeight: 500, zIndex: 1000, maxWidth: 420,
    }}>{toast.text}</div>
  );
}

function LlmTab({ providers, reload, setToast }: { providers: ProviderConfig[]; reload: () => void; setToast: (t: Toast) => void }) {
  const llmRows = providers.filter(p => p.kind === 'llm');
  const activeRow = llmRows.find(p => p.is_default) || null;

  const [provider, setProvider] = useState<Exclude<ProviderName, 'sendgrid'>>('openai');
  const [model, setModel] = useState<string>(LLM_MODELS.openai[0]);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (activeRow && (activeRow.provider === 'openai' || activeRow.provider === 'gemini' || activeRow.provider === 'together')) {
      setProvider(activeRow.provider as Exclude<ProviderName, 'sendgrid'>);
      if (activeRow.model) setModel(activeRow.model);
    }
  }, [activeRow?.id]);

  const models = LLM_MODELS[provider];
  const keyPlaceholder = activeRow?.provider === provider ? activeRow.api_key_masked : '';
  const statusPill = activeRow ? `${activeRow.provider} · ${activeRow.model || ''}`.trim() : 'no default set';

  const onProviderChange = (p: Exclude<ProviderName, 'sendgrid'>) => {
    setProvider(p);
    setModel(LLM_MODELS[p][0]);
  };

  const onSave = async () => {
    if (!apiKey || apiKey.length < 8) {
      setToast({ kind: 'error', text: 'API key is required (min 8 chars)' });
      return;
    }
    setSaving(true);
    try {
      const r = await upsertProvider({ kind: 'llm', provider, model, api_key: apiKey, is_default: true });
      if (r.success) {
        setToast({ kind: 'success', text: `Saved ${LLM_PROVIDER_LABEL[provider]} / ${model}` });
        setApiKey('');
        reload();
      } else {
        setToast({ kind: 'error', text: r.error || 'Save failed' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!apiKey || apiKey.length < 8) {
      setToast({ kind: 'error', text: 'Enter the API key in the field above before testing' });
      return;
    }
    setTesting(true);
    try {
      const r = await testLlmConnection({ provider, api_key: apiKey, model });
      if (r.success && r.data?.success) {
        setToast({ kind: 'success', text: `Connection OK (${r.data.latencyMs}ms)` });
      } else {
        setToast({ kind: 'error', text: r.data?.error || r.error || 'Connection failed' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #f1f5f9', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>AI / LLM Provider</h3>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: activeRow ? '#ecfdf5' : '#f1f5f9', color: activeRow ? '#047857' : '#64748b' }}>{statusPill}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={fieldLabel}>Provider</label>
            <select style={input} value={provider} onChange={e => onProviderChange(e.target.value as any)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="together">Together AI</option>
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Model</label>
            <select style={input} value={model} onChange={e => setModel(e.target.value)}>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>API Key</label>
            <input type="password" style={input} placeholder={keyPlaceholder} value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSave} disabled={saving}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: 'white', background: '#4f46e5', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Provider'}
          </button>
          <button onClick={onTest} disabled={testing}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#0f172a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1 }}>
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
      </div>

      <div style={{ background: '#eff6ff', borderRadius: 12, padding: 18, border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>Where is this used?</p>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>
          <li>Project scope generation (vision model)</li>
          <li>Bid scoring and AI-assisted suggestions</li>
          <li>Any future admin-level AI features</li>
          <li>When no provider is configured, the system falls back to the env Together AI key so existing AI features keep working.</li>
        </ul>
      </div>
    </>
  );
}

function EmailTab({ providers, reload, setToast }: { providers: ProviderConfig[]; reload: () => void; setToast: (t: Toast) => void }) {
  const emailRows = providers.filter(p => p.kind === 'email');
  const activeRow = emailRows.find(p => p.is_default) || null;

  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState(activeRow?.from_email || '');
  const [fromName, setFromName] = useState(activeRow?.from_name || 'BidWork');
  const [testTo, setTestTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    setFromEmail(activeRow?.from_email || '');
    setFromName(activeRow?.from_name || 'BidWork');
  }, [activeRow?.id]);

  const onSave = async () => {
    if (!apiKey || apiKey.length < 8) return setToast({ kind: 'error', text: 'SendGrid API key is required' });
    if (!fromEmail) return setToast({ kind: 'error', text: 'From email is required' });
    setSaving(true);
    try {
      const r = await upsertProvider({ kind: 'email', provider: 'sendgrid', api_key: apiKey, from_email: fromEmail, from_name: fromName, is_default: true });
      if (r.success) {
        setToast({ kind: 'success', text: 'SendGrid config saved' });
        setApiKey('');
        reload();
      } else {
        setToast({ kind: 'error', text: r.error || 'Save failed' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    if (!apiKey || apiKey.length < 8) return setToast({ kind: 'error', text: 'Enter the API key above before testing' });
    if (!fromEmail) return setToast({ kind: 'error', text: 'From email is required' });
    if (!testTo) return setToast({ kind: 'error', text: 'Provide a To address for the test' });
    setSendingTest(true);
    try {
      const r = await testEmailProvider({ provider: 'sendgrid', api_key: apiKey, from_email: fromEmail, from_name: fromName, to: testTo });
      if (r.success && r.data?.success) {
        setToast({ kind: 'success', text: `Test email sent to ${testTo}` });
      } else {
        setToast({ kind: 'error', text: r.data?.error || r.error || 'Send failed' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Send failed' });
    } finally {
      setSendingTest(false);
    }
  };

  const statusPill = activeRow ? `sendgrid · ${activeRow.from_email || ''}` : 'no default set';

  return (
    <>
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #f1f5f9', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Email Provider</h3>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: activeRow ? '#ecfdf5' : '#f1f5f9', color: activeRow ? '#047857' : '#64748b' }}>{statusPill}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={fieldLabel}>Provider</label>
            <select style={input} value="sendgrid" disabled>
              <option value="sendgrid">SendGrid</option>
            </select>
          </div>
          <div>
            <label style={fieldLabel}>From Email</label>
            <input type="email" style={input} placeholder="welcome@bidwork.com" value={fromEmail} onChange={e => setFromEmail(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>From Name</label>
            <input style={input} placeholder="BidWork" value={fromName} onChange={e => setFromName(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div>
            <label style={fieldLabel}>API Key</label>
            <input type="password" style={input} placeholder={activeRow ? activeRow.api_key_masked : 'SG.xxxxxxxx'} value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
          <div>
            <label style={fieldLabel}>Send test email to</label>
            <input type="email" style={input} placeholder="you@example.com" value={testTo} onChange={e => setTestTo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onSave} disabled={saving}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: 'white', background: '#4f46e5', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Provider'}
          </button>
          <button onClick={onTest} disabled={sendingTest}
            style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#0f172a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, cursor: sendingTest ? 'not-allowed' : 'pointer', opacity: sendingTest ? 0.7 : 1 }}>
            {sendingTest ? 'Sending…' : 'Send test email'}
          </button>
        </div>
      </div>

      <div style={{ background: '#eff6ff', borderRadius: 12, padding: 18, border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1e3a8a', marginBottom: 8 }}>Where is this used?</p>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>
          <li>Verification + password-reset emails</li>
          <li>Select-and-notify offer emails to contractors</li>
          <li>Admin-initiated personal emails to users</li>
          <li>When no provider is configured, the system falls back to the env SendGrid key.</li>
        </ul>
      </div>
    </>
  );
}

export default function ProvidersSetupPage() {
  const [tab, setTab] = useState<Tab>('llm');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const reload = async () => {
    try {
      const r = await listProviders();
      if (r.success) setProviders(r.data?.providers || []);
    } catch {
      // best-effort reload
    }
  };

  useEffect(() => { reload(); }, []);

  const tabBtn = (key: Tab, label: string): React.CSSProperties => ({
    padding: '12px 4px', marginRight: 28, fontSize: 14, fontWeight: 600,
    color: tab === key ? '#4f46e5' : '#64748b',
    borderBottom: tab === key ? '2px solid #4f46e5' : '2px solid transparent',
    background: 'none', cursor: 'pointer', border: 'none', outline: 'none',
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Providers Setup</h1>
      <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, maxWidth: 740 }}>
        Configure AI and email providers used by admin features and outbound communication.
        These are the same settings exposed by your backend env vars — the DB takes precedence when set.
      </p>

      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        <button style={tabBtn('llm', 'LLM Provider')} onClick={() => setTab('llm')}>LLM Provider</button>
        <button style={tabBtn('email', 'Email Providers')} onClick={() => setTab('email')}>Email Providers</button>
      </div>

      {tab === 'llm'
        ? <LlmTab providers={providers} reload={reload} setToast={setToast} />
        : <EmailTab providers={providers} reload={reload} setToast={setToast} />}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
