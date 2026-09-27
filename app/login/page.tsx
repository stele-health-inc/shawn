export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="login">
      <form action="/api/login" method="post">
        <h1>Saves</h1>
        <input type="hidden" name="next" value={next ?? "/"} />
        <input type="password" name="password" placeholder="Password" autoFocus required />
        {error && <p className="error">Wrong password</p>}
        <button type="submit">Enter</button>
      </form>
    </main>
  );
}
