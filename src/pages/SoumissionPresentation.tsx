import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatMontant, formatDate } from '@/lib/format';
import { fetchSoumissionById } from '@/lib/supabase-queries';
import { X, TrendingUp } from 'lucide-react';

const SoumissionPresentation = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['soumission', id],
    queryFn: () => fetchSoumissionById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Soumission introuvable.</p>
      </div>
    );
  }

  const { soumission, etablissements, rabais, roi, options } = data;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--sidebar-background))' }}>
      {/* Barre supérieure */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'hsl(var(--sidebar-primary))' }}>
            <div className="w-5 h-5 rounded-sm bg-white opacity-90" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Octogone 360</h1>
            <p className="text-xs" style={{ color: 'hsl(var(--sidebar-primary))' }}>Soumission {soumission.numero}</p>
          </div>
        </div>
        <Link to={`/soumissions/${id}`}>
          <Button variant="ghost" size="icon" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
            <X className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 overflow-auto px-8 py-12 space-y-10 max-w-5xl mx-auto w-full">
        {/* Titre client */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest" style={{ color: 'hsl(var(--sidebar-primary))' }}>
            Proposition commerciale
          </p>
          <h2 className="text-4xl font-bold" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
            {soumission.nom_client}
          </h2>
          <p className="text-sm" style={{ color: 'hsl(var(--sidebar-foreground) / 0.5)' }}>
            {soumission.created_at ? formatDate(soumission.created_at) : ''}
            {soumission.date_expiration && ` — Valide jusqu'au ${formatDate(soumission.date_expiration)}`}
          </p>
        </div>

        {/* Établissements */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
          <div className="px-6 py-4 border-b" style={{ background: 'hsl(var(--sidebar-accent))', borderColor: 'hsl(var(--sidebar-border))' }}>
            <h3 className="font-semibold text-lg" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              Détail par établissement
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'hsl(var(--sidebar-accent) / 0.5)' }}>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Établissement</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Unités</th>
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Prix mensuel</th>
              </tr>
            </thead>
            <tbody>
              {etablissements.map((e, i) => (
                <tr key={e.id} className="border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                  <td className="px-6 py-4">
                    <span className="font-medium" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                      {e.nom_etablissement || `Établissement ${i + 1}`}
                    </span>
                    {e.est_pilote && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'hsl(var(--sidebar-primary) / 0.2)', color: 'hsl(var(--sidebar-primary))' }}>
                        pilote
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>{e.nombre_unites}</td>
                  <td className="px-6 py-4 text-right font-bold text-lg" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                    {formatMontant(Number(e.prix_final || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Total mensuel', value: formatMontant(Number(soumission.total_mensuel || 0)), highlight: true },
            { label: 'Total annuel', value: formatMontant(Number(soumission.total_annuel || 0)), highlight: false },
            { label: 'Coût total 1re année', value: formatMontant(Number(soumission.cout_total_an1 || 0)), highlight: false },
          ].map(item => (
            <div
              key={item.label}
              className="p-6 rounded-2xl text-center"
              style={{
                background: item.highlight ? 'hsl(var(--sidebar-primary))' : 'hsl(var(--sidebar-accent))',
              }}
            >
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: item.highlight ? 'rgba(255,255,255,0.7)' : 'hsl(var(--sidebar-foreground) / 0.6)' }}>
                {item.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: 'white' }}>{item.value}</p>
            </div>
          ))}
        </div>
        {(soumission as any).frais_integration_offerts && (
          <p className="text-xs text-center -mt-3" style={{ color: '#059669', fontStyle: 'italic' }}>
            ✓ Frais d'intégration offerts — projet pilote
          </p>
        )}

        {/* Notes personnalisées */}
        {(() => {
          const notesPerso = ((soumission as any).notes_personnalisees || '').trim();
          const lignes = notesPerso ? notesPerso.split('\n').filter(Boolean) : [];
          if (!lignes.length) return null;
          return (
            <div className="p-5 rounded-2xl border" style={{ background: 'hsl(var(--sidebar-accent) / 0.5)', borderColor: 'hsl(var(--sidebar-border))' }}>
              <div className="flex items-center gap-2 mb-3">
                <span>ℹ️</span>
                <h4 className="font-semibold text-sm" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Notes</h4>
              </div>
              <div className="space-y-1">
                {lignes.map((ligne: string, i: number) => (
                  <p key={i} className="text-sm" style={{ fontStyle: 'italic', color: 'hsl(var(--sidebar-foreground) / 0.7)' }}>
                    • {ligne}
                  </p>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Rabais */}
        {rabais.length > 0 && (
          <div className="p-6 rounded-2xl" style={{ background: 'hsl(var(--sidebar-accent))' }}>
            <h3 className="font-semibold mb-3" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Rabais appliqués</h3>
            <div className="flex flex-wrap gap-2">
              {rabais.map((r: any) => (
                <div key={r.id} className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: 'hsl(var(--sidebar-primary) / 0.15)', color: 'hsl(var(--sidebar-primary))' }}>
                  <span>{r.nom} ({r.pourcentage}%)</span>
                  {r.description_rabais && (
                    <span className="block text-xs mt-0.5" style={{ fontStyle: 'italic', opacity: 0.75 }}>
                      {r.description_rabais}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options supplémentaires */}
        {options && options.length > 0 && (
          <div className="p-6 rounded-2xl" style={{ background: 'hsl(var(--sidebar-accent))' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              Options supplémentaires (au besoin)
            </h3>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'hsl(var(--sidebar-accent))' }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Option</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt: any) => (
                    <tr key={opt.id} className="border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
                        {opt.nom}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: 'hsl(var(--sidebar-foreground) / 0.7)' }}>
                        {opt.prix_description || 'Sur demande'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3" style={{ color: 'hsl(var(--sidebar-foreground) / 0.4)', fontStyle: 'italic' }}>
              Ces options sont informatives et n'affectent pas les totaux ci-dessus.
            </p>
          </div>
        )}


        {/* ROI */}
        {roi.soumission_roi && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--sidebar-primary))' }} />
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--sidebar-foreground))' }}>Analyse de retour sur investissement</h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Économies annuelles', value: formatMontant(Number(roi.soumission_roi.economies_totales || 0)), color: 'hsl(var(--success))' },
                { label: 'Bénéfice net', value: formatMontant(Number((roi.soumission_roi.economies_totales || 0) - (roi.soumission_roi.cout_octogone_annuel || 0))), color: 'hsl(var(--sidebar-foreground))' },
                { label: 'ROI', value: `${roi.soumission_roi.roi_multiplicateur}× votre investissement`, color: 'hsl(var(--sidebar-primary))' },
                { label: 'Retour en', value: `${roi.soumission_roi.periode_retour_mois} mois`, color: 'hsl(var(--sidebar-foreground))' },
              ].map(m => (
                <div key={m.label} className="p-5 rounded-xl text-center"
                  style={{ background: 'hsl(var(--sidebar-accent))' }}>
                  <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'hsl(var(--sidebar-foreground) / 0.6)' }}>{m.label}</p>
                  <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Pied de page */}
      <footer className="px-8 py-4 border-t text-center text-xs" style={{ borderColor: 'hsl(var(--sidebar-border))', color: 'hsl(var(--sidebar-foreground) / 0.4)' }}>
        Octogone 360 — {soumission.numero} — Valide 30 jours
      </footer>
    </div>
  );
};

export default SoumissionPresentation;
