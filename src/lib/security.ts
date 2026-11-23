import DOMPurify from 'dompurify';
import { supabase } from './supabase';
import type { Order } from '../lib/database.types';

// Security utility helpers for the application
export const sanitizeInput = (html: string) => {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }); // Strip all HTML tags
};

export const validateTenantAccess = async (userId: string, resourceTenantId: string): Promise<boolean> => {
  // Fetch the requesting user once
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', userId)
    .single();

  if (userError || !userData) {
    console.error('Failed to fetch user for access check:', userError?.message);
    return false;
  }

  const isAdmin = ['mega_admin', 'super_admin', 'tenant_admin'].includes(userData.role);
  if (isAdmin) return true;  // Admins can access across tenants

  return userData.tenant_id === resourceTenantId; // Enforce strict tenant isolation
};

export const generateAtomicTicketCheck = async (ticketCode: string): Promise<boolean> => {
  // Atomically mark ticket as used to prevent replay attacks
  const { data, error } = await supabase.rpc('validate_ticket_atomic', {
    p_code: ticketCode,
    p_user_id: ((await supabase.auth.getUser()).data?.user?.id) || ''
  });

  if (error) {
    console.error('Failed to atomically validate ticket:', error.message);
    return false;
  }

  return data === true; // Assuming the function returns TRUE if valid & newly used
};

export const verifyWebhookSignature = (
  signatureHeader: string,
  secret: string,
  payload: any
): boolean => {
  // Simple HMAC check for webhook authenticity
  const crypto = require('crypto');
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expectedSignature)
  );
};
