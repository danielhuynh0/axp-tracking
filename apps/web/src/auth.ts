import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { config } from "./config";

export const auth = config ? new UserManager({
  authority: config.issuer,
  client_id: config.clientId,
  redirect_uri: `${window.location.origin}/auth/callback`,
  response_type: "code",
  scope: "openid email axp/access",
  automaticSilentRenew: false,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
}) : null;

// Cognito logout uses client_id + logout_uri, not OIDC end-session parameters.
export async function signOut() {
  if (!config || !auth) return;
  await auth.removeUser();
  const url = new URL(`${config.domain}/logout`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("logout_uri", `${window.location.origin}/`);
  window.location.assign(url);
}
