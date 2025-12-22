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
 * Generate a 30-word phase certificate description
 * Describes knowledge gained, skills developed, and behavioral change achieved
 */
function generatePhaseDescription(phase: number, phaseName: string): string {
  const descriptions: Record<number, string> = {
    1: `You now understand financial tracking basics and established account management skills. You developed the habit of reviewing your financial overview regularly. You've gained confidence using digital tools and built readiness for deeper engagement.`,
    2: `You now track transactions digitally, organize spending by category, and maintain weekly financial awareness. You've developed skills in receipt scanning, manual logging, and cash wallet management. You consistently review insights and are ready for detailed tracking.`,
    3: `You now maintain consistent tracking habits, analyze spending patterns across categories, and manage multiple accounts effectively. You've developed skills in budget maintenance, spending reduction, and long-term financial awareness. You regularly use AI insights and are ready for advanced strategies.`,
    4: `You now master monthly budget planning, achieve significant spending reductions, and maintain disciplined financial habits. You've developed advanced skills in net worth management, comprehensive cash tracking, and strategic goal achievement. You consistently analyze progress and are ready for mastery.`,
    5: `You now maintain complete financial visibility, achieve substantial efficiency gains, and demonstrate mastery of personal finance management. You've developed expert skills in long-term wealth building, comprehensive tracking, and strategic financial optimization. You consistently apply advanced techniques and embody excellence.`
  };
  
  return descriptions[phase] || `You have successfully completed ${phaseName} and demonstrated consistent progress in your financial journey.`;
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
    
    // Generate the 30-word phase description
    const phaseDescription = generatePhaseDescription(phase, phaseName);
    
    // Use issuePhaseCredentialDirect to insert with phase_number
    return await issuePhaseCredentialDirect(
      userId,
      phase,
      badgeName,
      phaseDescription, // 30-word description for certificate
      goalTitle,
      criteriaSummary,
      recipientDisplayName,
      `Phase ${phase}`,
      phaseName // Pass phaseName for celebration
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
  badgeLevel: string,
  phaseName: string
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
    // Handle duplicate key errors gracefully (race condition protection)
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

    // Handle duplicate key error (23505) - certificate already exists
    if (error) {
      if (error.code === '23505' && error.message?.includes('idx_badge_credentials_user_phase')) {
        // Certificate already exists, fetch and return it
        console.log(`Phase ${phase} certificate already exists, fetching existing certificate...`);
        const existingCert = await getPhaseCertificate(userId, phase);
        if (existingCert) {
          return existingCert;
        }
      }
      throw error;
    }

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
    // Phase names mapping
    const phaseNames: Record<number, string> = {
      1: 'The Quick-Start Sprint',
      2: 'Basic Engagement',
      3: 'Intermediate Tracking',
      4: 'Advanced Budgeting',
      5: 'Financial Mastery'
    };

    for (let phase = 1; phase <= 5; phase++) {
      const isComplete = await isPhaseComplete(userId, phase);
      if (isComplete) {
        try {
          // Issue certificate (will return existing if already exists, handles duplicates gracefully)
          const cert = await issuePhaseCertificate(userId, phase);
          if (cert) {
            console.log(`✓ Phase ${phase} certificate ready (${cert.credential_number || 'existing'})`);
            // Celebration is created inside issuePhaseCertificate
          }
        } catch (error: any) {
          // If it's a duplicate key error, that's okay - certificate already exists
          if (error.code === '23505') {
            console.log(`Phase ${phase} certificate already exists`);
            // Still try to ensure celebration exists
            const phaseName = phaseNames[phase] || `Phase ${phase}`;
            try {
              await createPhaseCelebration(userId, phase, `Phase ${phase} Certificate`, phaseName);
            } catch (celebError) {
              // Celebration might already exist, that's fine
              console.log(`Celebration for Phase ${phase} already exists or failed to create`);
            }
          } else {
            console.error(`Failed to issue Phase ${phase} certificate:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking phase certificates:', error);
  }
}

