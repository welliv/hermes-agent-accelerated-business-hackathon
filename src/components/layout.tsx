import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { Bot } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-2" />
          <span className="font-semibold">Stripe MPP</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
        <footer className="shrink-0 border-t px-4 py-3 flex items-center justify-center gap-2 text-xs text-muted-foreground/70 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <strong>Hermes Agent Hackathon</strong>
          </span>
          <span className="opacity-40">·</span>
          <span className="inline-flex items-center gap-1">
            <Bot className="size-3.5" />
            NVIDIA, Stripe, Nous Research
          </span>
          <span className="opacity-40">·</span>
          <a
            href="https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-stripe-link-cli"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            Stripe Link CLI Skill
          </a>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
