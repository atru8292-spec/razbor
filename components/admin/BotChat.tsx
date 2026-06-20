"use client";

import { useEffect, useRef } from "react";
import { relTime } from "@/app/admin/labels";

// Переписка с ботом как мессенджер (BOT.md часть 2): наши сообщения справа (оксблад),
// человек слева (нейтральный), время у каждого, пометка «авто» для расписанных
// касаний, автоскролл вниз — последнее сообщение видно, как в чате.
export interface ChatMsg {
  id: string;
  created_at: string;
  dir: "in" | "out";
  text: string;
  auto?: boolean;
}

export default function BotChat({ messages, contactName }: { messages: ChatMsg[]; contactName: string }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages.length]);

  if (!messages.length) {
    return (
      <p className="mt-4 font-sans text-sm text-espresso/45">Переписки пока нет. Появится, когда человек напишет боту.</p>
    );
  }

  return (
    <div ref={boxRef} className="mt-4 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {messages.map((m) => {
        const ours = m.dir === "out";
        return (
          <div key={m.id} className={`flex ${ours ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] whitespace-pre-wrap rounded-2xl border px-3.5 py-2 font-sans text-sm ${
                ours
                  ? "border-oxblood/30 bg-oxblood/[0.07] text-espresso"
                  : "border-espresso/15 bg-paper-2/50 text-espresso/85"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 font-sans text-[0.7rem] text-espresso/40">
                <span className="uppercase tracking-[0.06em]">{ours ? "мы" : contactName}</span>
                {ours && m.auto && (
                  <span className="rounded bg-espresso/10 px-1 text-espresso/45">авто</span>
                )}
                <span title={new Date(m.created_at).toLocaleString("ru-RU")}>{relTime(m.created_at)}</span>
              </div>
              {m.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
