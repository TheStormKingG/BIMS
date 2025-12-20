import { getSupabase } from './supabaseClient';

const supabase = getSupabase();

/**
 * Event types that can be tracked
 */
export type EventType =
  | 'VIEW_OVERVIEW'
  | 'ADD_ACCOUNT'
  | 'VIEW_UPLOAD'
  | 'AI_CHAT_MESSAGE_SENT'
  | 'GOAL_CREATED'
  | 'RECEIPT_SCANNED'
  | 'MANUAL_SPEND_ADDED'
  | 'TIP_VIEWED'
  | 'EXPORT_PDF'
  | 'EXPORT_CSV'
  | 'EXPORT_EXCEL'
  | 'TRANSACTION_CATEGORIZED'
  | 'CASH_WALLET_FUNDS_ADDED'
  | 'SPENDING_SEARCHED'
  | 'LOGIN';

/**
 * Map frontend EventType to stored event type format
 */
const mapEventTypeToStoredFormat = (eventType: EventType): string => {
  const mapping: Record<EventType, string> = {
    'VIEW_OVERVIEW': 'overview_viewed',
    'ADD_ACCOUNT': 'account_added',
    'VIEW_UPLOAD': 'upload_viewed',
    'AI_CHAT_MESSAGE_SENT': 'ai_chat_used',
    'GOAL_CREATED': 'goal_created',
    'RECEIPT_SCANNED': 'receipt_scanned',
    'MANUAL_SPEND_ADDED': 'transaction_added_manual',
    'TIP_VIEWED': 'tip_viewed',
    'EXPORT_PDF': 'report_exported',
    'EXPORT_CSV': 'report_exported',
    'EXPORT_EXCEL': 'report_exported',
    'TRANSACTION_CATEGORIZED': 'transaction_categorized',
    'CASH_WALLET_FUNDS_ADDED': 'cash_wallet_funds_added',
    'SPENDING_SEARCHED': 'spending_searched',
    'LOGIN': 'overview_viewed',
  };
  return mapping[eventType] || eventType.toLowerCase();
};

/**
 * Emit an event for goal tracking
 * This should be called whenever a user performs an action that might complete a goal
 */
export const emitEvent = async (
  eventType: EventType,
  metadata: Record<string, any> = {}
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn(`Cannot emit event ${eventType}: user not authenticated`);
      return;
    }

    // Map EventType enum to stored format (criteria event_type format)
    const storedEventType = mapEventTypeToStoredFormat(eventType);

    const { error } = await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: storedEventType,
        occurred_at: new Date().toISOString(),
        metadata: { ...metadata, originalEventType: eventType },
      });

    if (error) {
      console.error(`Error emitting event ${eventType}:`, error);
      throw error;
    }

    // Trigger goal evaluation asynchronously (don't block the user action)
    // Use setTimeout to avoid blocking the UI
    setTimeout(async () => {
      try {
        const { GoalEngine } = await import('./goalEngine');
        await GoalEngine.processEvent(user.id, eventType, metadata);
      } catch (err) {
        console.error('Error processing event in goal engine:', err);
      }
    }, 0);
  } catch (error) {
    console.error('Error in emitEvent:', error);
    // Don't throw - we don't want event emission failures to break user flows
  }
};

