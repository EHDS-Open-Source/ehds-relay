import { Button } from "@ehds-relay/ui";

import { messages } from "./messages";

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">{messages.appTitle}</h1>
      <p className="text-muted-foreground">{messages.welcome}</p>
      <Button>{messages.getStarted}</Button>
    </main>
  );
}
