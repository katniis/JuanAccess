# TOTP authenticator codes as the staff Second Factor

Staff and staff_admin accounts need a password plus a rotating 6-digit code from an authenticator app (TOTP, e.g. Google Authenticator) to sign in. The threat we care about is someone who has a staff member's email and password. Emailed codes would go straight to that attacker. The clinic also has no SMTP set up, and TOTP works offline. Patients keep password-only sign-in.

## Considered Options

- **Emailed one-time codes**: rejected. They don't help when the email account itself is compromised, and they need email delivery we don't have.
- **Fixed 6-digit number printed on the staff ID card, stored in the DB**: rejected. It's a second password, not something the staff member physically has. Anyone who sees or photographs the card has it for good.

## Consequences

Each staff member's TOTP secret is stored encrypted, and Recovery Codes are shown once at setup. A staff_admin can reset another staff member's Second Factor. Existing staff must set it up at their next login.
