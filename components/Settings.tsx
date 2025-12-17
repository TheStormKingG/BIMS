import React, { useState, useRef, useEffect } from 'react';
import { User, UserPlus, MessageSquare, Info, Camera, ChevronRight, X, Share2, Mail, Facebook, Twitter, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSupabase } from '../services/supabaseClient';

interface SettingsProps {
  user: any;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const location = useLocation();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Check if we should open personal info from navigation state
  useEffect(() => {
    const state = location.state as { openPersonalInfo?: boolean } | null;
    if (state?.openPersonalInfo) {
      setSelectedOption('personal-info');
      // Clear the state to prevent reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [profileImage, setProfileImage] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [problemText, setProblemText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabase();

  // Personal Information form state
  const [personalInfo, setPersonalInfo] = useState({
    country: user?.user_metadata?.country || 'Guyana',
    fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    streetAddress1: user?.user_metadata?.street_address_1 || '',
    streetAddress2: user?.user_metadata?.street_address_2 || '',
    city: user?.user_metadata?.city || '',
    state: user?.user_metadata?.state || '',
    phoneNumber: user?.user_metadata?.phone_number || '',
    dateOfBirth: user?.user_metadata?.date_of_birth || '',
    gender: user?.user_metadata?.gender || '',
    occupation: user?.user_metadata?.occupation || '',
  });

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
    'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
    'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
    'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
    'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
    'Congo', 'Costa Rica', 'Côte d\'Ivoire', 'Croatia', 'Cuba', 'Cyprus',
    'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
    'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
    'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia',
    'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
    'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India',
    'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
    'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos',
    'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
    'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
    'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
    'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
    'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama',
    'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
    'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
    'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'São Tomé and Príncipe',
    'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
    'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan',
    'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
    'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
    'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
    'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia',
    'Zimbabwe'
  ];

  const handleProfilePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    // TODO: Upload to Supabase storage
  };

  const handlePersonalInformation = () => {
    setSelectedOption('personal-info');
  };

  const handleInviteContact = () => {
    setSelectedOption('invite-contact');
  };

  const handleProblemSuggestions = () => {
    setSelectedOption('problem-suggestions');
  };

  const handleShare = (platform: string) => {
    const shareUrl = 'https://stashway.app';
    const shareText = 'Check out Stashway - Personal Finance App!';

    const shareUrls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      email: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://stashway.app');
    alert('Link copied to clipboard!');
  };

  const handleSubmitProblem = async () => {
    if (!problemText.trim()) {
      alert('Please enter your problem or suggestion');
      return;
    }
    // TODO: Implement feedback submission
    alert('Thank you for your feedback!');
    setProblemText('');
    setSelectedOption(null);
  };

  if (selectedOption) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedOption === 'personal-info' && 'Personal Information'}
              {selectedOption === 'invite-contact' && 'Share in a post'}
              {selectedOption === 'problem-suggestions' && 'Problem/Suggestions'}
            </h1>
            <button
              onClick={() => setSelectedOption(null)}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Personal Information */}
          {selectedOption === 'personal-info' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Country/Region</label>
                <select
                  value={personalInfo.country}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black bg-white"
                >
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full name (First and Last name)</label>
                <input
                  type="text"
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Street address</label>
                <input
                  type="text"
                  value={personalInfo.streetAddress1}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, streetAddress1: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black mb-2"
                  placeholder="Address line 1"
                />
                <input
                  type="text"
                  value={personalInfo.streetAddress2}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, streetAddress2: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Address line 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <input
                  type="text"
                  value={personalInfo.city}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter your city"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">State / Province / Region</label>
                <input
                  type="text"
                  value={personalInfo.state}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, state: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter state/province/region"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone number</label>
                <input
                  type="tel"
                  value={personalInfo.phoneNumber}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                <select
                  value={personalInfo.gender}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black bg-white"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Occupation</label>
                <input
                  type="text"
                  value={personalInfo.occupation}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, occupation: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter your occupation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed here</p>
              </div>

              <button 
                onClick={async () => {
                  // TODO: Save to Supabase user_metadata
                  alert('Personal information saved!');
                }}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          )}

          {/* Invite Contact */}
          {selectedOption === 'invite-contact' && (
            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between p-4 border-b border-slate-700">
                <div className="flex flex-col items-center gap-3 flex-1">
                  <img src="/stashway-logo.png" alt="Stashway Logo" className="w-20 h-20" />
                  <h2 className="text-base font-semibold text-white">Share in a post</h2>
                </div>
                <button
                  onClick={() => setSelectedOption(null)}
                  className="text-slate-400 hover:text-white transition-colors mt-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Share Options */}
              <div className="p-4">
                <h3 className="text-white font-medium mb-4">Share</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  <button
                    onClick={() => handleShare('whatsapp')}
                    className="flex flex-col items-center gap-2 min-w-[60px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                    </div>
                    <span className="text-xs text-slate-300">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="flex flex-col items-center gap-2 min-w-[60px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                      <Facebook className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-slate-300">Facebook</span>
                  </button>
                  <button
                    onClick={() => handleShare('twitter')}
                    className="flex flex-col items-center gap-2 min-w-[60px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                      <Twitter className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-slate-300">X</span>
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className="flex flex-col items-center gap-2 min-w-[60px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-slate-300">Email</span>
                  </button>
                </div>
              </div>

              {/* Copy Link */}
              <div className="p-4 border-t border-slate-700 bg-slate-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="https://stashway.app"
                    readOnly
                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg text-sm border border-slate-600"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Problem/Suggestions */}
          {selectedOption === 'problem-suggestions' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <p className="text-slate-600">We'd love to hear from you! Share any problems you've encountered or suggestions for improvement.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Feedback</label>
                <textarea
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black resize-none"
                  placeholder="Describe the problem or share your suggestion..."
                />
              </div>
              <button
                onClick={handleSubmitProblem}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto">

        {/* Profile Photo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-44 h-44 rounded-full object-cover border-4 border-slate-200"
                />
              ) : (
                <div className="w-44 h-44 rounded-full bg-emerald-600 flex items-center justify-center border-4 border-slate-200">
                  <User className="w-20 h-20 text-white" />
                </div>
              )}
              <button
                onClick={handleProfilePhotoClick}
                className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Personal Information */}
          <button
            onClick={handlePersonalInformation}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <span className="font-medium text-slate-900">Personal Information</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Invite a Contact */}
          <button
            onClick={handleInviteContact}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <span className="font-medium text-slate-900">Invite a Contact</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Problem/Suggestions */}
          <button
            onClick={handleProblemSuggestions}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-medium text-slate-900">Problem/Suggestions</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* App Version */}
          <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Info className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-900">App Version</span>
                <span className="text-sm text-slate-500">1.0.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              alert('Error signing out: ' + error.message);
            } else {
              navigate('/', { replace: true });
            }
          }}
          className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>

        {/* Copyright and Address Information */}
        <div className="mt-8 text-center text-sm text-slate-600 space-y-2">
          <p>Dr. Stefan Gravesande | Preqal Inc © 2025-26</p>
          <div className="space-y-1">
            <p>90 Waiakabra</p>
            <p>Soesdyke Linden Highway</p>
            <p>East Bank Demerara</p>
            <p>Guyana</p>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="text-emerald-600 hover:text-emerald-700 font-medium">
              Privacy
            </button>
            <span className="text-slate-400">|</span>
            <button className="text-emerald-600 hover:text-emerald-700 font-medium">
              Terms
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

