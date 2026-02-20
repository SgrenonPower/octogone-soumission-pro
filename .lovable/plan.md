
# Refonte Stratégique — "Vos Pertes Invisibles" + Enrichissement des soumissions

## Analyse de l'état actuel

Après lecture complète des fichiers impactés, voici ce qui existe déjà vs. ce qui est vraiment nouveau :

**Déjà implémenté (ne pas retoucher) :**
- `supabase-queries.ts` : le join `modules_roi(nom, description)` est déjà en place (lignes 252-258) — aucune modification nécessaire ici
- `SoumissionPDF.tsx` : la structure "Votre investissement" + prix barrés + 3 cartes + "Ce que vous gagnez" + "Le verdict" existe déjà
- `SoumissionDetail.tsx` : le bloc "Argument ROI" en haut et les prix barrés dans le tableau existent déjà
- `SoumissionPresentation.tsx` : la structure avec prix barrés, cartes, ROI et verdict est déjà là

**Ce qui est RÉELLEMENT NOUVEAU dans ce prompt :**
- La **Section "Vos pertes invisibles"** (Section A) — entièrement nouvelle dans les 3 fichiers
- Elle doit s'insérer AVANT la section "Votre investissement" dans le PDF et la Présentation
- Elle contient : grille de cartes dynamiques (module → icône + perte + stat choc) + encadré chiffre-choc personnalisé avec le budget alimentaire

---

## Ce qui change par fichier

### 1. `src/components/pdf/SoumissionPDF.tsx` — Ajouter la section "Vos pertes invisibles"

Insérer entre le bloc "CLIENT" (ligne ~129) et la "SECTION 1 : VOTRE INVESTISSEMENT" (ligne ~131) un nouveau bloc conditionnel :

```
{hasRoi && (
  <div className="pdf-page-break pdf-no-break" style={{ ... }}>
    {/* Titre */}
    "Ce que vos factures ne vous montrent pas"
    
    {/* Sous-titre en italique */}
    "Vos factures alimentaires vous indiquent combien vous dépensez..."
    
    {/* Grille de cartes — fond #FEF2F2, bordure #FECACA */}
    {modulesSelectionnes.map(m => {
      const perte = MODULE_TO_PERTE[m.modules_roi?.slug ou nom];
      return (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px' }}>
          {/* icône (texte emoji ou label) */}
          <div style={{ fontWeight: 700 }}>{perte.titre}</div>
          <div style={{ fontSize: '9pt', color: '#6b7280' }}>{perte.description}</div>
          <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 4, padding: '3px 8px', fontSize: '8pt', fontWeight: 700 }}>
            {perte.stat}
          </div>
        </div>
      );
    })}
    
    {/* Chiffre-choc si budget > 0 */}
    {budgetAlimentaire > 0 && (
      <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '14px' }}>
        "En moyenne... Pour un budget de {budgetAlimentaire} $, cela représente entre
        {budgetAlimentaire × 0.05} $ et {budgetAlimentaire × 0.15} $..."
      </div>
    )}
  </div>
)}
```

**Correspondance module → perte** (table de mapping statique dans le fichier) :
Le mapping se fait par le **nom** du module (ou slug si disponible). Puisque `m.modules_roi?.nom` est disponible via le join, on peut matcher par nom partiel ou slug. La table de mapping est :

```typescript
const PERTES_INVISIBLES: Record<string, { titre: string; description: string; stat: string }> = {
  'thermometres': { titre: 'Bris de chaîne de froid', description: 'Pertes alimentaires dues aux variations de température non détectées', stat: '60 % des cuisines : au moins 1 incident/an' },
  'produits-recettes': { titre: 'Gaspillage par surproduction', description: 'Sans recettes standardisées, chaque cuisinier prépare "à peu près"', stat: '4 à 10 % des achats alimentaires gaspillés' },
  'inventaires': { titre: 'Commandes à l\'aveugle', description: 'Sans visibilité sur les stocks, on commande en double ou trop tard', stat: '5 à 10 % des approvisionnements perdus' },
  'inventaires-temps-reel': { titre: 'Écarts invisibles', description: 'Les incongruités d\'inventaire passent inaperçues pendant des semaines', stat: 'Pertes non détectées pendant des mois' },
  'facturation': { titre: 'Heures perdues en saisie manuelle', description: 'La facturation papier consomme un temps fou et génère des erreurs', stat: '65 heures/an de travail administratif évitable' },
  'paniers-commandes': { titre: 'Temps perdu en commandes manuelles', description: 'Chaque responsable passe des heures à commander', stat: '50 heures/an par responsable' },
  'ressources-humaines': { titre: 'Administration RH manuelle', description: 'Horaires, paies, suivis — tout est fait à la main', stat: '72 heures/an en gestion RH évitable' },
  'taches-repetitives': { titre: 'Tâches répétées sans automatisation', description: 'Des heures chaque semaine à refaire les mêmes vérifications', stat: '2 à 5 heures/semaine gaspillées' },
};
```

Le lookup se fait par `m.modules_roi?.slug` (de la table `modules_roi`, champ `slug` existant) — mais puisque `soumission_roi_modules` fait le join sur `modules_roi(nom, description)` uniquement (pas `slug`), il faut enrichir le select pour inclure aussi `slug`.

**Ajustement dans `supabase-queries.ts` :** modifier le join de :
```ts
.select('*, modules_roi(nom, description)')
```
vers :
```ts
.select('*, modules_roi(nom, description, slug)')
```

Le type `SoumissionRoiModule` dans le PDF doit aussi inclure `slug` dans `modules_roi`.

### 2. `src/pages/SoumissionPresentation.tsx` — Même section, thème sidebar

Même logique de mapping, mais avec les couleurs du thème sidebar (C.bg, C.fg, etc.).

Les cartes "pertes invisibles" ont un fond rouge-orangé adapté au thème dark :
- Fond : `rgba(239, 68, 68, 0.12)` (rouge pâle translucide)
- Bordure : `rgba(239, 68, 68, 0.3)`
- Stat : `rgba(239, 68, 68, 0.85)` sur fond `rgba(239, 68, 68, 0.2)`

La section s'insère entre l'en-tête client (bloc "Titre client") et la section "Votre investissement".

L'encadré chiffre-choc adapté au thème sidebar :
- Fond : `rgba(245, 158, 11, 0.08)` (orange très pâle)
- Bordure : `rgba(245, 158, 11, 0.3)`

### 3. `src/pages/SoumissionDetail.tsx` — Aucune modification requise

Le fichier est déjà complet avec toutes les fonctionnalités requises (prix barrés, synthèse ROI en haut, noms des modules). La section "Vos pertes invisibles" n'est pas demandée pour la vue interne vendeur.

---

## Modifications techniques détaillées

### Étape 1 — `src/lib/supabase-queries.ts`

Ligne 256 : changer le select du join pour inclure `slug` :
```ts
// Avant :
.select('*, modules_roi(nom, description)')
// Après :
.select('*, modules_roi(nom, description, slug)')
```

Et mettre à jour le type TypeScript correspondant (ligne 252) :
```ts
// Avant :
{ nom: string; description: string | null } | null
// Après :
{ nom: string; description: string | null; slug: string } | null
```

### Étape 2 — `src/components/pdf/SoumissionPDF.tsx`

1. Mettre à jour le type `SoumissionRoiModule` (ligne 7-9) pour inclure `slug` dans `modules_roi`
2. Ajouter la constante de mapping `PERTES_INVISIBLES` en dehors du composant
3. Ajouter une fonction helper `getPerte(slug: string)` pour retrouver la perte par slug
4. Insérer la section "Vos pertes invisibles" entre le bloc CLIENT et la SECTION 1, conditionnée par `hasRoi`
5. Le layout de la grille en PDF utilise `display: grid, gridTemplateColumns: '1fr 1fr'` (2 colonnes) pour max 4 cartes
6. Le budget alimentaire vient de `roi?.budget_alimentaire`

### Étape 3 — `src/pages/SoumissionPresentation.tsx`

1. Ajouter les mêmes imports d'icônes nécessaires (les icônes lucide-react ne fonctionnent pas dans le PDF inline, mais fonctionnent dans la présentation React)
2. Ajouter la même constante `PERTES_INVISIBLES` (partagée ou dupliquée)
3. Insérer la section après le bloc "Titre client" (section avec `soumission.nom_client`)
4. Pour la présentation, utiliser de vraies icônes Lucide-React dans les cartes (Thermometer, BookOpen, Package, BarChart3, FileText, ShoppingCart, Users, Repeat)
5. Le budget alimentaire vient de `roi.soumission_roi?.budget_alimentaire`

---

## Architecture du mapping module → perte

La correspondance se base sur le champ `slug` de `modules_roi` (déjà en base, déjà utilisé dans `roi-calc.ts`) :

```
thermometres           → Bris de chaîne de froid
produits-recettes      → Gaspillage par surproduction  
inventaires            → Commandes à l'aveugle
inventaires-temps-reel → Écarts invisibles
facturation            → Heures perdues en saisie manuelle
paniers-commandes      → Temps perdu en commandes manuelles
ressources-humaines    → Administration RH manuelle
taches-repetitives     → Tâches répétées sans automatisation
```

---

## Résumé des fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/lib/supabase-queries.ts` | Ajouter `slug` dans le join `modules_roi(nom, description, slug)` |
| `src/components/pdf/SoumissionPDF.tsx` | Ajouter section "Vos pertes invisibles" avant "Votre investissement" |
| `src/pages/SoumissionPresentation.tsx` | Ajouter section "Vos pertes invisibles" avec thème sidebar + icônes Lucide |
| `src/pages/SoumissionDetail.tsx` | Aucune modification — déjà complet |

---

## Ce qui ne change PAS

- La logique ROI (`roi-calc.ts`)
- La section "Votre investissement" (prix barrés + 3 cartes) — déjà en place
- La section "Ce que vous gagnez" (tableau ROI) — déjà en place
- La section "Le verdict" — déjà en place
- Les conditions générales, notes, pied de page
- Les pages Admin, Calculateur, Soumissions (liste)
- Aucune migration base de données

---

## Condition d'affichage de la section "Vos pertes invisibles"

La section s'affiche UNIQUEMENT si `hasRoi` est vrai (des modules ROI sont sélectionnés). Sans ROI actif, toute la section est masquée — conforme à la spec.

L'encadré chiffre-choc personnalisé s'affiche UNIQUEMENT si `budgetAlimentaire > 0`.
