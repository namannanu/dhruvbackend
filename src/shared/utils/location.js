const DEFAULT_ALLOWED_RADIUS_METERS = 150;

const clampRadius = (radius) => {
  if (typeof radius !== 'number' || Number.isNaN(radius)) {
    return DEFAULT_ALLOWED_RADIUS_METERS;
  }
  return Math.min(Math.max(radius, 10), 5000);
};

const buildLocationLabel = (parts = {}) => {
  const { formattedAddress, label, address, city, state, postalCode } = parts;
  if (formattedAddress && formattedAddress.trim()) {
    return formattedAddress.trim();
  }

  const collected = [label, address, city, state, postalCode].filter(Boolean);
  if (collected.length === 0) {
    return null;
  }

  const labelFromParts = collected.join(', ').replace(/,\s*,/g, ', ').trim();
  return labelFromParts || null;
};

const buildAttendanceJobLocation = (details = {}, overrides = {}) => {
  if (details.latitude == null || details.longitude == null) {
    return null;
  }

  return {
    latitude: details.latitude,
    longitude: details.longitude,
    address: details.formattedAddress || details.label,
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
  clampRadius
};
