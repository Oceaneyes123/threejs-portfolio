import ClientHome from "./ClientHome";

export default function Home({ searchParams }: { searchParams?: { name?: string } }) {
  const displayName = searchParams?.name;
  return <ClientHome name={displayName} />;
}
