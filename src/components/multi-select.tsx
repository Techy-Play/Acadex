"use client"

import * as React from "react"
import { ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between rounded-xl font-normal h-auto min-h-10 py-2"
        >
          {selected.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {selected.map((val) => {
                const opt = options.find((o) => o.value === val)
                return (
                  <Badge key={val} variant="secondary" className="rounded-sm">
                    {opt?.label}
                  </Badge>
                )
              })}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] rounded-xl max-h-64 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selected, option.value])
              } else {
                onChange(selected.filter((val) => val !== option.value))
              }
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
