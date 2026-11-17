/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  RefreshOutline,
  SearchOutline,
  SortAscendingOutline,
  SortDescendingOutline,
} from "@makeplane/propel/icons";
// plane imports
import { Avatar } from "@makeplane/propel/components/avatar";
import { Button } from "@makeplane/propel/components/button";
import { Icon } from "@makeplane/propel/components/icon";
import { InputField } from "@makeplane/propel/components/input-field";
import { Select, SelectContent, SelectItem, SelectList, SelectTrigger } from "@makeplane/propel/components/select";
import { EmptyStateCompact } from "@plane/blocks/empty-state";
import { Skeleton } from "@plane/blocks/skeleton";
import { InstanceService } from "@plane/services";
import type { IInstanceMemberReportRow } from "@plane/types";
import { cn, getFileURL } from "@plane/utils";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
// types
import type { Route } from "./+types/page";

const instanceService = new InstanceService();

type TSortField = "name" | "workspaces_count" | "started_count" | "backlog_count" | "unstarted_count";
type TSortOrder = "asc" | "desc";
type TStateFilter = "all" | "has_started" | "has_backlog" | "has_unstarted" | "has_any_active" | "no_active";

const STATE_FILTER_OPTIONS: Array<{ value: TStateFilter; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "has_started", label: "Has active Started" },
  { value: "has_backlog", label: "Has active Backlog" },
  { value: "has_unstarted", label: "Has active Unstarted" },
  { value: "has_any_active", label: "Has any active work item" },
  { value: "no_active", label: "No active work items" },
];

function SortableColumnHeader({
  label,
  field,
  activeField,
  sortOrder,
  align = "left",
  onSort,
}: {
  label: string;
  field: TSortField;
  activeField: TSortField;
  sortOrder: TSortOrder;
  align?: "left" | "right";
  onSort: (field: TSortField) => void;
}) {
  const isActive = activeField === field;
  const SortIcon = isActive && sortOrder === "desc" ? SortDescendingOutline : SortAscendingOutline;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1.5 text-caption-sm-medium transition-colors hover:text-primary",
        isActive ? "text-primary" : "text-tertiary",
        align === "right" && "ml-auto justify-end"
      )}
    >
      <span>{label}</span>
      <Icon
        icon={SortIcon}
        className={cn("size-3.5 transition-opacity", isActive ? "opacity-100 text-accent-primary" : "opacity-40")}
      />
    </button>
  );
}

export default function MemberReportPage(_props: Route.ComponentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState<TStateFilter>("all");
  const [sortBy, setSortBy] = useState<TSortField>("started_count");
  const [sortOrder, setSortOrder] = useState<TSortOrder>("desc");

  const { data, error, isLoading, isValidating, mutate } = useSWR("INSTANCE_MEMBER_REPORTS", () =>
    instanceService.memberReports()
  );

  const handleSort = (field: TSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  const filteredAndSortedRows = useMemo(() => {
    const rows = data?.results ?? [];
    const query = searchQuery.trim().toLowerCase();

    const filtered = rows.filter((row: IInstanceMemberReportRow) => {
      if (workspaceFilter !== "all" && !row.workspaces.some((ws) => ws.id === workspaceFilter)) {
        return false;
      }

      if (stateFilter === "has_started" && row.started_count <= 0) return false;
      if (stateFilter === "has_backlog" && row.backlog_count <= 0) return false;
      if (stateFilter === "has_unstarted" && row.unstarted_count <= 0) return false;
      if (stateFilter === "has_any_active" && row.started_count + row.backlog_count + row.unstarted_count <= 0)
        return false;
      if (stateFilter === "no_active" && row.started_count + row.backlog_count + row.unstarted_count > 0)
        return false;

      if (query) {
        const matchesUser =
          row.full_name.toLowerCase().includes(query) ||
          row.display_name.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query);
        const matchesWorkspace = row.workspaces.some(
          (ws) => ws.name.toLowerCase().includes(query) || ws.slug.toLowerCase().includes(query)
        );
        if (!matchesUser && !matchesWorkspace) return false;
      }

      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
          break;
        case "workspaces_count":
          comparison = a.workspaces.length - b.workspaces.length;
          break;
        case "started_count":
          comparison = a.started_count - b.started_count;
          break;
        case "backlog_count":
          comparison = a.backlog_count - b.backlog_count;
          break;
        case "unstarted_count":
          comparison = a.unstarted_count - b.unstarted_count;
          break;
      }

      if (comparison === 0) {
        comparison = a.full_name.localeCompare(b.full_name, undefined, { sensitivity: "base" });
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data?.results, searchQuery, sortBy, sortOrder, stateFilter, workspaceFilter]);

  const summary = useMemo(
    () =>
      filteredAndSortedRows.reduce(
        (acc, row) => ({
          totalMembers: acc.totalMembers + 1,
          totalStarted: acc.totalStarted + row.started_count,
          totalBacklog: acc.totalBacklog + row.backlog_count,
          totalUnstarted: acc.totalUnstarted + row.unstarted_count,
        }),
        { totalMembers: 0, totalStarted: 0, totalBacklog: 0, totalUnstarted: 0 }
      ),
    [filteredAndSortedRows]
  );

  const hasActiveFilters = searchQuery.trim() !== "" || workspaceFilter !== "all" || stateFilter !== "all";
  const workspaces = data?.workspaces ?? [];

  return (
    <PageWrapper
      size="lg"
      header={{
        title: "Member workload report",
        description:
          "All active workspace members across the instance with workspace memberships and active assigned work item counts.",
        actions: (
          <Button
            variant="secondary"
            size="sm"
            stretch="auto"
            loading={isValidating}
            startIcon={<Icon icon={RefreshOutline} />}
            onClick={() => void mutate()}
            label="Refresh"
          />
        ),
      }}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-subtle bg-layer-1 p-3">
            <div className="text-caption-sm-regular text-tertiary">Members shown</div>
            <div className="mt-1 text-h5-semibold text-primary">{summary.totalMembers}</div>
          </div>
          <div className="rounded-lg border border-subtle bg-layer-1 p-3">
            <div className="text-caption-sm-regular text-tertiary">Active Started</div>
            <div className="mt-1 text-h5-semibold text-primary">{summary.totalStarted}</div>
          </div>
          <div className="rounded-lg border border-subtle bg-layer-1 p-3">
            <div className="text-caption-sm-regular text-tertiary">Active Backlog</div>
            <div className="mt-1 text-h5-semibold text-primary">{summary.totalBacklog}</div>
          </div>
          <div className="rounded-lg border border-subtle bg-layer-1 p-3">
            <div className="text-caption-sm-regular text-tertiary">Active Unstarted</div>
            <div className="mt-1 text-h5-semibold text-primary">{summary.totalUnstarted}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-subtle bg-layer-1 p-3 md:flex-row md:items-center">
          <div className="min-w-0 flex-1">
            <InputField
              id="report_search"
              type="text"
              size="md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member name, email, or workspace..."
              startIcon={<Icon icon={SearchOutline} className="size-4 text-tertiary" />}
            />
          </div>

          <div className="w-full md:w-56">
            <Select value={workspaceFilter} onValueChange={(value) => setWorkspaceFilter(value ?? "all")}>
              <SelectTrigger variant="secondary" size="md" placeholder="All workspaces" />
              <SelectContent>
                <SelectList>
                  <SelectItem value="all" label="All workspaces" size="md" />
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id} label={ws.name} size="md" />
                  ))}
                </SelectList>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Select value={stateFilter} onValueChange={(value) => setStateFilter((value as TStateFilter) ?? "all")}>
              <SelectTrigger variant="secondary" size="md" placeholder="All activity" />
              <SelectContent>
                <SelectList>
                  {STATE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} label={opt.label} size="md" />
                  ))}
                </SelectList>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="md"
              stretch="auto"
              onClick={() => {
                setSearchQuery("");
                setWorkspaceFilter("all");
                setStateFilter("all");
              }}
              label="Clear"
            />
          )}
        </div>

        {isLoading && !data ? (
          <Skeleton>
            <Skeleton.Item height="56px" width="100%" />
            <Skeleton.Item height="56px" width="100%" />
            <Skeleton.Item height="56px" width="100%" />
          </Skeleton>
        ) : error ? (
          <EmptyStateCompact
            title="Failed to load report"
            description="Could not fetch workspace member report data. Try refreshing."
          />
        ) : filteredAndSortedRows.length === 0 ? (
          <EmptyStateCompact
            title="No matching members"
            description={
              hasActiveFilters
                ? "No workspace members match the selected filters."
                : "No active workspace members were found on this instance."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-subtle bg-layer-1">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-subtle bg-layer-2">
                  <th className="px-4 py-3">
                    <SortableColumnHeader
                      label="Member"
                      field="name"
                      activeField={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3">
                    <SortableColumnHeader
                      label="Workspaces"
                      field="workspaces_count"
                      activeField={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortableColumnHeader
                      label="Started"
                      field="started_count"
                      activeField={sortBy}
                      sortOrder={sortOrder}
                      align="right"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortableColumnHeader
                      label="Backlog"
                      field="backlog_count"
                      activeField={sortBy}
                      sortOrder={sortOrder}
                      align="right"
                      onSort={handleSort}
                    />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortableColumnHeader
                      label="Unstarted"
                      field="unstarted_count"
                      activeField={sortBy}
                      sortOrder={sortOrder}
                      align="right"
                      onSort={handleSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {filteredAndSortedRows.map((member) => (
                  <tr key={member.id} className="hover:bg-layer-1-hover">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <Avatar
                          size="sm"
                          alt={member.full_name}
                          src={member.avatar_url ? getFileURL(member.avatar_url) : undefined}
                          fallback={member.full_name[0]?.toUpperCase()}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-body-sm-medium text-primary">{member.full_name}</div>
                          <div className="truncate text-caption-sm-regular text-tertiary">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {member.workspaces.map((ws) => (
                          <span
                            key={ws.id}
                            className="inline-flex items-center gap-1 rounded-md border border-subtle bg-layer-2 px-2 py-0.5 text-caption-xs-medium text-secondary"
                            title={`${ws.name} (${ws.slug})`}
                          >
                            <span>{ws.name}</span>
                            <span className="text-placeholder">[{ws.slug}]</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <span
                        className={cn(
                          "inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-caption-sm-medium",
                          member.started_count > 0
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-layer-2 text-tertiary"
                        )}
                      >
                        {member.started_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <span
                        className={cn(
                          "inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-caption-sm-medium",
                          member.backlog_count > 0 ? "bg-layer-2 text-primary" : "bg-layer-2 text-tertiary"
                        )}
                      >
                        {member.backlog_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <span
                        className={cn(
                          "inline-flex min-w-[2rem] items-center justify-center rounded-md px-2 py-0.5 text-caption-sm-medium",
                          member.unstarted_count > 0 ? "bg-layer-2 text-primary" : "bg-layer-2 text-tertiary"
                        )}
                      >
                        {member.unstarted_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

export const meta: Route.MetaFunction = () => [{ title: "Report - God Mode" }];
