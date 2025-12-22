import { getSupabase } from './supabaseClient';
import CryptoJS from 'crypto-js';

const supabase = getSupabase();

export interface BadgeCredential {
  id: string;
  credential_number: string;
  user_id: string;
  recipient_display_name: string;
  badge_name: string;
  badge_description: string;
  badge_level?: string;
  issued_at: string;
  issuing_org_name: string;
  issuing_org_url: string;
  goal_id: number | null;
  phase_number?: number | null;
  goal_title: string;
  criteria_summary: string;
  evidence_hash: string;
  signature: string;
  status: 'ACTIVE' | 'REVOKED';
  revoked_at?: string;
  revoked_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CanonicalEvidencePayload {
  credential_number: string;
  badge_name: string;
  recipient_display_name: string;
  issued_at: string;
  goal_id: number;
  goal_title: string;
  status: 'ACTIVE' | 'REVOKED';
}

/**
 * Generate a unique credential number in format: STW-YYYY-XXXXXX
 */
export function generateCredentialNumber(): string {
  const year = new Date().getFullYear();
  // Generate 6-character base32 string (uppercase, excluding ambiguous chars: 0, O, I, L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `STW-${year}-${randomPart}`;
}

/**
 * Create canonical JSON payload for signing
 */
export function createCanonicalPayload(
  credentialNumber: string,
  badgeName: string,
  recipientDisplayName: string,
  issuedAt: string,
  goalId: number,
  goalTitle: string,
  status: 'ACTIVE' | 'REVOKED' = 'ACTIVE'
): CanonicalEvidencePayload {
  return {
    credential_number: credentialNumber,
    badge_name: badgeName,
    recipient_display_name: recipientDisplayName,
    issued_at: issuedAt,
    goal_id: goalId,
    goal_title: goalTitle,
    status: status
  };
}

/**
 * Hash the canonical payload to create evidence hash
 */
export function hashEvidence(payload: CanonicalEvidencePayload): string {
  const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
  return CryptoJS.SHA256(canonicalJson).toString();
}

/**
 * Compute HMAC-SHA256 signature for the canonical payload
 * Note: In production, this should ideally run server-side via an edge function
 * For now, using client-side signing with crypto-js (acceptable for MVP, but secret is exposed)
 * TODO: Create Supabase Edge Function for server-side signing
 */
export function computeSignature(payload: CanonicalEvidencePayload): string {
  // TODO: Move this to a Supabase Edge Function or serverless function
  // For now, using a client-side secret (acceptable for MVP but not ideal for production)
  const secret = import.meta.env.VITE_BADGE_SIGNING_SECRET || 'stashway-badge-secret-2025-dev';
  
  const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
  return CryptoJS.HmacSHA256(canonicalJson, secret).toString();
}

/**
 * Verify signature against payload
 */
export function verifySignature(
  payload: CanonicalEvidencePayload,
  expectedSignature: string
): boolean {
  const computedSignature = computeSignature(payload);
  // Use constant-time comparison (basic implementation)
  // In production, use proper timing-safe comparison
  return computedSignature === expectedSignature;
}

/**
 * Get credential by credential number (public access)
 */
export async function getCredentialByNumber(credentialNumber: string): Promise<BadgeCredential | null> {
  try {
    const { data, error } = await supabase
      .from('badge_credentials')
      .select('*')
      .eq('credential_number', credentialNumber)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as BadgeCredential | null;
  } catch (error) {
    console.error('Error fetching credential by number:', error);
    return null;
  }
}

/**
 * Get credential by user ID and goal ID
 */
export async function getCredentialByUserAndGoal(
  userId: string,
  goalId: number
): Promise<BadgeCredential | null> {
  try {
    const { data, error } = await supabase
      .from('badge_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_id', goalId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching credential by user and goal:', error);
    return null;
  }
}

/**
 * Get all credentials for a user
 */
export async function getUserCredentials(userId: string): Promise<BadgeCredential[]> {
  try {
    const { data, error } = await supabase
      .from('badge_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    return [];
  }
}

/**
 * Issue a new credential
 * Automatically generates credential number, signature, and evidence hash
 */
export async function issueCredential(
  userId: string,
  goalId: number,
  badgeName: string,
  badgeDescription: string,
  goalTitle: string,
  criteriaSummary: string,
  recipientDisplayName: string,
  badgeLevel?: string
): Promise<BadgeCredential> {
  try {
    // Check if credential already exists
    const existing = await getCredentialByUserAndGoal(userId, goalId);
    if (existing) {
      return existing; // Don't issue duplicate
    }

    // Generate credential number (check for uniqueness)
    let credentialNumber: string;
    let attempts = 0;
    do {
      credentialNumber = generateCredentialNumber();
      const existingCred = await getCredentialByNumber(credentialNumber);
      if (!existingCred) break;
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique credential number');
      }
    } while (true);

    // Create canonical payload
    const issuedAt = new Date().toISOString();
    const payload = createCanonicalPayload(
      credentialNumber,
      badgeName,
      recipientDisplayName,
      issuedAt,
      goalId,
      goalTitle,
      'ACTIVE'
    );

    // Generate hash and signature
    const evidenceHash = hashEvidence(payload);
    const signature = computeSignature(payload);

    // Insert credential with retry logic for reliability
    let data;
    let error;
    let insertAttempts = 0;
    const maxInsertAttempts = 3;
    
    while (insertAttempts < maxInsertAttempts) {
      const result = await supabase
        .from('badge_credentials')
        .insert({
          credential_number: credentialNumber,
          user_id: userId,
          recipient_display_name: recipientDisplayName,
          badge_name: badgeName,
          badge_description: badgeDescription,
          badge_level: badgeLevel || null,
          goal_id: goalId,
          goal_title: goalTitle,
          criteria_summary: criteriaSummary,
          evidence_hash: evidenceHash,
          signature: signature,
          status: 'ACTIVE'
        })
        .select()
        .single();
      
      data = result.data;
      error = result.error;
      
      if (!error) break;
      
      insertAttempts++;
      if (insertAttempts < maxInsertAttempts) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * insertAttempts));
      }
    }

    if (error) {
      // Provide detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      };
      console.error('Credential insert error after retries:', errorDetails);
      throw new Error(`Failed to create credential after ${maxInsertAttempts} attempts: ${error.message}`);
    }

    // Log issuance event
    await logCredentialEvent(data.id, 'ISSUED', {
      goal_id: goalId,
      credential_number: credentialNumber
    });

    return data;
  } catch (error) {
    console.error('Error issuing credential:', error);
    throw error;
  }
}

/**
 * Log a credential event (audit trail)
 */
export async function logCredentialEvent(
  credentialId: string,
  eventType: 'ISSUED' | 'SHARED' | 'VERIFIED' | 'REVOKED',
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from('badge_credential_events')
      .insert({
        credential_id: credentialId,
        event_type: eventType,
        metadata: metadata,
        occurred_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging credential event:', error);
      // Don't throw - event logging shouldn't block main flow
    }
  } catch (error) {
    console.error('Error in logCredentialEvent:', error);
    // Don't throw - event logging shouldn't block main flow
  }
}

/**
 * Verify a credential (public function)
 * Uses the RPC function for public access
 */
export async function verifyCredentialPublic(credentialNumber: string): Promise<{
  verified: boolean;
  reason?: string;
  credential?: any;
  revoked_at?: string;
  revoked_reason?: string;
}> {
  try {
    const { data, error } = await supabase.rpc('verify_badge_credential', {
      cred_num: credentialNumber
    });

    if (error) throw error;

    // Log verification event
    if (data?.credential_number) {
      // We can't log directly since we don't have credential_id, but we can track via metadata
      // For now, we'll skip event logging for public verifications to avoid complexity
    }

    if (!data.verified) {
      return {
        verified: false,
        reason: data.reason || 'UNKNOWN'
      };
    }

    return {
      verified: true,
      credential: data
    };
  } catch (error) {
    console.error('Error verifying credential:', error);
    return {
      verified: false,
      reason: 'ERROR'
    };
  }
}

/**
 * Revoke a credential (admin only - would need server-side implementation)
 */
export async function revokeCredential(
  credentialId: string,
  reason: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('badge_credentials')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', credentialId);

    if (error) throw error;

    // Log revocation event
    await logCredentialEvent(credentialId, 'REVOKED', { reason });
  } catch (error) {
    console.error('Error revoking credential:', error);
    throw error;
  }
}

