import ClientHome from "./ClientHome";

export default async function Home({ searchParams }: { searchParams?: Promise<{ name?: string }> }) {
  const params = await searchParams;
  const displayName = params?.name;
  return <ClientHome name={displayName} />;
}
