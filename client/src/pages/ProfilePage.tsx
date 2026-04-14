import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyProfile, updateProfile, getCategories } from '../services/projectApi';

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isContractor = user?.role === 'contractor';
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [category, setCategory] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [bio, setBio] = useState('');
  const [servingCities, setServingCities] = useState<string[]>([]);
  const [servingZipcodes, setServingZipcodes] = useState<string[]>([]);
  const [newCity, setNewCity] = useState('');
  const [newZip, setNewZip] = useState('');

  useEffect(() => { loadProfile(); loadCategories(); }, []);

  const loadProfile = async () => {
    try {
      const result = await getMyProfile();
      if (result.success && result.data.profile) {
        const p = result.data.profile;
        setProfile(p);
        setBusinessName(p.business_name || '');
        setOfficeAddress(p.office_address || '');
        setPhone(p.phone || '');
        setLicenseNumber(p.license_number || '');
        setLicenseType(p.license_type || '');
        setCategory(p.category || '');
        setYearsExp(p.years_experience ? String(p.years_experience) : '');
        setBio(p.bio || '');
        setServingCities(p.serving_cities || []);
        setServingZipcodes(p.serving_zipcodes || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      if (result.success) {
        const role = user?.role === 'contractor' ? 'contractor' : 'skilled_labor';
        setCategoryOptions(result.data[role] || []);
      }
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await updateProfile({
        business_name: businessName, office_address: officeAddress, phone,
        license_number: licenseNumber, license_type: licenseType, category,
        years_experience: yearsExp ? parseInt(yearsExp) : undefined, bio,
        serving_cities: servingCities, serving_zipcodes: servingZipcodes,
      });
      if (result.success) { setSuccess('Profile saved!'); setProfile(result.data.profile); setTimeout(() => setSuccess(''), 3000); }
      else setError(result.error || 'Failed to save');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const addCity = () => { if (newCity.trim() && !servingCities.includes(newCity.trim())) { setServingCities([...servingCities, newCity.trim()]); setNewCity(''); } };
  const removeCity = (c: string) => setServingCities(servingCities.filter(x => x !== c));
  const addZip = () => { if (newZip.trim() && !servingZipcodes.includes(newZip.trim())) { setServingZipcodes([...servingZipcodes, newZip.trim()]); setNewZip(''); } };
  const removeZip = (z: string) => setServingZipcodes(servingZipcodes.filter(x => x !== z));

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading profile...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>My Profile</span>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Back to Dashboard</button>
      </nav>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        {success && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 16px', color: '#059669', marginBottom: 16, fontSize: 14 }}>{success}</div>}
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 }}>{error}</div>}

        {/* Business Info */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Business Information</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          <div>
            <label style={labelStyle}>Business Name</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Office Address</label>
            <input value={officeAddress} onChange={e => setOfficeAddress(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select...</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {isContractor && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>License Number</label>
                <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License Type</label>
                <input value={licenseType} onChange={e => setLicenseType(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Years of Experience</label>
              <input type="number" value={yearsExp} onChange={e => setYearsExp(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* Service Area */}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Service Area</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Jobs posted in these cities or zip codes will appear on your dashboard. Leave empty to see all available jobs.</p>

        <div style={{ background: '#eff6ff', borderRadius: 12, padding: 20, border: '1px solid #bfdbfe', marginBottom: 32 }}>
          {/* Cities */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, fontSize: 13 }}>Serving Cities</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {servingCities.map(c => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#1e3a8a' }}>
                  {c}
                  <button onClick={() => removeCity(c)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0 }}>x</button>
                </span>
              ))}
              {servingCities.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No cities added - showing all jobs</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newCity} onChange={e => setNewCity(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCity())} placeholder="Type city name and press Enter" style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
              <button onClick={addCity} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Add</button>
            </div>
          </div>

          {/* Zip codes */}
          <div>
            <label style={{ ...labelStyle, fontSize: 13 }}>Serving Zip Codes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {servingZipcodes.map(z => (
                <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#1e3a8a' }}>
                  {z}
                  <button onClick={() => removeZip(z)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 0 }}>x</button>
                </span>
              ))}
              {servingZipcodes.length === 0 && <span style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>No zip codes added</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newZip} onChange={e => setNewZip(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addZip())} placeholder="Type zip code and press Enter" style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6 }} />
              <button onClick={addZip} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'white', background: '#2563eb', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: saving ? '#93c5fd' : 'linear-gradient(135deg, #059669, #10b981)' }}>
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
