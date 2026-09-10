"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Console 数据表（飞书多维表格 / Airtable 式浏览体验）
 *
 * 统一负责：
 * - 横向滚动（表格宽于视口，页面本身不横移）
 * - Sticky Header（纵向滚动时表头常驻）
 * - Sticky Left（checkbox + 主识别列固定）
 * - Sticky Right（高频操作列固定）
 * - nowrap / 合理 min-width / 行 hover 一致性
 *
 * 用法：
 * ```tsx
 * <ConsoleTable className="[&_td]:px-4 [&_td]:py-3">
 *   <ConsoleTHead>
 *     <ConsoleTr>
 *       <ConsoleTh stickyLeft={0} fixedWidth={80} className="px-4">checkbox</ConsoleTh>
 *       <ConsoleTh stickyLeft={80} className="min-w-[320px]">岗位</ConsoleTh>
 *       <ConsoleTh>赛道</ConsoleTh>
 *       ...
 *       <ConsoleTh stickyRight>操作</ConsoleTh>
 *     </ConsoleTr>
 *   </ConsoleTHead>
 *   <ConsoleTBody>
 *     <ConsoleTr>
 *       <ConsoleTd stickyLeft={0} fixedWidth={80}>checkbox</ConsoleTd>
 *       <ConsoleTd stickyLeft={80} className="min-w-[320px]">...</ConsoleTd>
 *       ...
 *       <ConsoleTd stickyRight>操作</ConsoleTd>
 *     </ConsoleTr>
 *   </ConsoleTBody>
 * </ConsoleTable>
 * ```
 *
 * 注意：`stickyLeft={0}` 仅表示「最左侧固定列」，本身不强制列宽。
 * 若该列需要固定宽度（如 checkbox 列），请显式传 `fixedWidth={80}`，
 * 以保证后续列的 `left` 偏移精确对齐。普通主识别列直接配合
 * `className="min-w-[...]"` 使用即可。
 */

export function ConsoleTable({
  className,
  children,
  maxHeightClass = "max-h-[calc(100vh-17rem)]",
}: {
  className?: string;
  children: React.ReactNode;
  maxHeightClass?: string;
}) {
  return (
    <div className={cn("console-table-scroll", maxHeightClass, className)}>
      <table className="console-table text-sm">{children}</table>
    </div>
  );
}

export function ConsoleTHead({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <thead className={cn(className)}>{children}</thead>;
}

export function ConsoleTBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <tbody className={cn(className)}>{children}</tbody>;
}

export function ConsoleTr({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <tr className={cn(className)}>{children}</tr>;
}

type StickyProps =
  | { stickyLeft?: number; stickyRight?: never; fixedWidth?: number }
  | { stickyLeft?: never; stickyRight?: boolean; fixedWidth?: number };

export function ConsoleTh({
  className,
  children,
  stickyLeft,
  stickyRight,
  fixedWidth,
  style,
  ...rest
}: React.ComponentProps<"th"> & StickyProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        stickyLeft !== undefined && "dt-sticky-left",
        stickyRight && "dt-sticky-right",
        className
      )}
      style={
        stickyLeft !== undefined
          ? ({
              left: stickyLeft,
              ...(fixedWidth !== undefined && { width: fixedWidth, minWidth: fixedWidth, maxWidth: fixedWidth }),
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...rest}
    >
      {children}
    </th>
  );
}

export function ConsoleTd({
  className,
  children,
  stickyLeft,
  stickyRight,
  fixedWidth,
  style,
  ...rest
}: React.ComponentProps<"td"> & StickyProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        stickyLeft !== undefined && "dt-sticky-left",
        stickyRight && "dt-sticky-right",
        className
      )}
      style={
        stickyLeft !== undefined
          ? ({
              left: stickyLeft,
              ...(fixedWidth !== undefined && { width: fixedWidth, minWidth: fixedWidth, maxWidth: fixedWidth }),
              ...style,
            } as React.CSSProperties)
          : style
      }
      {...rest}
    >
      {children}
    </td>
  );
}
