import { useI18n, Language } from '../../i18n';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  const toggle = () => {
    setLang(lang === 'en' ? 'es' : 'en');
  };

  return (
    <button onClick={toggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
        background: 'transparent', border: '1px solid #e2e8f0',
        color: '#64748b', cursor: 'pointer', transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
    >
      {lang === 'en' ? '🇺🇸' : '🇪🇸'} {lang === 'en' ? 'ES' : 'EN'}
    </button>
  );
}
