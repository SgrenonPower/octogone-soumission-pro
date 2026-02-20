import { useEffect } from 'react';
import { formatMontant, formatDate } from '@/lib/format';
import { Soumission, SoumissionEtablissement, Rabais, SoumissionOption } from '@/lib/supabase-queries';
import { Database } from '@/integrations/supabase/types';

type SoumissionRoi = Database['public']['Tables']['soumission_roi']['Row'];
type SoumissionRoiModule = Database['public']['Tables']['soumission_roi_modules']['Row'];

interface SoumissionPDFProps {
  soumission: Soumission;
  etablissements: (SoumissionEtablissement & { segment?: any })[];
  rabais: Rabais[];
  roi: SoumissionRoi | null;
  roiModules: SoumissionRoiModule[];
  options?: SoumissionOption[];
}

export const triggerPrint = () => {
  window.print();
};

const SoumissionPDF = ({ soumission, etablissements, rabais, roi, roiModules, options = [] }: SoumissionPDFProps) => {
  useEffect(() => {
    // Inject print CSS
    const style = document.createElement('style');
    style.id = 'pdf-print-style';
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #pdf-content { display: block !important; }
        #pdf-content { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: white; }
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

  const totalMensuel = Number(soumission.total_mensuel || 0);
  const totalAnnuel = Number(soumission.total_annuel || 0);
  const fraisInt = Number(soumission.frais_integration || 0);
  const fraisOfferts = (soumission as any).frais_integration_offerts ?? false;
  const coutAn1 = Number(soumission.cout_total_an1 || 0);

  const modulesSelectionnes = roiModules.filter(m => m.selectionne);

  return (
    <div
      id="pdf-content"
      className="hidden"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#1a1a2e',
        fontSize: '11pt',
        lineHeight: '1.5',
      }}
    >
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #1e3a5f' }}>
        <div>
          <div style={{ fontSize: '22pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 4 }}>Octogone 360</div>
          <div style={{ fontSize: '9pt', color: '#6b7280' }}>Plateforme de gestion alimentaire</div>
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

      {/* Informations client */}
      <div className="pdf-no-break" style={{ marginBottom: 24, padding: '12px 16px', background: '#f0f4f8', borderRadius: 8, borderLeft: '4px solid #1e3a5f' }}>
        <div style={{ fontSize: '9pt', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          CLIENT
        </div>
        <div style={{ fontSize: '14pt', fontWeight: 700 }}>{soumission.nom_client}</div>
        <div style={{ fontSize: '9pt', color: '#6b7280', marginTop: 2 }}>
          {etablissements.length} établissement{etablissements.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Tableau établissements */}
      <div className="pdf-no-break" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 10, color: '#1e3a5f' }}>
          Détail par établissement
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Établissement</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Unités</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Prix brut/mois</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Prix final/mois</th>
            </tr>
          </thead>
          <tbody>
            {etablissements.map((e, i) => (
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
                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6b7280', textDecoration: Number(e.prix_brut) !== Number(e.prix_final) ? 'line-through' : 'none' }}>
                  {formatMontant(Number(e.prix_brut || 0))}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                  {formatMontant(Number(e.prix_final || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rabais */}
      {rabais.length > 0 && (
        <div className="pdf-no-break" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 8, color: '#1e3a5f' }}>Rabais appliqués</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {rabais.map((r: any) => (
              <div key={r.id} style={{ padding: '4px 12px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: '9pt', fontWeight: 500 }}>
                <span>{r.nom} ({r.pourcentage}%)</span>
                {r.description_rabais && (
                  <span style={{ display: 'block', fontSize: '8pt', fontStyle: 'italic', opacity: 0.8, marginTop: 2 }}>
                    {r.description_rabais}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Totaux */}
      <div className="pdf-no-break" style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: 10, color: '#1e3a5f' }}>Récapitulatif financier</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', color: '#6b7280' }}>Total mensuel</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMontant(totalMensuel)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '8px 12px', color: '#6b7280' }}>Total annuel (×12)</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMontant(totalAnnuel)}</td>
            </tr>
            {fraisOfferts ? (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>
                  Frais d'intégration
                  <span style={{ fontSize: '9pt', marginLeft: 8, color: '#9ca3af' }}>
                    (valeur {formatMontant(fraisInt)})
                  </span>
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: 8 }}>
                    {formatMontant(fraisInt)}
                  </span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>0,00 $ (gratuit – projet pilote)</span>
                </td>
              </tr>
            ) : (
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>Frais d'intégration ({etablissements.length} étab. × 3 000 $)</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMontant(fraisInt)}</td>
              </tr>
            )}
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700, fontSize: '11pt' }}>Coût total 1re année</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontSize: '13pt' }}>{formatMontant(coutAn1)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ROI */}
      {roi && modulesSelectionnes.length > 0 && (
        <div className="pdf-page-break">
          <div style={{ fontSize: '14pt', fontWeight: 800, color: '#1e3a5f', marginBottom: 20, paddingTop: 16 }}>
            Analyse de retour sur investissement
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Économies annuelles', value: formatMontant(Number(roi.economies_totales || 0)), bg: '#d1fae5', color: '#065f46' },
              { label: 'Coût Octogone/an', value: formatMontant(Number(roi.cout_octogone_annuel || 0)), bg: '#f0f4f8', color: '#1e3a5f' },
              { label: 'Bénéfice net', value: formatMontant(Number((roi.economies_totales || 0) - (roi.cout_octogone_annuel || 0))), bg: '#dbeafe', color: '#1d4ed8' },
              { label: 'ROI', value: `${roi.roi_multiplicateur}× votre investissement`, bg: '#1e3a5f', color: 'white' },
            ].map(m => (
              <div key={m.label} style={{ padding: '12px 14px', background: m.bg, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '8pt', color: m.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{m.label}</div>
                <div style={{ fontSize: '12pt', fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10.5pt', fontWeight: 700, marginBottom: 10, color: '#1e3a5f' }}>Économies par module</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
            <thead>
              <tr style={{ background: '#f0f4f8' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280' }}>Module</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Économie mensuelle</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>Économie annuelle</th>
              </tr>
            </thead>
            <tbody>
              {modulesSelectionnes.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
                  <td style={{ padding: '8px 12px' }}>Module {i + 1}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>{formatMontant(Number(m.economie_mensuelle || 0))}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatMontant(Number(m.economie_annuelle || 0))}</td>
                </tr>
              ))}
              <tr style={{ background: '#1e3a5f', color: 'white' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700 }}>Total des économies</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatMontant(Number(roi.economies_totales || 0) / 12)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{formatMontant(Number(roi.economies_totales || 0))}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 16, padding: '10px 14px', background: '#d1fae5', borderRadius: 8 }}>
            <span style={{ fontWeight: 700, color: '#065f46' }}>
              Période de retour sur investissement : {roi.periode_retour_mois} mois seulement
            </span>
          </div>
        </div>
      )}

      {/* Options supplémentaires */}
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

      {/* Notes importantes */}
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
                <div key={i} style={{ fontSize: '10pt', color: '#78350f', lineHeight: 1.6, wordBreak: 'break-word' }}>
                  • {ligne}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Conditions */}
      <div className="pdf-no-break" style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '10pt', fontWeight: 700, marginBottom: 8, color: '#1e3a5f' }}>Conditions générales</div>
        <div style={{ fontSize: '9pt', color: '#6b7280', lineHeight: 1.6 }}>
          Cette soumission est valide pour une période de 30 jours à compter de la date d'émission.
          Les prix sont exprimés en dollars canadiens et sont sujets à change sans préavis après la date d'expiration.
          Les frais d'intégration sont payables à la signature du contrat.
          Le prix mensuel s'applique à compter de la mise en service de chaque établissement.
        </div>
      </div>

      {/* Pied de page */}
      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '2px solid #1e3a5f', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#6b7280' }}>
        <span>Octogone 360</span>
        <span>{soumission.numero}</span>
        <span>Confidentiel</span>
      </div>
    </div>
  );
};

export default SoumissionPDF;
