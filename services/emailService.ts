import emailjs from '@emailjs/browser';

/**
 * Send MMG payment screenshot upload notification email
 */
export async function sendMMGUploadEmail(params: {
  userEmail: string;
  plan: string;
  amountExpected: number;
  referenceMessage: string;
  requestId: string;
  uploadedAt: string;
}): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS configuration is missing. Please check environment variables.');
  }

  // Prepare template parameters
  const templateParams = {
    to_email: 'stefan.gravesande@preqal.com,stefan.gravesande@gmail.com',
    user_email: params.userEmail,
    plan: params.plan,
    amount: `GYD ${params.amountExpected.toLocaleString()}`,
    reference_message: params.referenceMessage,
    request_id: params.requestId,
    uploaded_at: params.uploadedAt,
  };

  try {
    await emailjs.send(serviceId, templateId, templateParams, {
      publicKey: publicKey,
    });
    console.log('MMG upload notification email sent successfully');
  } catch (error) {
    console.error('Error sending MMG upload notification email:', error);
    throw error;
  }
}

