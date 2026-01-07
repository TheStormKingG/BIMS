import { getSupabase } from './supabaseClient';
import { updateWalletBalance } from './walletDatabase';

/**
 * Factory Reset Service
 * Deletes all user data except the user account itself
 * - Deletes all bank accounts (except cash wallet, which is emptied)
 * - Deletes all receipts (database and storage)
 * - Deletes all spent items
 * - Deletes all goals
 * - Deletes all transactions
 * - Deletes all tips
 * - Deletes all chat sessions
 * - Deletes all celebrations
 * - Deletes all badge credentials
 * - Deletes all events
 * - Clears user preferences
 */
export const performFactoryReset = async (userId: string): Promise<void> => {
  const supabase = getSupabase();
  
  try {
    console.log('Starting factory reset for user:', userId);
    
    // 1. Empty cash wallet (keep it but set balance to 0)
    try {
      await updateWalletBalance(0);
      console.log('✓ Cash wallet emptied');
    } catch (error) {
      console.error('Error emptying wallet:', error);
      // Continue even if wallet update fails
    }
    
    // 2. Delete all bank accounts (except cash wallet)
    const { error: banksError } = await supabase
      .from('banks')
      .delete()
      .eq('user_id', userId)
      .neq('bank_name', 'Cash Wallet');
    
    if (banksError) {
      console.error('Error deleting banks:', banksError);
      throw new Error(`Failed to delete bank accounts: ${banksError.message}`);
    }
    console.log('✓ Bank accounts deleted');
    
    // 2b. Delete all accounts (except cash wallet) - accounts table
    const { error: accountsError } = await supabase
      .from('accounts')
      .delete()
      .eq('user_id', userId)
      .neq('type', 'CASH_WALLET');
    
    if (accountsError) {
      console.error('Error deleting accounts:', accountsError);
      // Continue even if this fails (accounts table might not exist in all setups)
    } else {
      console.log('✓ Accounts deleted');
    }
    
    // 3. Delete all receipts from storage first, then database
    // Get all receipts for this user
    const { data: receipts, error: receiptsFetchError } = await supabase
      .from('receipts')
      .select('id, storage_path')
      .eq('user_id', userId);
    
    if (!receiptsFetchError && receipts) {
      // Delete receipt images from storage
      const storagePaths = receipts
        .map(r => r.storage_path)
        .filter((path): path is string => !!path);
      
      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove(storagePaths);
        
        if (storageError) {
          console.error('Error deleting receipt images from storage:', storageError);
          // Continue even if storage deletion fails
        } else {
          console.log('✓ Receipt images deleted from storage');
        }
      }
      
      // Delete receipts from database
      const { error: receiptsDeleteError } = await supabase
        .from('receipts')
        .delete()
        .eq('user_id', userId);
      
      if (receiptsDeleteError) {
        console.error('Error deleting receipts:', receiptsDeleteError);
        throw new Error(`Failed to delete receipts: ${receiptsDeleteError.message}`);
      }
      console.log('✓ Receipts deleted from database');
    }
    
    // 4. Delete all spent items
    const { error: spentError } = await supabase
      .from('spent_table')
      .delete()
      .eq('user_id', userId);
    
    if (spentError) {
      console.error('Error deleting spent items:', spentError);
      throw new Error(`Failed to delete spent items: ${spentError.message}`);
    }
    console.log('✓ Spent items deleted');
    
    // 5. Delete all funds_out transactions
    const { error: fundsOutError } = await supabase
      .from('funds_out')
      .delete()
      .eq('user_id', userId);
    
    if (fundsOutError) {
      console.error('Error deleting funds_out:', fundsOutError);
      // Continue even if this fails
    } else {
      console.log('✓ Funds out transactions deleted');
    }
    
    // 5b. Delete all funds_in transactions
    const { error: fundsInError } = await supabase
      .from('funds_in')
      .delete()
      .eq('user_id', userId);
    
    if (fundsInError) {
      console.error('Error deleting funds_in:', fundsInError);
      // Continue even if this fails
    } else {
      console.log('✓ Funds in transactions deleted');
    }
    
    // 6. Delete all goals
    const { error: goalsError } = await supabase
      .from('goals')
      .delete()
      .eq('user_id', userId);
    
    if (goalsError) {
      console.error('Error deleting goals:', goalsError);
      throw new Error(`Failed to delete goals: ${goalsError.message}`);
    }
    console.log('✓ Goals deleted');
    
    // 7. Delete all transactions
    const { error: transactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId);
    
    if (transactionsError) {
      console.error('Error deleting transactions:', transactionsError);
      throw new Error(`Failed to delete transactions: ${transactionsError.message}`);
    }
    console.log('✓ Transactions deleted');
    
    // 8. Delete all tips
    const { error: tipsError } = await supabase
      .from('tips')
      .delete()
      .eq('user_id', userId);
    
    if (tipsError) {
      console.error('Error deleting tips:', tipsError);
      // Continue even if this fails
    } else {
      console.log('✓ Tips deleted');
    }
    
    // 9. Delete all chat sessions
    const { error: chatError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', userId);
    
    if (chatError) {
      console.error('Error deleting chat sessions:', chatError);
      // Continue even if this fails
    } else {
      console.log('✓ Chat sessions deleted');
    }
    
    // 10. Delete all celebrations
    const { error: celebrationsError } = await supabase
      .from('celebrations')
      .delete()
      .eq('user_id', userId);
    
    if (celebrationsError) {
      console.error('Error deleting celebrations:', celebrationsError);
      // Continue even if this fails
    } else {
      console.log('✓ Celebrations deleted');
    }
    
    // 11. Delete all badge credentials
    const { error: badgeCredentialsError } = await supabase
      .from('badge_credentials')
      .delete()
      .eq('user_id', userId);
    
    if (badgeCredentialsError) {
      console.error('Error deleting badge credentials:', badgeCredentialsError);
      // Continue even if this fails
    } else {
      console.log('✓ Badge credentials deleted');
    }
    
    // 12. Delete all user events
    const { error: eventsError } = await supabase
      .from('user_events')
      .delete()
      .eq('user_id', userId);
    
    if (eventsError) {
      console.error('Error deleting user events:', eventsError);
      // Continue even if this fails
    } else {
      console.log('✓ User events deleted');
    }
    
    // 13. Delete user preferences
    const { error: preferencesError } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);
    
    if (preferencesError) {
      console.error('Error deleting user preferences:', preferencesError);
      // Continue even if this fails
    } else {
      console.log('✓ User preferences deleted');
    }
    
    // 14. Clear local storage (except auth tokens)
    const authToken = localStorage.getItem('sb-auth-token');
    const supabaseUrl = localStorage.getItem('SUPABASE_URL');
    const supabaseKey = localStorage.getItem('SUPABASE_ANON_KEY');
    
    localStorage.clear();
    
    // Restore essential items
    if (authToken) localStorage.setItem('sb-auth-token', authToken);
    if (supabaseUrl) localStorage.setItem('SUPABASE_URL', supabaseUrl);
    if (supabaseKey) localStorage.setItem('SUPABASE_ANON_KEY', supabaseKey);
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('✓ Local and session storage cleared');
    console.log('Factory reset completed successfully');
    
  } catch (error) {
    console.error('Factory reset failed:', error);
    throw error;
  }
};
