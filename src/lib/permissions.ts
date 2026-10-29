
export type OrganisationRole =
  | "org:admin"
  | "org:member";

export type Permission =
  | "projects:view"
  | "projects:create"
  | "members:view"
  | "members:invite"
  | "billing:manage"
  | "settings:manage";

const rolePermissions: Record<
  OrganisationRole,
  readonly Permission[]
> = {
  "org:admin": [
    "projects:view",
    "projects:create",
    "members:view",
    "members:invite",
    "billing:manage",
    "settings:manage",
  ],

  "org:member": [
    "projects:view",
    "projects:create",
    "members:view",
  ],
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
): boolean {
  if (
    role !== "org:admin" &&
    role !== "org:member"
  ) {
    return false;
  }

  return rolePermissions[role].includes(permission);
}

export function isOrganisationAdmin(
  role: string | null | undefined
): boolean {
  return role === "org:admin";
}
