// Values must match the server's accepted gender and Sex at Birth values.
export const genderOptions = [
   ['female', 'Female'],
   ['male', 'Male'],
   ['nonbinary', 'Non-binary'],
   ['other', 'Other'],
   ['prefer_not_to_say', 'Prefer not to say'],
];

export const sexAtBirthOptions = [
   ['female', 'Female'],
   ['male', 'Male'],
];

export const genderLabel = (value) =>
   genderOptions.find(([option]) => option === value)?.[1] || 'Not recorded';
