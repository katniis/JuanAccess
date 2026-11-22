import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { providers } from '../db/schema/index.js';
import { manilaDateString } from '../utils/timezone.js';

// Only public Doctor Profile columns; never NPI numbers or user accounts.
const profileColumns = {
   id: providers.id,
   firstName: providers.firstName,
   lastName: providers.lastName,
   profession: providers.profession,
   isActive: providers.isActive,
   specialty: providers.specialty,
   education: providers.education,
   prcLicenseNumber: providers.prcLicenseNumber,
   boardCertifications: providers.boardCertifications,
   practiceStartYear: providers.practiceStartYear,
   background: providers.background,
   photoUrl: providers.photoUrl,
   consultationFee: providers.consultationFee,
};

const isListedDoctor = (row) => row.isActive && row.profession === 'physician';

const toDoctorProfile = (row) => ({
   id: row.id,
   first_name: row.firstName,
   last_name: row.lastName,
   specialty: row.specialty,
   education: row.education,
   prc_license_number: row.prcLicenseNumber,
   board_certifications: row.boardCertifications,
   practice_start_year: row.practiceStartYear,
   years_of_experience: row.practiceStartYear
      ? Number(manilaDateString(new Date()).slice(0, 4)) - row.practiceStartYear
      : null,
   background: row.background,
   photo_url: row.photoUrl,
   consultation_fee: row.consultationFee,
});

// shortcut: filters Practitioners in JS (the table is clinic-sized); move to SQL if it grows large.
export async function listDoctorProfiles() {
   const rows = await db
      .select(profileColumns)
      .from(providers)
      .orderBy(asc(providers.lastName), asc(providers.firstName));
   return rows.filter(isListedDoctor).map(toDoctorProfile);
}

export async function getDoctorProfile(id) {
   const [row] = await db
      .select(profileColumns)
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1);
   return row && isListedDoctor(row) ? toDoctorProfile(row) : null;
}
