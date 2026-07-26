import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  integer,
  boolean,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const flavorCategoryEnum = pgEnum("flavor_category", [
  "cookie",
  "mini",
  "ncd",
  "classic",
  "other",
]);

export const sourceEnum = pgEnum("appearance_source", [
  "crumbl_official",
  "crumblmenu_us",
  "menucrumblcookies_com",
  "manual",
]);

export const flavors = pgTable(
  "flavors",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: flavorCategoryEnum("category").notNull().default("cookie"),
    imageUrl: text("image_url"),
    partnerBrand: text("partner_brand"),
    aliases: text("aliases").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("flavors_slug_idx").on(t.slug)],
);

export const weeks = pgTable(
  "weeks",
  {
    id: serial("id").primaryKey(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("weeks_start_idx").on(t.startDate)],
);

export const appearances = pgTable(
  "appearances",
  {
    id: serial("id").primaryKey(),
    flavorId: integer("flavor_id")
      .notNull()
      .references(() => flavors.id, { onDelete: "cascade" }),
    weekId: integer("week_id")
      .notNull()
      .references(() => weeks.id, { onDelete: "cascade" }),
    isDebut: boolean("is_debut").notNull().default(false),
    isReturn: boolean("is_return").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    source: sourceEnum("source").notNull().default("crumbl_official"),
    rawName: text("raw_name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("appearances_flavor_week_idx").on(t.flavorId, t.weekId),
    index("appearances_week_idx").on(t.weekId),
  ],
);

export const flavorsRelations = relations(flavors, ({ many }) => ({
  appearances: many(appearances),
}));

export const weeksRelations = relations(weeks, ({ many }) => ({
  appearances: many(appearances),
}));

export const appearancesRelations = relations(appearances, ({ one }) => ({
  flavor: one(flavors, {
    fields: [appearances.flavorId],
    references: [flavors.id],
  }),
  week: one(weeks, {
    fields: [appearances.weekId],
    references: [weeks.id],
  }),
}));

export type Flavor = typeof flavors.$inferSelect;
export type NewFlavor = typeof flavors.$inferInsert;
export type Week = typeof weeks.$inferSelect;
export type NewWeek = typeof weeks.$inferInsert;
export type Appearance = typeof appearances.$inferSelect;
export type NewAppearance = typeof appearances.$inferInsert;
