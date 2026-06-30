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
import { AlbyIcon } from "@/icons/AlbyIcon";

const externalLinks = [
  {
    title: "Alby Bitcoin Builder Skill",
    url: "https://github.com/getalby/builder-skill",
    icon: <BotIcon className="size-4" />,
  },
  {
    title: "NWC Faucet",
    url: "https://faucet.nwc.dev",
    icon: <DropletsIcon className="size-4" />,
  },
  {
    title: "Sandbox Source Code",
    url: "https://github.com/welliv/shopstr-sandbox",
    icon: <CodeIcon className="size-4" />,
  },
  {
    title: "Feedback",
    url: "https://feedback.getalby.com/-alby-sandbox-request-a-feature",
    icon: <LightbulbIcon className="size-4" />,
  },
  {
    title: "Help",
    url: "https://support.getalby.com",
    icon: <HelpCircleIcon className="size-4" />,
  },
];

const sectionLabels: Record<string, string> = {
  scenarios: "Lightning Scenarios",
  "402": "402 · Agent Payments",
  "bitcoin-connect": "Bitcoin Connect",
};

export function AppSidebar() {
  const location = useLocation();
  const scenarioId = location.pathname.split("/").filter(Boolean)[0];

  const lightningScenarios = scenarios.filter(
    (s) => !s.section || s.section === "scenarios",
  );
  const fourzerotwoScenarios = scenarios.filter((s) => s.section === "402");
  const bitcoinConnectScenarios = scenarios.filter(
    (s) => s.section === "bitcoin-connect",
  );

  const sections = [
    { label: "scenarios", items: lightningScenarios },
    { label: "402", items: fourzerotwoScenarios },
    { label: "bitcoin-connect", items: bitcoinConnectScenarios },
  ].filter((s) => s.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="">
        <div className="flex items-center gap-2">
          <AlbyIcon className="size-6" />
          <div>
            <h1 className="font-semibold">Shopstr Sandbox</h1>
            <p className="text-xs text-muted-foreground">
              Agent Commerce on Lightning
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