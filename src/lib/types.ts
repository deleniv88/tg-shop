export type Lang = "uk" | "pl" | "en";
export type L10n = Partial<Record<Lang, string>>;

export type Theme = {
  primary?: string;
  accent?: string;
  bg?: string;
  surface?: string;
  text?: string;
  radius?: string;
};

export type Shop = {
  id: string;
  slug: string;
  name: string;
  domains: string[];
  currency: string;
  languages: Lang[];
  default_lang: Lang;
  theme: Theme;
  logo_url: string | null;
  tagline: L10n;
  hero_title: L10n;
  hero_text: L10n;
  min_order: number;
  delivery_fee: number;
  free_delivery_from: number | null;
  delivery_note: L10n;
  payment_methods: PaymentMethod[];
  support_username: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  tg_welcome: L10n;
  tg_welcome_image: string | null;
  is_open: boolean;
};

export type Category = {
  id: string;
  shop_id: string;
  slug: string;
  name: L10n;
  emoji: string | null;
  sort: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  shop_id: string;
  category_id: string | null;
  slug: string;
  sku: string | null;
  name: L10n;
  description: L10n;
  ingredients: L10n;
  allergens: L10n;
  unit: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_18plus: boolean;
  images: string[];
  sort: number;
};

export type PaymentMethod = "test_card" | "cod";

export type OrderStatus = "new" | "confirmed" | "shipped" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "not_required";

export type Order = {
  id: string;
  shop_id: string;
  number: number;
  source: "web" | "tg";
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  telegram_id: number | null;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  zip: string | null;
  comment: string | null;
  lang: Lang | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  access_token: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  qty: number;
  total: number;
};

/** Minimal product snapshot the browser keeps in the cart. Prices are re-checked on the server. */
export type CartLine = {
  id: string;
  qty: number;
  name: string;
  price: number;
  image?: string | null;
  emoji?: string | null;
  unit?: string | null;
  slug: string;
  stock?: number | null;
};
