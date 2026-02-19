// Formatage canadien-français

/**
 * Formate un montant en dollars canadiens
 * Ex: 1234.56 → "1 234,56 $"
 */
export const formatMontant = (valeur: number | null | undefined): string => {
  if (valeur === null || valeur === undefined || isNaN(valeur)) return '0,00 $';
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valeur);
};

/**
 * Formate un pourcentage avec 1 décimale
 * Ex: 15 → "15,0 %"
 */
export const formatPourcentage = (valeur: number): string => {
  return new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valeur) + ' %';
};

/**
 * Formate une date en format québécois
 * Ex: "17 février 2025"
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

/**
 * Génère un numéro de soumission unique
 * Ex: "OCT-2025-001"
 */
export const genererNumeroSoumission = (dernierNumero: number): string => {
  const annee = new Date().getFullYear();
  const numero = String(dernierNumero + 1).padStart(3, '0');
  return `OCT-${annee}-${numero}`;
};
