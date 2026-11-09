import { patientRequest } from './patientApi.js';

export function getPatientNotifications() {
   return patientRequest('/notifications/mine');
}

export function dismissPatientNotification(id) {
   return patientRequest(`/notifications/${id}`, { method: 'DELETE' });
}

export function dismissAllPatientNotifications() {
   return patientRequest('/notifications/mine', { method: 'DELETE' });
}
