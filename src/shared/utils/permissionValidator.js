const VALID_PERMISSIONS = [
  'post_jobs',
  'hire_workers',
  'manage_schedules',
  'view_applications',
  'manage_payments',
  'view_analytics'
];

const ROLE_PERMISSION_MAP = {
  admin: VALID_PERMISSIONS,
  manager: ['post_jobs', 'view_applications', 'manage_schedules', 'view_analytics'],
  supervisor: ['manage_schedules', 'view_applications'],
  worker: []
};

const normalize = (value) => value?.toLowerCase();

const validatePermissions = (permissions, user) => {
  if (!Array.isArray(permissions) || !permissions.length) {
    return {
      isValid: true,
      invalidPermissions: [],
      unauthorizedPermissions: [],
      validPermissions: VALID_PERMISSIONS,
      suggestions: []
    };
  }

  const normalized = permissions.map(normalize);
  const userRole = normalize(user?.role) || 'worker';
  const allowedPermissions = ROLE_PERMISSION_MAP[userRole] || [];

  const invalidPermissions = normalized.filter((permission) => !VALID_PERMISSIONS.includes(permission));
  const unauthorizedPermissions = normalized.filter(
    (permission) => VALID_PERMISSIONS.includes(permission) && !allowedPermissions.includes(permission)
  );

  const suggestions = invalidPermissions
    .map((invalid) => VALID_PERMISSIONS.find((valid) => valid.includes(invalid?.split('_')[0] || '')))
    .filter(Boolean);

  return {
    isValid: !invalidPermissions.length && !unauthorizedPermissions.length,
    invalidPermissions,
    unauthorizedPermissions,
    validPermissions: VALID_PERMISSIONS,
    suggestions
  };
};

const createInvalidPermissionError = (invalidPermissions, suggestions, validPermissions) => ({
  error: 'Invalid permissions provided',
  invalidPermissions,
  suggestions: suggestions.length ? suggestions : null,
  validPermissions,
  message: `The following permissions are not valid: ${invalidPermissions.join(', ')}`
});

const createUnauthorizedPermissionError = (unauthorizedPermissions, user) => {
  const userRole = normalize(user?.role) || 'worker';
  const allowedPermissions = ROLE_PERMISSION_MAP[userRole] || [];
  return {
    error: 'Insufficient permissions',
    unauthorizedPermissions,
    userRole,
    allowedPermissions,
    message: `Role ${userRole} cannot grant: ${unauthorizedPermissions.join(', ')}`
  };
};

module.exports = {
  validatePermissions,
  createInvalidPermissionError,
  createUnauthorizedPermissionError,
  VALID_PERMISSIONS,
  ROLE_PERMISSION_MAP
};
