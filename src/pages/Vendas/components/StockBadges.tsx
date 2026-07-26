interface StockBadgesProps {
  openRollsCount?: number;
  hasClosedRoll?: boolean;
}

// O lote é gravado dentro do nome do material, após " - " (ex.: "3M Color Stable
// - Lote 1111111" ou, em dados antigos, "3M Color Stable - 666666"). Não existe
// coluna dedicada. Extrai o texto após o último " - ", tirando "Lote " e o
// sufixo " (Aberta)" dos rolos abertos.
export function extractLotes(materials: { name?: string | null }[]): string[] {
  const lotes = materials
    .map((m) => {
      const clean = (m.name || "").replace(/\s*\(Aberta\)\s*$/i, "").trim();
      const idx = clean.lastIndexOf(" - ");
      if (idx === -1) return null;
      return clean.slice(idx + 3).replace(/^Lote\s+/i, "").trim() || null;
    })
    .filter((v): v is string => !!v);
  return [...new Set(lotes)];
}

// Pills coloridas para diferenciar, de relance, bobina aberta x fechada
// no seletor de material da venda.
export function StockBadges({ openRollsCount, hasClosedRoll }: StockBadgesProps) {
  const hasOpen = !!openRollsCount && openRollsCount > 0;

  if (!hasOpen && !hasClosedRoll) {
    return (
      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-destructive/15 text-destructive">
        sem estoque
      </span>
    );
  }

  return (
    <>
      {hasOpen && (
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          {openRollsCount} aberta{openRollsCount === 1 ? "" : "s"}
        </span>
      )}
      {hasClosedRoll && (
        <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-slate-400/15 text-slate-500 dark:text-slate-300">
          fechada
        </span>
      )}
    </>
  );
}
