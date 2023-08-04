import { handleOAuthRedirect } from "./account/auth";

handleOAuthRedirect().then((res) => {
  setTimeout(() => {
    document.getElementById("output")!.innerHTML = res?.email ? `Successfully signed in as ${res.email}. You may close the window now.` : "Error signing in";
  }, 3000); // match the polling rate
});
