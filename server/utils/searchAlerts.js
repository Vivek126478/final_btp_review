const fs = require('fs');
const path = require('path');

const getAlertsFilePath = () => {
  const configuredPath = process.env.SEARCH_ALERTS_PATH;
  if (configuredPath && typeof configuredPath === 'string') return configuredPath;
  return path.join(__dirname, '..', 'data', 'searchAlerts.json');
};

const ensureDir = async (filePath) => {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });
};

const readAlerts = async () => {
  const filePath = getAlertsFilePath();
  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const writeAlerts = async (alerts) => {
  const filePath = getAlertsFilePath();
  await ensureDir(filePath);
  await fs.promises.writeFile(filePath, JSON.stringify(alerts, null, 2), 'utf8');
};

const normalizeStr = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

const rideMatchesFilters = (ride, filters) => {
  if (!ride || !filters) return false;
  if (ride.status !== 'active') return false;

  const start = normalizeStr(filters.startLocation);
  if (start && !normalizeStr(ride.startLocation).includes(start)) return false;

  const end = normalizeStr(filters.endLocation);
  if (end && !normalizeStr(ride.endLocation).includes(end)) return false;

  if (filters.date) {
    const d = new Date(filters.date);
    const startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);

    const rideTime = new Date(ride.rideDateTime);
    if (!(rideTime >= startOfDay && rideTime <= endOfDay)) return false;
  }

  if (filters.minSeats !== undefined && filters.minSeats !== null && String(filters.minSeats) !== '') {
    const minSeats = parseInt(filters.minSeats);
    if (!Number.isNaN(minSeats) && (ride.availableSeats ?? 0) < minSeats) return false;
  }

  if (filters.maxPrice !== undefined && filters.maxPrice !== null && String(filters.maxPrice) !== '') {
    const maxPrice = parseFloat(filters.maxPrice);
    const price = parseFloat(ride.pricePerSeat || 0);
    if (!Number.isNaN(maxPrice) && price > maxPrice) return false;
  }

  if (filters.tags) {
    const wanted = String(filters.tags)
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (wanted.length > 0) {
      const rideTags = Array.isArray(ride.tags) ? ride.tags.map(t => String(t).toLowerCase()) : [];
      const ok = rideTags.some(tag => wanted.includes(tag));
      if (!ok) return false;
    }
  }

  return true;
};

exports.createSearchAlert = async ({ userId, email, filters }) => {
  const alerts = await readAlerts();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const alert = {
    id,
    userId,
    email,
    filters: filters || {},
    createdAt: new Date().toISOString(),
    notifiedAt: null,
    active: true
  };

  alerts.push(alert);
  await writeAlerts(alerts);
  return alert;
};

exports.checkAndNotifyForRide = async ({ ride, notify }) => {
  const alerts = await readAlerts();
  let changed = false;

  const activeAlerts = alerts.filter(a => a && a.active && !a.notifiedAt);

  for (const alert of activeAlerts) {
    if (!alert.email) continue;

    if (rideMatchesFilters(ride, alert.filters)) {
      try {
        await notify({ alert, ride });
        alert.notifiedAt = new Date().toISOString();
        alert.active = false;
        changed = true;
      } catch (e) {
        // swallow - keep alert active
      }
    }
  }

  if (changed) {
    await writeAlerts(alerts);
  }

  return { notifiedCount: activeAlerts.filter(a => a.notifiedAt).length };
};
