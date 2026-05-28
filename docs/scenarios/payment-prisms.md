# Payment Prisms

Title: Payment Prisms
Description: Listen to incoming payments, and forward a percentage of the value to multiple recipients.
Education: Prisms is an extension of payment forwarding that allow a single initial payment to fund multiple wallets. Prisms can also be recursive. Make sure to consider reserving 1% for routing fees for each payment.
Complexity: Medium

Similar to [./payment-forwarding.md] but with an extra recipient: David.

```txt
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  👤 Alice    │  👤 Bob      │  👤 Charlie  │  👤 David    │
│  NWC   Conn. │  NWC   Conn. │  NWC   Conn. │  NWC   Conn. │
├──────────────┼──────────────┼──────────────┼──────────────┤
│              │              │              │              │
│  9,000 sats  │  5,900 sats  │  2,050 sats  │  1,550 sats  │
│              │  [-100]      │  [+50]       │  [+50]       │
│  $8.12       │  $5.32       │  $1.85       │  $1.40       │
│              │              │              │              │
│  Recipient   │  Lightning   │  Lightning   │  Lightning   │
│  ┌────────┐  │  Address     │  Address     │  Address     │
│  │bob@    │  │  ┌────────┐  │  ┌────────┐  │  ┌────────┐  │
│  │getalby │  │  │bob@    │  │  │charlie@│  │  │david@  │  │
│  │.com    │  │  │getalby │  │  │getalby │  │  │getalby │  │
│  └────────┘  │  │.com    │  │  │.com    │  │  │.com    │  │
│              │  └────────┘  │  └────────┘  │  └────────┘  │
│  Quick Pay   │              │              │              │
│  ┌─┬──┬───┐  │  Prism Split │  Incoming    │  Incoming    │
│  │100│500│1000││              │  ┌────────┐  │  ┌────────┐  │
│  │sats│sats│sats││           │  │⚡ +50  │  │  │⚡ +50  │  │
│  └─┴──┴───┘  │  Charlie: 5% │  │ sats   │  │  │ sats   │  │
│              │  David:   5% │  │ 9:25:30│  │  │ 9:25:30│  │
│  ✅ Sent     │  Bob keeps:  │  └────────┘  │  └────────┘  │
│  1000 sats   │       90%    │              │              │
│              │              │  ✅ Received │  ✅ Received │
│              │  ✅ Split:   │  50 sats     │  50 sats     │
│              │  Kept 900    │              │              │
│              │  Charlie 50  │              │              │
│              │  David 50    │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Instructions (re-implemented from feb623f)

**⚠️ Start Listening First**

1. First turn ON "Start Listening" on Bob first.
2. Then send payment from Alice (or the sender).

This ensures the prism splitting logic captures the payment.

