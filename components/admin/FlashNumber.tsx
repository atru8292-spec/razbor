"use client";

import { useEffect, useRef, useState } from "react";

// Плавная подсветка изменившегося числа (часть F): при автообновлении, если значение
// поменялось, коротко подсвечиваем оксбладом. Анимируем только цвет фона, 500ms.
export default function FlashNumber({ value, className }: { value: string | number; className?: string }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span className={`rounded transition-colors duration-500 ${flash ? "bg-oxblood/20" : "bg-transparent"} ${className ?? ""}`}>
      {value}
    </span>
  );
}
