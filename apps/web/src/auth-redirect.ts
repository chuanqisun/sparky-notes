import { handleOAuthRedirect } from "./features/auth/auth";

handleOAuthRedirect().then((res) => {
  document.getElementById("output")!.innerHTML = res?.email ? `Successfully signed in as ${res.email}. You may close the window now.` : "Error signing in";
});
