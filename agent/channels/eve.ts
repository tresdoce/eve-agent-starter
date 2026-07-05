import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Self-hosted (non-Vercel) production access: shared operator/service
    // credentials. Swap for your own user/session auth if this agent gets
    // a real multi-user frontend.
    httpBasic({
      username: process.env.ROUTE_AUTH_BASIC_USERNAME ?? "",
      password: process.env.ROUTE_AUTH_BASIC_PASSWORD ?? "",
    }),
  ],
});
