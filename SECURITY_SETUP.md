# Local API configuration

The vision test reads `MIMO_API_KEY` from the process environment. Set the variable in your local terminal or secret manager before running the test; a missing value stops execution before making a request.

Never paste API credentials into source files. Local `.env` files and editor history are ignored. If a credential was published, revoke it in the provider console; removing Git content does not revoke a credential.
