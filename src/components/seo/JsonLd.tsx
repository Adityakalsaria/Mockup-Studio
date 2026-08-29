import type { Thing, WithContext } from "schema-dts";

interface JsonLdProps {
  data: WithContext<Thing> | Array<WithContext<Thing>>;
}

export default function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data)
    ? {
        "@context": "https://schema.org",
        "@graph": data,
      }
    : data;

  return (
    <script
      type="application/ld+json"
      // JSON-LD payload is static content generated from controlled local objects.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
