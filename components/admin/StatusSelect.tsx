"use client";

import { useTransition } from "react";
import { setLeadStatus } from "@/app/admin/actions";
import { STATUS_OPTIONS } from "@/app/admin/labels";

// Компактный выпадающий список смены статуса (часть D). На выбор — сразу отправляет
// форму на server-action setLeadStatus, страница ревалидируется. Без отдельной кнопки.
export default function StatusSelect({ leadId, status }: { leadId: string; status: string | null }) {
  const [pending, start] = useTransition();
  const current = STATUS_OPTIONS.some((o) => o.value === status) ? (status as string) : "new";

  return (
    <form action={setLeadStatus}>
      <input type="hidden" name="leadId" value={leadId} />
      <select
        name="status"
        defaultValue={current}
        disabled={pending}
        onChange={(e) => start(() => e.currentTarget.form?.requestSubmit())}
        aria-label="Статус лида"
        className="cursor-pointer border border-espresso/20 bg-transparent px-2 py-1 font-sans text-xs text-espresso/80 hover:border-oxblood/50 focus:border-oxblood focus:outline-none disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
