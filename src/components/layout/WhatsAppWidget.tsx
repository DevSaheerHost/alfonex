'use client';

export default function WhatsAppWidget() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[72px] right-4 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-110 hover:bg-[#1ebe5d] lg:bottom-6"
    >
      <i className="fa-brands fa-whatsapp text-2xl text-white" />
    </a>
  );
}
