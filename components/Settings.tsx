import React, { useState, useRef } from 'react';
import { User, UserPlus, MessageSquare, Info, Camera, ChevronRight, X, Share2, Mail, Facebook, Twitter } from 'lucide-react';
import { getSupabase } from '../services/supabaseClient';

interface SettingsProps {
  user: any;
}

export const Settings: React.FC<SettingsProps> = ({ user }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(user?.user_metadata?.avatar_url || null);
  const [problemText, setProblemText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabase();

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  defaultValue={user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-black"
                  placeholder="Enter your full name"
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
              <button className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
                Save Changes
              </button>
            </div>
          )}

          {/* Invite Contact */}
          {selectedOption === 'invite-contact' && (
            <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Share in a post</h2>
                <button
                  onClick={() => setSelectedOption(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create Post Button */}
              <div className="p-4 border-b border-slate-700">
                <button className="w-full bg-white text-black py-3 rounded-lg font-medium hover:bg-slate-100 transition-colors">
                  Create post
                </button>
                <p className="text-slate-400 text-sm mt-2 text-center">Share with your network</p>
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

        {/* Profile Photo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-slate-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center border-4 border-slate-200">
                  <User className="w-12 h-12 text-white" />
                </div>
              )}
              <button
                onClick={handleProfilePhotoClick}
                className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center border-2 border-white shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
            </div>
            <button
              onClick={handleProfilePhotoClick}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Edit Photo
            </button>
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
      </div>
    </div>
  );
};

