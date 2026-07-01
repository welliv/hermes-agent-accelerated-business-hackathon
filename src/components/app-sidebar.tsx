import {
  BotIcon,
  CodeIcon,
  DropletsIcon,
  ExternalLink,
  HelpCircleIcon,
  LightbulbIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { scenarios } from "@/data/scenarios";

const externalLinks = [
  {
    title: "Stripe Link CLI Skill",
    url: "https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-stripe-link-cli",
    icon: <BotIcon className="size-4" />,
  },
  {
    title: "Stripe Test Mode",
    url: "https://dashboard.stripe.com/test",
    icon: <DropletsIcon className="size-4" />,
  },
  {
    title: "Sandbox Source Code",
    url: "https://github.com/welliv/shopstr-sandbox",
    icon: <CodeIcon className="size-4" />,
  },
  {
    title: "Hermes Docs",
    url: "https://hermes-agent.nousresearch.com/docs",
    icon: <LightbulbIcon className="size-4" />,
  },
  {
    title: "MPP Spec",
    url: "https://github.com/stripe/agent-toolkit",
    icon: <HelpCircleIcon className="size-4" />,
  },
];

const sectionLabels: Record<string, string> = {
  "402": "402 · Agent Payments (Stripe MPP)",
};

export function AppSidebar() {
  const location = useLocation();
  const scenarioId = location.pathname.split("/").filter(Boolean)[0];

  const fourzerotwoScenarios = scenarios.filter((s) => s.section === "402");

  const sections = [
    { label: "402", items: fourzerotwoScenarios },
  ].filter((s) => s.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="">
        <div className="flex items-center gap-2">
          <BotIcon className="size-6" />
          <div>
            <h1 className="font-semibold">Stripe MPP Sandbox</h1>
            <p className="text-xs text-muted-foreground">
              MPP-Paid AI Inference for Agents
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={!scenarioId}>
                  <Link to="/">
                    <span>👋</span>
                    <span>Getting Started</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sections.map((section) => (
          <SidebarGroup key={section.label} className="-mt-4">
            <SidebarGroupLabel className="text-xs font-semibold tracking-widest text-muted-foreground">
              {sectionLabels[section.label] || section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((scenario) => (
                  <SidebarMenuItem key={scenario.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={scenarioId === scenario.id}
                    >
                      <Link to={`/${scenario.id}`}>
                        <span>{scenario.icon}</span>
                        <span>{scenario.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className="mx-0" />

      <SidebarFooter>
        <SidebarMenu>
          {externalLinks.map((link) => (
            <SidebarMenuItem key={link.url}>
              <SidebarMenuButton asChild>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <span>{link.icon}</span>
                  <span>{link.title}</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}