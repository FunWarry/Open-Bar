# OpenBar — Terms of Service & Commercial Conditions (CGU & CGV)

*Last updated: November 2026*

Welcome to **OpenBar**, a proprietary commercial point-of-sale (POS) and bar management progressive web application developed and owned by Mathéo Gevraise (FunWarry).

By subscribing to, installing, configuring, deploying, or accessing the OpenBar application (including via waiter tablets, bartender KDS screens, client QR code menus, or manager dashboards), you agree to be bound by these Terms of Service ("Terms").

---

## 1. Commercial Model & Monthly Subscription

1. **Subscription-Based Service**:
   OpenBar is provided as a paid commercial service billed on a **monthly subscription basis** per establishment. Active subscription status is required to access, execute, and receive updates for the software.
2. **Cancellation & Expiry**:
   Upon cancellation or non-renewal of the monthly subscription, rights to execute and access the software terminate at the end of the current paid billing cycle.

---

## 2. Deployment Options (Dual Hosting Model)

Subscribing establishments may choose between two supported deployment modes:

### Option A: Self-Hosted on Existing Hardware (On-Premise / BYOH)
- The establishment installs and runs OpenBar locally on its own on-premise hardware connected to its local private network (LAN/Wi-Fi).
- **CRITICAL HARDWARE DISCLAIMER (No Hardware Provided)**:
  - OpenBar does **NOT** sell, supply, manufacture, deliver, or lease any hardware, servers, touchscreens, tablets, or terminals.
  - The software is provided under a **"Bring Your Own Hardware" (BYOH)** policy: the establishment uses its already existing hardware (e.g., existing POS PC, mini-PC) or acquires its own compatible equipment.
  - OpenBar may provide advisory guides and hardware recommendations (such as Raspberry Pi 5 or mini-PC specifications, compatible ESC/POS receipt printers, and Concert IP payment terminals), but assumes zero liability or warranty for physical hardware acquisition, defects, or maintenance.

### Option B: Cloud Hosting in France (Sovereign Managed Cluster)
- The establishment accesses OpenBar as a managed cloud service hosted in France (e.g., OVHcloud, Scaleway, or French sovereign datacenters).
- **Strict Multi-Tenant Separation & Isolation**:
  - The cloud architecture guarantees strict, airtight logical and data separation between distinct bars and establishments.
  - Each establishment benefits from dedicated, isolated databases (`Database-per-Tenant`), isolated container/pod namespaces, dedicated persistent volumes, and isolated network policies preventing any cross-tenant data leakage or resource starvation.

---

## 3. Scope & Permitted Usage

1. **Proprietary & Private**: OpenBar is private proprietary software. Access is restricted to paying subscribers.
2. **Single Establishment License**: Unless an enterprise multi-establishment subscription is specifically contracted, each subscription covers exactly one (1) physical commercial establishment.
3. **No Resale or Sub-Licensing**: Reselling, sub-licensing, reverse-engineering, or redistributing the software to third parties is strictly prohibited.

---

## 4. Fiscal, Accounting & Regulatory Compliance

1. **Operator's Sole Responsibility**: The establishment owner/operator is solely responsible for ensuring that its accounting methods, tax declarations, and cash register operations comply with applicable national and local laws.
2. **French Fiscal Provisions (CGI Article 286 I-3° bis & NF525 Standards)**:
   - OpenBar embeds technical primitives designed to support compliance (inalterable sequential invoice numbering `FAC-YYYY-NNNNN`, cryptographic SHA-256 daily Z-report sealing, and French FEC fiscal export tools).
   - The operator remains responsible for validating that its operational setup complies with statutory criteria.
3. **Audit Trail & Archives**: The operator is responsible for performing periodic backup exports, closing daily cash registers, and retaining records as required by tax authorities.

---

## 5. Data Privacy & GDPR / RGPD Governance

1. **Self-Hosted Mode**:
   - In On-Premise mode, all data resides strictly within the establishment's local hardware. Zero external telemetry or client data is transmitted to OpenBar or third-party cloud servers.
2. **Cloud Mode (Hosted in France)**:
   - Data is stored in French datacenters under strict European GDPR / RGPD compliance (Regulation (EU) 2016/679).
   - Data is never transferred outside the European Union.
3. **Data Controller Status**:
   - The establishment is the **Data Controller** regarding customer names, orders, table allocations, and employee credentials.
   - OpenBar operates strictly as a software provider or Data Processor (in Cloud mode).

---

## 6. Disclaimer of Warranty & Limitation of Liability

1. **Software "AS IS"**: The software and documentation are provided "AS IS" and "AS AVAILABLE" without warranties of uninterrupted uptime or error-free network conditions.
2. **Hardware & Local Network**: OpenBar is not liable for Wi-Fi dead zones, power outages, terminal breakdowns, or failure of customer-supplied hardware.
3. **Data Safeguards**: In Self-Hosted mode, the customer is solely responsible for running periodic database backups (`pg_dump`). In Cloud mode, automated daily snapshot backups are executed pursuant to the active service level.

---

## 7. Governing Law

These Terms are governed by the laws of France. Any disputes shall be subject to the exclusive jurisdiction of the competent courts of France.

For commercial subscription inquiries or assistance:
- **Author & Founder**: Mathéo Gevraise ([@FunWarry](https://github.com/FunWarry))
- **OpenBar Commercial Administration**: via private repository administration
