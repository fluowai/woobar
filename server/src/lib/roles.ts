export const ROLES = [
  'superadmin',
  'admin',
  'manager',
  'waiter',
  'kitchen',
  'pantry',
  'courier',
  'attendant',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLES_SQL = ROLES.map(role => `'${role}'`).join(',');

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Papéis que um 'admin' pode criar/editar (nunca superadmin). */
export const ASSIGNABLE_BY_ADMIN: readonly Role[] = [
  'admin',
  'manager',
  'waiter',
  'kitchen',
  'pantry',
  'courier',
  'attendant',
];

/**
 * Verifica se o papel `target` pode ser atribuído por quem tem `actorRole`.
 * Apenas superadmin pode criar/editar superadmin.
 */
export function canAssignRole(actorRole: string | undefined, target: unknown): target is Role {
  if (!isRole(target)) return false;
  if (target === 'superadmin') return actorRole === 'superadmin';
  return true;
}
