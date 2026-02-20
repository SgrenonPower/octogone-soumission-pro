import { useEffect } from 'react';
import { formatMontant, formatDate } from '@/lib/format';
import { Soumission, SoumissionEtablissement, Rabais, SoumissionOption } from '@/lib/supabase-queries';
import { Database } from '@/integrations/supabase/types';

type SoumissionRoi = Database['public']['Tables']['soumission_roi']['Row'];
type SoumissionRoiModule = Database['public']['Tables']['soumission_roi_modules']['Row'] & {
  modules_roi?: { nom: string; description: string | null; slug: string } | null;
};

// ── Mapping slug module → perte invisible ──
const PERTES_INVISIBLES: Record<string, { emoji: string; titre: string; description: string; stat: string }> = {
  'thermometres': {
    emoji: '🌡️',
    titre: 'Bris de chaîne de froid',
    description: 'Pertes alimentaires dues aux variations de température non détectées',
    stat: '60 % des cuisines : au moins 1 incident/an',
  },
  'produits-recettes': {
    emoji: '📖',
    titre: 'Gaspillage par surproduction',
    description: 'Sans recettes standardisées, chaque cuisinier prépare "à peu près" — les surplus finissent à la poubelle',
    stat: '4 à 10 % des achats alimentaires gaspillés',
  },
  'inventaires': {
    emoji: '📦',
    titre: 'Commandes à l\'aveugle',
    description: 'Sans visibilité sur les stocks, on commande en double ou trop tard — surstock et ruptures',
    stat: '5 à 10 % des approvisionnements perdus',
  },
  'inventaires-temps-reel': {
    emoji: '📊',
    titre: 'Écarts invisibles',
    description: 'Les incongruités d\'inventaire passent inaperçues pendant des semaines',
    stat: 'Pertes non détectées pendant des mois',
  },
  'facturation': {
    emoji: '📄',
    titre: 'Heures perdues en saisie manuelle',
    description: 'La facturation papier consomme un temps fou et génère des erreurs',
    stat: '65 heures/an de travail administratif évitable',
  },
  'paniers-commandes': {
    emoji: '🛒',
    titre: 'Temps perdu en commandes manuelles',
    description: 'Chaque responsable passe des heures à commander par téléphone ou courriel',
    stat: '50 heures/an par responsable',
  },
  'ressources-humaines': {
    emoji: '👥',
    titre: 'Administration RH manuelle',
    description: 'Horaires, paies, suivis — tout est fait à la main, tout prend trop de temps',
    stat: '72 heures/an en gestion RH évitable',
  },
  'taches-repetitives': {
    emoji: '🔄',
    titre: 'Tâches répétées sans automatisation',
    description: 'Des heures chaque semaine à refaire les mêmes vérifications, rapports, suivis',
    stat: '2 à 5 heures/semaine gaspillées',
  },
};

interface SoumissionPDFProps {
  soumission: Soumission;
  etablissements: (SoumissionEtablissement & { segment?: any })[];
  rabais: Rabais[];
  roi: SoumissionRoi | null;
  roiModules: SoumissionRoiModule[];
  options?: SoumissionOption[];
  config?: Record<string, string>;
}

export const triggerPrint = () => {
  window.print();
};

const SoumissionPDF = ({ soumission, etablissements, rabais, roi, roiModules, options = [], config }: SoumissionPDFProps) => {
  const nomEntreprise = config?.nom_entreprise || 'Octogone 360';
  const sousTitreEntreprise = config?.sous_titre_entreprise || 'Plateforme de gestion alimentaire';
  const conditionsGenerales = config?.conditions_generales ||
    "Cette soumission est valide pour une période de 30 jours à compter de la date d'émission. Les prix sont exprimés en dollars canadiens et sont sujets à change sans préavis après la date d'expiration. Les frais d'intégration sont payables à la signature du contrat. Le prix mensuel s'applique à compter de la mise en service de chaque établissement.";
  const fraisParEtabConfig = config?.frais_integration ? Number(config.frais_integration) : null;
  const textePortee = (soumission as any).texte_portee?.trim()
    || config?.texte_portee_defaut
    || 'Octogone est une solution intégrée de gestion alimentaire conçue pour optimiser vos opérations, réduire vos coûts et éliminer les pertes invisibles de votre service alimentaire.';

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'pdf-print-style';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #pdf-content,
        #pdf-content * { visibility: visible !important; }
        #pdf-content {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          background: white !important;
          z-index: 99999 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        @page { size: A4; margin: 18mm 15mm; }
        .pdf-no-break { page-break-inside: avoid; }
        .pdf-page-break { page-break-before: always; }
      }
    `;
    if (!document.getElementById('pdf-print-style')) {
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById('pdf-print-style');
      if (el) el.remove();
    };
  }, []);

  // ---- Calculs dérivés ----
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

  const modulesSelectionnes = roiModules.filter(m => m.selectionne);
  const hasRoi = roi && modulesSelectionnes.length > 0;

  const economiesTotalesAnn = hasRoi ? Number(roi!.economies_totales || 0) : 0;
  const economiesTotalesMens = economiesTotalesAnn / 12;
  const beneficeNetAnn = economiesTotalesAnn - totalAnnuel;
  const beneficeNetMens = economiesTotalesMens - totalMensuel;
  const beneficePositif = beneficeNetAnn >= 0;

  return (
    <div
      id="pdf-content"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '210mm',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1a1a2e',
        fontSize: '11pt',
        lineHeight: '1.5',
      }}
    >
      {/* ── EN-TÊTE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #1e3a5f' }}>
        <div>
          <div style={{ fontSize: '22pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>{nomEntreprise}</div>
          <div style={{ fontSize: '9pt', color: '#6b7280' }}>{sousTitreEntreprise}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16pt', fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace' }}>{soumission.numero}</div>
          <div style={{ fontSize: '9pt', color: '#6b7280' }}>
            Émise le {soumission.created_at ? formatDate(soumission.created_at) : ''}
          </div>
          {soumission.date_expiration && (
            <div style={{ fontSize: '9pt', color: '#6b7280' }}>
              Valide jusqu'au {formatDate(soumission.date_expiration)}
            </div>
          )}
        </div>
      </div>

      {/* ── CLIENT ── */}
      <div className="pdf-no-break" style={{ marginBottom: 28, padding: '12px 16px', background: '#f0f4f8', borderRadius: 8, borderLeft: '4px solid #1e3a5f' }}>
        <div style={{ fontSize: '9pt', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          PROPOSITION COMMERCIALE POUR
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>{soumission.nom_client}</div>
        <div style={{ fontSize: '9pt', color: '#6b7280', marginTop: 2 }}>
          {etablissements.length} établissement{etablissements.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* ── PORTÉE ── */}
      <div className="pdf-no-break" style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: '9pt',
          fontWeight: 700,
          color: '#1e3a5f',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 6,
        }}>
          Portée
        </div>
        <div style={{ fontSize: '10pt', color: '#374151', lineHeight: 1.6 }}>
          {textePortee}
        </div>
      </div>

      {/* ── SECTION "VOS PERTES INVISIBLES" (uniquement si ROI actif) ── */}
      {hasRoi && (() => {
        const budgetAlimentaire = Number(roi!.budget_alimentaire || 0);
        const pertesAvecDonnees = modulesSelectionnes
          .map(m => {
            const slug = (m as any).modules_roi?.slug || '';
            const perte = PERTES_INVISIBLES[slug];
            return perte ? { ...perte, id: m.id } : null;
          })
          .filter(Boolean) as (typeof PERTES_INVISIBLES[string] & { id: string })[];

        if (pertesAvecDonnees.length === 0) return null;

        return (
          <div className="pdf-no-break" style={{ marginBottom: 28, padding: '18px 20px', background: '#fef9f9', border: '1px solid #fecaca', borderRadius: 10 }}>
            {/* Titre */}
            <div style={{ fontSize: '13pt', fontWeight: 800, color: '#b91c1c', marginBottom: 4 }}>
              Ce que vos factures ne vous montrent pas
            </div>
            <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic', marginBottom: 16 }}>
              Vos factures alimentaires vous indiquent combien vous dépensez. Mais elles ne révèlent jamais combien vous perdez.
              Sans système de suivi en place, ces pertes restent invisibles — comme une passoire dont personne ne connaît l'existence.
            </div>

            {/* Grille de cartes (2 colonnes) */}
            <div style={{ display: 'grid', gridTemplateColumns: pertesAvecDonnees.length === 1 ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {pertesAvecDonnees.map(perte => (
                <div key={perte.id} style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '12px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '14pt' }}>{perte.emoji}</span>
                    <div style={{ fontSize: '10pt', fontWeight: 700, color: '#991b1b' }}>{perte.titre}</div>
                  </div>
                  <div style={{ fontSize: '9pt', color: '#6b7280', marginBottom: 8, lineHeight: 1.4 }}>{perte.description}</div>
                  <div style={{
                    display: 'inline-block',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: 4,
                    padding: '3px 8px',
                    fontSize: '8pt',
                    fontWeight: 700,
                  }}>
                    {perte.stat}
                  </div>
                </div>
              ))}
            </div>

            {/* Encadré chiffre-choc personnalisé */}
            {budgetAlimentaire > 0 && (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: '9.5pt',
                color: '#92400e',
              }}>
                En moyenne, les établissements de gestion alimentaire perdent entre 5 et 15 % de leur budget alimentaire
                en pertes invisibles chaque année. Pour un budget de{' '}
                <strong style={{ color: '#dc2626' }}>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire)}</strong>,
                cela représente entre{' '}
                <strong style={{ color: '#dc2626' }}>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire * 0.05)}</strong>
                {' '}et{' '}
                <strong style={{ color: '#dc2626' }}>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(budgetAlimentaire * 0.15)}</strong>
                {' '}de pertes potentielles annuelles.
              </div>
            )}
          </div>
        );
      })()}

      {/* ── SECTION 1 : VOTRE INVESTISSEMENT ── */}
      <div className="pdf-no-break" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '13pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
          Votre investissement
        </div>
        <div style={{ fontSize: '9pt', color: '#6b7280', marginBottom: 12 }}>
          Détail par établissement avec les conditions négociées
        </div>

        {/* Tableau établissements enrichi */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Établissement</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Unités</th>
              {aDesRabais && (
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Prix régulier</th>
              )}
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Votre prix</th>
              {aDesRabais && (
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Vous économisez</th>
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
                <tr key={e.id} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>
                    {e.nom_etablissement || `Établissement ${i + 1}`}
                    {e.est_pilote && (
                      <span style={{ marginLeft: 8, fontSize: '8pt', padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4 }}>
                        PILOTE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>{e.nombre_unites}</td>
                  {aDesRabais && (
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#9ca3af', textDecoration: aRabaisLigne ? 'line-through' : 'none' }}>
                      {formatMontant(brut)}
                    </td>
                  )}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#1e3a5f' }}>
                    {formatMontant(final)}
                  </td>
                  {aDesRabais && (
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: aRabaisLigne ? '#059669' : '#9ca3af', fontWeight: aRabaisLigne ? 600 : 400 }}>
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
        <div className="pdf-no-break" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rabais.map((r: any) => (
              <div key={r.id} style={{ padding: '4px 12px', background: '#d1fae5', color: '#065f46', borderRadius: 20, fontSize: '9pt', fontWeight: 600 }}>
                ✓ {r.nom} (−{r.pourcentage}%)
                {r.description_rabais && (
                  <span style={{ display: 'block', fontSize: '8pt', fontStyle: 'italic', opacity: 0.85, marginTop: 1 }}>
                    {r.description_rabais}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cartes récapitulatif */}
      <div className="pdf-no-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28 }}>
        {/* Mensuel */}
        <div style={{ padding: '14px 16px', background: '#1e3a5f', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '8pt', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Mensuel
          </div>
          <div style={{ fontSize: '15pt', fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {formatMontant(totalMensuel)}
          </div>
          {aDesRabais && (
            <>
              <div style={{ fontSize: '8.5pt', color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', marginBottom: 2 }}>
                {formatMontant(totalBrutMensuel)}
              </div>
              <div style={{ fontSize: '8.5pt', color: '#6ee7b7', fontWeight: 600 }}>
                −{pctEconomiePrix.toFixed(1)}%
              </div>
            </>
          )}
        </div>

        {/* Annuel */}
        <div style={{ padding: '14px 16px', background: '#f0f4f8', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '8pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            Annuel
          </div>
          <div style={{ fontSize: '15pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
            {formatMontant(totalAnnuel)}
          </div>
          {aDesRabais && (
            <>
              <div style={{ fontSize: '8.5pt', color: '#9ca3af', textDecoration: 'line-through', marginBottom: 2 }}>
                {formatMontant(totalBrutAnnuel)}
              </div>
              <div style={{ fontSize: '8.5pt', color: '#059669', fontWeight: 600 }}>
                Économie : {formatMontant(economiePrixAnnuel)}/an
              </div>
            </>
          )}
        </div>

        {/* 1re année */}
        <div style={{ padding: '14px 16px', background: '#f0f4f8', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ fontSize: '8pt', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
            1re année (incl. intégration)
          </div>
          <div style={{ fontSize: '15pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
            {fraisOfferts ? formatMontant(totalAnnuel) : formatMontant(coutAn1)}
          </div>
          {fraisOfferts ? (
            <div style={{ fontSize: '8.5pt', color: '#059669', fontWeight: 600 }}>
              <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 4 }}>
                {formatMontant(coutAn1)}
              </span>
              Intégration offerte ✓
            </div>
          ) : (
            fraisInt > 0 && (
              <div style={{ fontSize: '8.5pt', color: '#6b7280' }}>
                dont {formatMontant(fraisInt)} d'intégration
              </div>
            )
          )}
        </div>
      </div>

      {/* ── SECTION 2 : CE QUE VOUS GAGNEZ (ROI) ── */}
      {hasRoi && (
        <div className="pdf-page-break">
          <div style={{ fontSize: '13pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>
            Ce que vous gagnez avec {nomEntreprise}
          </div>
          <div style={{ fontSize: '9pt', color: '#6b7280', marginBottom: 16 }}>
            Estimation des économies générées grâce aux modules sélectionnés
          </div>

          {/* Tableau des modules orienté bénéfices */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#1e3a5f' }}>Module</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#1e3a5f' }}>Ce que ça règle</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>Économie/mois</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>Économie/an</th>
              </tr>
            </thead>
            <tbody>
              {modulesSelectionnes.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e3a5f' }}>
                    {(m as any).modules_roi?.nom || `Module ${i + 1}`}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '9pt' }}>
                    {(m as any).modules_roi?.description || ''}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                    {formatMontant(Number(m.economie_mensuelle || 0))}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    {formatMontant(Number(m.economie_annuelle || 0))}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#065f46', color: 'white' }}>
                <td colSpan={2} style={{ padding: '9px 12px', fontWeight: 700 }}>Total des économies générées</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{formatMontant(economiesTotalesMens)}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, fontSize: '11pt' }}>{formatMontant(economiesTotalesAnn)}</td>
              </tr>
            </tbody>
          </table>

          {/* Bloc verdict comparatif */}
          <div className="pdf-no-break" style={{
            padding: '18px 20px',
            borderRadius: 10,
            border: `2px solid ${beneficePositif ? '#059669' : '#f59e0b'}`,
            background: beneficePositif ? '#f0fdf4' : '#fffbeb',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '10pt' }}>
              <span style={{ color: '#6b7280' }}>Votre investissement Octogone :</span>
              <span style={{ fontWeight: 600, color: '#1e3a5f' }}>{formatMontant(totalAnnuel)} / an</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '10pt' }}>
              <span style={{ color: '#6b7280' }}>Vos économies générées :</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>−{formatMontant(economiesTotalesAnn)} / an</span>
            </div>
            <div style={{ borderTop: `1px solid ${beneficePositif ? '#86efac' : '#fcd34d'}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '11pt', color: '#1e3a5f' }}>BÉNÉFICE NET :</span>
              <span style={{ fontWeight: 800, fontSize: '14pt', color: beneficePositif ? '#059669' : '#d97706' }}>
                +{formatMontant(Math.abs(beneficeNetAnn))} / an {beneficePositif ? '✓' : ''}
              </span>
            </div>
            {beneficePositif && (
              <div style={{ marginTop: 10, display: 'flex', gap: 20, fontSize: '9.5pt', color: '#065f46' }}>
                <span>Chaque dollar investi vous en rapporte <strong>{roi!.roi_multiplicateur}×</strong></span>
                <span>Retour sur investissement en <strong>{roi!.periode_retour_mois} mois</strong> seulement</span>
              </div>
            )}
            {!beneficePositif && (
              <div style={{ marginTop: 8, fontSize: '9pt', color: '#92400e', fontStyle: 'italic' }}>
                Ce scénario ne génère pas encore de bénéfice net. Ajustez les modules pour optimiser.
              </div>
            )}
          </div>

          {/* ── SECTION 3 : LE VERDICT ── */}
          <div className="pdf-no-break" style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: '9.5pt', color: '#1e40af', fontStyle: 'italic', lineHeight: 1.7 }}>
              En résumé, pour un investissement mensuel de <strong>{formatMontant(totalMensuel)}</strong>,{' '}
              {nomEntreprise} vous permet d'économiser <strong>{formatMontant(economiesTotalesMens)}</strong> par mois,
              {' '}soit un bénéfice net de <strong style={{ color: '#059669' }}>{formatMontant(Math.abs(beneficeNetMens))}</strong>{' '}
              {beneficePositif ? 'chaque mois' : 'à atteindre'}.
              {beneficePositif && ` Votre investissement est rentabilisé en ${roi!.periode_retour_mois} mois seulement.`}
            </div>
          </div>
        </div>
      )}

      {/* ── OPTIONS SUPPLÉMENTAIRES ── */}
      {options.length > 0 && (
        <div className="pdf-no-break" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 10, color: '#1e3a5f' }}>
            Options supplémentaires (au besoin)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Option</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Prix</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt, i) => (
                <tr key={opt.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={{ padding: '8px 12px' }}>{opt.nom}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280' }}>
                    {opt.prix_description || 'Sur demande'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '8.5pt', color: '#9ca3af', marginTop: 8, fontStyle: 'italic' }}>
            Ces options sont informatives et ne sont pas incluses dans le total de l'abonnement.
          </p>
        </div>
      )}

      {/* ── NOTES ── */}
      {(() => {
        const notesPerso = ((soumission as any).notes_personnalisees || '').trim();
        const lignes = notesPerso ? notesPerso.split('\n').filter(Boolean) : [];
        if (!lignes.length) return null;
        return (
          <div className="pdf-no-break" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 8, color: '#1e3a5f' }}>
              Notes importantes
            </div>
            <div style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b', borderRadius: 8, padding: '12px 16px' }}>
              {lignes.map((ligne: string, i: number) => (
                <div key={i} style={{ fontSize: '10pt', color: '#78350f', lineHeight: 1.6 }}>
                  • {ligne}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── CONDITIONS ── */}
      <div className="pdf-no-break" style={{ marginTop: 36, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: 8, color: '#1e3a5f' }}>Conditions générales</div>
        <div style={{ fontSize: '9pt', color: '#6b7280', lineHeight: 1.6 }}>
          {conditionsGenerales}
        </div>
      </div>

      {/* ── PIED DE PAGE ── */}
      <div style={{ marginTop: 28, paddingTop: 12, borderTop: '2px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#6b7280' }}>
        <span>{nomEntreprise}</span>
        <span>{soumission.numero}</span>
        <span>Confidentiel</span>
      </div>
    </div>
  );
};

export default SoumissionPDF;
