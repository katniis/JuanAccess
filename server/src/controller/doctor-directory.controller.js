import { getDoctorProfile } from '../services/doctor-directory.service.js';

export async function getDoctorProfileHandler(req, res) {
   const id = Number(req.params.id);
   if (!Number.isInteger(id) || id < 1)
      return res.status(400).json({ error: 'Invalid doctor ID' });
   try {
      const doctor = await getDoctorProfile(id);
      return doctor
         ? res.json({ doctor })
         : res.status(404).json({ error: 'Doctor not found' });
   } catch (error) {
      console.error('Failed to load Doctor Profile:', error);
      return res.status(500).json({ error: 'Failed to load doctor' });
   }
}
