// FILE PATH: lib/legal-content.ts
// REPLACED 2026-09-11, English pass: Angelina uploaded three lawyer-approved
// documents (SENSORA_FINAL_LEGAL_PACK_UA_11-09-2026.docx,
// SENSORA_FINAL_Privacy_UA_11-09-2026.docx,
// SENSORA_FINAL_Terms_UA_11-09-2026.docx), which were Ukrainian-only and
// transcribed verbatim into this file first. She then asked for this to be
// in English instead, since the site's audience (Terms 1.5: United States
// and Canada) and the rest of the app's UI are English.
//
// IMPORTANT: the text below is MY translation of the lawyer-approved
// Ukrainian original, not a second lawyer-reviewed English text. Every
// clause, number, name and cross-reference is translated 1:1 against the
// Ukrainian source (same section numbering, same facts, nothing added or
// dropped) — but a translation can still shift legal nuance in ways a
// lawyer reading only the English would want to check. If Angelina's lawyer
// wants to review this English version specifically before it's treated as
// equally authoritative to the Ukrainian original, that review is still
// outstanding — flagging this rather than presenting my translation as
// itself lawyer-approved.
export const PRIVACY_POLICY_VERSION = '2026-09-11'
export const PRIVACY_POLICY_UPDATED = 'September 11, 2026'
export const TERMS_OF_USE_UPDATED = 'September 11, 2026'
export const COOKIE_POLICY_VERSION = '2026-09-11'
export const COOKIE_POLICY_UPDATED = 'September 11, 2026'
export const REFUND_POLICY_UPDATED = 'September 11, 2026'

export const SUPPORT_EMAIL = 'sensorsoffical@gmail.com'

// Real registered-entity details, verified against bank reference documents,
// and matching (character-for-character on KRS/NIP/REGON/address) what the
// final lawyer-approved legal pack itself states in Terms 1.2, Privacy 1.1
// and Cookie Policy 1.1.
export const BUSINESS_LEGAL_NAME = 'ALTAIR SOLUTIONS SP. Z O.O.'
export const BUSINESS_TAX_ID_LABEL = 'NIP/VAT ID: PL9522217938 · REGON: 389278509 · KRS: 0000907518'
export const BUSINESS_ADDRESS = 'Ul. Ostrobramska 101, 04-041 Warszawa, Poland'

export interface LegalSection {
  heading: string
  body: string[]
}

// The final lawyer-approved Cookie Policy table (Section 3) uses Name /
// Type / Purpose / Duration / Note — no separate category classification
// like the old drafting-stage badge system (Strictly Necessary / Functional
// / Analytics) had.
export interface CookieTableEntry {
  name: string
  type: string
  purpose: string
  duration: string
  note: string
}

export const TERMS_OF_USE_SECTIONS: LegalSection[] = [
  {
    heading: "1. Operator and Scope",
    body: [
      "1.1. SENSORA is a digital platform available via sensora.space and, upon official release, through related SENSORA applications. These Terms govern account creation, free features, paid text chat with a Mentor, the internal balance, and personalized content.",
      `1.2. The operator of SENSORA and the contracting party with the user is Altair Solutions Sp. z o.o., registered in Poland at Ul. Ostrobramska 101, 04-041 Warszawa, Poland. KRS: 0000907518. NIP: PL9522217938. REGON: 389278509. Contact for support, complaints, and data-related inquiries: ${SUPPORT_EMAIL}.`,
      "1.3. A user is a natural person using SENSORA for personal purposes. Commercial resale of access or content without the Operator's permission is not permitted.",
      "1.4. A specific purchase is governed by these Terms and by the information shown to the user before payment is confirmed: product name, price, volume, term, or other material parameters. Mandatory consumer rights are not limited by these Terms.",
      "1.5. SENSORA is oriented toward users in the United States and Canada, excluding the province of Quebec, but certain features may be unavailable in specific jurisdictions. The Operator may restrict sales or functionality where required by law or by the rules of payment or platform partners.",
    ],
  },
  {
    heading: "2. Terms and Nature of the Services",
    body: [
      "2.1. A “Mentor” is a real person whom the user chooses for personalized communication in the areas of Tarot, astrology, numerology, spiritual practices, and self-discovery. A Mentor's profile may use a pseudonym; the profile photo depicts a real person.",
      "2.2. Mentors provide personalized interpretations, explanations, and recommendations within the stated esoteric field. This is not a claim to the status of a physician, psychologist, psychotherapist, attorney, financial advisor, or other regulated professional.",
      "2.3. A “minute package” is a one-time purchase of a volume of paid chat. A “paid session” is an open chat billed per second. “Promotional access” means a one-time 180 seconds of free chat. “Personalized video” is a separately paid Tarot video spread created by a Mentor.",
      "2.4. Providing the service does not guarantee the truth of a prediction or the occurrence of any specific life outcome. The result of an interpretation is personalized but remains subjective by nature.",
    ],
  },
  {
    heading: "3. Acceptance of the Terms and Purchases",
    body: [
      "3.1. By creating an account or otherwise confirming acceptance of the Terms, the user agrees to this version. Before a paid purchase, the user is shown its price and main conditions.",
      "3.2. SENSORA does not use a subscription, automatic renewal of packages, or automatic top-up. Each new package or personalized video is purchased by a separate user action.",
      "3.3. Using an already-purchased balance in an active chat is not a new charge to a bank card. The order of such use is set out in Sections 9–13.",
      "3.4. Agreeing to these Terms is not consent to marketing use of private correspondence, photos, or other personal materials.",
    ],
  },
  {
    heading: "4. Age, Account, and Security",
    body: [
      "4.1. SENSORA is intended only for persons aged 18 and over. By creating an account, the user represents that they are at least 18 years old and have the right to enter into this agreement under the law applicable to them.",
      "4.2. The user is responsible for keeping access to their account secure and must notify support of any suspected unauthorized access.",
      "4.3. In case of signs of fraud, circumvention of promotional-access rules, account takeover, or another material violation, the Operator may temporarily restrict the relevant features and conduct a proportionate review.",
    ],
  },
  {
    heading: "5. Personalized Esoteric Consultations and Limits on Outcome",
    body: [
      "5.1. SENSORA enables users to receive specific, personalized answers, interpretations, and recommendations in the fields of Tarot, astrology, numerology, and related practices. Mentors may take into account facts and circumstances the user voluntarily shares in chat.",
      "5.2. Such interpretations are not a scientific determination of facts and do not guarantee an accurate prediction of future events, the behavior of third parties, or any specific outcome.",
      "5.3. The Operator and Mentors do not guarantee the return of a partner, marriage, pregnancy, recovery, employment, income, winning a dispute, or any other defined outcome. A prediction not coming true does not, by itself, mean the service was provided improperly.",
      "5.4. The user makes their own life decisions and should verify material facts through appropriate, reliable sources.",
    ],
  },
  {
    heading: "6. Medical and Psychological Limits",
    body: [
      "6.1. SENSORA does not provide medical care, diagnosis, treatment, psychotherapy, psychiatric care, or crisis assistance. Everyday support in chat does not create a professional therapeutic relationship.",
      "6.2. A Mentor must not make a diagnosis, prescribe or change treatment, advise stopping prescribed medication, or present an esoteric interpretation as a substitute for medical care.",
      "6.3. In the event of an immediate threat to life, self-harm, violence, or an acute condition, the user should contact their local emergency or crisis service. SENSORA is not an emergency service and does not guarantee an immediate response.",
    ],
  },
  {
    heading: "7. Legal, Financial, and Other Regulated Services",
    body: [
      "7.1. SENSORA does not provide individualized legal opinions, representation, investment or tax advice, medical care, or other regulated professional services.",
      "7.2. The user should not rely on an esoteric prediction as the sole basis for legal proceedings, medical treatment, investments, loans, bets, buying or selling assets, or other decisions with material legal, medical, or financial consequences.",
      "7.3. Interaction on SENSORA does not create an attorney–client, physician–patient, psychotherapist–client, or investment advisor–client relationship.",
    ],
  },
  {
    heading: "8. Mentors and Rules of Interaction",
    body: [
      "8.1. The user chooses which available Mentor to consult. Typical response time is approximately 1–60 seconds; for a more detailed answer it may take up to 90 seconds.",
      "8.2. The service is sold to the user by the Operator. A Mentor works within SENSORA and must not request personal payment outside the official payment mechanism.",
      "8.3. A Mentor may work with other private chats at the same time. Each conversation remains separate; working in parallel does not give other users access to your conversation.",
      "8.4. A real person responds in chat under a Mentor's profile. The separate palm-reading feature uses the Anthropic Claude API and is labeled as an AI feature.",
      "8.5. It is prohibited to frighten a user with an invented danger to encourage payment, to deliberately prolong a paid chat, to create a simulated romantic attachment, or to request credits, gifts, passwords, verification codes, or full card details.",
      `8.6. Complaints about a Mentor's conduct can be sent to ${SUPPORT_EMAIL}. The SENSORA team may restrict or block a Mentor's account for violating internal rules.`,
    ],
  },
  {
    heading: "9. Free Features and the 3 Free Minutes",
    body: [
      "9.1. The following may be available without payment: daily, weekly, and monthly horoscopes; a natal chart; self-guided Tarot spreads; numerology features; mood tracking; and compatibility checks with friends. The set of free features may change for future use.",
      "9.2. A new user is offered one free introductory live-chat period of 180 seconds. It is granted once per account, contact details, and device; a payment card is not required to receive these 3 minutes.",
      "9.3. During the promotional period, the interface shows a countdown. If, after 180 seconds, there is a paid balance on the account, that same chat automatically switches to paid mode at a rate of 2.00 USD per minute, billed per second. The user must be shown this automatic-switch rule before the chat begins. If there is no available balance, no paid charge occurs.",
      "9.4. Promotional access does not create a subscription, debt, recurring payment, or authorization for automatic top-up.",
    ],
  },
  {
    heading: "10. Minute Packages and Pricing",
    body: [
      "10.1. All SENSORA prices are displayed and charged in US dollars (USD). The exact list of live-chat packages, base minutes, and bonus minutes is shown in the table below and on the purchase page before payment.",
      "10.2. Paid and bonus minutes, once credited, are tracked in a single combined balance and are not technically separated. An unused balance has no set calendar expiration as long as the account is active and SENSORA continues to offer the relevant feature.",
      "10.3. The amount shown to the user on the payment page is the amount SENSORA charges for the purchase. No separate tax is added at the current checkout. If a card is issued in a different currency, the conversion, exchange rate, and any bank fees are determined by the user's bank.",
      "10.4. Having previously used a card does not permit SENSORA to purchase a package again on the user's behalf. There is no auto-renewal.",
    ],
  },
  {
    heading: "11. No Subscription",
    body: [
      "11.1. SENSORA does not use a subscription model. Minute packages and personalized video are one-time purchases.",
      "11.2. A future price change applies to new purchases and does not create new charges retroactively.",
    ],
  },
  {
    heading: "12. Balance, Ending a Chat, and Account Deletion",
    body: [
      "12.1. The user can see their current balance and transaction history in the available interface. The balance is used only for SENSORA's services and is not a bank account.",
      "12.2. The user may end a chat at any time. A Mentor may also indicate that they are ending the interaction; once a specific session ends, no new charges accrue for it.",
      "12.3. When the balance is exhausted, the server does not allow a negative balance: the session ends without creating a debt. A push warning may be sent approximately 60 seconds before the balance is projected to run out, if notifications are enabled and technically available.",
      "12.4. Account deletion is a separate feature in SENSORA. After confirmed deletion, the wallet and any unused balance are deleted along with the account, and no automatic monetary refund is issued. This does not cancel a refund already approved, or another refund right that cannot be excluded under applicable law. Before deleting an account, the user is advised to resolve any open payment disputes.",
    ],
  },
  {
    heading: "13. Live Chat Billing",
    body: [
      "13.1. The base rate for live chat is 2.00 USD per minute for all Mentors. Timing and charging occur per second, without rounding each started minute up.",
      "13.2. The entire time an active paid session is open is charged, including time spent waiting for a Mentor's reply and any inactivity by the user. There is no automatic pause while a Mentor is preparing a reply.",
      "13.3. If the last message is from the user and the Mentor does not respond within 90 seconds, the session closes automatically and further charges stop. Amounts charged before the automatic closure are not refunded automatically; the user may submit a refund request under Section 15.",
      "13.4. A page or web app moving to the background does not, by itself, end a paid session. If the code continues running in the background, charging may continue. To stop being charged, the user should end the chat in the relevant interface.",
      "13.5. If a charge request fails to go through due to loss of internet connection or server unavailability, no amount is charged for that second and none is charged retroactively. If the connection is not restored within 60 consecutive seconds, the server ends the session as interrupted.",
      "13.6. Once the balance is exhausted, the user must separately purchase a new package to continue. There is no auto-renewal.",
    ],
  },
  {
    heading: "14. Personalized Tarot Video",
    body: [
      "14.1. A personalized Tarot video costs 50.00 USD. The typical length of the finished video is 2–5 minutes, and the typical turnaround time is 1–3 days.",
      "14.2. The video is created by a Mentor based on the topic and information provided by the user. The finished file is delivered directly into the private conversation with the relevant Mentor.",
      "14.3. No separate expiration date is set for the finished video: it remains available in the chat as long as the account exists and SENSORA continues to support the feature. There is currently no separate function to download the video to a device.",
      "14.4. There is currently no separate cancel button or free edit for a video order. If the video is not delivered, has a technical defect, or materially does not match the agreed order, the user may contact support. Mandatory rights granted by applicable law are preserved.",
    ],
  },
  {
    heading: "15. Refunds and Payment Disputes",
    body: [
      `15.1. A request for a refund, an erroneous charge, or another payment dispute is submitted to ${SUPPORT_EMAIL}. Verification may require account details, the transaction date, and a brief description of the issue.`,
      "15.2. If a chat closed automatically because a Mentor did not respond within 90 seconds, further charging stops. Amounts already charged are not refunded automatically, but the user may submit a refund request; a decision is made after reviewing the session log and circumstances.",
      "15.3. Payment inquiries are handled by the Head of Operations and Customer Management or another person authorized by the Operator. The typical actual timeframe for reviewing a dispute and initiating a refund is approximately 1–2 weeks, unless a shorter period is required by applicable law.",
      "15.4. Confirmed duplicate or erroneous charges are subject to correction. Subjective disagreement with an esoteric interpretation, or a prediction not coming true where the service was properly provided, does not by itself create a right to a refund.",
      "15.5. If a refund is approved for a payment made via Stripe, the Operator initiates it to the same payment method used for the payment, unless otherwise required by law or objectively impossible. The time for the refund to actually post depends on the bank and payment system.",
      "15.6. A good-faith claim or chargeback is not, by itself, grounds for a penalty. In case of signs of fraud, the Operator may temporarily restrict new paid transactions while it reviews the matter.",
    ],
  },
  {
    heading: "16. Personal Data and Privacy",
    body: [
      `16.1. SENSORA's separate Privacy Policy describes the categories of data, purposes of processing, providers, international transfers, retention periods, and user rights. Contact for data matters: ${SUPPORT_EMAIL}.`,
      "16.2. Private chats are not public. They are accessible to the relevant Mentor and authorized SENSORA staff to the extent necessary to provide the service, support, handle complaints, and ensure quality control.",
      "16.3. SENSORA does not use private chats to train artificial intelligence models. The separate AI palm-reading feature sends a photo to Anthropic to process that specific request.",
      "16.4. Private chats, photos, stories, and other personal materials are not used in advertising or public case studies without the user's separate, voluntary consent.",
    ],
  },
  {
    heading: "17. Intellectual Property",
    body: [
      "17.1. Rights to SENSORA's software, brand, design, and materials belong to the Operator and/or other rights holders who have granted the right to use them.",
      "17.2. The user receives a personal, non-exclusive, non-transferable right to use SENSORA and the materials received for personal, non-commercial purposes. Payment for personalized material does not transfer exclusive proprietary rights.",
      "17.3. The user retains rights to their own materials and grants SENSORA a limited right to technically store, transmit to a Mentor or provider, and otherwise process them only to the extent necessary for the requested feature, support, and lawful dispute resolution.",
    ],
  },
  {
    heading: "18. Prohibited Conduct",
    body: [
      "18.1. The following are prohibited: fraud, impersonating another person, threats, harassment, sexual exploitation, unlawful materials, unlawful disclosure of others' data, circumventing payment, using stolen payment instruments, and harmful technical interference.",
      "18.2. The user must not pressure a Mentor into giving prohibited professional advice or use SENSORA to organize unlawful acts. Good-faith criticism, disagreement, and complaints are not violations.",
    ],
  },
  {
    heading: "19. Restrictions and Account Termination",
    body: [
      "19.1. The Operator may restrict features or an account based on a reasonable indication of fraud, a security threat, a material or repeated breach of the Terms, failure to meet the age requirement, or a lawful demand from an authority.",
      `19.2. The user may request a review of a decision at ${SUPPORT_EMAIL}. Legal rights regarding services paid for but not provided are preserved.`,
    ],
  },
  {
    heading: "20. Availability and Third-Party Services",
    body: [
      "20.1. SENSORA does not guarantee absolute continuity of operation or compatibility with every device or browser. Planned and emergency technical work may temporarily limit access.",
      "20.2. The service relies, among others, on Vercel (hosting and web analytics), Supabase (database), Stripe (payments), and Anthropic (AI palm reading). The related data processing is described in the Privacy Policy.",
    ],
  },
  {
    heading: "21. Limits of Liability",
    body: [
      "21.1. The Operator is liable for its own breaches within the limits of applicable law. The absence of a contractual guarantee of the truth of esoteric interpretations does not release the Operator from liability for failing to provide a paid service, an erroneous charge, misleading advertising, or another breach for which it is liable by law.",
      "21.2. These Terms do not limit liability in cases where such a limitation is prohibited by applicable law, and do not override mandatory consumer rights or rights in the area of personal data.",
    ],
  },
  {
    heading: "22. Circumstances Beyond Reasonable Control",
    body: [
      "22.1. A party may be released from liability for a delay directly caused by an extraordinary circumstance beyond its reasonable control, within the limits of applicable law. Such a circumstance does not grant the right to indefinitely withhold payment for a service that will ultimately not be provided.",
    ],
  },
  {
    heading: "23. Changes to and Discontinuation of SENSORA",
    body: [
      "23.1. The Operator may amend these Terms for future use in connection with changes in law, security, technical compatibility, or features. Material changes do not create new charges retroactively.",
      "23.2. In the event of a planned final shutdown of SENSORA, the Operator will aim to notify users at least 30 days in advance. Unfulfilled paid orders and due refunds will be settled through support; approved refunds will be sent to the original payment method where technically possible.",
    ],
  },
  {
    heading: "24. Governing Law, Disputes, and Final Provisions",
    body: [
      "24.1. These Terms are governed by the law of Poland, without depriving the user of mandatory rights that apply to them regardless of this choice.",
      `24.2. Claims may be sent to ${SUPPORT_EMAIL}. Contacting support beforehand does not deprive the user of the right to contact their bank, a competent regulator, or a court.`,
      "24.3. Disputes are heard by the competent state courts under applicable jurisdictional rules. These Terms do not impose mandatory arbitration or a general waiver of the consumer's right to a class action.",
      "24.4. If a specific provision is invalid or unenforceable, the rest of the Terms remain in effect to the extent permitted by law.",
      "24.5. Effective date: September 11, 2026. The current public documents are: sensora.space/terms, sensora.space/privacy, sensora.space/cookies, and sensora.space/contacts.",
    ],
  },
]

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Who Controls Your Data",
    body: [
      "1.1. The controller/operator of SENSORA is Altair Solutions Sp. z o.o., Ul. Ostrobramska 101, 04-041 Warszawa, Poland. KRS: 0000907518. NIP: PL9522217938. REGON: 389278509.",
      `1.2. For questions about privacy, access, correction, or deletion of data, contact ${SUPPORT_EMAIL}.`,
      "1.3. This Policy applies to sensora.space and SENSORA's official features. As of this version, the service is available as a web application; future native versions may have additional technical mechanisms, which users will be informed about separately.",
      "1.4. The Operator has assessed that a formal Data Protection Officer is not currently required under Article 37 of the GDPR: SENSORA's core activity is not the large-scale, regular, and systematic monitoring of individuals, nor the large-scale processing of special categories of data. Sensitive information that appears in chat is shared voluntarily by the user in the course of an esoteric consultation the user requested, not collected as SENSORA's core activity. This position is reassessed if the scale or nature of processing materially changes. Data-related inquiries can still be sent to the contact in 1.2 at any time.",
    ],
  },
  {
    heading: "2. What Data We Process",
    body: [
      "Contact details used to sign in: email or phone number.",
      "Date of birth and data the user enters for personalized features.",
      "Mood history, personal readings, natal/numerology results, compatibility reports, and details about friends the user adds to the service.",
      "Private chat messages, complaints, support inquiries, and related session logs.",
      "Palm photos, if the user uses the AI palm-reading feature.",
      "Order and transaction data needed for payment, refunds, accounting, and dispute resolution.",
      "A random device identifier (device ID) used to prevent repeated claiming of the one-time 3 free minutes.",
      "A push token and notification settings, if the user allows push notifications.",
      "Technical data processed by the infrastructure: IP address, country/region, browser and device data, and network/server logs. SENSORA's core database has no dedicated field for storing an IP address, but Vercel receives it at the infrastructure level.",
    ],
  },
  {
    heading: "3. Why We Use Data",
    body: [
      "Purpose — Typical legal basis:",
      "Creating and maintaining an account; providing chat, free features, and personalized content — Performance of a contract / providing the feature the user requested.",
      "Payment, refunds, transaction accounting, and resolving payment disputes — Performance of a contract and legal/accounting obligations.",
      "Security, fraud prevention, and preventing repeated use of the free trial — Legitimate interest in protecting the service and users, where permitted by law.",
      "Support, complaints, and quality control — Performance of a contract and legitimate interest in the proper functioning of the service.",
      "Push notifications — User settings/consent and other applicable basis under applicable law.",
      "Web analytics and technical diagnostics — Legitimate interest in stability and understanding of service usage, where permitted by law.",
      "AI palm reading — Performance of the requested feature; separate consent or another specific basis, if required by applicable law.",
      "3.1. If a user voluntarily shares information about health, beliefs, intimate life, or other sensitive matters in chat, SENSORA processes it only to the extent necessary for the requested interaction and in accordance with applicable law. Users should not share excessive sensitive data if it is not needed for the chosen feature.",
    ],
  },
  {
    heading: "4. Who Can See or Receive Data",
    body: [
      "4.1. A private chat is accessible to the relevant Mentor and to authorized SENSORA administrators, consultants, and support staff, to the extent needed for their work: providing the service, support, handling complaints, security, and quality control.",
      "4.2. Mentors and part of the staff work mainly from Ukraine; some staff may work from Lithuania and other countries. Access is granted by role and only for work purposes.",
      "4.3. For its technical operations, SENSORA relies on the following main providers: Vercel — hosting of the web application and Vercel Web Analytics; Supabase — the database, with the confirmed location of the main database being Ireland, EU; Stripe — payment processing and related payment operations; Anthropic — AI processing of photos for the palm-reading feature.",
      "4.4. Data may also be disclosed to government authorities or other parties where required by law, a court order, or another proper legal basis.",
    ],
  },
  {
    heading: "5. AI, Palm Photos, and Private Chats",
    body: [
      "5.1. SENSORA does not use private chats to train artificial intelligence models and does not apply automated moderation to them as a standard feature of the service.",
      "5.2. AI palm reading is a separate feature. The photo is sent to the Anthropic Claude API for one-time processing of that specific request. SENSORA does not retain the uploaded palm photo as a separate user file after this processing is complete.",
      "5.3. Under Anthropic's standard commercial terms, API requests and responses are typically deleted on Anthropic's side within 30 days, except where longer retention is required for legal compliance or safety. For material flagged by safety systems as a potential violation, individual records may be retained longer. Commercial API data is not used by Anthropic to train models by default. SENSORA does not claim to operate under a Zero Data Retention regime.",
    ],
  },
  {
    heading: "6. Vercel Web Analytics and Technical Logs",
    body: [
      "6.1. Vercel Web Analytics is enabled in production. Under the confirmed configuration, it does not require third-party advertising cookies; to measure sessions, Vercel may create a technical identifier/hash based on the incoming request and store a session identifier for up to 24 hours.",
      "6.2. Independently of Web Analytics, Vercel, as the hosting provider, receives the IP address and may determine the country or region from it, and may process device characteristics and technical logs. SENSORA's core database does not store the IP address in a dedicated field.",
    ],
  },
  {
    heading: "7. Device ID and Preventing Repeated Free Trials",
    body: [
      "7.1. SENSORA generates a random UUID, sensora_device_id, in the browser and stores it in localStorage. When checking eligibility for the free introductory period, this ID is sent to SENSORA's server and recorded in Supabase in the free_trial_usage table together with a record of the free-trial use.",
      "7.2. The current system retains this anti-fraud record with no automatic deletion period, including after account deletion, so that deleting and re-registering an account does not create a new free trial period. The code does not use additional canvas, user-agent, or IP fingerprinting beyond this random UUID.",
    ],
  },
  {
    heading: "8. Retention Periods",
    body: [
      "Category — Current retention approach:",
      "Account, chats, mood history, friends, reports, and related content — for as long as the account is active; deleted during self-service account deletion under the current logic.",
      "Palm photos — SENSORA does not retain it as a separate file after one-time processing; Anthropic's provider-side retention periods, described above, apply there.",
      "Transaction/payment records — may be retained longer after account deletion for tax, accounting, refund, and legal purposes. Under the current logic, records may remain without a user_id, retaining the amount and date.",
      "Device ID / free_trial_usage — retained with no automatic deletion period to prevent repeated free trials, including after account deletion.",
      "Push subscription — deleted together with the account under the current logic.",
      "Vercel Web Analytics session identifier — up to 24 hours, per Vercel Web Analytics' current mechanism.",
      "8.1. SENSORA does not currently have a separate, regular database backup export configured at the application level. The project uses Supabase Free; this does not exclude the provider's own technical logs or service data.",
    ],
  },
  {
    heading: "9. Account Deletion, Export, and Withdrawing Consent",
    body: [
      "9.1. Account deletion is available to the user as a self-service feature and is carried out at the database level. Under the current logic it deletes the wallet, conversations, friends, mood history, compatibility reports, and push subscriptions; certain transactional and anti-fraud records may remain under the rules of this Policy.",
      `9.2. There is currently no automated export of all personal data or a separate toggle to withdraw each individual consent. Requests for access, export, correction, or deletion can be sent to ${SUPPORT_EMAIL}. Push notifications can be turned off through the available device/service settings.`,
    ],
  },
  {
    heading: "10. Marketing and Use of Personal Materials",
    body: [
      "10.1. The current application has no module that gives SENSORA the right to use private chats, photos, stories, or other personal materials in advertising. Such materials are not used for marketing based solely on acceptance of the Terms of Use or this Policy.",
      "10.2. If SENSORA introduces such use in the future, it will require a separate, optional opt-in explaining the material, the purpose, and the ability to withdraw consent going forward.",
    ],
  },
  {
    heading: "11. International Processing",
    body: [
      "11.1. The Operator is located in Poland; the main Supabase database is in Ireland. At the same time, Mentors and staff from Ukraine, Lithuania, and other countries may have access to data, and Vercel, Stripe, and Anthropic may process data in their own infrastructure regions.",
      "11.2. Where the law requires special safeguards for an international transfer, the Operator applies the appropriate legal mechanism and limits the transfer to what is necessary.",
    ],
  },
  {
    heading: "12. User Rights",
    body: [
      "12.1. Depending on where they live and the applicable law, a user may have the right to access their personal data, correct it, delete it, restrict its processing, object to processing, data portability, withdraw consent, and lodge a complaint with a competent authority.",
      "12.2. To fulfill a request, SENSORA may ask for information needed for a proportionate identity check. Withdrawing consent does not make processing carried out before the withdrawal unlawful.",
      "12.3. SENSORA does not sell private chats or other personal materials to advertisers and does not use them to train AI models.",
    ],
  },
  {
    heading: "13. Children, Security, and Changes to This Policy",
    body: [
      "13.1. SENSORA is intended for persons aged 18 and over. If we become aware of an account belonging to a person who does not meet the age requirement, access may be restricted, and the data processed or deleted in accordance with the law.",
      "13.2. SENSORA applies organizational and technical measures to protect data, but no online service can guarantee absolute security.",
      "13.3. This Policy may be updated in connection with changes to features, providers, or legislation. The current version is published at sensora.space/privacy.",
      `13.4. Contact: ${SUPPORT_EMAIL}. Related documents: sensora.space/terms, sensora.space/cookies, sensora.space/contacts.`,
    ],
  },
]

export const COOKIE_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: "1. Who Runs SENSORA",
    body: [
      `1.1. Operator: Altair Solutions Sp. z o.o., Ul. Ostrobramska 101, 04-041 Warszawa, Poland. KRS: 0000907518. NIP: PL9522217938. REGON: 389278509. Contact: ${SUPPORT_EMAIL}.`,
      "1.2. Related documents: sensora.space/privacy, sensora.space/terms, and sensora.space/contacts.",
    ],
  },
  {
    heading: "2. What Cookies and localStorage Are",
    body: [
      "2.1. Cookies are small pieces of data that a browser stores to run a session or for other technical purposes. localStorage is browser storage where a web application can save settings and technical identifiers between visits.",
      "2.2. The current web version of SENSORA uses functional cookies and localStorage. Vercel Web Analytics is also enabled in production.",
      "2.3. SENSORA does not show a cookie-consent banner with accept/reject options. This is because none of the storage described in this Policy is a non-essential advertising or third-party tracking cookie of the kind that, under the ePrivacy Directive and similar rules, requires prior opt-in consent: the cookies and localStorage entries listed in Section 3 are used to keep the user signed in, remember functional settings, or run first-party technical measurement, and are treated as strictly necessary or equivalent technical storage. A short notice is still shown to inform the user that such storage is used, together with a link to this Policy.",
    ],
  },
  {
    heading: "3. Cookies and Local Storage SENSORA Uses",
    body: [
      "The full list is in the table below on sensora.space/cookies: the exact name, type, purpose, retention period, and a note for each entry.",
    ],
  },
  {
    heading: "4. Device ID and the Server-Side Anti-Fraud Record",
    body: [
      "4.1. sensora_device_id is generated as a random UUID in localStorage. When checking eligibility for the one-time 3 free minutes, the browser sends it to /api/session/free-trial, after which it is recorded in Supabase in the free_trial_usage table.",
      "4.2. The server-side free_trial_usage record is kept with no automatic TTL and is not deleted together with the account. The purpose is to prevent repeated free trials by deleting and re-registering an account.",
      "4.3. The code, as reviewed, does not use additional canvas fingerprinting, user-agent hashing, or IP fingerprinting beyond this random UUID.",
    ],
  },
  {
    heading: "5. Vercel Web Analytics",
    body: [
      "5.1. Vercel Web Analytics is enabled in production. Under the current configuration it does not use third-party advertising cookies. Vercel may create a technical hash/session identifier based on the incoming request; that identifier is stored for up to 24 hours.",
      "5.2. Vercel, as the hosting provider, also sees the IP address, may determine the country/region, and may process technical logs, regardless of whether SENSORA stores the IP in its core database. See the Privacy Policy for more detail.",
    ],
  },
  {
    heading: "6. Managing Storage",
    body: [
      "6.1. The user can delete cookies and localStorage through their browser settings. This may sign the user out, reset their language/theme, or lose the local state of certain features.",
      "6.2. Deleting sensora_device_id from the browser alone does not delete the corresponding anti-fraud record in Supabase and does not guarantee the free trial will be granted again.",
    ],
  },
  {
    heading: "7. Mobile Applications",
    body: [
      "7.1. As of this version, SENSORA operates as a web application. If a native wrapper for iOS or Android is released in the future, this Cookie Policy will be updated if the mobile version uses additional SDKs, identifiers, or other storage mechanisms.",
    ],
  },
  {
    heading: "8. Updates and Contact",
    body: [
      "8.1. This policy may change along with SENSORA's technical features. The current version is published at sensora.space/cookies.",
      `8.2. Questions about cookies, localStorage, or privacy can be sent to ${SUPPORT_EMAIL}.`,
    ],
  },
]

export const REFUND_POLICY_SECTIONS: LegalSection[] = [
  {
    heading: "Refunds and Payment Disputes",
    body: [
      `A request for a refund, an erroneous charge, or another payment dispute is submitted to ${SUPPORT_EMAIL}. Verification may require account details, the transaction date, and a brief description of the issue.`,
      "If a chat closed automatically because a Mentor did not respond within 90 seconds, further charging stops. Amounts already charged are not refunded automatically, but the user may submit a refund request; a decision is made after reviewing the session log and circumstances.",
      "Payment inquiries are handled by the Head of Operations and Customer Management or another person authorized by the Operator. The typical actual timeframe for reviewing a dispute and initiating a refund is approximately 1–2 weeks, unless a shorter period is required by applicable law.",
      "Confirmed duplicate or erroneous charges are subject to correction. Subjective disagreement with an esoteric interpretation, or a prediction not coming true where the service was properly provided, does not by itself create a right to a refund.",
      "If a refund is approved for a payment made via Stripe, the Operator initiates it to the same payment method used for the payment, unless otherwise required by law or objectively impossible. The time for the refund to actually post depends on the bank and payment system.",
      "A good-faith claim or chargeback is not, by itself, grounds for a penalty. In case of signs of fraud, the Operator may temporarily restrict new paid transactions while it reviews the matter.",
    ],
  },
  {
    heading: "Full text",
    body: [
      "This is the same text as Section 15 of the Terms of Use. See the full Terms at sensora.space/terms.",
    ],
  },
]

export const COOKIE_TABLE: CookieTableEntry[] = [
  {
    name: "sensora_client_session",
    type: "Cookie",
    purpose: "Keeps the user signed in",
    duration: "Up to 30 days",
    note: "httpOnly; Secure; SameSite=Lax; host-only",
  },
  {
    name: "sensora_staff_session",
    type: "Cookie",
    purpose: "Session for authorized staff",
    duration: "Up to 12 hours",
    note: "httpOnly; Secure; SameSite=Lax; host-only",
  },
  {
    name: "sensora_device_id",
    type: "localStorage",
    purpose: "Random UUID to control one-time free-trial use",
    duration: "Stored in the browser until cleared/replaced",
    note: "Sent to the server when checking free-trial eligibility",
  },
  {
    name: "sensora_theme",
    type: "localStorage",
    purpose: "Remembers the chosen interface theme",
    duration: "Until cleared/changed",
    note: "Functional storage",
  },
  {
    name: "sensora_locale",
    type: "localStorage",
    purpose: "Remembers the chosen interface language/locale",
    duration: "Until cleared/changed",
    note: "Functional storage",
  },
  {
    name: "sensora_cookie_notice_ack",
    type: "localStorage",
    purpose: "Remembers that the user dismissed the cookie notice",
    duration: "Until cleared/changed",
    note: "Not an advertising tracker",
  },
]
