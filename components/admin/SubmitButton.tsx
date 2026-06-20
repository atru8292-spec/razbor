"use client";

import { useFormStatus } from "react-dom";

// Кнопка отправки формы с состоянием ожидания (часть E — AI-разбор идёт несколько
// секунд). Должна быть потомком <form>, чтобы useFormStatus видел его статус.
export default function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
