import { RouterProvider } from "react-router/dom";
import { router } from "./routes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme>
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  );
}

export default App;
