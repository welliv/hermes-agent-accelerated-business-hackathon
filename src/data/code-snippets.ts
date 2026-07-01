export type SnippetCategory =
  | "this-scenario"
  | "402";

/**
 * Valid snippet IDs - use this type for type-safe snippet references
 */
export type SnippetId =
  // 402
  | "fetch-with-l402";

export type CodeLanguage = "javascript" | "typescript" | "bash";

export interface CodeSnippet {
  id: SnippetId;
  title: string;
  description: string;
  code: string;
  category: SnippetCategory;
  language?: CodeLanguage; // defaults to 'typescript'
}

export const SNIPPET_CATEGORIES: {
  id: SnippetCategory;
  label: string;
  icon: string;
}[] = [
  { id: "this-scenario", label: "This Scenario", icon: "play" },
  { id: "402", label: "402", icon: "lock" },
];

export const CODE_SNIPPETS: CodeSnippet[] = [
  // 402
  {
    id: "fetch-with-l402",
    title: "fetch402 (Stripe MPP)",
    description:
      "Fetch a resource protected by HTTP 402 Payment Required with Stripe. Automatically handles the Stripe payment challenge, creates a PaymentIntent, pays with test card, and retries with proof of payment.",
    category: "402",
    code: `import { Stripe } from "stripe"

// For Stripe MPP: the agent pays via Stripe PaymentIntent (test card: pm_card_visa)
// Server responds with 402 + www-authenticate: stripe
// Agent creates PaymentIntent, confirms with test card, retries with payment-signature header

const stripe = new Stripe("sk_test_...", { apiVersion: "2023-10-16" })

async function payWithStripeMPP(endpoint: string, task: string) {
  // 1. Agent submits task, gets model recommendation + price
  const recommendation = await analyzeTask(task)

  // 2. Server creates 402 challenge with Stripe
  const challenge = await createStripeChallenge(endpoint, recommendation)

  // 3. Create PaymentIntent and pay with test card
  const paymentIntent = await stripe.paymentIntents.create({
    amount: challenge.amountCents,
    currency: "usd",
    payment_method: "pm_card_visa",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" }
  })

  // 4. Verify payment and execute
  const result = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, model: recommendation.model, paymentIntentId: paymentIntent.id })
  })

  return result.json()
}

// Server-side resources:
// MPP Protocol: https://mpp.dev/
// Stripe PaymentIntents: https://docs.stripe.com/api/payment_intents
// Agent-Driven Commerce: https://docs.stripe.com/agents`,
  },
];

/**
 * Get snippets by their IDs (primary lookup method)
 */
export function getSnippetsById(ids: SnippetId[]): CodeSnippet[] {
  return ids
    .map((id) => CODE_SNIPPETS.find((snippet) => snippet.id === id))
    .filter((snippet): snippet is CodeSnippet => snippet !== undefined);
}

/**
 * Get a single snippet by ID
 */
export function getSnippetById(id: SnippetId): CodeSnippet | undefined {
  return CODE_SNIPPETS.find((snippet) => snippet.id === id);
}

/**
 * Get snippets by category
 */
export function getSnippetsByCategory(
  category: SnippetCategory,
): CodeSnippet[] {
  return CODE_SNIPPETS.filter((snippet) => snippet.category === category);
}