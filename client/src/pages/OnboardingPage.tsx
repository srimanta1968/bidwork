import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardProfile } from '../services/authService';
import { updateServingAreas } from '../services/projectApi';
import LocationPicker, { type LocationOption, type LocationPickerHandle } from '../components/common/LocationPicker';

const CONTRACTOR_CATEGORIES = ['General Contractor', 'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Painting', 'Flooring', 'Remodeling', 'Carpentry', 'Masonry', 'Deck/Patio'];
const SKILLED_LABOR_CATEGORIES = ['Landscaping', 'Cleaning', 'Moving', 'Handyman', 'Pressure Washing', 'Gutter Cleaning', 'Fence Repair', 'Demolition', 'Hauling', 'Assembly', 'Painting', 'Flooring', 'Carpentry'];

export default function OnboardingPage() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const isContractor = user?.role === 'contractor';
  const categories = isContractor ? CONTRACTOR_CATEGORIES : SKILLED_LABOR_CATEGORIES;

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [category, setCategory] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [yearsExp, setYearsExp] = useState('');
  const [bio, setBio] = useState('');
  const [servingLocations, setServingLocations] = useState<LocationOption[]>([]);
  const pickerRef = useRef<LocationPickerHandle>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: any = { phone, category: category || skills[0] || 'General', skills: isContractor ? undefined : skills, years_experience: yearsExp ? parseInt(yearsExp) : undefined, bio: bio || undefined };
      if (isContractor) { payload.business_name = businessName; payload.office_address = address; payload.license_number = licenseNumber; payload.license_type = licenseType; }
      else { payload.business_name = businessName || undefined; }

      const result = await onboardProfile(token!, payload);
      if (result.success) {
        const finalSelection = pickerRef.current ? await pickerRef.current.commitPending() : servingLocations;
        if (finalSelection.length > 0) {
          await updateServingAreas({ serving_location_ids: finalSelection.map(s => s.id) });
        }
        updateUser({ ...user!, is_onboarded: true });
        navigate('/dashboard');
      } else { setError(result.error || 'Failed to save profile'); }
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#f8fafc' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
            {isContractor ? 'Complete Your Contractor Profile' : 'Set Up Your Skills Profile'}
          </h1>
          <p style={{ fontSize: 15, color: '#64748b' }}>This info helps homeowners find and trust you.</p>

          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{ width: 40, height: 4, borderRadius: 2, background: step >= s ? '#2563eb' : '#e2e8f0', transition: 'background 0.3s' }} />
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 36, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Business Info */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Business Information</h2>
                {isContractor && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Business Name</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your company name" style={inputStyle} />
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Phone Number *</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="(555) 123-4567" style={inputStyle} />
                </div>
                {isContractor && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Office Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State, ZIP" style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} />
                  </div>
                )}
                <button type="button" onClick={() => { if (!phone) { setError('Phone is required'); return; } setError(''); setStep(2); }}
                  style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: License & Category */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                  {isContractor ? 'License & Specialty' : 'Your Skills'}
                </h2>
                {isContractor && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>License Number *</label>
                      <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required placeholder="e.g. CSLB-123456" style={inputStyle} />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>License Type</label>
                      <input type="text" value={licenseType} onChange={(e) => setLicenseType(e.target.value)} placeholder="e.g. General B, C-10 Electrical" style={inputStyle} />
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>{isContractor ? 'Primary Category *' : 'Select Your Skills *'}</label>
                  {isContractor ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {categories.map((cat) => (
                        <button key={cat} type="button" onClick={() => setCategory(cat)}
                          style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                            background: category === cat ? '#eff6ff' : 'white',
                            border: `1.5px solid ${category === cat ? '#2563eb' : '#e2e8f0'}`,
                            color: category === cat ? '#2563eb' : '#475569' }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {categories.map((cat) => (
                        <button key={cat} type="button" onClick={() => toggleSkill(cat)}
                          style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            background: skills.includes(cat) ? '#2563eb' : 'white',
                            border: `1.5px solid ${skills.includes(cat) ? '#2563eb' : '#e2e8f0'}`,
                            color: skills.includes(cat) ? 'white' : '#475569' }}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setStep(1)} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', background: 'white' }}>Back</button>
                  <button type="button" onClick={() => { if (isContractor && !category) { setError('Select a category'); return; } if (!isContractor && skills.length === 0) { setError('Select at least one skill'); return; } setError(''); setStep(3); }}
                    style={{ flex: 2, padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Experience & Bio */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>Almost Done!</h2>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Years of Experience</label>
                  <input type="number" value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 5" min="0" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Short Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell homeowners about your experience and what makes you stand out..." style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} />
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #bfdbfe' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Service Area</h3>
                  <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Add the metros, counties, cities, or specific zip codes you serve. Jobs posted in these areas will appear on your dashboard. You can add more or change this anytime in your profile.</p>
                  <LocationPicker ref={pickerRef} selected={servingLocations} onChange={setServingLocations} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setStep(2)} style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 600, color: '#475569', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', background: 'white' }}>Back</button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading ? '#93c5fd' : 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 2px 10px rgba(5,150,105,0.3)' }}>
                    {loading ? 'Saving...' : 'Complete Profile'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
