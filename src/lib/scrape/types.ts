export type ScrapedFlavor = {
  rawName: string;
  name: string;
  slug: string;
  partnerBrand: string | null;
  isNCD: boolean;
  isNew: boolean;
  isFeatured: boolean;
  description?: string | null;
  imageUrl?: string | null;
  crumblProfileSlug?: string | null;
};

export type ScrapedWeek = {
  startDate: string; // ISO yyyy-MM-dd (Monday)
  endDate: string; // ISO yyyy-MM-dd (Saturday)
  label: string;
  source: "crumbl_official" | "crumblmenu_us" | "menucrumblcookies_com" | "manual";
  flavors: ScrapedFlavor[];
};
