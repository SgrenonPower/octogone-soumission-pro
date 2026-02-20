import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { formatMontant, formatDate } from '@/lib/format';
import { fetchSoumissionById, fetchConfig } from '@/lib/supabase-queries';
import { X, TrendingUp, CheckCircle, Thermometer, BookOpen, Package, BarChart3, FileText, ShoppingCart, Users, Repeat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Mapping slug → perte invisible ──
interface PerteData {
  Icon: LucideIcon;
  titre: string;
  description: string;
  stat: string;
}

const PERTES_INVISIBLES: Record<string, PerteData> = {
  'thermometres': {
    Icon: Thermometer,
    titre: 'Bris de chaîne de froid',
    description: 'Pertes alimentaires dues aux variations de température non détectées',
    stat: '60 % des cuisines : au moins 1 incident/an',
  },
  'produits-recettes': {
    Icon: BookOpen,
    titre: 'Gaspillage par surproduction',
    description: 'Sans recettes standardisées, chaque cuisinier prépare "à peu près" — les surplus finissent à la poubelle',
    stat: '4 à 10 % des achats alimentaires gaspillés',
  },
  'inventaires': {
    Icon: Package,
    titre: 'Commandes à l\'aveugle',
    description: 'Sans visibilité sur les stocks, on commande en double ou trop tard — surstock et ruptures',
    stat: '5 à 10 % des approvisionnements perdus',
  },
  'inventaires-temps-reel': {
    Icon: BarChart3,
    titre: 'Écarts invisibles',
    description: 'Les incongruités d\'inventaire passent inaperçues pendant des semaines',
    stat: 'Pertes non détectées pendant des mois',
  },
  'facturation': {
    Icon: FileText,
    titre: 'Heures perdues en saisie manuelle',
    description: 'La facturation papier consomme un temps fou et génère des erreurs',
    stat: '65 heures/an de travail administratif évitable',
  },
  'paniers-commandes': {
    Icon: ShoppingCart,
    titre: 'Temps perdu en commandes manuelles',
    description: 'Chaque responsable passe des heures à commander par téléphone ou courriel',
    stat: '50 heures/an par responsable',
  },
  'ressources-humaines': {
    Icon: Users,
    titre: 'Administration RH manuelle',
    description: 'Horaires, paies, suivis — tout est fait à la main, tout prend trop de temps',
    stat: '72 heures/an en gestion RH évitable',
  },
  'taches-repetitives': {
    Icon: Repeat,
    titre: 'Tâches répétées sans automatisation',
    description: 'Des heures chaque semaine à refaire les mêmes vérifications, rapports, suivis',
    stat: '2 à 5 heures/semaine gaspillées',
  },
};

const SoumissionPresentation = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['soumission', id],
    queryFn: () => fetchSoumissionById(id!),
    enabled: !!id,
  });

  const { data: config = {} } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
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

  // ---- Calculs ----
  const totalMensuel = Number(soumission.total_mensuel || 0);
  const totalAnnuel = Number(soumission.total_annuel || 0);
  const fraisInt = Number(soumission.frais_integration || 0);
  const fraisOfferts = (soumission as any).frais_integration_offerts ?? false;
  const coutAn1 = Number(soumission.cout_total_an1 || 0);

  const totalBrutMensuel = etablissements.reduce((sum, e) => sum + Number(e.prix_brut || 0), 0);
  const totalBrutAnnuel = totalBrutMensuel * 12;
  const economiePrixMensuel = totalBrutMensuel - totalMensuel;
  const economiePrixAnnuel = totalBrutAnnuel - totalAnnuel;
  const pctEconomiePrix = totalBrutMensuel > 0 ? (economiePrixMensuel / totalBrutMensuel) * 100 : 0;
  const aDesRabais = economiePrixMensuel > 0.01;

  const modulesSelectionnes = (roi.modules || []).filter((m: any) => m.selectionne);
  const hasRoi = roi.soumission_roi && modulesSelectionnes.length > 0;

  const economiesTotalesAnn = hasRoi ? Number(roi.soumission_roi!.economies_totales || 0) : 0;
  const economiesTotalesMens = economiesTotalesAnn / 12;
  const beneficeNetAnn = economiesTotalesAnn - totalAnnuel;
  const beneficeNetMens = economiesTotalesMens - totalMensuel;
  const beneficePositif = beneficeNetAnn >= 0;

  const nomEntreprise = config.nom_entreprise || 'Octogone 360';

  // Couleurs thème sidebar
  const C = {
    bg: 'hsl(var(--sidebar-background))',
    fg: 'hsl(var(--sidebar-foreground))',
    primary: 'hsl(var(--sidebar-primary))',
    accent: 'hsl(var(--sidebar-accent))',
    border: 'hsl(var(--sidebar-border))',
    fgMuted: 'hsl(var(--sidebar-foreground) / 0.55)',
    fgFaint: 'hsl(var(--sidebar-foreground) / 0.35)',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg }}>
      {/* ── BARRE SUPÉRIEURE ── */}
      <header className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: C.primary }}>
            <div className="w-5 h-5 rounded-sm bg-white opacity-90" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: C.fg }}>{nomEntreprise}</h1>
            <p className="text-xs" style={{ color: C.primary }}>Proposition commerciale · {soumission.numero}</p>
          </div>
        </div>
        <Link to={`/soumissions/${id}`}>
          <Button variant="ghost" size="icon" style={{ color: C.fg }}>
            <X className="h-5 w-5" />
          </Button>
        </Link>
      </header>

      {/* ── CONTENU ── */}
      <main className="flex-1 overflow-auto px-8 py-10 space-y-10 max-w-5xl mx-auto w-full">

        {/* Titre client */}
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: C.primary }}>
            Proposition commerciale
          </p>
          <h2 className="text-4xl font-bold" style={{ color: C.fg }}>
            {soumission.nom_client}
          </h2>
          <p className="text-sm" style={{ color: C.fgMuted }}>
            {soumission.created_at ? formatDate(soumission.created_at) : ''}
            {soumission.date_expiration && ` — Valide jusqu'au ${formatDate(soumission.date_expiration)}`}
          </p>
        </div>

        {/* ── PORTÉE ── */}
        {(() => {
          const textePortee = (soumission as any).texte_portee?.trim()
            || config.texte_portee_defaut
            || 'Octogone est une solution intégrée de gestion alimentaire conçue pour optimiser vos opérations, réduire vos coûts et éliminer les pertes invisibles de votre service alimentaire.';
          return (
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: C.fgFaint }}>
                Portée
              </p>
              <p className="text-sm leading-relaxed italic" style={{ color: C.fgMuted }}>
                {textePortee}
              </p>
            </div>
          );
        })()}

        {/* ══ SECTION "VOS PERTES INVISIBLES" (uniquement si ROI actif) ══ */}
        {hasRoi && (() => {
          const budgetAlimentaire = Number(roi.soumission_roi!.budget_alimentaire || 0);
          const pertesAvecDonnees = modulesSelectionnes
            .map((m: any) => {
              const slug = m.modules_roi?.slug || '';
              const perte = PERTES_INVISIBLES[slug];
              return perte ? { ...perte, id: m.id } : null;
            })
            .filter(Boolean) as (PerteData & { id: string })[];

          if (pertesAvecDonnees.length === 0) return null;

          return (
            <section className="space-y-5 rounded-2xl p-6 border" style={{
              background: 'rgba(239,68,68,0.04)',
              borderColor: 'rgba(239,68,68,0.2)',
            }}>
              {/* En-tête */}
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#f87171' }}>
                  Ce que vos factures ne vous montrent pas
                </h3>
                <p className="text-sm mt-1 italic" style={{ color: C.fgMuted }}>
                  Vos factures alimentaires vous indiquent combien vous dépensez. Mais elles ne révèlent jamais combien vous perdez.
                  Sans système de suivi, ces pertes restent invisibles — comme une passoire dont personne ne connaît l'existence.
                </p>
              </div>

              {/* Grille de cartes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pertesAvecDonnees.map(perte => {
                  const { Icon } = perte;
                  return (
                    <div key={perte.id} className="rounded-xl p-4 flex flex-col gap-3" style={{
                      background: 'rgba(239,68,68,0.09)',
                      border: '1px solid rgba(239,68,68,0.25)',
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.18)' }}>
                          <Icon className="h-4 w-4" style={{ color: '#f87171' }} />
                        </div>
                        <span className="font-semibold text-sm" style={{ color: C.fg }}>{perte.titre}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: C.fgMuted }}>{perte.description}</p>
                      <div className="inline-flex items-center self-start px-2.5 py-1 rounded-full text-xs font-bold" style={{
                        background: 'rgba(239,68,68,0.18)',
                        color: 'rgba(239,68,68,0.9)',
                      }}>
                        {perte.stat}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Encadré chiffre-choc */}
              {budgetAlimentaire > 0 && (
                <div className="rounded-xl p-4 text-sm" style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: C.fgMuted,
                }}>
                  En moyenne, les établissements de gestion alimentaire perdent entre 5 et 15 % de leur budget alimentaire
                  en pertes invisibles chaque année. Pour un budget de{' '}
                  <strong style={{ color: '#fbbf24' }}>
                    {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire)}
                  </strong>,
                  cela représente entre{' '}
                  <strong style={{ color: '#fbbf24' }}>
                    {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire * 0.05)}
                  </strong>
                  {' '}et{' '}
                  <strong style={{ color: '#fbbf24' }}>
                    {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire * 0.15)}
                  </strong>
                  {' '}de pertes potentielles annuelles.
                </div>
              )}
            </section>
          );
        })()}

        {/* ══ SECTION 1 : VOTRE INVESTISSEMENT ══ */}
        <section className="space-y-5">
          <div>
            <h3 className="text-xl font-bold" style={{ color: C.fg }}>Votre investissement</h3>
            <p className="text-sm mt-1" style={{ color: C.fgMuted }}>Conditions négociées pour votre organisation</p>
          </div>

          {/* Tableau établissements */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: C.accent }}>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Établissement</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: C.fgMuted }}>Unités</th>
                  {aDesRabais && (
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Prix régulier</th>
                  )}
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Votre prix</th>
                  {aDesRabais && (
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: C.fgMuted }}>Vous économisez</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {etablissements.map((e, i) => {
                  const brut = Number(e.prix_brut || 0);
                  const final = Number(e.prix_final || 0);
                  const eco = brut - final;
                  const aRabaisLigne = eco > 0.01;
                  return (
                    <tr key={e.id} className="border-t" style={{ borderColor: C.border }}>
                      <td className="px-6 py-4">
                        <span className="font-medium" style={{ color: C.fg }}>
                          {e.nom_etablissement || `Établissement ${i + 1}`}
                        </span>
                        {e.est_pilote && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `hsl(var(--sidebar-primary) / 0.2)`, color: C.primary }}>
                            pilote
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center hidden sm:table-cell" style={{ color: C.fgMuted }}>{e.nombre_unites}</td>
                      {aDesRabais && (
                        <td className="px-6 py-4 text-right text-sm" style={{ color: C.fgFaint, textDecoration: aRabaisLigne ? 'line-through' : 'none' }}>
                          {formatMontant(brut)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right font-bold text-lg" style={{ color: C.primary }}>
                        {formatMontant(final)}
                      </td>
                      {aDesRabais && (
                        <td className="px-6 py-4 text-right text-sm font-semibold hidden sm:table-cell"
                          style={{ color: aRabaisLigne ? '#10b981' : C.fgFaint }}>
                          {aRabaisLigne ? `−\u00a0${formatMontant(eco)}` : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Badges rabais */}
          {rabais.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {rabais.map((r: any) => (
                <div key={r.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>{r.nom} (−{r.pourcentage}%)</span>
                  {r.description_rabais && (
                    <span className="text-xs opacity-75 italic">{r.description_rabais}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cartes récapitulatif */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Mensuel — carte principale */}
            <div className="p-6 rounded-2xl text-center" style={{ background: C.primary }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Mensuel
              </p>
              <p className="text-3xl font-bold text-white">{formatMontant(totalMensuel)}</p>
              {aDesRabais && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {formatMontant(totalBrutMensuel)}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: '#6ee7b7' }}>
                    −{pctEconomiePrix.toFixed(1)}% sur le prix régulier
                  </p>
                </div>
              )}
            </div>

            {/* Annuel */}
            <div className="p-6 rounded-2xl text-center" style={{ background: C.accent }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: C.fgMuted }}>
                Annuel
              </p>
              <p className="text-3xl font-bold" style={{ color: C.fg }}>{formatMontant(totalAnnuel)}</p>
              {aDesRabais && (
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs line-through" style={{ color: C.fgFaint }}>
                    {formatMontant(totalBrutAnnuel)}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: '#10b981' }}>
                    Économie : {formatMontant(economiePrixAnnuel)}/an
                  </p>
                </div>
              )}
            </div>

            {/* 1re année */}
            <div className="p-6 rounded-2xl text-center" style={{ background: C.accent }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: C.fgMuted }}>
                1re année
              </p>
              <p className="text-3xl font-bold" style={{ color: C.fg }}>
                {fraisOfferts ? formatMontant(totalAnnuel) : formatMontant(coutAn1)}
              </p>
              {fraisOfferts ? (
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs line-through" style={{ color: C.fgFaint }}>
                    {formatMontant(coutAn1)}
                  </p>
                  <p className="text-xs font-semibold" style={{ color: '#10b981' }}>
                    Intégration offerte ✓
                  </p>
                </div>
              ) : (
                fraisInt > 0 && (
                  <p className="text-xs mt-2" style={{ color: C.fgMuted }}>
                    dont {formatMontant(fraisInt)} d'intégration
                  </p>
                )
              )}
            </div>
          </div>
        </section>

        {/* ══ SECTION 2 : CE QUE VOUS GAGNEZ (ROI) ══ */}
        {hasRoi && (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5" style={{ color: C.primary }} />
              <div>
                <h3 className="text-xl font-bold" style={{ color: C.fg }}>
                  Ce que vous gagnez avec {nomEntreprise}
                </h3>
                <p className="text-sm" style={{ color: C.fgMuted }}>Estimation des économies générées</p>
              </div>
            </div>

            {/* Tableau modules */}
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: C.accent }}>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Module</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: C.fgMuted }}>Ce que ça règle</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Économie/mois</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: C.fgMuted }}>Économie/an</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesSelectionnes.map((m: any, i: number) => (
                    <tr key={m.id} className="border-t" style={{ borderColor: C.border, background: i % 2 === 0 ? 'transparent' : `hsl(var(--sidebar-accent) / 0.4)` }}>
                      <td className="px-6 py-3 font-semibold" style={{ color: C.fg }}>
                        {m.modules_roi?.nom || `Module ${i + 1}`}
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-xs" style={{ color: C.fgMuted }}>
                        {m.modules_roi?.description || ''}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold" style={{ color: '#10b981' }}>
                        {formatMontant(Number(m.economie_mensuelle || 0))}
                      </td>
                      <td className="px-6 py-3 text-right font-bold hidden sm:table-cell" style={{ color: '#10b981' }}>
                        {formatMontant(Number(m.economie_annuelle || 0))}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t" style={{ borderColor: C.border, background: 'rgba(16,185,129,0.12)' }}>
                    <td colSpan={2} className="px-6 py-3 font-bold" style={{ color: C.fg }}>Total des économies générées</td>
                    <td className="px-6 py-3 text-right font-bold" style={{ color: '#10b981' }}>{formatMontant(economiesTotalesMens)}</td>
                    <td className="px-6 py-3 text-right font-bold hidden sm:table-cell" style={{ color: '#10b981' }}>{formatMontant(economiesTotalesAnn)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bloc verdict comparaison */}
            <div className="rounded-2xl p-6 border-2"
              style={{
                background: beneficePositif ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)',
                borderColor: beneficePositif ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)',
              }}>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span style={{ color: C.fgMuted }}>Votre investissement Octogone :</span>
                  <span className="font-semibold" style={{ color: C.fg }}>{formatMontant(totalAnnuel)} / an</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: C.fgMuted }}>Vos économies générées :</span>
                  <span className="font-semibold" style={{ color: '#10b981' }}>−{formatMontant(economiesTotalesAnn)} / an</span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: beneficePositif ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
                  <span className="font-bold text-base" style={{ color: C.fg }}>BÉNÉFICE NET :</span>
                  <span className="text-2xl font-bold"
                    style={{ color: beneficePositif ? '#10b981' : '#f59e0b' }}>
                    +{formatMontant(Math.abs(beneficeNetAnn))} / an
                    {beneficePositif && ' ✓'}
                  </span>
                </div>
              </div>
              {beneficePositif && (
                <div className="flex flex-wrap gap-4 text-sm pt-2 border-t" style={{ borderColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                  <span>Chaque dollar investi vous en rapporte <strong>{roi.soumission_roi!.roi_multiplicateur}×</strong></span>
                  <span>Retour sur investissement en <strong>{roi.soumission_roi!.periode_retour_mois} mois</strong> seulement</span>
                </div>
              )}
              {!beneficePositif && (
                <p className="text-sm italic mt-2" style={{ color: '#d97706' }}>
                  Ce scénario ne génère pas encore de bénéfice net. Ajustez les modules pour optimiser.
                </p>
              )}
            </div>

            {/* ═ LE VERDICT ═ */}
            <div className="rounded-2xl p-6" style={{ background: 'hsl(var(--sidebar-accent) / 0.5)', border: `1px solid ${C.border}` }}>
              <p className="text-sm italic leading-relaxed" style={{ color: C.fg }}>
                En résumé, pour un investissement mensuel de{' '}
                <strong style={{ color: C.primary }}>{formatMontant(totalMensuel)}</strong>,{' '}
                {nomEntreprise} vous permet d'économiser{' '}
                <strong style={{ color: '#10b981' }}>{formatMontant(economiesTotalesMens)}</strong> par mois,
                {' '}soit un bénéfice net de{' '}
                <strong style={{ color: '#10b981' }}>{formatMontant(Math.abs(beneficeNetMens))}</strong>{' '}
                {beneficePositif ? 'chaque mois' : 'à atteindre'}.
                {beneficePositif && (
                  <> Votre investissement est rentabilisé en{' '}
                    <strong style={{ color: C.primary }}>{roi.soumission_roi!.periode_retour_mois} mois</strong> seulement.</>
                )}
              </p>
            </div>
          </section>
        )}

        {/* ══ OPTIONS SUPPLÉMENTAIRES ══ */}
        {options && options.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-base font-semibold" style={{ color: C.fg }}>Options supplémentaires (au besoin)</h3>
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: C.border }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: C.accent }}>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Option</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: C.fgMuted }}>Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {options.map((opt: any) => (
                    <tr key={opt.id} className="border-t" style={{ borderColor: C.border }}>
                      <td className="px-5 py-3 font-medium" style={{ color: C.fg }}>{opt.nom}</td>
                      <td className="px-5 py-3 text-right" style={{ color: C.fgMuted }}>{opt.prix_description || 'Sur demande'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs italic" style={{ color: C.fgFaint }}>Ces options sont informatives et n'affectent pas les totaux ci-dessus.</p>
          </section>
        )}

        {/* ══ NOTES ══ */}
        {(() => {
          const notesPerso = ((soumission as any).notes_personnalisees || '').trim();
          const lignes = notesPerso ? notesPerso.split('\n').filter(Boolean) : [];
          if (!lignes.length) return null;
          return (
            <div className="p-5 rounded-2xl border" style={{ background: `hsl(var(--sidebar-accent) / 0.4)`, borderColor: C.border }}>
              <div className="flex items-center gap-2 mb-3">
                <span>ℹ️</span>
                <h4 className="font-semibold text-sm" style={{ color: C.fg }}>Notes</h4>
              </div>
              <div className="space-y-1">
                {lignes.map((ligne: string, i: number) => (
                  <p key={i} className="text-sm italic" style={{ color: C.fgMuted }}>• {ligne}</p>
                ))}
              </div>
            </div>
          );
        })()}
      </main>

      {/* ── PIED DE PAGE ── */}
      <footer className="px-8 py-4 border-t text-center text-xs"
        style={{ borderColor: C.border, color: C.fgFaint }}>
        {nomEntreprise} — {soumission.numero} — Valide {config.validite_soumission_jours || 30} jours
      </footer>
    </div>
  );
};

export default SoumissionPresentation;
