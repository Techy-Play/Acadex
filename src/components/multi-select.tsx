"use client"

import * as React from "react"
import { Check } from "lucide-react"

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
}: {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}) {
  if (options.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-xl border border-border/50 text-center">
        {placeholder}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-xl bg-card">
      {options.map((option) => {
        const isChecked = selected.includes(option.value);
        return (
          <label
            key={option.value}
            className={`relative flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
              isChecked 
                ? "bg-primary/10 border-primary/40 text-primary font-medium" 
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            <input
              type="checkbox"
              className="absolute opacity-0 w-0 h-0"
              checked={isChecked}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange([...selected, option.value]);
                } else {
                  onChange(selected.filter((val) => val !== option.value));
                }
              }}
            />
            <div className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${
              isChecked ? "bg-primary border-primary text-primary-foreground" : "border-primary"
            }`}>
              {isChecked && <Check className="h-3 w-3" />}
            </div>
            <span className="text-xs line-clamp-1">{option.label}</span>
          </label>
        );
      })}
    </div>
  )
}
