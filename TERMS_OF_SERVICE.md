# OpenBar — Terms of Service & Legal Notices (Conditions Générales d'Utilisation)

*Last updated: September 2026*

Welcome to **OpenBar**, an offline-first point-of-sale (POS) and bar management progressive web application developed by Mathéo Gevraise (FunWarry).

By deploying, installing, running, configuring, or interacting with the OpenBar application (including via client QR code ordering, server handhelds, or manager dashboards), you agree to be bound by these Terms of Service ("Terms").

---

## 1. Scope & Purpose

OpenBar is an autonomous software solution designed to facilitate table orders, kitchen/bar order preparation, inventory tracking, bill splitting, and manager statistics on a local area network (LAN).

These Terms govern the terms of access, liability, fiscal accountability, and privacy when operating OpenBar.

---

## 2. Licensing & Permitted Usage

1. **Non-Commercial Evaluation**: Use of OpenBar is permitted free of charge exclusively for personal testing, educational research, evaluation, and non-profit volunteer associations pursuant to the [LICENSE.md](LICENSE.md).
2. **Commercial Operation License**: Any deployment in a commercial venue (for-profit bar, pub, restaurant, club, festival, catering service, or point of sale) requires a valid, executed **Commercial License** from the author (Mathéo Gevraise).
3. **No Resale or Sublicensing**: Redistribution as a managed cloud service (SaaS) or resale to third parties without prior written consent from the author is strictly prohibited.

---

## 3. Disclaimer of Warranty ("AS IS")

THE OPENBAR SOFTWARE AND ASSOCIATED DOCUMENTATION ARE PROVIDED STRICTLY ON AN **"AS IS"** AND **"AS AVAILABLE"** BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OPERATIONAL UPTIME, DATA ACCURACY, OR CONTINUOUS AVAILABILITY.

The author does not warrant that:
- The software will meet your specific business or operational requirements.
- The operation will be uninterrupted, error-free, or free of network latency.
- Deficiencies or bugs will be corrected immediately unless covered by a dedicated commercial SLA agreement.

---

## 4. Limitation of Liability

TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:

1. **Operational and Financial Risks**: Under no circumstances shall the author, contributors, or copyright holders be held liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:
   - Cash register or drawer discrepancies, errors in bill calculation or item discounts.
   - Loss of revenue, business interruption, customer disputes, or goodwill loss.
   - Food or beverage spoilage related to inventory alerts or stock discrepancies.
   - Transaction failures resulting from local Wi-Fi disruptions, power outages, device failure, or browser incompatibility.
2. **Data Loss**: You are solely responsible for regular database backups (`pg_dump`), system snapshots, and disaster recovery procedures. The author shall not be liable for any loss of orders, receipts, logs, or establishment settings.

---

## 5. Fiscal, Accounting & Regulatory Compliance

1. **Operator's Sole Responsibility**: The operator/establishment owner is solely responsible for ensuring that its point-of-sale systems, accounting methods, and billing practices comply with all local, national, and international tax and legal regulations in its jurisdiction.
2. **French Fiscal Provisions (CGI Article 286 I-3° bis & NF525 Standards)**:
   - In jurisdictions requiring certified inalterability, security, storage, and archiving of cash register systems (such as France under Article 286, I-3° bis of the *Code Général des Impôts*):
   - OpenBar provides architectural primitives (e.g., inalterable audit logs, sequential invoice numbering, daily Z-report closures, and FEC fiscal export tools), but **the operator is strictly responsible** for validating that their operational setup satisfies all applicable statutory certification and recordkeeping criteria.
   - OpenBar does not inherently substitute for a formal individual certification certificate unless a dedicated compliance audit or certified commercial deployment has been contracted.
3. **Audit Trail & Archives**: The operator must establish periodic audit archiving, secure daily Z-closures, and maintain accounting books compliant with tax authority requests.

---

## 6. Data Privacy & GDPR / RGPD Governance

1. **100% Local & Self-Hosted Architecture**:
   - OpenBar operates exclusively within your local private network (LAN/WLAN) on hardware you control (e.g., Raspberry Pi 5 or on-premise server).
   - **Zero External Telemetry**: The application does NOT transmit telemetry, analytics, client orders, payment data, or employee records to external cloud servers, the author, or third parties.
2. **Data Controller Status (Responsable de Traitement)**:
   - The operator/establishment owner is the **sole Data Controller** under the European General Data Protection Regulation (GDPR / RGPD Regulation (EU) 2016/679) and applicable data privacy statutes.
   - The operator is responsible for:
     - Informing patrons ordering via QR code of any data collected (e.g., customer name or table alias, if applicable).
     - Managing employee login credentials, PINs, and access rights.
     - Enforcing local network encryption (WPA3/WPA2, HTTPS/TLS if configured) and physical device security.
     - Executing data retention and erasure policies in accordance with legal obligations.

---

## 7. Modifications & Inquiries

The author reserves the right to amend these Terms. Continued use of OpenBar following publication of updated terms signifies acceptance of the revised Terms.

For commercial licensing, compliance assistance, or partnership inquiries:
- **Author**: Mathéo Gevraise (FunWarry)
- **Repository**: [https://github.com/FunWarry/Open-Bar](https://github.com/FunWarry/Open-Bar)
