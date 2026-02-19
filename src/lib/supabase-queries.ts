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

// Chargement des segments actifs
export const fetchSegments = async (): Promise<Segment[]> => {
  const { data, error } = await supabase
    .from('segments')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Chargement des paliers d'un segment
export const fetchPaliers = async (segmentId: string): Promise<Palier[]> => {
  const { data, error } = await supabase
    .from('paliers')
    .select('*')
    .eq('segment_id', segmentId)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Chargement de tous les paliers
export const fetchAllPaliers = async (): Promise<Palier[]> => {
  const { data, error } = await supabase
    .from('paliers')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Chargement des rabais actifs
export const fetchRabais = async (): Promise<Rabais[]> => {
  const { data, error } = await supabase
    .from('rabais')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Chargement de la configuration
export const fetchConfig = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase
    .from('config')
    .select('*');
  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach(c => { map[c.cle] = c.valeur; });
  return map;
};

// Chargement des modules ROI actifs
export const fetchModulesRoi = async (): Promise<ModuleRoi[]> => {
  const { data, error } = await supabase
    .from('modules_roi')
    .select('*')
    .eq('actif', true)
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Chargement des paramètres ROI
export const fetchParametresRoi = async (): Promise<ParametreRoi[]> => {
  const { data, error } = await supabase
    .from('parametres_roi')
    .select('*')
    .order('ordre');
  if (error) throw error;
  return data || [];
};

// Génère le prochain numéro de soumission
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

// Sauvegarde une soumission complète
export const sauvegarderSoumission = async (params: {
  numero: string;
  nomClient: string;
  totalMensuel: number;
  totalAnnuel: number;
  fraisIntegration: number;
  coutTotalAn1: number;
  notesInternes: string;
  etablissements: Array<{
    segmentId: string;
    nomEtablissement: string;
    nombreUnites: number;
    estPilote: boolean;
    prixBrut: number;
    prixFinal: number;
  }>;
  rabaisIds: string[];
  dateExpiration: Date;
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
      notes_internes: params.notesInternes,
      date_expiration: params.dateExpiration.toISOString(),
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
  if (params.rabaisIds.length > 0) {
    const { error: errRabais } = await supabase
      .from('soumission_rabais')
      .insert(params.rabaisIds.map(id => ({
        soumission_id: soumission.id,
        rabais_id: id,
      })));
    if (errRabais) throw errRabais;
  }

  return soumission;
};
