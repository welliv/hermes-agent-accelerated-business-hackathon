import {
  ExternalLink,
  TestTube,
  Shield,
  Server,
  CreditCard,
  LightbulbIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProductionWallet() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Ready for Production?</h2>
        <p className="text-sm text-muted-foreground">
          The test cards in this sandbox are great for learning and
          development, but they have important limitations. When you're ready
          to deploy your application to real users, you'll need a production
          Stripe account.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube className="h-5 w-5 text-orange-500" />
              Test Mode
            </CardTitle>
            <CardDescription>Used in this sandbox</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>Isolated testing ecosystem - no real charges</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>Uses <code>pm_card_visa</code> and other test cards</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>Perfect for learning and prototyping</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                <span>
                  Provided via{" "}
                  <a
                    href="https://dashboard.stripe.com/test"
                    target="_blank"
                    className="underline"
                  >
                    Stripe Dashboard
                  </a>
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-yellow-500" />
              Production Mode
            </CardTitle>
            <CardDescription>For real applications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Live PaymentIntents with real money</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Agents pay for AI inference per-request</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Per-request billing via MPP</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span>Your code works the same way!</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold">Production Setup</h3>
        <p className="text-sm text-muted-foreground">
          Replace test keys with live Stripe keys to enable real agent payments
          via the Machine Payments Protocol.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5" />
                Stripe Live Mode
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Recommended
                </span>
              </CardTitle>
              <CardDescription>Live MPP payments with Stripe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-600">
                  <Shield className="h-3 w-3" /> PCI-compliant
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                  <Server className="h-3 w-3" /> Global cards
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-600">
                  <CreditCard className="h-3 w-3" /> Full MPP support
                </span>
              </div>
              <p className="text-muted-foreground">
                Switch from test keys to live keys in your Stripe Skills for
                Hermes configuration. Agents can immediately start paying for
                AI inference with real PaymentIntents.
              </p>
              <Button asChild variant="default" size="sm" className="gap-2">
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CreditCard className="size-3.5" />
                  Open Stripe Dashboard
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-5 w-5" />
                Stripe Skills for Hermes
              </CardTitle>
              <CardDescription>Agent-driven commerce</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-600">
                  <Shield className="h-3 w-3" /> Agent-native
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-600">
                  <Server className="h-3 w-3" /> MCP-integrated
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-600">
                  <CreditCard className="h-3 w-3" /> No checkout
                </span>
              </div>
              <p className="text-muted-foreground">
                Let your Hermes agent discover services, negotiate prices, and
                pay for AI inference through Stripe MPP — no API keys, no
                prepaid credits, no checkout flow.
              </p>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a
                  href="https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/payments/payments-stripe-link-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Stripe Link CLI Skill
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-auto bg-muted/50">
        <CardContent className="">
          <p className="text-sm text-muted-foreground">
            <LightbulbIcon className="size-4 inline mr-1 mb-1" />
            The code you write using test cards works exactly the same with
            production Stripe keys. Just swap from test mode to live mode and
            your agents are ready to handle real payments!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}