import { useRef } from 'react';

const LENGTH = 6;

// Six one-digit boxes over one controlled string of digits. The value stays
// contiguous (no gaps): clicks and Tab never land past the first empty box,
// and clearing a filled box shifts the digits after it left.
function OtpInput({
   value,
   onChange,
   onComplete,
   disabled = false,
   autoFocus = false,
   invalid = false,
   id,
   label = 'Authenticator code',
   describedBy,
}) {
   const refs = useRef([]);
   const lastIndex = Math.min(value.length, LENGTH - 1);
   const focusAt = (index) =>
      refs.current[Math.max(0, Math.min(index, LENGTH - 1))]?.focus();

   const update = (next) => {
      next = next.slice(0, LENGTH);
      if (next === value) return;
      onChange(next);
      if (next.length === LENGTH) onComplete?.(next);
   };

   const insert = (index, raw) => {
      const digits = raw.replace(/\D/g, '');
      if (!digits) return;
      if (digits.length >= LENGTH) {
         update(digits);
         focusAt(LENGTH - 1);
         return;
      }
      update(
         value.slice(0, index) + digits + value.slice(index + digits.length),
      );
      focusAt(index + digits.length);
   };

   const handleKeyDown = (event, index) => {
      if (event.key === 'Backspace') {
         event.preventDefault();
         if (value[index]) {
            update(value.slice(0, index) + value.slice(index + 1));
         } else if (index > 0) {
            update(value.slice(0, index - 1) + value.slice(index));
            focusAt(index - 1);
         }
      } else if (event.key === 'ArrowLeft') {
         event.preventDefault();
         focusAt(index - 1);
      } else if (event.key === 'ArrowRight') {
         event.preventDefault();
         focusAt(Math.min(index + 1, lastIndex));
      } else if (event.key === 'Home') {
         event.preventDefault();
         focusAt(0);
      } else if (event.key === 'End') {
         event.preventDefault();
         focusAt(lastIndex);
      }
   };

   return (
      <div
         className={`otp-input${invalid ? ' otp-input--invalid' : ''}`}
         role="group"
         aria-label={label}>
         {Array.from({ length: LENGTH }, (_, index) => (
            <input
               key={index}
               ref={(element) => {
                  refs.current[index] = element;
               }}
               id={index === 0 ? id : undefined}
               className="otp-input__cell"
               type="text"
               inputMode="numeric"
               pattern="[0-9]*"
               autoComplete={index === 0 ? 'one-time-code' : 'off'}
               aria-label={`Digit ${index + 1} of ${LENGTH}`}
               aria-invalid={invalid || undefined}
               aria-describedby={describedBy}
               value={value[index] ?? ''}
               disabled={disabled}
               autoFocus={autoFocus && index === 0}
               // One Tab stop (the first empty box); arrows move within.
               tabIndex={index === lastIndex ? 0 : -1}
               onFocus={(event) => event.target.select()}
               onMouseDown={(event) => {
                  if (index <= lastIndex) return;
                  event.preventDefault();
                  focusAt(lastIndex);
               }}
               onChange={(event) => {
                  let raw = event.target.value;
                  const old = value[index];
                  // Typed beside an unselected digit: keep only the new one.
                  if (old && raw.length === 2)
                     raw = raw[0] === old ? raw[1] : raw[0];
                  insert(index, raw);
               }}
               onKeyDown={(event) => handleKeyDown(event, index)}
               onPaste={(event) => {
                  event.preventDefault();
                  insert(index, event.clipboardData.getData('text'));
               }}
            />
         ))}
      </div>
   );
}

export default OtpInput;
