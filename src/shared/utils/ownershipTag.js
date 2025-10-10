const toIdString = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Object) {
    if (value._id) {
      return value._id.toString();
    }
    if (value.id) {
      return value.id.toString();
    }
    if (typeof value.toString === 'function') {
      return value.toString();
    }
  }
  return null;
};

const extractOwnerDescriptor = (candidate) => {
  if (!candidate) {
    return { id: null, email: null };
  }

  if (typeof candidate === 'string') {
    return { id: candidate, email: null };
  }

  if (candidate instanceof Object) {
    const id = toIdString(candidate);
    const email = candidate.email || candidate.user?.email || null;
    return { id, email };
  }

  return { id: null, email: null };
};

/**
 * Returns a tag identifying whether the current user owns the resource.
 * If the owner id matches the current user, returns "owner".
 * Otherwise returns the first available owner email, if any.
 */
const resolveOwnershipTag = (currentUser, ...ownerCandidates) => {
  if (!currentUser) {
    return null;
  }

  const currentUserId = toIdString(currentUser._id || currentUser.id);
  let fallbackEmail = null;
  let hasCandidate = false;

  for (const candidate of ownerCandidates.filter(Boolean)) {
    hasCandidate = true;
    const { id, email } = extractOwnerDescriptor(candidate);
    if (currentUserId && id && currentUserId === id) {
      return 'owner';
    }
    if (!fallbackEmail && email) {
      fallbackEmail = email;
    }
  }

  if (fallbackEmail) {
    return fallbackEmail;
  }
  return hasCandidate ? 'team_member' : null;
};

module.exports = {
  resolveOwnershipTag,
};
