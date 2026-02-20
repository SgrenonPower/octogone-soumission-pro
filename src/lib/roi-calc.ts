// ============================================================
// Calcul ROI — Octogone 360
// Les paramètres sont chargés depuis la table `parametres_roi`
// ============================================================

import { ModuleRoi, ParametreRoi } from './supabase-queries';

export interface DonneesROI {
  nbEtablissements: number;
  budgetAlimentaire: number;
  coutsApprovisionnement: number;
  nbEmployesCuisine: number;
  nbResponsablesCommandes: number;
  nbEmployesTotal: number;
  tauxHoraireCuisine: number;
  tauxHoraireAdmin: number;
  tauxHoraireCompta: number;
  coutGestionDechets: number;
}

export interface ResultatModule {
  moduleId: string;
  slug: string;
  nom: string;
  economieAnnuelle: number;
  economieMensuelle: number;
  selectionne: boolean;
}

export interface ResultatROI {
  modules: ResultatModule[];
  economiesTotales: number;
  coutOctogoneAnnuel: number;
  beneficeNet: number;
  roiMultiplicateur: number;
  periodeRetourMois: number;
}

// Récupère la valeur d'un paramètre par clé pour un module donné
const getParam = (
  params: ParametreRoi[],
  moduleId: string,
  cle: string,
  defaut: number,
): number => {
  const p = params.find(p => p.module_id === moduleId && p.cle === cle);
  return p ? Number(p.valeur) : defaut;
};

// ---- Formules par module ----

export const calculerThermometres = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const saisieMin = getParam(params, moduleId, 'economie_saisie_min', 170);
  const saisieMax = getParam(params, moduleId, 'economie_saisie_max', 195);
  const reductionPertesAlim = getParam(params, moduleId, 'reduction_pertes_alim', 0.0075);
  const economieEnergieAnn = getParam(params, moduleId, 'economie_energie_annuelle', 480);
  const reductionDechets = getParam(params, moduleId, 'reduction_dechets', 0.15);

  const saisieMoy = (saisieMin + saisieMax) / 2;
  const economiesSaisie = saisieMoy * 12;
  const economiesPertesAlim = donnees.budgetAlimentaire * reductionPertesAlim;
  const economiesDechets = donnees.coutGestionDechets * reductionDechets;
  const economiesEnergie = economieEnergieAnn;

  return economiesSaisie + economiesPertesAlim + economiesDechets + economiesEnergie;
};

export const calculerProduitsRecettes = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const reductionMin = getParam(params, moduleId, 'reduction_gaspillage_min', 0.10);
  const reductionMax = getParam(params, moduleId, 'reduction_gaspillage_max', 0.15);
  const heuresParEmploye = getParam(params, moduleId, 'heures_recherche_par_employe', 25);
  const heuresCout = getParam(params, moduleId, 'heures_cout_recettes', 50);

  const reductionMoy = (reductionMin + reductionMax) / 2;
  const economiesGaspillage = donnees.budgetAlimentaire * reductionMoy;
  const gainsTempsRecherche = donnees.nbEmployesCuisine * heuresParEmploye * donnees.tauxHoraireCuisine;
  const gainsTempsRecettes = heuresCout * donnees.tauxHoraireCuisine;

  return economiesGaspillage + gainsTempsRecherche + gainsTempsRecettes;
};

export const calculerGestionInventaires = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const economieBaseMensuelle = getParam(params, moduleId, 'economie_base_mensuelle', 950);
  const reductionApproMin = getParam(params, moduleId, 'reduction_appro_min', 0.05);
  const reductionApproMax = getParam(params, moduleId, 'reduction_appro_max', 0.10);

  const reductionApproMoy = (reductionApproMin + reductionApproMax) / 2;
  const economiesBase = economieBaseMensuelle * 12 * donnees.nbEtablissements;
  const economiesAppro = donnees.coutsApprovisionnement * reductionApproMoy;

  return economiesBase + economiesAppro;
};

export const calculerInventairesTempsReel = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const economieCommandesMensuelle = getParam(params, moduleId, 'economie_commandes_mensuelle', 300);
  const economieSuiviMensuel = getParam(params, moduleId, 'economie_suivi_mensuel', 100);
  const heuresIncongruites = getParam(params, moduleId, 'heures_incongruites', 4);

  const economiesCommandes = economieCommandesMensuelle * 12 * donnees.nbEtablissements;
  const economiesSuivi = economieSuiviMensuel * 12 * donnees.nbEtablissements;
  const economiesIncongruites = heuresIncongruites * donnees.tauxHoraireAdmin * 12 * donnees.nbEtablissements;

  return economiesCommandes + economiesSuivi + economiesIncongruites;
};

export const calculerFacturation = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const heuresEconomisees = getParam(params, moduleId, 'heures_economisees_an', 65);
  return heuresEconomisees * donnees.tauxHoraireCompta;
};

export const calculerPaniers = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const heuresParResponsable = getParam(params, moduleId, 'heures_par_responsable', 50);
  return donnees.nbResponsablesCommandes * heuresParResponsable * donnees.tauxHoraireAdmin;
};

export const calculerRH = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const heuresRH = getParam(params, moduleId, 'heures_rh_an', 72);
  const heuresComptaRH = getParam(params, moduleId, 'heures_compta_rh_an', 12);
  return (heuresRH * donnees.tauxHoraireAdmin) + (heuresComptaRH * donnees.tauxHoraireCompta);
};

export const calculerTachesRepetitives = (
  donnees: DonneesROI,
  moduleId: string,
  params: ParametreRoi[],
): number => {
  const heuresMin = getParam(params, moduleId, 'heures_min_semaine', 2);
  const heuresMax = getParam(params, moduleId, 'heures_max_semaine', 5);
  const heuresMoy = (heuresMin + heuresMax) / 2;
  return heuresMoy * 52 * donnees.tauxHoraireAdmin;
};

// Dispatcher par slug
const calculerParSlug: Record<
  string,
  (donnees: DonneesROI, moduleId: string, params: ParametreRoi[]) => number
> = {
  'thermometres': calculerThermometres,
  'produits-recettes': calculerProduitsRecettes,
  'gestion-inventaires': calculerGestionInventaires,
  'inventaires-temps-reel': calculerInventairesTempsReel,
  'facturation': calculerFacturation,
  'paniers': calculerPaniers,
  'rh': calculerRH,
  'taches-repetitives': calculerTachesRepetitives,
};

// ---- Calcul principal ----

export const calculerROI = (
  donnees: DonneesROI,
  modules: ModuleRoi[],
  params: ParametreRoi[],
  modulesSelectionnes: Set<string>,
  coutOctoMensuelParEtab: number,
): ResultatROI => {
  const resultatsModules: ResultatModule[] = modules.map(module => {
    const selectionne = modulesSelectionnes.has(module.id);
    const calcFn = calculerParSlug[module.slug];
    const economieAnnuelle = selectionne && calcFn
      ? Math.round(calcFn(donnees, module.id, params) * 100) / 100
      : 0;

    return {
      moduleId: module.id,
      slug: module.slug,
      nom: module.nom,
      economieAnnuelle,
      economieMensuelle: Math.round((economieAnnuelle / 12) * 100) / 100,
      selectionne,
    };
  });

  const economiesTotales = resultatsModules
    .filter(m => m.selectionne)
    .reduce((acc, m) => acc + m.economieAnnuelle, 0);

  const coutOctogoneAnnuel = donnees.nbEtablissements * coutOctoMensuelParEtab * 12;
  const beneficeNet = economiesTotales - coutOctogoneAnnuel;
  const roiMultiplicateur = coutOctogoneAnnuel > 0
    ? Math.round((economiesTotales / coutOctogoneAnnuel) * 10) / 10
    : 0;
  const periodeRetourMois = economiesTotales > 0
    ? Math.round((coutOctogoneAnnuel / (economiesTotales / 12)) * 10) / 10
    : 0;

  return {
    modules: resultatsModules,
    economiesTotales: Math.round(economiesTotales * 100) / 100,
    coutOctogoneAnnuel: Math.round(coutOctogoneAnnuel * 100) / 100,
    beneficeNet: Math.round(beneficeNet * 100) / 100,
    roiMultiplicateur,
    periodeRetourMois,
  };
};
