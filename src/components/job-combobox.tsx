"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Job } from "@/lib/domain/types";

interface JobComboboxProps {
  jobs: Job[];
  value: string;
  onValueChange: (value: string) => void;
  companyNames: Record<string, string>;
  placeholder?: string;
  emptyText?: string;
}

/**
 * 可搜索岗位选择器：同时支持按「岗位编码 QJ-26-XXXX」与「岗位名称」过滤。
 * 展示格式统一为「QJ-26-XXXX｜岗位名称 · 公司」。
 */
export function JobCombobox({
  jobs,
  value,
  onValueChange,
  companyNames,
  placeholder = "选择岗位",
  emptyText = "未找到匹配的岗位",
}: JobComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = jobs.find((job) => job.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground mr-1.5">
                {selected.job_code || "岗位编号异常"}
              </span>
              {selected.title}
              {companyNames[selected.id] ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {companyNames[selected.id]}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索岗位编号或名称..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {jobs.map((job) => (
                <CommandItem
                  key={job.id}
                  value={`${job.job_code ?? ""} ${job.title} ${companyNames[job.id] ?? ""}`}
                  onSelect={() => {
                    onValueChange(job.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === job.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-mono text-xs text-muted-foreground mr-2 shrink-0">
                    {job.job_code || "岗位编号异常"}
                  </span>
                  <span className="truncate">{job.title}</span>
                  {companyNames[job.id] ? (
                    <span className="text-muted-foreground ml-1 shrink-0">
                      · {companyNames[job.id]}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
