import { patientRequest } from './patientApi.js';

export async function getDoctorDirectory() {
   const { doctors } = await patientRequest('/doctors');
   return doctors;
}

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
