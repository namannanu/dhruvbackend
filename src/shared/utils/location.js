const DEFAULT_ALLOWED_RADIUS_METERS = 150;

const clampRadius = (radius) => {
  if (typeof radius !== 'number' || Number.isNaN(radius)) {
    return DEFAULT_ALLOWED_RADIUS_METERS;
  }
  return Math.min(Math.max(radius, 10), 5000);
};

const toPlainObject = (value) => {
  if (!value) return null;
  if (typeof value.toObject === 'function') {
    return value.toObject();
  }
  return value;
};

const normalizeString = (value) => {
  if (value == null) {
    return undefined;
  }
  const str = value.toString().trim();
  return str.length ? str : undefined;
};

const normalizeAddressObject = (addr) => {
  const plain = toPlainObject(addr);
  if (!plain || typeof plain !== 'object') {
    return {};
  }
  return {
    line1:
      normalizeString(plain.line1) ||
      normalizeString(plain.street) ||
      normalizeString(plain.street1) ||
      normalizeString(plain.address1) ||
      normalizeString(plain.addressLine1),
    line2:
      normalizeString(plain.line2) ||
      normalizeString(plain.street2) ||
      normalizeString(plain.address2) ||
      normalizeString(plain.addressLine2),
    city: normalizeString(plain.city),
    state: normalizeString(plain.state),
    postalCode:
      normalizeString(plain.postalCode) ||
      normalizeString(plain.zip) ||
      normalizeString(plain.postal_code),
    country:
      normalizeString(plain.country) ||
      normalizeString(plain.countryCode) ||
      normalizeString(plain.country_name),
    allowedRadius:
      typeof plain.allowedRadius === 'number' ? plain.allowedRadius : undefined,
  };
};

const buildAddressChain = ({
  line1,
  city,
  state,
  postalCode,
  country,
}) => {
  const parts = [];
  const seen = new Set();
  const addPart = (value) => {
    const normalized = normalizeString(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(normalized);
  };

  addPart(line1);
  addPart(city);
  addPart(state);
  addPart(postalCode);
  addPart(country);

  return parts.length ? parts.join(', ') : null;
};

const buildLocationAddressString = (location) => {
  const plain = toPlainObject(location);
  if (!plain || typeof plain !== 'object') {
    return null;
  }

  const formatted = normalizeString(plain.formattedAddress);
  if (formatted) {
    return formatted;
  }

  const addressObj = normalizeAddressObject(plain.address);

  return buildAddressChain({
    line1:
      normalizeString(plain.line1) ||
      normalizeString(plain.address) ||
      addressObj.line1,
    city: normalizeString(plain.city) || addressObj.city,
    state: normalizeString(plain.state) || addressObj.state,
    postalCode: normalizeString(plain.postalCode) || addressObj.postalCode,
    country: normalizeString(plain.country) || addressObj.country,
  });
};

const buildLocationLabel = (parts = {}) => {
  const { label, address, city, state, postalCode } = parts;

  const collected = [
    normalizeString(label),
    normalizeString(address),
    normalizeString(city),
    normalizeString(state),
    normalizeString(postalCode),
  ].filter(Boolean);

  if (collected.length === 0) {
    return null;
  }

  const labelFromParts = collected.join(', ').replace(/,\s*,/g, ', ').trim();
  return labelFromParts || null;
};

const resolveLocationLabel = (location) => {
  const fullAddress = buildLocationAddressString(location);
  if (fullAddress) {
    return fullAddress;
  }

  const plain = toPlainObject(location);
  if (!plain || typeof plain !== 'object') {
    return null;
  }

  const addressObj = normalizeAddressObject(plain.address);
  const parts = {
    label: normalizeString(plain.label) || normalizeString(plain.name),
    address:
      normalizeString(plain.address) ||
      addressObj.line1 ||
      normalizeString(plain.line1) ||
      normalizeString(plain.street) ||
      normalizeString(plain.line2) ||
      null,
    city: normalizeString(plain.city) || addressObj.city,
    state: normalizeString(plain.state) || addressObj.state,
    postalCode:
      normalizeString(plain.postalCode) ||
      normalizeString(plain.zip) ||
      addressObj.postalCode,
  };

  return buildLocationLabel(parts);
};

const resolveAddressValue = (address) => {
  if (!address) {
    return null;
  }
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed.length ? trimmed : null;
  }

  const plain = toPlainObject(address);
  if (!plain) {
    return null;
  }
  if (typeof plain === 'string') {
    const trimmed = plain.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof plain !== 'object') {
    return null;
  }

  const normalized = normalizeAddressObject(plain);
  const formatted = buildAddressChain({
    line1:
      normalizeString(plain.line1) ||
      normalized.line1,
    city: normalizeString(plain.city) || normalized.city,
    state: normalizeString(plain.state) || normalized.state,
    postalCode: normalizeString(plain.postalCode) || normalized.postalCode,
    country: normalizeString(plain.country) || normalized.country,
  });

  if (formatted) {
    return formatted;
  }

  const parts = [];
  if (normalized.line1) parts.push(normalized.line1);
  if (normalized.line2) parts.push(normalized.line2);

  const cityState = [normalized.city, normalized.state]
    .filter(Boolean)
    .join(', ');
  if (cityState) {
    parts.push(
      normalized.postalCode ? `${cityState} ${normalized.postalCode}` : cityState
    );
  } else if (normalized.postalCode) {
    parts.push(normalized.postalCode);
  }
  if (normalized.country) {
    parts.push(normalized.country);
  }

  const joined = parts.join(', ').trim();
  return joined.length ? joined : null;
};

const deriveBusinessLocation = ({ business, addressOverride, defaultRadius = DEFAULT_ALLOWED_RADIUS_METERS }) => {
  const businessObj = toPlainObject(business);
  if (!businessObj) {
    return null;
  }

  const baseLocation = businessObj.location
    ? toPlainObject(businessObj.location)
    : {};

  const normalizedBusinessAddress = normalizeAddressObject(businessObj.address);

  const result = {
    line1:
      normalizeString(addressOverride) ||
      normalizeString(baseLocation.line1) ||
      normalizeString(baseLocation.address) ||
      normalizeString(businessObj.addressLine1) ||
      normalizeString(businessObj.address) ||
      normalizedBusinessAddress.line1,
    line2:
      normalizeString(baseLocation.line2) ||
      normalizedBusinessAddress.line2,
    address:
      normalizeString(baseLocation.address) ||
      normalizeString(addressOverride) ||
      normalizeString(businessObj.address) ||
      normalizedBusinessAddress.line1,
    city:
      normalizeString(baseLocation.city) ||
      normalizedBusinessAddress.city ||
      normalizeString(businessObj.city),
    state:
      normalizeString(baseLocation.state) ||
      normalizedBusinessAddress.state ||
      normalizeString(businessObj.state),
    postalCode:
      normalizeString(baseLocation.postalCode) ||
      normalizedBusinessAddress.postalCode ||
      normalizeString(businessObj.postalCode),
    country:
      normalizeString(baseLocation.country) ||
      normalizedBusinessAddress.country ||
      normalizeString(businessObj.country),
    latitude:
      baseLocation.latitude ??
      businessObj.latitude ??
      businessObj.lat ??
      businessObj.coordinates?.latitude ??
      businessObj.coordinates?.lat ??
      null,
    longitude:
      baseLocation.longitude ??
      businessObj.longitude ??
      businessObj.lng ??
      businessObj.coordinates?.longitude ??
      businessObj.coordinates?.lng ??
      null,
    allowedRadius: clampRadius(
      baseLocation.allowedRadius ??
      businessObj.allowedRadius ??
      normalizedBusinessAddress.allowedRadius ??
      defaultRadius
    ),
    name:
      normalizeString(baseLocation.name) ||
      normalizeString(businessObj.name),
    placeId:
      normalizeString(baseLocation.placeId) ||
      normalizeString(businessObj.placeId),
    notes: normalizeString(baseLocation.notes),
    timezone:
      normalizeString(baseLocation.timezone) ||
      normalizeString(businessObj.timezone),
    isActive:
      typeof baseLocation.isActive === 'boolean'
        ? baseLocation.isActive
        : true,
    setBy: baseLocation.setBy || businessObj.owner || undefined,
    setAt: baseLocation.setAt || businessObj.updatedAt || businessObj.createdAt || undefined,
  };

  const cleaned = Object.fromEntries(
    Object.entries(result).filter(([, value]) => value != null && value !== '')
  );

  if (!Object.keys(cleaned).length) {
    return null;
  }

  const resolvedAddress = buildLocationAddressString(cleaned);
  if (resolvedAddress) {
    if (!normalizeString(cleaned.address)) {
      cleaned.address = resolvedAddress;
    }
    if (!normalizeString(cleaned.line1)) {
      cleaned.line1 = resolvedAddress;
    }
  }

  return cleaned;
};

const buildAttendanceJobLocation = (details = {}, overrides = {}) => {
  if (details.latitude == null || details.longitude == null) {
    return null;
  }

  return {
    latitude: details.latitude,
    longitude: details.longitude,
    address: details.address || details.label,
    label: details.label,
    name: details.label,
    allowedRadius: clampRadius(details.allowedRadius),
    isActive: overrides.isActive ?? true,
    description: overrides.description,
    accuracy: overrides.accuracy,
    timestamp: overrides.timestamp,
    altitude: overrides.altitude,
    heading: overrides.heading,
    speed: overrides.speed
  };
};

module.exports = {
  DEFAULT_ALLOWED_RADIUS_METERS,
  buildLocationLabel,
  buildAttendanceJobLocation,
  clampRadius,
  toPlainObject,
  normalizeString,
  normalizeAddressObject,
  buildAddressChain,
  buildLocationAddressString,
  resolveLocationLabel,
  deriveBusinessLocation,
  resolveAddressValue,
};
