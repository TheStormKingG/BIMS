import { getSupabase } from './supabaseClient';
import { getUserGoalProgress, getSystemGoalsByPhase } from './goalsService';
import { issueCredential } from './credentialService';

const supabase = getSupabase();

/**
 * Check if a phase is 100% complete (all goals in the phase are completed)
 */
export async function isPhaseComplete(userId: string, phase: number): Promise<boolean> {
  try {
    const goalsByPhase = await getSystemGoalsByPhase();
    const phaseGoals = goalsByPhase[phase] || [];
    
    if (phaseGoals.length === 0) return false;
    
    const progress = await getUserGoalProgress(userId);
    
    const completedCount = progress.filter(p => 
      phaseGoals.some(g => g.id === p.goal_id) && p.is_completed
    ).length;
    
    return completedCount === phaseGoals.length;
  } catch (error) {
    console.error(`Error checking phase ${phase} completion:`, error);
    return false;
  }
}

/**
 * Issue a phase certificate credential
 * Uses phase_number column to distinguish from regular badge credentials (goal_id is NULL)
 */
export async function issuePhaseCertificate(
  userId: string,
  phase: number
): Promise<any> {
  try {
    // Check if certificate already exists
    const existingCert = await getPhaseCertificate(userId, phase);
    if (existingCert) {
      return existingCert;
    }
    
    const goalsByPhase = await getSystemGoalsByPhase();
    const phaseGoals = goalsByPhase[phase] || [];
    
    if (phaseGoals.length === 0) {
      throw new Error(`Phase ${phase} has no goals`);
    }
    
    // Phase names
    const phaseNames: Record<number, string> = {
      1: 'The Quick-Start Sprint',
      2: 'Basic Engagement',
      3: 'Intermediate Tracking',
      4: 'Advanced Budgeting',
      5: 'Financial Mastery'
    };
    
    const phaseName = phaseNames[phase] || `Phase ${phase}`;
    const badgeName = `Phase ${phase} Certificate`;
    const goalTitle = `Completed ${phaseName}`;
    const criteriaSummary = `Completed all ${phaseGoals.length} goals in Phase ${phase}: ${phaseName}`;
    
    // Get user profile for recipient display name
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    
    const recipientDisplayName = user.user_metadata?.full_name 
      || user.user_metadata?.display_name 
      || user.email?.split('@')[0] 
      || 'User';
    
    // Use issuePhaseCredentialDirect to insert with phase_number
    return await issuePhaseCredentialDirect(
      userId,
      phase,
      badgeName,
      `Congratulations! You've completed all goals in ${phaseName} and earned your Phase ${phase} Certificate.`,
      goalTitle,
      criteriaSummary,
      recipientDisplayName,
      `Phase ${phase}`
    );
  } catch (error) {
    console.error(`Error issuing phase ${phase} certificate:`, error);
    throw error;
  }
}

/**
 * Directly issue a phase certificate (bypasses regular issueCredential which requires goal_id)
 */
async function issuePhaseCredentialDirect(
  userId: string,
  phase: number,
  badgeName: string,
  badgeDescription: string,
  goalTitle: string,
  criteriaSummary: string,
  recipientDisplayName: string,
  badgeLevel: string
): Promise<any> {
  try {
    // Import credential functions
    const credentialService = await import('./credentialService');
    const { generateCredentialNumber, createCanonicalPayload, hashEvidence, computeSignature } = credentialService;
    
    // Generate credential number (check for uniqueness)
    let credentialNumber: string;
    let attempts = 0;
    do {
      credentialNumber = generateCredentialNumber();
      const { data: existingCred } = await supabase
        .from('badge_credentials')
        .select('id')
        .eq('credential_number', credentialNumber)
        .maybeSingle();
      if (!existingCred) break;
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique credential number');
      }
    } while (true);

    // Create canonical payload (use phase number as goal_id equivalent for signing purposes only)
    // The actual database goal_id will be NULL for phase certificates
    const issuedAt = new Date().toISOString();
    // For phase certificates, we create a payload with phase as goal_id for signing
    // This is just for cryptographic signing, not stored in DB
    const payload = {
      credential_number: credentialNumber,
      badge_name: badgeName,
      recipient_display_name: recipientDisplayName,
      issued_at: issuedAt,
      goal_id: phase, // Use phase number for payload signing (not stored in DB)
      goal_title: goalTitle,
      status: 'ACTIVE' as const
    };

    // Generate hash and signature (using the payload with sorted keys)
    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());
    const CryptoJS = await import('crypto-js');
    const evidenceHash = CryptoJS.SHA256(canonicalJson).toString();
    
    // Compute signature
    const secret = import.meta.env.VITE_BADGE_SIGNING_SECRET || 'stashway-badge-secret-2025-dev';
    const signature = CryptoJS.HmacSHA256(canonicalJson, secret).toString();

    // Insert credential with phase_number and NULL goal_id
    const { data, error } = await supabase
      .from('badge_credentials')
      .insert({
        credential_number: credentialNumber,
        user_id: userId,
        recipient_display_name: recipientDisplayName,
        badge_name: badgeName,
        badge_description: badgeDescription,
        badge_level: badgeLevel,
        goal_id: null, // NULL for phase certificates
        phase_number: phase, // Phase number
        goal_title: goalTitle,
        criteria_summary: criteriaSummary,
        evidence_hash: evidenceHash,
        signature: signature,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (error) throw error;

    // Log issuance event
    await credentialService.logCredentialEvent(data.id, 'ISSUED', {
      phase_number: phase,
      credential_number: credentialNumber
    });

    // Create celebration for phase certificate
    await createPhaseCelebration(userId, phase, badgeName, phaseName);

    return data;
  } catch (error) {
    console.error('Error issuing phase credential:', error);
    throw error;
  }
}

/**
 * Get phase certificate for a user
 */
export async function getPhaseCertificate(userId: string, phase: number): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('badge_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('phase_number', phase)
      .is('goal_id', null) // Phase certificates have NULL goal_id
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error(`Error fetching phase ${phase} certificate:`, error);
    return null;
  }
}

/**
 * Create a celebration for a phase certificate
 */
export async function createPhaseCelebration(
  userId: string,
  phase: number,
  badgeName: string,
  phaseName: string
): Promise<void> {
  try {
    // Check if celebration already exists
    const { data: existingCelebration, error: celebrationCheckError } = await supabase
      .from('user_celebrations')
      .select('id')
      .eq('user_id', userId)
      .eq('phase_number', phase)
      .limit(1)
      .maybeSingle();

    if (celebrationCheckError && celebrationCheckError.code !== 'PGRST116') {
      throw celebrationCheckError;
    }

    if (!existingCelebration) {
      // Create celebration
      const { error: celebrationError } = await supabase
        .from('user_celebrations')
        .insert({
          user_id: userId,
          goal_id: null,
          badge_id: null,
          phase_number: phase,
          message: `Congratulations! You completed all goals in "${phaseName}" and earned your Phase ${phase} Certificate!`,
        });

      if (celebrationError) throw celebrationError;
      console.log(`✓ Phase ${phase} celebration created`);
    }
  } catch (error) {
    console.error(`Error creating phase ${phase} celebration:`, error);
    // Don't throw - celebration is nice to have but shouldn't block certificate issuance
  }
}

/**
 * Check all phases and issue certificates for completed phases
 * Called after a goal is completed to check if the phase is now complete
 */
export async function checkAndIssuePhaseCertificates(userId: string): Promise<void> {
  try {
    for (let phase = 1; phase <= 5; phase++) {
      const isComplete = await isPhaseComplete(userId, phase);
      if (isComplete) {
        // Check if certificate already exists
        const existingCert = await getPhaseCertificate(userId, phase);
        if (!existingCert) {
          try {
            await issuePhaseCertificate(userId, phase);
            console.log(`✓ Phase ${phase} certificate issued`);
            // Celebration is created inside issuePhaseCertificate
          } catch (error) {
            console.error(`Failed to issue Phase ${phase} certificate:`, error);
          }
        } else {
          // Certificate exists, but check if celebration exists
          // This handles cases where certificate was created but celebration wasn't
          const goalsByPhase = await getSystemGoalsByPhase();
          const phaseGoals = goalsByPhase[phase] || [];
          const phaseNames: Record<number, string> = {
            1: 'The Quick-Start Sprint',
            2: 'Basic Engagement',
            3: 'Intermediate Tracking',
            4: 'Advanced Budgeting',
            5: 'Financial Mastery'
          };
          const phaseName = phaseNames[phase] || `Phase ${phase}`;
          await createPhaseCelebration(userId, phase, `Phase ${phase} Certificate`, phaseName);
        }
      }
    }
  } catch (error) {
    console.error('Error checking phase certificates:', error);
  }
}

