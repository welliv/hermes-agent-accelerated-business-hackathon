# Payment Forwarding

Title: Payment Forwarding
Description: Listen to incoming payments, and forward a percentage of the value using a recipient lightning address.
Education: Payment forwarding can be used to make revenue by providing a service for merchants. For example, receive the payment on behalf of a merchant, provide a service, and then forward 99% of the value to the merchant. Keep in mind, you should reserve 1% for routing fees.
Complexity: Medium

```txt
════════════════════════════════════════════════════════════════════════════════
                            PAYMENT FORWARDING SETUP
════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────┬──────────────────────────┬─────────────────────────┐
│  👤 Alice               │  👤 Bob                  │  👤 Charlie             │
│  NWC          Connected │  NWC          Connected  │  NWC          Connected │
├─────────────────────────┼──────────────────────────┼─────────────────────────┤
│                         │                          │                         │
│  10,000 sats            │  5,000 sats              │  2,000 sats             │
│  $9.02                  │  $4.51                   │  $1.80                  │
│                         │                          │                         │
│  Recipient              │  Lightning Address       │  Lightning Address      │
│  ┌───────────────────┐ │  ┌────────────────────┐  │  ┌───────────────────┐ │
│  │bob@getalby.com    │ │  │bob@getalby.com     │  │  │charlie@getalby.com│ │
│  └───────────────────┘ │  └────────────────────┘  │  └───────────────────┘ │
│                         │                          │                         │
│  Quick Pay              │  Forward Settings        │  Status: Waiting        │
│  ┌──┬──┬────┐          │  Forward to Charlie      │                         │
│  │100│500│1000│         │  ┌────────────────────┐  │                         │
│  │sats│sats│sats│       │  │ 10             %   │  │                         │
│  └──┴──┴────┘          │  └────────────────────┘  │                         │
│                         │                          │                         │
│                         │  [Update Settings]       │                         │
│                         │                          │                         │
└─────────────────────────┴──────────────────────────┴─────────────────────────┘


════════════════════════════════════════════════════════════════════════════════
                         BOB FORWARDS 10% TO CHARLIE
════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────┬──────────────────────────┬─────────────────────────┐
│  👤 Alice               │  👤 Bob                  │  👤 Charlie             │
│  NWC          Connected │  NWC          Connected  │  NWC          Connected │
├─────────────────────────┼──────────────────────────┼─────────────────────────┤
│                         │                          │                         │
│  9,000 sats             │  5,900 sats [-100]       │  2,100 sats [+100]      │
│  $8.12                  │  $5.32                   │  $1.89                  │
│                         │                          │                         │
│  Recipient              │  Lightning Address       │  Lightning Address      │
│  ┌───────────────────┐ │  ┌────────────────────┐  │  ┌───────────────────┐ │
│  │bob@getalby.com    │ │  │bob@getalby.com     │  │  │charlie@getalby.com│ │
│  └───────────────────┘ │  └────────────────────┘  │  └───────────────────┘ │
│                         │                          │                         │
│  Quick Pay              │  Forward Settings        │  Incoming Payments      │
│  ┌──┬──┬────┐          │  Forward to Charlie      │  ┌───────────────────┐ │
│  │100│500│1000│         │  ┌────────────────────┐  │  │⚡ +100 sats       │ │
│  │sats│sats│sats│       │  │ 10             %   │  │  │   9:23:45 PM      │ │
│  └──┴──┴────┘          │  └────────────────────┘  │  └───────────────────┘ │
│                         │                          │                         │
│  ✅ Sent 1000 sats      │  ✅ Forwarded 100 sats   │  ✅ Received 100 sats   │
│                         │     Kept 900 sats        │                         │
│                         │                          │                         │
└─────────────────────────┴──────────────────────────┴─────────────────────────┘
```

## Instructions (re-implemented from feb623f)

**⚠️ Start Listening First**

1. First turn ON "Start Listening" on Bob first.
2. Then send payment from Alice.

This ensures the forwarding logic captures the payment.

