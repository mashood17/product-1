import { useCallback, useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ChevronUp, Eye, EyeOff, KeyRound, LogOut, X } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import { Logo } from "../brand/Logo";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { errorMessage } from "../../lib/query-client";
import { cn } from "../../lib/utils";
import { Button, Input, Modal } from "../ui";

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  const { admin, hasRole, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (admin && hasRole(...item.roles)));
  const sections = [...new Set(visibleItems.map((item) => item.section))];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-neutral-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <Logo height={32} />
            <p className="mt-1 text-sm font-medium uppercase tracking-wide text-neutral-400">Admin panel</p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Primary">
          {sections.map((section) => (
            <div key={section} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{section}</p>
              <ul className="flex flex-col gap-0.5">
                {visibleItems
                  .filter((item) => item.section === section)
                  .map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-accent-50 text-accent-800"
                              : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                          )
                        }
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative border-t border-neutral-100 p-3">
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} aria-hidden="true" />
              <div className="absolute inset-x-3 bottom-[calc(100%-0.5rem)] z-20 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-elevation-lg">
                <div className="px-3.5 py-3">
                  <p className="truncate text-xs font-medium text-neutral-800">{admin?.email}</p>
                  <p className="text-[11px] capitalize text-neutral-400">{admin?.role}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 border-t border-neutral-100 px-3.5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <KeyRound className="h-4 w-4" />
                  Change password
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2 border-t border-neutral-100 px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            className="relative z-20 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-100"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {admin?.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-neutral-800">{admin?.email}</p>
              <p className="text-[11px] capitalize text-neutral-400">{admin?.role}</p>
            </div>
            <ChevronUp className={cn("h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform", profileOpen && "rotate-180")} />
          </button>
        </div>
      </aside>

      <ChangePasswordModal open={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} onChanged={logout} />
    </>
  );
}

function ChangePasswordModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleClose = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setShowCurrent(false);
    setShowNew(false);
    onClose();
  }, [onClose]);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: currentPassword, new_password: newPassword }),
    onSuccess: () => {
      showToast({ title: "Password changed", description: "Sign in again with your new password.", variant: "success" });
      reset();
      onClose();
      void onChanged();
    },
    onError: (err) => showToast({ title: "Couldn't change password", description: errorMessage(err), variant: "error" }),
  });

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Change password"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" isLoading={mutation.isPending} onClick={() => mutation.mutate()} disabled={!canSubmit}>
            Save
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="relative">
          <Input
            label="Current password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            tabIndex={-1}
            aria-label={showCurrent ? "Hide password" : "Show password"}
            className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="relative">
          <Input
            label="New password"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="At least 8 characters."
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            tabIndex={-1}
            aria-label={showNew ? "Hide password" : "Show password"}
            className="absolute right-3 top-[34px] text-neutral-400 hover:text-neutral-600"
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </Modal>
  );
}
