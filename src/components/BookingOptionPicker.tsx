import { Check } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { BookingOption } from "@/lib/booking-options";

const LEGEND: Record<BookingOption["kind"], string> = {
  tier: "Choose your ticket",
  slot: "Choose a time",
  room: "Choose a room",
};

/** Radio list of tiers / slots / rooms. Renders nothing for a single option. */
export function BookingOptionPicker({
  options,
  selectedId,
  onSelect,
}: {
  options: BookingOption[];
  selectedId: string | undefined;
  onSelect: (option: BookingOption) => void;
}) {
  if (options.length <= 1) return null;
  const name = `booking-option-${options[0].kind}`;
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 font-display text-lg">{LEGEND[options[0].kind]}</legend>
      {options.map((option) => {
        const active = option.id === selectedId;
        return (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition ${
              active ? "bg-gradient-soft ring-primary/60" : "bg-surface ring-border"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={active}
              onChange={() => onSelect(option)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ring-1 ${
                active ? "bg-gradient-brand ring-transparent" : "ring-border"
              }`}
            >
              {active && <Check className="h-3 w-3 text-primary-foreground" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{option.label}</span>
              {option.detail && (
                <span className="block truncate text-xs text-muted-foreground">{option.detail}</span>
              )}
            </span>
            <span className="font-mono text-sm">{formatPrice(option.unitPrice)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
