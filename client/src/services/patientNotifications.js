import { patientRequest } from './patientApi.js';

export function getPatientNotifications() {
   return patientRequest('/notifications/mine');
}
