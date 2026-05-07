export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-8 anim-in">
      <div className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-2">{eyebrow}</div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && <p className="mt-3 text-sm leading-6 text-muted-foreground max-w-3xl">{description}</p>}
    </div>
  );
}
