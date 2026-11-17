# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Django imports
from django.db.models import Count, Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Module imports
from .base import BaseAPIView
from plane.db.models import IssueAssignee, StateGroup, WorkspaceMember
from plane.license.api.permissions import InstanceAdminPermission


class InstanceMemberReportEndpoint(BaseAPIView):
    permission_classes = [InstanceAdminPermission]

    def get(self, request):
        memberships = (
            WorkspaceMember.objects.filter(
                deleted_at__isnull=True,
                is_active=True,
                workspace__deleted_at__isnull=True,
                member__is_bot=False,
            )
            .select_related("member", "member__avatar_asset", "workspace")
            .order_by("workspace__name", "created_at")
        )

        members_map = {}
        workspaces_map = {}

        for membership in memberships:
            user = membership.member
            workspace = membership.workspace
            ws_id = str(workspace.id)

            if ws_id not in workspaces_map:
                workspaces_map[ws_id] = {
                    "id": ws_id,
                    "name": workspace.name,
                    "slug": workspace.slug,
                }

            user_id = str(user.id)
            if user_id not in members_map:
                full_name = f"{user.first_name} {user.last_name}".strip()
                members_map[user_id] = {
                    "id": user_id,
                    "email": user.email or "",
                    "first_name": user.first_name or "",
                    "last_name": user.last_name or "",
                    "display_name": user.display_name or full_name or user.email or "",
                    "full_name": full_name or user.display_name or user.email or "",
                    "avatar_url": user.avatar_url,
                    "is_active": user.is_active,
                    "workspaces": [],
                    "started_count": 0,
                    "backlog_count": 0,
                    "unstarted_count": 0,
                }

            members_map[user_id]["workspaces"].append(
                {
                    "id": ws_id,
                    "name": workspace.name,
                    "slug": workspace.slug,
                    "role": membership.role,
                }
            )

        user_ids = list(members_map.keys())
        if user_ids:
            issue_counts = (
                IssueAssignee.objects.filter(
                    deleted_at__isnull=True,
                    assignee_id__in=user_ids,
                    issue__deleted_at__isnull=True,
                    issue__archived_at__isnull=True,
                    issue__is_draft=False,
                    issue__project__deleted_at__isnull=True,
                    issue__project__archived_at__isnull=True,
                    issue__workspace__deleted_at__isnull=True,
                    issue__state__deleted_at__isnull=True,
                    issue__state__group__in=[
                        StateGroup.STARTED.value,
                        StateGroup.BACKLOG.value,
                        StateGroup.UNSTARTED.value,
                    ],
                )
                .values("assignee_id")
                .annotate(
                    started_count=Count(
                        "issue_id",
                        filter=Q(issue__state__group=StateGroup.STARTED.value),
                        distinct=True,
                    ),
                    backlog_count=Count(
                        "issue_id",
                        filter=Q(issue__state__group=StateGroup.BACKLOG.value),
                        distinct=True,
                    ),
                    unstarted_count=Count(
                        "issue_id",
                        filter=Q(issue__state__group=StateGroup.UNSTARTED.value),
                        distinct=True,
                    ),
                )
            )

            for row in issue_counts:
                assignee_id = str(row["assignee_id"])
                if assignee_id in members_map:
                    members_map[assignee_id]["started_count"] = row["started_count"]
                    members_map[assignee_id]["backlog_count"] = row["backlog_count"]
                    members_map[assignee_id]["unstarted_count"] = row["unstarted_count"]

        results = list(members_map.values())

        search = (request.query_params.get("search") or "").strip().lower()
        if search:
            results = [
                item
                for item in results
                if search in item["email"].lower()
                or search in item["full_name"].lower()
                or search in item["display_name"].lower()
                or any(search in ws["name"].lower() or search in ws["slug"].lower() for ws in item["workspaces"])
            ]

        workspace_id = (request.query_params.get("workspace_id") or "").strip()
        if workspace_id:
            results = [
                item for item in results if any(ws["id"] == workspace_id for ws in item["workspaces"])
            ]

        state_filter = (request.query_params.get("state_filter") or "").strip()
        if state_filter == "has_started":
            results = [item for item in results if item["started_count"] > 0]
        elif state_filter == "has_backlog":
            results = [item for item in results if item["backlog_count"] > 0]
        elif state_filter == "has_unstarted":
            results = [item for item in results if item["unstarted_count"] > 0]
        elif state_filter == "has_any_active":
            results = [
                item
                for item in results
                if (item["started_count"] + item["backlog_count"] + item["unstarted_count"]) > 0
            ]
        elif state_filter == "no_active":
            results = [
                item
                for item in results
                if (item["started_count"] + item["backlog_count"] + item["unstarted_count"]) == 0
            ]

        sort_by = (request.query_params.get("sort_by") or "name").strip()
        sort_order = (request.query_params.get("sort_order") or "asc").strip().lower()
        reverse = sort_order == "desc"

        sort_key_map = {
            "name": lambda item: (item["full_name"].lower(), item["email"].lower()),
            "email": lambda item: item["email"].lower(),
            "workspaces_count": lambda item: (len(item["workspaces"]), item["full_name"].lower()),
            "started_count": lambda item: (item["started_count"], item["full_name"].lower()),
            "backlog_count": lambda item: (item["backlog_count"], item["full_name"].lower()),
            "unstarted_count": lambda item: (item["unstarted_count"], item["full_name"].lower()),
            "total_active_count": lambda item: (
                item["started_count"] + item["backlog_count"] + item["unstarted_count"],
                item["full_name"].lower(),
            ),
        }
        results.sort(key=sort_key_map.get(sort_by, sort_key_map["name"]), reverse=reverse)

        summary = {
            "total_members": len(results),
            "total_started": sum(item["started_count"] for item in results),
            "total_backlog": sum(item["backlog_count"] for item in results),
            "total_unstarted": sum(item["unstarted_count"] for item in results),
        }

        return Response(
            {
                "results": results,
                "workspaces": sorted(workspaces_map.values(), key=lambda ws: ws["name"].lower()),
                "summary": summary,
            },
            status=status.HTTP_200_OK,
        )
