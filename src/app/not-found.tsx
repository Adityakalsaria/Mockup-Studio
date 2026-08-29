import Container from "@/components/layout/Container";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Container className="text-center">
        <h1 className="type-display font-bold">404</h1>
        <p className="type-body-l mt-4 text-muted">Page not found.</p>
      </Container>
    </div>
  );
}
