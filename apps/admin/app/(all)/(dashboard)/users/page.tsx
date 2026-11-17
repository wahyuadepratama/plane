/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { AddOutline, DeleteOutline } from "@makeplane/propel/icons";
// plane imports
import { Avatar } from "@makeplane/propel/components/avatar";
import { Button } from "@makeplane/propel/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogHeading,
  DialogMain,
  DialogTitle,
} from "@makeplane/propel/components/dialog";
import { Icon } from "@makeplane/propel/components/icon";
import { Tooltip } from "@makeplane/propel/components/tooltip";
import { EmptyStateCompact } from "@plane/blocks/empty-state";
import { Skeleton } from "@plane/blocks/skeleton";
import { setToast } from "@plane/blocks/toast";
import type { IInstanceAdmin } from "@plane/types";
import { getFileURL } from "@plane/utils";
// components
import { PageWrapper } from "@/components/common/page-wrapper";
// hooks
import { useInstance, useUser } from "@/hooks/store";
// local imports
import { AddAdminModal } from "./add-admin-modal";
import type { Route } from "./+types/page";

function formatDate(dateString?: string | null) {
  if (!dateString) return "Never";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const UsersManagementPage = observer(function UsersManagementPage(_props: Route.ComponentProps) {
  const { instanceAdmins, fetchInstanceAdmins, deleteInstanceAdmin } = useInstance();
  const { currentUser } = useUser();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<IInstanceAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isLoading } = useSWR("INSTANCE_ADMINS", () => fetchInstanceAdmins());

  const admins = instanceAdmins ?? [];

  const handleConfirmDelete = async () => {
    if (!adminToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInstanceAdmin(adminToDelete.id);
      setToast({
        type: "success",
        title: "Success!",
        message: "God Mode access removed.",
      });
      setAdminToDelete(null);
    } catch (error: any) {
      setToast({
        type: "error",
        title: "Error!",
        message: error?.error || "Failed to remove admin access.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <AddAdminModal isOpen={isAddModalOpen} handleClose={() => setIsAddModalOpen(false)} />

      <Dialog
        open={Boolean(adminToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setAdminToDelete(null);
        }}
      >
        <DialogContent size="sm">
          <DialogMain>
            <DialogHeader>
              <DialogHeading>
                <DialogTitle>Remove God Mode access</DialogTitle>
              </DialogHeading>
            </DialogHeader>
            <DialogBody>
              <p className="text-body-xs-regular leading-5 text-secondary">
                Remove{" "}
                <span className="font-medium text-primary">
                  {adminToDelete?.user_detail?.email || adminToDelete?.user_detail?.display_name}
                </span>{" "}
                from God Mode administrators? Their workspace account and memberships will remain intact.
              </p>
            </DialogBody>
          </DialogMain>
          <DialogActions>
            <Button
              variant="secondary"
              size="md"
              stretch="auto"
              disabled={isDeleting}
              onClick={() => setAdminToDelete(null)}
              label="Cancel"
            />
            <Button
              variant="danger"
              size="md"
              stretch="auto"
              loading={isDeleting}
              onClick={handleConfirmDelete}
              label={isDeleting ? "Removing..." : "Remove"}
            />
          </DialogActions>
        </DialogContent>
      </Dialog>

      <PageWrapper
        header={{
          title: "God Mode admins",
          description:
            "Manage administrator accounts allowed to access God Mode. Removing an admin only revokes God Mode access.",
          actions: (
            <Button
              variant="primary"
              size="sm"
              stretch="auto"
              startIcon={<Icon icon={AddOutline} />}
              onClick={() => setIsAddModalOpen(true)}
              label="Add admin"
            />
          ),
        }}
      >
        <div className="space-y-3">
          {isLoading && !instanceAdmins ? (
            <Skeleton>
              <Skeleton.Item height="64px" width="100%" />
              <Skeleton.Item height="64px" width="100%" />
            </Skeleton>
          ) : admins.length > 0 ? (
            <div className="divide-y divide-subtle rounded-lg border border-subtle bg-layer-1">
              {admins.map((admin) => {
                const detail = admin.user_detail;
                const fullName = `${detail?.first_name ?? ""} ${detail?.last_name ?? ""}`.trim();
                const displayName = fullName || detail?.display_name || detail?.email || "Admin";
                const isSelf = currentUser?.id === admin.user;
                const isLastAdmin = admins.length <= 1;
                const disableRemove = isSelf || isLastAdmin;
                const disabledReason = isSelf
                  ? "You cannot remove your own God Mode access."
                  : isLastAdmin
                    ? "At least one God Mode admin must remain."
                    : "Remove God Mode access";

                return (
                  <div
                    key={admin.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        size="md"
                        alt={displayName}
                        src={detail?.avatar_url ? getFileURL(detail.avatar_url) : undefined}
                        fallback={displayName[0]?.toUpperCase()}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-body-sm-medium text-primary">{displayName}</span>
                          {isSelf && (
                            <span className="rounded bg-accent-subtle px-1.5 py-0.5 text-caption-xs-medium text-accent-primary">
                              You
                            </span>
                          )}
                          <span className="rounded border border-subtle bg-layer-2 px-1.5 py-0.5 text-caption-xs-regular text-secondary">
                            Admin
                          </span>
                        </div>
                        <div className="truncate text-caption-sm-regular text-tertiary">{detail?.email}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption-xs-regular text-placeholder">
                          <span>Added {formatDate(admin.created_at)}</span>
                          <span>•</span>
                          <span>Last login: {formatDate(detail?.last_login_time)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end">
                      <Tooltip label={disabledReason}>
                        <span className="inline-flex">
                          <Button
                            variant="secondary"
                            size="sm"
                            stretch="auto"
                            disabled={disableRemove}
                            startIcon={<Icon icon={DeleteOutline} />}
                            onClick={() => setAdminToDelete(admin)}
                            className="text-danger-primary"
                            label="Remove"
                          />
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyStateCompact
              title="No instance admins found"
              description="Add an administrator account to grant access to God Mode."
            />
          )}
        </div>
      </PageWrapper>
    </>
  );
});

export const meta: Route.MetaFunction = () => [{ title: "Users - God Mode" }];

export default UsersManagementPage;
