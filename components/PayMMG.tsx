import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Check, Upload, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { createPaymentRequest, uploadPaymentScreenshot, getPaymentRequest, PLAN_PRICES, MMG_PAYEE_PHONE } from '../services/mmgPayments';
import { SubscriptionPlan } from '../services/subscriptionService';
import { getSupabase } from '../services/supabaseClient';

export const PayMMG: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = (searchParams.get('plan') || 'pro') as SubscriptionPlan;
  
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [amountExpected, setAmountExpected] = useState<number>(PLAN_PRICES[plan] || 0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  // Check for existing payment request in localStorage
  useEffect(() => {
    const storedRequestId = localStorage.getItem(`mmg_payment_request_${plan}`);
    if (storedRequestId) {
      // Verify request still exists and is not verified
      getPaymentRequest(storedRequestId).then((request) => {
        if (request && request.status !== 'verified' && request.status !== 'rejected') {
          setPaymentRequestId(request.id);
          setGeneratedMessage(request.generated_message);
          setAmountExpected(request.amount_expected);
          setExpiresAt(request.expires_at);
          
          if (request.status === 'ai_parsed' || request.status === 'admin_uploaded') {
            setUploaded(true);
          }
        } else {
          localStorage.removeItem(`mmg_payment_request_${plan}`);
        }
      });
    }
  }, [plan]);

  const handlePayForPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await createPaymentRequest(plan);
      
      setPaymentRequestId(response.request_id);
      setGeneratedMessage(response.generated_message);
      setAmountExpected(response.amount_expected);
      setExpiresAt(response.expires_at);
      
      // Store in localStorage
      localStorage.setItem(`mmg_payment_request_${plan}`, response.request_id);
      
      setShowUploadModal(true);
    } catch (err: any) {
      console.error('Error creating payment request:', err);
      setError(err.message || 'Failed to create payment request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      
      setUploadFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !paymentRequestId) {
      setError('Please select a screenshot');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      await uploadPaymentScreenshot(paymentRequestId, uploadFile);
      
      setUploaded(true);
      setUploadFile(null);
      setUploadPreview(null);
      
      // Clear file input
      const fileInput = document.getElementById('payment-screenshot') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      console.error('Error uploading screenshot:', err);
      setError(err.message || 'Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const planNames: Record<SubscriptionPlan, string> = {
    none: 'None',
    personal: 'Personal',
    pro: 'Pro',
    pro_max: 'Pro Max',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/settings/pricing')}
            className="text-slate-600 hover:text-slate-900 mb-4 flex items-center gap-2"
          >
            ← Back to Pricing
          </button>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            MMG Payment Instructions
          </h1>
          <p className="text-slate-600">
            Complete your payment for the <strong>{planNames[plan]}</strong> plan using Mobile Money Guyana (MMG)
          </p>
        </div>

        {/* Payment Instructions Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Step-by-Step Instructions</h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Click "Pay for Plan" button below</h3>
                <p className="text-slate-600">
                  This will generate a unique payment reference message that you'll need to copy.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Open MMG App</h3>
                <p className="text-slate-600">
                  Open your Mobile Money Guyana (MMG) app on your phone.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Send Payment</h3>
                <div className="text-slate-600 space-y-2">
                  <p>Send money to:</p>
                  <div className="bg-slate-50 p-4 rounded-lg font-mono text-lg">
                    <div className="mb-2">
                      <span className="text-slate-500">Payee:</span>{' '}
                      <span className="font-bold text-slate-900">{MMG_PAYEE_PHONE}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Amount:</span>{' '}
                      <span className="font-bold text-emerald-600">GYD {amountExpected.toLocaleString()}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-slate-500">Message:</span>{' '}
                      <span className="font-mono text-sm">[Copy the generated message below]</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Upload Success Screenshot</h3>
                <p className="text-slate-600">
                  After completing the payment, take a screenshot of the MMG success confirmation and upload it below.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Reference Card */}
        {generatedMessage && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">Your Payment Reference Message</h3>
            <div className="bg-white p-4 rounded-lg mb-4 font-mono text-sm break-all">
              {generatedMessage}
            </div>
            <button
              onClick={handleCopyMessage}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Message
                </>
              )}
            </button>
            {expiresAt && (
              <p className="text-xs text-slate-600 mt-4 text-center">
                Payment reference expires: {new Date(expiresAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Upload Section */}
        {generatedMessage && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {uploaded ? 'Payment Screenshot Uploaded' : 'Upload Payment Screenshot'}
            </h3>
            
            {uploaded ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                <p className="text-emerald-900 font-semibold mb-2">
                  Your payment screenshot has been uploaded and processed.
                </p>
                <p className="text-slate-600 text-sm">
                  Our team is reviewing your payment. You'll receive a notification once it's verified.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="payment-screenshot"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Select Screenshot
                  </label>
                  <input
                    id="payment-screenshot"
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
                      alt="Payment screenshot preview"
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
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Screenshot
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Pay for Plan Button */}
        {!generatedMessage && (
          <button
            onClick={handlePayForPlan}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating Payment Reference...
              </>
            ) : (
              'Pay for Plan'
            )}
          </button>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> After uploading your payment screenshot, our team will verify the payment within 24-48 hours. 
            You'll receive a notification once your plan is activated.
          </p>
        </div>
      </div>
    </div>
  );
};

