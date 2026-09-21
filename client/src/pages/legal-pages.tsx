import { Link } from "wouter";
import { ShieldCheck, FileText } from "lucide-react";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
  icon,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
  icon: "privacy" | "terms";
}) {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-slate-900 px-6 py-10 text-white sm:px-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
              {icon === "privacy" ? <ShieldCheck className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-slate-300">Last updated: {updatedAt}</p>
          </header>

          <main className="space-y-8 px-6 py-8 text-slate-700 sm:px-10 sm:py-10">
            <p className="text-base leading-7">{intro}</p>

            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="leading-7">
                    {paragraph}
                  </p>
                ))}
                {section.items && (
                  <ul className="list-disc space-y-2 ps-6 leading-7">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <div className="border-t border-slate-200 pt-6 text-sm text-slate-600">
              Questions about this document?{" "}
              <Link href="/contact">
                <span className="cursor-pointer font-medium text-emerald-700 hover:underline">Contact Momtazchem</span>
              </Link>
              .
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="September 21, 2026"
      icon="privacy"
      intro="Momtazchem respects your privacy. This policy explains what information we collect through our website and services, why we use it, and the choices available to you."
      sections={[
        {
          title: "1. Information we collect",
          items: [
            "Account and identity information, such as your name, email address, phone number, and login details.",
            "Order and delivery information, including products ordered, billing details, delivery address, and order history.",
            "Business information you provide when registering or communicating as a customer, vendor, or company representative.",
            "Payment status and transaction references. Payment providers may process payment credentials directly; we do not need to store complete card credentials.",
            "Messages, inquiries, support requests, reviews, and other content you submit.",
            "Technical information such as IP address, browser type, device information, cookies, and website activity.",
          ]
        },
        {
          title: "2. How we use information",
          items: [
            "Provide accounts, process orders and payments, arrange delivery, and provide customer support.",
            "Communicate order updates, security notices, service messages, and responses to your requests.",
            "Maintain inventory, prevent fraud and misuse, secure the website, and comply with legal obligations.",
            "Improve our products, website, customer experience, and business operations.",
            "Send marketing communications where permitted and according to your communication preferences.",
          ]
        },
        {
          title: "3. Cookies and similar technologies",
          paragraphs: [
            "We may use essential cookies to keep you signed in, remember preferences, protect sessions, and operate shopping features. We may also use analytics technologies to understand website performance. You can control non-essential cookies through your browser settings, although disabling some cookies may affect website functions."
          ]
        },
        {
          title: "4. How information is shared",
          paragraphs: [
            "We may share information with service providers that help us operate the website, process payments, deliver orders, host data, send communications, or prevent fraud. We may also disclose information when required by law, to protect users and our services, or as part of a legitimate business transfer. We do not sell personal information for money."
          ]
        },
        {
          title: "5. Data retention and security",
          paragraphs: [
            "We retain information for as long as needed to provide services, maintain business and transaction records, resolve disputes, enforce agreements, and meet legal requirements. We apply reasonable administrative, technical, and organizational safeguards, but no online system can guarantee absolute security."
          ]
        },
        {
          title: "6. Your choices and rights",
          paragraphs: [
            "Depending on applicable law, you may request access to, correction of, or deletion of your personal information, or object to certain processing. Some transaction records may need to be retained for legal, accounting, security, or fraud-prevention purposes. You may also unsubscribe from optional marketing messages."
          ]
        },
        {
          title: "7. International processing",
          paragraphs: [
            "Our providers and business operations may process information in countries other than your own. Where required, we use appropriate measures to protect information transferred internationally."
          ]
        },
        {
          title: "8. Children",
          paragraphs: [
            "Our commercial services are not directed to children who are not legally able to enter into a purchase agreement. We do not knowingly collect personal information from children in violation of applicable law."
          ]
        },
        {
          title: "9. Changes to this policy",
          paragraphs: [
            "We may update this policy as our services or legal obligations change. The updated date at the top of this page indicates the latest revision."
          ]
        },
      ]}
    />
  );
}

export function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt="September 21, 2026"
      icon="terms"
      intro="These Terms of Service govern your access to and use of the Momtazchem website, accounts, shopping services, and related features. By using the services, you agree to these terms."
      sections={[
        {
          title: "1. Eligibility and accounts",
          paragraphs: [
            "You must have legal capacity to enter into an agreement and provide accurate, current information. You are responsible for protecting your account credentials and for activity performed through your account. Notify us promptly if you believe your account has been compromised."
          ]
        },
        {
          title: "2. Products and availability",
          paragraphs: [
            "We try to present product descriptions, images, specifications, prices, and availability accurately. Actual packaging or appearance may vary, and availability may change without notice. Product information is not a substitute for required technical, safety, or professional guidance."
          ]
        },
        {
          title: "3. Orders and acceptance",
          paragraphs: [
            "Submitting an order is an offer to purchase. An order is accepted only when we confirm it for processing or shipment. We may reject or cancel an order because of availability, pricing or description errors, payment issues, suspected fraud, legal restrictions, delivery limitations, or other legitimate operational reasons. If payment has been collected for a cancelled order, the applicable refund process will be initiated."
          ]
        },
        {
          title: "4. Prices, payments, and invoices",
          paragraphs: [
            "Prices, currencies, taxes, delivery costs, discounts, and payment options shown during checkout apply to the order, subject to correction of clear errors. You authorize the selected payment provider or wallet service to process the applicable amount. Proforma documents are not final tax invoices unless converted or identified as such."
          ]
        },
        {
          title: "5. Delivery, returns, and refunds",
          paragraphs: [
            "Delivery dates are estimates unless expressly guaranteed. You must provide accurate delivery and contact details and inspect deliveries within a reasonable time. Returns, replacements, and refunds depend on product condition, product type, safety requirements, applicable law, and the return terms communicated for the order."
          ]
        },
        {
          title: "6. Acceptable use",
          items: [
            "Do not use the services unlawfully, fraudulently, or to infringe the rights of others.",
            "Do not interfere with website security, availability, accounts, data, or technical infrastructure.",
            "Do not submit false information, impersonate another person or organization, or attempt unauthorized access.",
            "Do not copy, scrape, reverse engineer, or commercially exploit website content except where permitted by law or written authorization.",
          ]
        },
        {
          title: "7. Intellectual property",
          paragraphs: [
            "The website, branding, software, text, graphics, product presentation, and other content are owned by Momtazchem or its licensors and are protected by applicable intellectual-property laws. These terms grant only a limited right to use the services for their intended purpose."
          ]
        },
        {
          title: "8. Third-party services",
          paragraphs: [
            "Payment, delivery, communication, and other third-party services may be subject to their own terms and privacy practices. We are not responsible for third-party services outside our control."
          ]
        },
        {
          title: "9. Disclaimers and limitation of liability",
          paragraphs: [
            "To the extent permitted by law, services are provided on an “as available” basis. We do not exclude responsibilities that cannot legally be excluded. For other claims, Momtazchem is not liable for indirect, incidental, or consequential losses arising from use of the services, and any liability is limited to the amount paid for the transaction giving rise to the claim."
          ]
        },
        {
          title: "10. Suspension and termination",
          paragraphs: [
            "We may restrict or terminate access when reasonably necessary to protect users, comply with law, prevent fraud or abuse, enforce these terms, or protect service integrity. Provisions that by their nature should continue after termination will remain effective."
          ]
        },
        {
          title: "11. Changes and disputes",
          paragraphs: [
            "We may update these terms when services or legal requirements change. Updated terms apply from the date posted. Before starting formal proceedings, please contact us so we can try to resolve the issue. Mandatory rights and dispute rules under applicable law remain unaffected."
          ]
        },
      ]}
    />
  );
}