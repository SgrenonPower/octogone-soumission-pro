import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Segment = Database['public']['Tables']['segments']['Row'];
export type Palier = Database['public']['Tables']['paliers']['Row'];
export type Rabais = Database['public']['Tables']['rabais']['Row'];
export type Config = Database['public']['Tables']['config']['Row'];
export type ModuleRoi = Database['public']['Tables']['modules_roi']['Row'];
export type ParametreRoi = Database['public']['Tables']['parametres_roi']['Row'];
export type Soumission = Database['public']['Tables']['soumissions']['Row'];
export type SoumissionEtablissement = Database['public']['Tables']['soumission_etablissements']['Row'];
export type Utilisateur = Database['public']['Tables']['utilisateurs']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type SoumissionOption = {
  id: string;
  soumission_id: string;
  nom: string;
  prix_description: string;
  ordre: number;
};

// ============================================================
// Segments / Paliers / Rabais / Config
// ============================================================

export const fetchSegments = async (): Promise<Segment[]> => {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchAllSegments = async (): Promise<Segment[]> => {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchPaliers = async (segmentId: string): Promise<Palier[]> => {
  const { data, error } = await supabase
    .from('paliers')
    .select('*')
    .eq('segment_id', segmentId)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchAllPaliers = async (): Promise<Palier[]> => {
  const { data, error } = await supabase
    .from('paliers')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchRabais = async (): Promise<Rabais[]> => {
  const { data, error } = await supabase
    .from('rabais')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchAllRabais = async (): Promise<Rabais[]> => {
  const { data, error } = await supabase
    .from('rabais')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchConfig = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from('config')
    .select('*');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach(c => { map[c.cle] = c.valeur; });
  return map;
};

export const updateConfig = async (cle: string, valeur: string): Promise<void> => {
  const { error } = await supabase
    .from('config')
    .update({ valeur, updated_at: new Date().toISOString() })
    .eq('cle', cle);
  if (error) throw error;
};

// ============================================================
// Modules / Paramètres ROI
// ============================================================

export const fetchModulesRoi = async (): Promise<ModuleRoi[]> => {
  const { data, error } = await supabase
    .from('modules_roi')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchAllModulesRoi = async (): Promise<ModuleRoi[]> => {
  const { data, error } = await supabase
    .from('modules_roi')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const fetchParametresRoi = async (): Promise<ParametreRoi[]> => {
  const { data, error } = await supabase
    .from('parametres_roi')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

export const updateParametreRoi = async (id: string, valeur: number): Promise<void> => {
  const { error } = await supabase
    .from('parametres_roi')
    .update({ valeur })
    .eq('id', id);
  if (error) throw error;
};

// ============================================================
// Soumissions — Numérotation
// ============================================================

export const genererNumero = async (): Promise<string> => {
  const annee = new Date().getFullYear();
  const { data } = await supabase
    .from('soumissions')
    .select('numero')
    .like('numero', `OCT-${annee}-%`)
    .order('numero', { ascending: false })
    .limit(1);

  let dernier = 0;
  if (data && data.length > 0) {
    const match = data[0].numero.match(/OCT-\d{4}-(\d+)/);
    if (match) dernier = parseInt(match[1]);
  }
  return `OCT-${annee}-${String(dernier + 1).padStart(3, '0')}`;
};

// ============================================================
// Soumissions — CRUD
// ============================================================

export interface FiltresSoumissions {
  recherche?: string;
  statut?: string;
  page?: number;
  parPage?: number;
}

export interface SoumissionAvecDetails extends Soumission {
  etablissements?: SoumissionEtablissement[];
  segments?: Segment[];
}

export const fetchSoumissions = async (
  filtres: FiltresSoumissions = {},
): Promise<{ data: SoumissionAvecDetails[]; total: number }> => {
  const { recherche, statut, page = 1, parPage = 20 } = filtres;
  const debut = (page - 1) * parPage;

  let query = supabase
    .from('soumissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(debut, debut + parPage - 1);

  if (recherche) {
    query = query.or(`nom_client.ilike.%${recherche}%,numero.ilike.%${recherche}%`);
  }
  if (statut && statut !== 'tous') {
    query = query.eq('statut', statut);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], total: count || 0 };
};

export const fetchSoumissionById = async (id: string): Promise<{
  soumission: Soumission;
  etablissements: (SoumissionEtablissement & { segment?: Segment })[];
  rabais: Rabais[];
  roi: { soumission_roi: Database['public']['Tables']['soumission_roi']['Row'] | null; modules: Database['public']['Tables']['soumission_roi_modules']['Row'][] };
  options: SoumissionOption[];
}> => {
  const [soumissionRes, etablissementsRes, rabaisRes, roiRes, optionsRes] = await Promise.all([
    supabase.from('soumissions').select('*').eq('id', id).single(),
    supabase.from('soumission_etablissements').select('*, segments(*)').eq('soumission_id', id),
    supabase.from('soumission_rabais').select('*, rabais(*)').eq('soumission_id', id),
    supabase.from('soumission_roi').select('*').eq('soumission_id', id).maybeSingle(),
    supabase.from('soumission_options' as any).select('*').eq('soumission_id', id).order('ordre') as any,
  ]);

  if (soumissionRes.error) throw soumissionRes.error;

  const etablissements = (etablissementsRes.data || []).map((e: any) => ({
    ...e,
    segment: e.segments,
  }));

  const nomMapRabais: Record<string, string> = {
    'multi-sites': 'Multi-sites',
    'volume': 'Volume',
    'personnalise': 'Rabais personnalisé',
  };

  const rabais = (rabaisRes.data || []).map((row: any) => {
    if (row.rabais) {
      // Toggle (engagement, pilote) → vient du join
      return row.rabais;
    } else if (row.type_rabais && row.type_rabais !== 'aucun') {
      // Dropdown personnalisé → objet synthétique compatible
      return {
        id: row.id,
        nom: nomMapRabais[row.type_rabais] || row.type_rabais,
        pourcentage: row.pourcentage_applique,
        description_rabais: row.description_rabais,
        slug: row.type_rabais,
        type_ui: 'dropdown',
        actif: true,
        ordre: 0,
        groupe_exclusion: null,
        condition_description: row.description_rabais,
      };
    }
    return null;
  }).filter(Boolean);

  let roiModules: Database['public']['Tables']['soumission_roi_modules']['Row'][] = [];
  if (roiRes.data) {
    const { data: modules } = await supabase
      .from('soumission_roi_modules')
      .select('*')
      .eq('soumission_roi_id', roiRes.data.id);
    roiModules = modules || [];
  }

  return {
    soumission: soumissionRes.data,
    etablissements,
    rabais,
    roi: { soumission_roi: roiRes.data, modules: roiModules },
    options: ((optionsRes as any).data || []) as SoumissionOption[],
  };
};

export const changerStatut = async (id: string, statut: string): Promise<void> => {
  const { error } = await supabase
    .from('soumissions')
    .update({ statut, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const supprimerSoumission = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('soumissions')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const dupliquerSoumission = async (id: string): Promise<string> => {
  // Charger la soumission originale
  const { soumission, etablissements, rabais } = await fetchSoumissionById(id);
  const numero = await genererNumero();

  const { data: nouvelle, error } = await supabase
    .from('soumissions')
    .insert({
      numero,
      nom_client: soumission.nom_client,
      statut: 'brouillon',
      total_mensuel: soumission.total_mensuel,
      total_annuel: soumission.total_annuel,
      frais_integration: soumission.frais_integration,
      cout_total_an1: soumission.cout_total_an1,
      frais_integration_offerts: (soumission as any).frais_integration_offerts ?? false,
      notes_internes: soumission.notes_internes,
      notes_personnalisees: (soumission as any).notes_personnalisees,
      parent_id: id,
      date_expiration: soumission.date_expiration,
    })
    .select()
    .single();

  if (error) throw error;

  // Dupliquer les établissements
  if (etablissements.length > 0) {
    await supabase.from('soumission_etablissements').insert(
      etablissements.map(e => ({
        soumission_id: nouvelle.id,
        segment_id: e.segment_id,
        nom_etablissement: e.nom_etablissement,
        nombre_unites: e.nombre_unites,
        est_pilote: e.est_pilote,
        prix_brut: e.prix_brut,
        prix_final: e.prix_final,
      }))
    );
  }

  // Dupliquer les rabais — via les lignes brutes (pas les objets synthétiques)
  const { data: rabaisOriginaux } = await supabase
    .from('soumission_rabais')
    .select('*')
    .eq('soumission_id', id);

  if (rabaisOriginaux && rabaisOriginaux.length > 0) {
    await supabase.from('soumission_rabais').insert(
      (rabaisOriginaux as any[]).map((r: any) => ({
        soumission_id: nouvelle.id,
        rabais_id: r.rabais_id,
        type_rabais: r.type_rabais,
        pourcentage_applique: r.pourcentage_applique,
        description_rabais: r.description_rabais,
      }))
    );
  }

  // Dupliquer les options supplémentaires
  const { data: optionsOriginales } = await (supabase as any)
    .from('soumission_options')
    .select('*')
    .eq('soumission_id', id)
    .order('ordre');

  if (optionsOriginales && optionsOriginales.length > 0) {
    await (supabase as any).from('soumission_options').insert(
      optionsOriginales.map((o: any) => ({
        soumission_id: nouvelle.id,
        nom: o.nom,
        prix_description: o.prix_description,
        ordre: o.ordre,
      }))
    );
  }

  return nouvelle.id;
};

export const exporterCSV = (soumissions: Soumission[]): void => {
  const entetes = ['Numéro', 'Client', 'Statut', 'Total mensuel', 'Total annuel', 'Frais intégration', 'Coût an 1', 'Date création'];
  const lignes = soumissions.map(s => [
    s.numero,
    s.nom_client,
    s.statut,
    s.total_mensuel?.toString() || '0',
    s.total_annuel?.toString() || '0',
    s.frais_integration?.toString() || '0',
    s.cout_total_an1?.toString() || '0',
    s.created_at ? new Date(s.created_at).toLocaleDateString('fr-CA') : '',
  ]);

  const contenu = [entetes, ...lignes]
    .map(l => l.map(c => `"${c}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `soumissions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================
// Sauvegarde complète (soumission + ROI)
// ============================================================

export interface DonneesROISauvegarde {
  budgetAlimentaire: number;
  coutsApprovisionnement: number;
  nbEmployesCuisine: number;
  nbResponsablesCommandes: number;
  nbEmployesTotal: number;
  tauxHoraireCuisine: number;
  tauxHoraireAdmin: number;
  tauxHoraireCompta: number;
  coutGestionDechets: number;
  economiesTotales: number;
  coutOctogoneAnnuel: number;
  roiMultiplicateur: number;
  periodeRetourMois: number;
  modules: Array<{
    moduleId: string;
    selectionne: boolean;
    economieMensuelle: number;
    economieAnnuelle: number;
  }>;
}

export const sauvegarderSoumission = async (params: {
  numero: string;
  nomClient: string;
  totalMensuel: number;
  totalAnnuel: number;
  fraisIntegration: number;
  coutTotalAn1: number;
  fraisIntegrationOfferts: boolean;
  notesInternes: string;
  notesPersonnalisees: string;
  utilisateurId?: string;
  etablissements: Array<{
    segmentId: string;
    nomEtablissement: string;
    nombreUnites: number;
    estPilote: boolean;
    prixBrut: number;
    prixFinal: number;
  }>;
  rabaisToggleIds: string[];
  rabaisDropdown: {
    type: string;
    pourcentage: number;
    description: string;
  };
  dateExpiration: Date;
  roi?: DonneesROISauvegarde;
  options?: Array<{
    nom: string;
    prixDescription: string;
    ordre: number;
  }>;
}) => {
  const { data: soumission, error: errSoumission } = await supabase
    .from('soumissions')
    .insert({
      numero: params.numero,
      nom_client: params.nomClient,
      total_mensuel: params.totalMensuel,
      total_annuel: params.totalAnnuel,
      frais_integration: params.fraisIntegration,
      cout_total_an1: params.coutTotalAn1,
      frais_integration_offerts: params.fraisIntegrationOfferts,
      notes_internes: params.notesInternes,
      notes_personnalisees: params.notesPersonnalisees,
      date_expiration: params.dateExpiration.toISOString(),
      utilisateur_id: params.utilisateurId || null,
    })
    .select()
    .single();

  if (errSoumission) throw errSoumission;

  // Insérer les établissements
  if (params.etablissements.length > 0) {
    const { error: errEtab } = await supabase
      .from('soumission_etablissements')
      .insert(params.etablissements.map(e => ({
        soumission_id: soumission.id,
        segment_id: e.segmentId,
        nom_etablissement: e.nomEtablissement,
        nombre_unites: e.nombreUnites,
        est_pilote: e.estPilote,
        prix_brut: e.prixBrut,
        prix_final: e.prixFinal,
      })));
    if (errEtab) throw errEtab;
  }

  // Insérer les rabais
  const rowsARabais: Array<{
    soumission_id: string;
    rabais_id: string | null;
    type_rabais: string | null;
    pourcentage_applique: number | null;
    description_rabais: string | null;
  }> = [];

  // Toggles (engagement, pilote) → via rabais_id
  for (const id of params.rabaisToggleIds) {
    rowsARabais.push({
      soumission_id: soumission.id,
      rabais_id: id,
      type_rabais: null,
      pourcentage_applique: null,
      description_rabais: null,
    });
  }

  // Rabais dropdown personnalisé
  if (params.rabaisDropdown.type !== 'aucun') {
    rowsARabais.push({
      soumission_id: soumission.id,
      rabais_id: null,
      type_rabais: params.rabaisDropdown.type,
      pourcentage_applique: params.rabaisDropdown.pourcentage,
      description_rabais: params.rabaisDropdown.description || null,
    });
  }

  if (rowsARabais.length > 0) {
    const { error: errRabais } = await supabase
      .from('soumission_rabais')
      .insert(rowsARabais as any);
    if (errRabais) throw errRabais;
  }

  // Insérer les données ROI si présentes
  if (params.roi) {
    const roi = params.roi;
    const { data: roiRecord, error: errRoi } = await supabase
      .from('soumission_roi')
      .insert({
        soumission_id: soumission.id,
        budget_alimentaire: roi.budgetAlimentaire,
        couts_approvisionnement: roi.coutsApprovisionnement,
        nb_employes_cuisine: roi.nbEmployesCuisine,
        nb_responsables_commandes: roi.nbResponsablesCommandes,
        nb_employes_total: roi.nbEmployesTotal,
        taux_horaire_cuisine: roi.tauxHoraireCuisine,
        taux_horaire_admin: roi.tauxHoraireAdmin,
        taux_horaire_comptabilite: roi.tauxHoraireCompta,
        cout_gestion_dechets: roi.coutGestionDechets,
        economies_totales: roi.economiesTotales,
        cout_octogone_annuel: roi.coutOctogoneAnnuel,
        roi_multiplicateur: roi.roiMultiplicateur,
        periode_retour_mois: roi.periodeRetourMois,
      })
      .select()
      .single();
    if (errRoi) throw errRoi;

    // Insérer les modules ROI
    if (roi.modules.length > 0) {
      const { error: errModules } = await supabase
        .from('soumission_roi_modules')
        .insert(roi.modules.map(m => ({
          soumission_roi_id: roiRecord.id,
          module_id: m.moduleId,
          selectionne: m.selectionne,
          economie_mensuelle: m.economieMensuelle,
          economie_annuelle: m.economieAnnuelle,
        })));
      if (errModules) throw errModules;
    }
  }

  // Insérer les options supplémentaires
  if (params.options && params.options.length > 0) {
    await (supabase as any).from('soumission_options').insert(
      params.options.map(o => ({
        soumission_id: soumission.id,
        nom: o.nom,
        prix_description: o.prixDescription,
        ordre: o.ordre,
      }))
    );
  }

  return soumission;
};

// ============================================================
// Segments admin — Mise à jour
// ============================================================

export const updateSegment = async (
  id: string,
  champs: Partial<Pick<Segment, 'prix_unitaire' | 'minimum_mensuel' | 'actif'>>,
): Promise<void> => {
  const { error } = await supabase
    .from('segments')
    .update({ ...champs, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const updatePalier = async (
  id: string,
  champs: Partial<Pick<Palier, 'tarif_mensuel' | 'capacite_min' | 'capacite_max'>>,
): Promise<void> => {
  const { error } = await supabase
    .from('paliers')
    .update(champs)
    .eq('id', id);
  if (error) throw error;
};

export const insertPalier = async (palier: Omit<Palier, 'id'>): Promise<Palier> => {
  const { data, error } = await supabase
    .from('paliers')
    .insert(palier)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deletePalier = async (id: string): Promise<void> => {
  const { error } = await supabase.from('paliers').delete().eq('id', id);
  if (error) throw error;
};

// ============================================================
// Rabais admin
// ============================================================

export const updateRabais = async (
  id: string,
  champs: Partial<Pick<Rabais, 'pourcentage' | 'actif' | 'nom' | 'condition_description'>>,
): Promise<void> => {
  const { error } = await supabase
    .from('rabais')
    .update(champs)
    .eq('id', id);
  if (error) throw error;
};

export const insertRabais = async (rabais: Omit<Rabais, 'id'>): Promise<Rabais> => {
  const { data, error } = await supabase
    .from('rabais')
    .insert(rabais)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteRabais = async (id: string): Promise<void> => {
  const { error } = await supabase.from('rabais').delete().eq('id', id);
  if (error) throw error;
};

// ============================================================
// Utilisateurs admin
// ============================================================

export const fetchUtilisateurs = async (): Promise<Utilisateur[]> => {
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const insertUtilisateur = async (u: Omit<Utilisateur, 'id' | 'created_at'>): Promise<Utilisateur> => {
  const { data, error } = await supabase
    .from('utilisateurs')
    .insert(u)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateUtilisateur = async (
  id: string,
  champs: Partial<Pick<Utilisateur, 'actif' | 'role' | 'nom' | 'email'>>,
): Promise<void> => {
  const { error } = await supabase
    .from('utilisateurs')
    .update(champs)
    .eq('id', id);
  if (error) throw error;
};

// ============================================================
// Audit Log
// ============================================================

export const fetchAuditLog = async (filtres?: {
  utilisateurId?: string;
  table?: string;
  dateDebut?: string;
  dateFin?: string;
}): Promise<AuditLog[]> => {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (filtres?.utilisateurId) {
    query = query.eq('utilisateur_id', filtres.utilisateurId);
  }
  if (filtres?.table) {
    query = query.eq('table_modifiee', filtres.table);
  }
  if (filtres?.dateDebut) {
    query = query.gte('created_at', filtres.dateDebut);
  }
  if (filtres?.dateFin) {
    query = query.lte('created_at', filtres.dateFin);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const logAudit = async (entry: {
  tableModifiee: string;
  enregistrementId?: string;
  champ?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
  description: string;
}): Promise<void> => {
  await supabase.from('audit_log').insert({
    table_modifiee: entry.tableModifiee,
    enregistrement_id: entry.enregistrementId,
    champ: entry.champ,
    ancienne_valeur: entry.ancienneValeur,
    nouvelle_valeur: entry.nouvelleValeur,
    description: entry.description,
  });
};

export const rollbackAuditEntry = async (log: AuditLog): Promise<void> => {
  if (!log.ancienne_valeur || !log.champ || !log.enregistrement_id) return;

  const table = log.table_modifiee as 'segments' | 'rabais' | 'config' | 'parametres_roi' | 'paliers';
  const update: Record<string, string | number> = {};

  // Tenter de parser comme nombre
  const parsed = parseFloat(log.ancienne_valeur);
  update[log.champ] = isNaN(parsed) ? log.ancienne_valeur : parsed;

  const { error } = await supabase
    .from(table)
    .update(update)
    .eq('id', log.enregistrement_id);

  if (error) throw error;
};
