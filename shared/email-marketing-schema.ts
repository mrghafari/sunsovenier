import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const marketingSubscribers = pgTable("marketing_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  audience: text("audience").notNull().default("prospect"),
  source: text("source").notNull().default("admin"),
  customerId: integer("customer_id"),
  consent: boolean("consent").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("active"),
  consentAt: timestamp("consent_at"),
  consentSource: text("consent_source"),
  verificationTokenHash: text("verification_token_hash"),
  verificationExpiresAt: timestamp("verification_expires_at"),
  unsubscribeTokenHash: text("unsubscribe_token_hash"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, table => ({
  emailAudienceUnique: uniqueIndex("marketing_subscribers_email_audience_idx").on(table.email, table.audience),
}));

export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  audience: text("audience").notNull().default("all"),
  status: text("status").notNull().default("draft"),
  createdBy: integer("created_by"),
  queuedAt: timestamp("queued_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const marketingSuppressions = pgTable("marketing_suppressions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  reason: text("reason").notNull().default("unsubscribe"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => ({
  emailUnique: uniqueIndex("marketing_suppressions_email_idx").on(table.email),
}));

export const marketingCampaignRecipients = pgTable("marketing_campaign_recipients", {
  id: serial("id").primaryKey(),
  // Customer IDs are cross-database and intentionally have no FK.
  campaignId: integer("campaign_id").notNull().references(() => marketingCampaigns.id, { onDelete: "cascade" }),
  subscriberId: integer("subscriber_id").references(() => marketingSubscribers.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  normalizedEmail: text("normalized_email").notNull(),
  audience: text("audience").notNull(),
  name: text("name"),
  unsubscribeUrl: text("unsubscribe_url").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  claimedAt: timestamp("claimed_at"),
  nextAttemptAt: timestamp("next_attempt_at"),
  deliveryUnknown: boolean("delivery_unknown").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, table => ({
  campaignEmailUnique: uniqueIndex("marketing_campaign_recipient_email_idx").on(table.campaignId, table.normalizedEmail),
}));

export const insertMarketingSubscriberSchema = createInsertSchema(marketingSubscribers).omit({
  id: true, createdAt: true, updatedAt: true, verificationTokenHash: true,
  verificationExpiresAt: true, unsubscribeTokenHash: true, unsubscribedAt: true,
});
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true, createdAt: true, updatedAt: true, queuedAt: true, startedAt: true, completedAt: true,
});
export const insertMarketingCampaignRecipientSchema = createInsertSchema(marketingCampaignRecipients).omit({
  id: true, createdAt: true, claimedAt: true, sentAt: true,
});

export type MarketingSubscriber = typeof marketingSubscribers.$inferSelect;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type MarketingCampaignRecipient = typeof marketingCampaignRecipients.$inferSelect;