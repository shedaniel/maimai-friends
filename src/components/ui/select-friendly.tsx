"use client"

import * as React from "react"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"
import { Check, ChevronDown } from "lucide-react"
import { useState } from "react"

interface SelectFriendlyContextValue<T extends string> {
  isMobile: boolean
  value?: T
  onValueChange?: (v: T) => void,
  disabled?: boolean
  values: Record<T, React.ReactNode>
  setValues?: React.Dispatch<React.SetStateAction<Record<T, React.ReactNode>>>
}

const SelectFriendlyContext = React.createContext<SelectFriendlyContextValue<string>>({
  isMobile: false,
  values: {},
})

function useSelectFriendlyContext<T extends string>() {
  const ctx = React.useContext(SelectFriendlyContext)
  if (!ctx) throw new Error("SelectFriendly components must be inside <SelectFriendly>")
  return ctx
}

// Root component
interface SelectFriendlyProps<T extends string> {
  value?: T
  onValueChange?: (value: T) => void
  children: React.ReactNode
  disabled?: boolean
}

function SelectFriendly<T extends string>({ value, onValueChange, children, disabled }: SelectFriendlyProps<T>) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [values, setValues] = useState<Record<T, React.ReactNode>>({} as Record<T, React.ReactNode>)

  return (
    <SelectFriendlyContext.Provider value={{ isMobile, value, onValueChange: onValueChange as (v: string) => void, disabled, values, setValues }}>
      {isMobile ? (
        <Sheet>{children}</Sheet>
      ) : (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          {children}
        </Select>
      )}
    </SelectFriendlyContext.Provider>
  )
}

// --- TRIGGER ---
interface SelectFriendlyTriggerProps extends React.ComponentProps<"button"> {
  className?: string
  children?: React.ReactNode
}

function SelectFriendlyTrigger({ className, children, ...props }: SelectFriendlyTriggerProps) {
  const { isMobile } = useSelectFriendlyContext()

  if (isMobile) {
    return (
      <SheetTrigger asChild>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded="false"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm",
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </SheetTrigger>
    )
  }

  return (
    <SelectTrigger className={cn("w-full h-8", className)} {...props}>
      {children}
    </SelectTrigger>
  )
}

interface SelectFriendlyTriggerValueProps extends React.ComponentProps<"span"> {
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
}

function SelectFriendlyTriggerValue({ className, placeholder, children, ...props }: SelectFriendlyTriggerValueProps) {
  const { isMobile, value, values } = useSelectFriendlyContext()

  const displayValue = React.useMemo(() => {
    if (children) return children
    if (value && values[value]) return values[value]
    return placeholder
  }, [children, value, values, placeholder])

  if (isMobile) {
    return children || <span>{displayValue}</span>
  }

  return <SelectValue placeholder={placeholder} {...props}>{children}</SelectValue>
}

// --- CONTENT ---
interface SelectFriendlyContentProps {
  children: React.ReactNode
  label?: string
  className?: string
}

function SelectFriendlyContent({ children, label, className }: SelectFriendlyContentProps) {
  const { isMobile } = useSelectFriendlyContext()

  if (isMobile) {
    return (
      <SheetContent side="bottom">
        <SheetHeader className="border-b">
          <SheetTitle>{label || "Select an option"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col px-2 mb-4 max-h-[80vh] overflow-y-auto">{children}</div>
      </SheetContent>
    )
  }

  return <SelectContent className={className}>{children}</SelectContent>
}

// --- ITEM ---
interface SelectFriendlyItemProps {
  value: string
  children: React.ReactNode
}

function SelectFriendlyItem({ value, children }: SelectFriendlyItemProps) {
  const { isMobile, value: selectedValue, onValueChange, setValues } = useSelectFriendlyContext<string>()
  
  React.useEffect(() => {
    setValues?.((prev) => {
      // Only update if value isn’t already set (prevents re-render loops)
      if (prev[value] === children) return prev
      return { ...prev, [value]: children }
    })
  }, [value, children, setValues])

  if (isMobile) {
    return (
      <SheetClose asChild>
        <button
          type="button"
          onClick={() => onValueChange?.(value)}
          className={cn(
            "w-full px-2 py-2 text-left text-sm rounded-md flex items-center gap-2",
            selectedValue === value && "bg-card text-card-foreground shadow"
          )}
        >
          {selectedValue === value ? <Check className="h-4 w-4 opacity-50" /> : <div className="h-4 w-4 opacity-50" />}
          {children}
        </button>
      </SheetClose>
    )
  }

  return <SelectItem value={value}>{children}</SelectItem>
}

export {
  SelectFriendly as Select,
  SelectFriendlyTrigger as SelectTrigger,
  SelectFriendlyTriggerValue as SelectValue,
  SelectFriendlyContent as SelectContent,
  SelectFriendlyItem as SelectItem,
}
