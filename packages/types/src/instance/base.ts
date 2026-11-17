/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { IUserLite } from "../users";
import type {
  TInstanceAIConfigurationKeys,
  TInstanceEmailConfigurationKeys,
  TInstanceImageConfigurationKeys,
  TInstanceAuthenticationKeys,
  TInstanceWorkspaceConfigurationKeys,
  TCoreLoginMediums,
} from "./";
import type { TExtendedLoginMediums } from "./auth-ee";

export interface IInstanceInfo {
  instance: IInstance;
  config: IInstanceConfig;
}

export interface IInstance {
  id: string;
  created_at: string;
  updated_at: string;
  instance_name: string | undefined;
  whitelist_emails: string | undefined;
  instance_id: string | undefined;
  license_key: string | undefined;
  current_version: string | undefined;
  latest_version: string | undefined;
  last_checked_at: string | undefined;
  namespace: string | undefined;
  is_telemetry_enabled: boolean;
  is_support_required: boolean;
  is_activated: boolean;
  is_setup_done: boolean;
  is_signup_screen_visited: boolean;
  user_count: number | undefined;
  is_verified: boolean;
  created_by: string | undefined;
  updated_by: string | undefined;
  workspaces_exist: boolean;
}

export interface IInstanceConfig {
  enable_signup: boolean;
  is_workspace_creation_disabled: boolean;
  is_google_enabled: boolean;
  is_github_enabled: boolean;
  is_gitlab_enabled: boolean;
  is_gitea_enabled: boolean;
  is_magic_login_enabled: boolean;
  is_email_password_enabled: boolean;
  github_app_name: string | undefined;
  slack_client_id: string | undefined;
  has_unsplash_configured: boolean;
  has_llm_configured: boolean;
  file_size_limit: number | undefined;
  is_smtp_configured: boolean;
  app_base_url: string | undefined;
  space_base_url: string | undefined;
  admin_base_url: string | undefined;
  is_self_managed: boolean;
  instance_changelog_url?: string;
}

export interface IInstanceAdminUserDetail extends IUserLite {
  is_active?: boolean;
  last_login_time?: string | null;
  date_joined?: string;
}

export interface IInstanceAdmin {
  created_at: string;
  created_by: string;
  id: string;
  instance: string;
  role: number | string;
  updated_at: string;
  updated_by: string;
  user: string;
  user_detail: IInstanceAdminUserDetail;
}

export interface ICreateInstanceAdminPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  role?: number;
}

export interface IInstanceMemberReportWorkspace {
  id: string;
  name: string;
  slug: string;
  role: number;
}

export interface IInstanceMemberReportRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  workspaces: IInstanceMemberReportWorkspace[];
  started_count: number;
  backlog_count: number;
  unstarted_count: number;
}

export interface IInstanceMemberReportSummary {
  total_members: number;
  total_started: number;
  total_backlog: number;
  total_unstarted: number;
}

export interface IInstanceMemberReportResponse {
  results: IInstanceMemberReportRow[];
  workspaces: Array<Pick<IInstanceMemberReportWorkspace, "id" | "name" | "slug">>;
  summary: IInstanceMemberReportSummary;
}

export type TInstanceConfigurationKeys =
  | TInstanceAIConfigurationKeys
  | TInstanceEmailConfigurationKeys
  | TInstanceImageConfigurationKeys
  | TInstanceAuthenticationKeys
  | TInstanceWorkspaceConfigurationKeys;

export interface IInstanceConfiguration {
  id: string;
  created_at: string;
  updated_at: string;
  key: TInstanceConfigurationKeys;
  value: string;
  created_by: string | null;
  updated_by: string | null;
}

export type IFormattedInstanceConfiguration = {
  [key in TInstanceConfigurationKeys]: string;
};

export type TLoginMediums = TCoreLoginMediums | TExtendedLoginMediums;
