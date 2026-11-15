/** Builds a wa.me deep link with a pre-filled message. Number may contain +, spaces or dashes. */
export function whatsappLink(number: string, message?: string) {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function bookingEnquiryMessage(service?: string) {
  return service
    ? `Hello Beauty Empire! I'd like to enquire about booking "${service}". Could you share available slots?`
    : "Hello Beauty Empire! I'd like to book an appointment. Could you share available slots?";
}

export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : phone;
}
