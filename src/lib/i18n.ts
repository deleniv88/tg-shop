import type { L10n, Lang, OrderStatus, PaymentStatus } from "./types";

const uk = {
  search: "Знайти продукт",
  categories: "Категорії",
  all: "Усі товари",
  featured: "Популярне",
  cart: "Кошик",
  addToCart: "Додати до кошика",
  inCart: "У кошику",
  add: "Додати",
  outOfStock: "Немає в наявності",
  back: "Назад",
  ingredients: "Склад",
  allergens: "Алергени",
  adultsOnly: "Тільки 18+",
  emptyCart: "Кошик порожній",
  emptyCartHint: "Додайте товари з каталогу",
  toCatalog: "До каталогу",
  items: "Товари",
  delivery: "Доставка",
  free: "Безкоштовно",
  total: "Разом",
  checkout: "Оформити замовлення",
  minOrderLeft: "До мінімального замовлення ще {amount}",
  freeDeliveryLeft: "До безкоштовної доставки ще {amount}",
  freeDeliveryReached: "Доставка безкоштовна",
  minOrder: "Мінімальне замовлення",
  name: "Ім'я та прізвище",
  phone: "Телефон",
  email: "Email",
  address: "Адреса",
  addressPh: "вулиця, номер будинку, квартира",
  city: "Місто",
  zip: "Поштовий індекс",
  comment: "Коментар",
  commentPh: "Побажання до замовлення",
  optional: "необов'язково",
  payment: "Оплата",
  pay_test_card: "Карткою онлайн (тест)",
  pay_cod: "При отриманні",
  placeOrder: "Підтвердити замовлення",
  placeOrderPay: "Перейти до оплати",
  summary: "Ваше замовлення",
  backToCart: "Повернутися до кошика",
  orderNo: "Замовлення №{n}",
  thanks: "Дякуємо за замовлення!",
  thanksText: "Ми зв'яжемося з вами для підтвердження.",
  orderStatus: "Статус",
  paymentStatus: "Оплата",
  testPayment: "Тестова оплата",
  testPaymentHint: "Це демо-оплата: гроші не списуються. Натисніть «Оплатити», щоб симулювати успішний платіж.",
  payNow: "Оплатити {amount}",
  declinePay: "Симулювати відмову",
  paid: "Оплачено",
  payFailed: "Оплата не пройшла",
  tryAgain: "Спробувати ще раз",
  support: "Підтримка",
  writeUs: "Є питання? Напишіть нам",
  shopClosed: "Магазин тимчасово не приймає замовлення",
  required: "Заповніть обов'язкові поля",
  error: "Щось пішло не так. Спробуйте ще раз.",
  sale: "Акція",
  pcs: "шт.",
  continueShopping: "Продовжити покупки",
  allRights: "Усі права захищено",
  qty: "Кількість",
  errMinOrder: "Мінімальне замовлення — {amount}",
  errStock: "Недостатньо на складі: {name}",
  errUnavailable: "Деякі товари більше недоступні. Оновіть кошик.",
  errEmpty: "Кошик порожній",
  errPayment: "Цей спосіб оплати недоступний",
};

type Dict = typeof uk;

const pl: Dict = {
  search: "Szukaj produktu",
  categories: "Kategorie",
  all: "Wszystkie produkty",
  featured: "Popularne",
  cart: "Koszyk",
  addToCart: "Dodaj do koszyka",
  inCart: "W koszyku",
  add: "Dodaj",
  outOfStock: "Brak w magazynie",
  back: "Wstecz",
  ingredients: "Skład",
  allergens: "Alergeny",
  adultsOnly: "Tylko 18+",
  emptyCart: "Koszyk jest pusty",
  emptyCartHint: "Dodaj produkty z katalogu",
  toCatalog: "Do katalogu",
  items: "Produkty",
  delivery: "Dostawa",
  free: "Za darmo",
  total: "Razem",
  checkout: "Złóż zamówienie",
  minOrderLeft: "Do minimalnego zamówienia brakuje {amount}",
  freeDeliveryLeft: "Do darmowej dostawy brakuje {amount}",
  freeDeliveryReached: "Dostawa za darmo",
  minOrder: "Minimalne zamówienie",
  name: "Imię i nazwisko",
  phone: "Telefon",
  email: "Email",
  address: "Adres",
  addressPh: "ulica, numer domu, mieszkania",
  city: "Miasto",
  zip: "Kod pocztowy",
  comment: "Komentarz",
  commentPh: "Uwagi do zamówienia",
  optional: "opcjonalnie",
  payment: "Płatność",
  pay_test_card: "Kartą online (test)",
  pay_cod: "Przy odbiorze",
  placeOrder: "Potwierdź zamówienie",
  placeOrderPay: "Przejdź do płatności",
  summary: "Twoje zamówienie",
  backToCart: "Wróć do koszyka",
  orderNo: "Zamówienie nr {n}",
  thanks: "Dziękujemy za zamówienie!",
  thanksText: "Skontaktujemy się z Tobą, aby je potwierdzić.",
  orderStatus: "Status",
  paymentStatus: "Płatność",
  testPayment: "Płatność testowa",
  testPaymentHint: "To płatność demo: pieniądze nie są pobierane. Kliknij „Zapłać”, aby zasymulować udaną płatność.",
  payNow: "Zapłać {amount}",
  declinePay: "Symuluj odmowę",
  paid: "Opłacono",
  payFailed: "Płatność nie powiodła się",
  tryAgain: "Spróbuj ponownie",
  support: "Pomoc",
  writeUs: "Masz pytania? Napisz do nas",
  shopClosed: "Sklep tymczasowo nie przyjmuje zamówień",
  required: "Wypełnij wymagane pola",
  error: "Coś poszło nie tak. Spróbuj ponownie.",
  sale: "Promocja",
  pcs: "szt.",
  continueShopping: "Kontynuuj zakupy",
  allRights: "Wszelkie prawa zastrzeżone",
  qty: "Ilość",
  errMinOrder: "Minimalne zamówienie — {amount}",
  errStock: "Za mało w magazynie: {name}",
  errUnavailable: "Niektóre produkty są niedostępne. Odśwież koszyk.",
  errEmpty: "Koszyk jest pusty",
  errPayment: "Ta metoda płatności jest niedostępna",
};

const dicts: Record<Lang, Dict> = { uk, pl, en: uk };

export type TKey = keyof Dict;

export function t(lang: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = (dicts[lang] ?? uk)[key] ?? uk[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Pick a translation from a {"uk": "...", "pl": "..."} object, falling back to any filled value. */
export function tr(value: L10n | null | undefined, lang: Lang, fallbackLang?: Lang): string {
  if (!value) return "";
  return value[lang] || (fallbackLang && value[fallbackLang]) || Object.values(value).find(Boolean) || "";
}

export const LANG_LABEL: Record<Lang, string> = { uk: "UA", pl: "PL", en: "EN" };

export const ORDER_STATUS: Record<OrderStatus, Record<"uk" | "pl", string>> = {
  new: { uk: "Нове", pl: "Nowe" },
  confirmed: { uk: "Підтверджене", pl: "Potwierdzone" },
  shipped: { uk: "Відправлене", pl: "Wysłane" },
  completed: { uk: "Виконане", pl: "Zrealizowane" },
  cancelled: { uk: "Скасоване", pl: "Anulowane" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, Record<"uk" | "pl", string>> = {
  pending: { uk: "Очікує оплати", pl: "Oczekuje na płatność" },
  paid: { uk: "Оплачено", pl: "Opłacono" },
  failed: { uk: "Не вдалася", pl: "Nieudana" },
  not_required: { uk: "При отриманні", pl: "Przy odbiorze" },
};

export function statusLabel(status: OrderStatus, lang: Lang) {
  return ORDER_STATUS[status][lang === "pl" ? "pl" : "uk"];
}
export function paymentLabel(status: PaymentStatus, lang: Lang) {
  return PAYMENT_STATUS[status][lang === "pl" ? "pl" : "uk"];
}
