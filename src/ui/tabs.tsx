"use client";

import { useId, useRef, type KeyboardEvent } from "react";

export type TabItem<T extends string> = {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly controls?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  ariaLabel,
  className = "",
}: {
  readonly items: readonly TabItem<T>[];
  readonly value: T;
  readonly onValueChange: (value: T) => void;
  readonly ariaLabel: string;
  readonly className?: string;
}) {
  const namespace = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const enabled = items.reduce<Array<{ item: TabItem<T>; index: number }>>((result, item, index) => {
      if (!item.disabled) result.push({ item, index });
      return result;
    }, []);
    const position = enabled.findIndex(({ index }) => index === current);
    if (position === -1) return;
    let nextPosition: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextPosition = (position + 1) % enabled.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextPosition = (position - 1 + enabled.length) % enabled.length;
    if (event.key === "Home") nextPosition = 0;
    if (event.key === "End") nextPosition = enabled.length - 1;
    if (nextPosition === null) return;
    event.preventDefault();
    const next = enabled[nextPosition];
    if (!next) return;
    onValueChange(next.item.value);
    refs.current[next.index]?.focus();
  }

  return (
    <div className={`seg ui-tabs ${className}`.trim()} role="tablist" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(node) => { refs.current[index] = node; }}
          type="button"
          role="tab"
          id={`${namespace}-tab-${item.value}`}
          aria-selected={value === item.value}
          aria-controls={item.controls}
          tabIndex={value === item.value ? 0 : -1}
          className={value === item.value ? "active" : ""}
          disabled={item.disabled}
          onClick={() => onValueChange(item.value)}
          onKeyDown={(event) => move(event, index)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
