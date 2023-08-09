import { handleOAuthRedirect } from "@h20/auth";

handleOAuthRedirect({ serverHost: import.meta.env.VITE_H20_SERVER_HOST }).then((res) => {
  setTimeout(() => {
    document.getElementById("output")!.innerHTML = res?.email ? `Successfully signed in as ${res.email}. You may close the window now.` : "Error signing in";
  }, 3000); // match the polling rate
});
