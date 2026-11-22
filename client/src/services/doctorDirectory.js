import { patientRequest } from './patientApi.js';

// Signed-in only: one active physician's Doctor Profile.
export async function getDoctorProfile(id) {
   const { doctor } = await patientRequest(
      '/doctors/' + encodeURIComponent(id),
   );
   return doctor;
}

export const doctorName = (doctor) =>
   'Dr. ' + doctor.first_name + ' ' + doctor.last_name;

export const formatConsultationFee = (fee) =>
   fee == null
      ? null
      : new Intl.NumberFormat('en-PH', {
           style: 'currency',
           currency: 'PHP',
        }).format(Number(fee));
