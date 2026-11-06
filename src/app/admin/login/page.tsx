import { signIn } from "../actions";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="login admin" style={{ display: "grid" }}>
      <form action={signIn}>
        <div>
          <h1 style={{ fontSize: 22 }}>Вхід в адмінку</h1>
          <p className="muted small" style={{ margin: "4px 0 0" }}>Користувач створюється в Supabase → Authentication → Users</p>
        </div>
        {e === "auth" && <div className="alert">Невірний email або пароль</div>}
        {e === "noshop" && (
          <div className="alert">
            Цей користувач не прив&apos;язаний до магазину. Виконайте в SQL Editor:{" "}
            <code>select add_shop_admin(&apos;email&apos;, &apos;demo&apos;);</code>
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn block" type="submit" style={{ background: "#1c1917" }}>
          Увійти
        </button>
      </form>
    </div>
  );
}
