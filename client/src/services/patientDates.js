export const CLINIC_TIME_ZONE = 'Asia/Manila';

export function formatClinicDate(value, options = {}) {
   const date = parseClinicDate(value);
   if (!date) return '';

   return new Intl.DateTimeFormat(undefined, {
      timeZone: CLINIC_TIME_ZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options,
   }).format(date);
}

export function formatClinicMonth(value) {
   const date = parseClinicDate(value);
   if (!date) return '';

   return new Intl.DateTimeFormat(undefined, {
      timeZone: CLINIC_TIME_ZONE,
      month: 'short',
   }).format(date);
}

export function formatClinicTime(value) {
   const date = parseClinicDate(value);
   if (!date) return '';

   return new Intl.DateTimeFormat(undefined, {
      timeZone: CLINIC_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

export function formatClinicDateTime(value) {
   const date = parseClinicDate(value);
   if (!date) return '';

   return new Intl.DateTimeFormat(undefined, {
      timeZone: CLINIC_TIME_ZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

export function clinicDateKey(value = new Date()) {
   const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: CLINIC_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
   }).formatToParts(parseClinicDate(value));
   const values = Object.fromEntries(
      parts.map(({ type, value: part }) => [type, part]),
   );
   return `${values.year}-${values.month}-${values.day}`;
}

export function formatRemaining(expiresAt, now = Date.now()) {
   const expiry = new Date(expiresAt).getTime();
   if (!Number.isFinite(expiry)) return 'Unavailable';

   const seconds = Math.max(0, Math.floor((expiry - now) / 1000));
   const hours = Math.floor(seconds / 3600);
   const minutes = Math.floor((seconds % 3600) / 60);
   const remainingSeconds = seconds % 60;
   return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function parseClinicDate(value) {
   if (value instanceof Date)
      return Number.isNaN(value.getTime()) ? null : value;
   if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const date = new Date(`${value}T00:00:00+08:00`);
      return Number.isNaN(date.getTime()) ? null : date;
   }
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? null : date;
}
