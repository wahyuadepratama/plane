/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo, useState } from "react";
import { HideOutline, ShowOutline } from "@makeplane/propel/icons";
// plane imports
import { Banner } from "@makeplane/propel/components/banner";
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
import { IconButton } from "@makeplane/propel/components/icon-button";
import { InputField } from "@makeplane/propel/components/input-field";
import { PasswordStrengthIndicator } from "@plane/blocks/auth";
import { setToast } from "@plane/blocks/toast";
import { E_PASSWORD_STRENGTH } from "@plane/constants";
import { cn, getPasswordStrength, validatePersonName } from "@plane/utils";
// hooks
import { useInstance } from "@/hooks/store";

type TAddAdminModalProps = {
  isOpen: boolean;
  handleClose: () => void;
};

type TAddMode = "create" | "existing";

export function AddAdminModal({ isOpen, handleClose }: TAddAdminModalProps) {
  const { createInstanceAdmin } = useInstance();

  const [mode, setMode] = useState<TAddMode>("create");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const resetForm = () => {
    setMode("create");
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsPasswordFocused(false);
    setIsSubmitting(false);
    setErrorMessage(undefined);
  };

  const isSubmitDisabled = useMemo(() => {
    if (isSubmitting || !email.trim()) return true;
    if (mode === "existing") return false;
    return (
      !firstName.trim() ||
      !password ||
      getPasswordStrength(password) !== E_PASSWORD_STRENGTH.STRENGTH_VALID ||
      password !== confirmPassword
    );
  }, [confirmPassword, email, firstName, isSubmitting, mode, password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setErrorMessage(undefined);
    setIsSubmitting(true);

    try {
      await createInstanceAdmin(
        mode === "existing"
          ? { email: email.trim().toLowerCase() }
          : {
              email: email.trim().toLowerCase(),
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              password,
            }
      );

      setToast({
        type: "success",
        title: "Success!",
        message: "God Mode admin added successfully.",
      });
      handleClose();
    } catch (error: any) {
      const apiError = error?.error || error?.message || "Failed to add instance admin.";
      setErrorMessage(apiError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) resetForm();
      }}
    >
      <DialogContent size="md">
        <form onSubmit={handleSubmit}>
          <DialogMain>
            <DialogHeader>
              <DialogHeading>
                <DialogTitle>Add God Mode admin</DialogTitle>
              </DialogHeading>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-subtle bg-layer-2 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setErrorMessage(undefined);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-caption-sm-medium transition-colors",
                    mode === "create" ? "bg-layer-1 text-primary shadow-raised-100" : "text-tertiary hover:text-primary"
                  )}
                >
                  New account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("existing");
                    setErrorMessage(undefined);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-caption-sm-medium transition-colors",
                    mode === "existing"
                      ? "bg-layer-1 text-primary shadow-raised-100"
                      : "text-tertiary hover:text-primary"
                  )}
                >
                  Existing Plane user
                </button>
              </div>

              {errorMessage && <Banner placement="inline" variant="danger" description={errorMessage} />}

              <InputField
                id="admin_email"
                type="email"
                size="lg"
                orientation="vertical"
                label="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                autoComplete="off"
              />

              {mode === "existing" ? (
                <p className="text-caption-sm-regular text-tertiary">
                  Grants God Mode access to an existing Plane account using their current password.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField
                      id="admin_first_name"
                      type="text"
                      size="lg"
                      orientation="vertical"
                      label="First name"
                      required
                      maxLength={50}
                      value={firstName}
                      onChange={(e) => {
                        const validation = validatePersonName(e.target.value);
                        if (validation === true || e.target.value === "") {
                          setFirstName(e.target.value);
                        }
                      }}
                      placeholder="First name"
                      autoComplete="off"
                    />
                    <InputField
                      id="admin_last_name"
                      type="text"
                      size="lg"
                      orientation="vertical"
                      label="Last name"
                      maxLength={50}
                      value={lastName}
                      onChange={(e) => {
                        const validation = validatePersonName(e.target.value);
                        if (validation === true || e.target.value === "") {
                          setLastName(e.target.value);
                        }
                      }}
                      placeholder="Last name"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1">
                    <InputField
                      id="admin_password"
                      type={showPassword ? "text" : "password"}
                      size="lg"
                      orientation="vertical"
                      label="Password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Strong password"
                      autoComplete="new-password"
                      endIcon={
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          icon={<Icon icon={showPassword ? HideOutline : ShowOutline} />}
                          onClick={() => setShowPassword((prev) => !prev)}
                        />
                      }
                    />
                    <PasswordStrengthIndicator password={password} isFocused={isPasswordFocused} />
                  </div>

                  <div className="space-y-1">
                    <InputField
                      id="admin_confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      size="lg"
                      orientation="vertical"
                      label="Confirm password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      endIcon={
                        <IconButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          icon={<Icon icon={showConfirmPassword ? HideOutline : ShowOutline} />}
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        />
                      }
                    />
                    {!!confirmPassword && password !== confirmPassword && (
                      <span className="text-body-xs-regular text-danger-primary">Passwords don{"'"}t match</span>
                    )}
                  </div>
                </>
              )}
            </DialogBody>
          </DialogMain>
          <DialogActions>
            <Button variant="secondary" size="md" stretch="auto" type="button" onClick={handleClose} label="Cancel" />
            <Button
              variant="primary"
              size="md"
              stretch="auto"
              type="submit"
              disabled={isSubmitDisabled}
              loading={isSubmitting}
              label={isSubmitting ? "Adding..." : "Add admin"}
            />
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}
