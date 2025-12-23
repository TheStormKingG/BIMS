import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { getSupabase } from '../services/supabaseClient';

interface PaymentRequest {
  id: string;
  user_id: string;
  plan: string;
  amount_expected: number;
  currency: string;
  reference_code: string;
  generated_message: string;
  status: string;
  created_at: string;
  user_uploaded_at: string | null;
  expires_at: string;
}

interface Extraction {
  extracted_amount: number | null;
  extracted_transaction_id: string | null;
  extracted_reference_code: string | null;
  extracted_datetime: string | null;
  extracted_sender: string | null;
  extracted_receiver: string | null;
}

export const AdminVerifyMMG: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('request_id');
  
  const supabase = getSupabase();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [userExtraction, setUserExtraction] = useState<Extraction | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ['stefan.gravesande@preqal.com', 'stefan.gravesande@gmail.com'];

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check user email directly (client-side safe)
      const userEmail = user.email?.toLowerCase();
      
      setIsAdmin(userEmail ? ADMIN_EMAILS.includes(userEmail) : false);
      
      if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
        setError('Access denied. Admin privileges required.');
      }
      
      setLoading(false);
    };

    checkAdmin();
  }, [supabase]);

  // Load payment request data
  useEffect(() => {
    if (!requestId || !isAdmin) return;

    const loadRequest = async () => {
      try {
        // Get payment request
        const { data: requestData, error: requestError } = await supabase
          .from('mmg_payment_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError || !requestData) {
          setError('Payment request not found');
          return;
        }

        setRequest(requestData as PaymentRequest);

        // Get user extraction
        const { data: extractionData } = await supabase
          .from('mmg_payment_extractions')
          .select('raw_json')
          .eq('request_id', requestId)
          .eq('kind', 'user_success')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (extractionData?.raw_json) {
          setUserExtraction(extractionData.raw_json as Extraction);
        }

        // Get user uploaded image
        const { data: artifacts } = await supabase
          .from('mmg_payment_artifacts')
          .select('storage_path')
          .eq('request_id', requestId)
          .eq('kind', 'user_success')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (artifacts?.storage_path) {
          const { data: urlData } = await supabase.storage
            .from('mmg_payments')
            .createSignedUrl(artifacts.storage_path, 3600);
          
          if (urlData?.signedUrl) {
            setUserImageUrl(urlData.signedUrl);
          }
        }
      } catch (err: any) {
        console.error('Error loading request:', err);
        setError(err.message || 'Failed to load payment request');
      }
    };

    loadRequest();
  }, [requestId, isAdmin, supabase]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setUploadFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !requestId) {
      setError('Please select a screenshot');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Upload file to storage
      const timestamp = Date.now();
      const fileExt = uploadFile.name.split('.').pop() || 'png';
      const storagePath = `${requestId}/admin_received/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('mmg_payments')
        .upload(storagePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload screenshot');
      }

      // Call edge function to parse and verify
      const { data, error: parseError } = await supabase.functions.invoke('mmg-parse-admin-received', {
        body: {
          request_id: requestId,
          storage_path: storagePath,
        },
      });

      if (parseError) {
        throw new Error(parseError.message || 'Failed to verify payment');
      }

      if (!data || data.error) {
        throw new Error(data?.error || 'Failed to verify payment');
      }

      if (data.verified) {
        setSuccess('Payment verified successfully! User plan has been upgraded.');
        setUploadFile(null);
        setUploadPreview(null);
        
        // Reload request to show updated status
        window.location.reload();
      } else {
        setError(`Verification failed: ${data.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Error uploading and verifying:', err);
      setError(err.message || 'Failed to upload and verify screenshot');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">Admin privileges required to access this page.</p>
          <button
            onClick={() => navigate('/overview')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-lg font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Not Found</h2>
          <p className="text-slate-600 mb-6">The payment request could not be found.</p>
          <button
            onClick={() => navigate('/overview')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-lg font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/overview')}
            className="text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Verify MMG Payment
          </h1>
          <p className="text-slate-600">
            Review and verify payment request #{request.id.substring(0, 8)}
          </p>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Payment Request Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Plan</label>
              <p className="text-lg font-bold text-slate-900 capitalize">{request.plan}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Amount Expected</label>
              <p className="text-lg font-bold text-emerald-600">{request.currency} {request.amount_expected.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Reference Code</label>
              <p className="text-lg font-mono text-slate-900">{request.reference_code}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Status</label>
              <p className="text-lg font-bold text-slate-900 capitalize">{request.status.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Created At</label>
              <p className="text-slate-900">{new Date(request.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-500 uppercase">Expires At</label>
              <p className="text-slate-900">{new Date(request.expires_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* User Uploaded Screenshot */}
        {userImageUrl && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">User Uploaded Screenshot</h2>
            <div className="border-2 border-slate-200 rounded-lg p-4">
              <img
                src={userImageUrl}
                alt="User payment screenshot"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
            
            {userExtraction && (
              <div className="mt-6 bg-slate-50 rounded-lg p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Extracted Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Amount:</span>{' '}
                    <span className="font-semibold">{userExtraction.extracted_amount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Transaction ID:</span>{' '}
                    <span className="font-semibold font-mono">{userExtraction.extracted_transaction_id || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reference Code:</span>{' '}
                    <span className="font-semibold font-mono">{userExtraction.extracted_reference_code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date/Time:</span>{' '}
                    <span className="font-semibold">{userExtraction.extracted_datetime || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sender:</span>{' '}
                    <span className="font-semibold">{userExtraction.extracted_sender || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Receiver:</span>{' '}
                    <span className="font-semibold">{userExtraction.extracted_receiver || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Upload Section */}
        {request.status !== 'verified' && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Upload Funds Received Screenshot</h2>
            <p className="text-slate-600 mb-6">
              Upload a screenshot of the MMG funds received notification to verify this payment.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="admin-screenshot"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Select Screenshot
                </label>
                <input
                  id="admin-screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              {uploadPreview && (
                <div className="border-2 border-slate-200 rounded-lg p-4">
                  <img
                    src={uploadPreview}
                    alt="Admin screenshot preview"
                    className="max-w-full h-auto rounded-lg"
                  />
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading and Verifying...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload and Verify
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-6 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-emerald-900 mb-1">Success</h4>
              <p className="text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Verified Status */}
        {request.status === 'verified' && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-emerald-900 mb-2">Payment Verified</h3>
            <p className="text-emerald-700">
              This payment has been verified and the user's plan has been upgraded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

