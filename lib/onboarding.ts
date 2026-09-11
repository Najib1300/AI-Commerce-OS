export interface AuthenticatedUser { id: string; email?: string }
export interface OnboardingClient {
  auth: { getUser(): Promise<{ data: { user: AuthenticatedUser | null }; error?: { message: string } | null }> };
  rpc(name: "create_initial_workspace", parameters: { p_full_name: string; p_organization_name: string }): PromiseLike<{ data: string | null; error: { message: string; code?: string } | null }>;
}

export type ProvisionWorkspaceResult =
  | { status: "created"; organizationId: string }
  | { status: "unauthenticated" }
  | { status: "failed"; detail: string };

export async function provisionInitialWorkspace(
  client: OnboardingClient,
  input: { fullName: string; organizationName: string },
): Promise<ProvisionWorkspaceResult> {
  const { data, error: authError } = await client.auth.getUser();
  if (authError || !data.user) return { status: "unauthenticated" };

  const { data: organizationId, error } = await client.rpc("create_initial_workspace", {
    p_full_name: input.fullName,
    p_organization_name: input.organizationName,
  });
  if (error || !organizationId) {
    return { status: "failed", detail: error?.message ?? "Workspace RPC returned no organization ID." };
  }
  return { status: "created", organizationId };
}

export function shouldSkipOnboarding(membership: { organization_id: string } | null) {
  return Boolean(membership?.organization_id);
}
