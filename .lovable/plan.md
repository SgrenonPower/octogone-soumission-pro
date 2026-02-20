
# Corrections PDF — 5 bugs identifiés

## Analyse des bugs

### Bug 1 — Portée markdown brut (SoumissionPDF.tsx ligne 259, SoumissionPresentation.tsx ligne 184)
Le texte `textePortee` est affiché directement sans nettoyage. Si l'administrateur a saisi du markdown dans la config (`**Portée des services**`), les astérisques s'affichent tels quels. Une fonction `nettoyerMarkdown` doit être appliquée avant l'affichage dans les deux composants.

### Bug 2 — Verdict bénéfice net inversé (SoumissionPDF.tsx ligne 546, SoumissionPresentation.tsx ligne 488)
Le code actuel force toujours un signe `+` et utilise `Math.abs()` :
```tsx
+{formatMontant(Math.abs(beneficeNetAnn))} / an {beneficePositif ? '✓' : ''}
```
Quand `beneficeNetAnn = -35265`, cela affiche `+35 265,20 $ / an` sans le `✓` mais avec un message "Ce scénario ne génère pas encore de bénéfice net" — incohérent.

Le fix : afficher le montant réel (négatif) en rouge quand négatif, positif en vert quand positif.

### Bug 3 — Options prix (non-bug)
La logique `opt.prix_description || 'Sur demande'` est correcte dans les deux composants. La sauvegarde mappe `prixDescription → prix_description` correctement (supabase-queries.ts ligne 659). Les valeurs "1" et "12" vues lors de la démo étaient des données de test saisies manuellement avec des descriptions numériques. Pas de correction de code nécessaire.

### Bug 4 — Double bullets dans les notes (SoumissionPDF.tsx ligne 624, SoumissionPresentation.tsx ligne 564)
Le code fait `• {ligne}` sans vérifier si `ligne` commence déjà par un bullet. Résultat : `• • texte`. La solution : une fonction `formaterLigneNote` qui normalise les bullets existants ou en ajoute un si absent.

### Bug 5 — Carte 1re année montant barré = montant final (SoumissionPDF.tsx lignes 462-479)
Quand `fraisOfferts = true` :
- Prix affiché = `totalAnnuel` (frais = 0 car offerts) ✓
- Prix barré = `coutAn1` = `totalAnnuel + 0` = `totalAnnuel` ← identique, donc le barré ne sert à rien

Le prix barré doit être `totalAnnuel + fraisInt` (le vrai coût si les frais n'étaient pas offerts). Le même problème existe dans `SoumissionPresentation.tsx` ligne 402 où `coutAn1` est utilisé comme barré.

## Corrections à apporter

### Fichier 1 : `src/components/pdf/SoumissionPDF.tsx`

**Ajouter la fonction `nettoyerMarkdown`** avant le composant (après les constantes P) :
```typescript
const nettoyerMarkdown = (texte: string): string =>
  texte
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '• ')
    .trim();
```

**Ajouter la fonction `formaterLigneNote`** :
```typescript
const formaterLigneNote = (ligne: string): string => {
  const t = ligne.trim();
  if (t.startsWith('•')) return t;
  if (t.startsWith('- ') || t.startsWith('* ')) return '• ' + t.slice(2);
  return '• ' + t;
};
```

**Bug 1 fix** — ligne 259 : remplacer `{textePortee}` par `{nettoyerMarkdown(textePortee)}`

**Bug 2 fix** — bloc verdict (lignes 543-558) : remplacer l'affichage du BÉNÉFICE NET pour distinguer positif/négatif :
```tsx
<span style={{ fontWeight: 800, fontSize: '14pt', color: beneficePositif ? P.green : P.red }}>
  {beneficePositif ? '+' : ''}{formatMontant(beneficeNetAnn)} / an {beneficePositif ? '✓' : ''}
</span>
```
Note : `formatMontant` formate déjà les nombres négatifs avec le signe `−`, donc pas besoin de `Math.abs()` pour le cas négatif.

**Bug 4 fix** — ligne 624 : remplacer `• {ligne}` par `{formaterLigneNote(ligne)}`

**Bug 5 fix** — carte 1re année (lignes 457-479) : calculer `coutAn1Regulier = totalAnnuel + fraisInt` et l'utiliser comme montant barré :
```tsx
{/* Prix barré = annuel + frais d'intégration (avant remise) */}
{fraisOfferts && (totalAnnuel + fraisInt) > totalAnnuel && (
  <div style={{ textDecoration: 'line-through', color: P.grayLight, fontSize: '8.5pt' }}>
    {formatMontant(totalAnnuel + fraisInt)}
  </div>
)}
<div style={{ fontSize: '15pt', fontWeight: 800, color: P.dark }}>
  {formatMontant(coutAn1)}  {/* = totalAnnuel quand frais offerts */}
</div>
{fraisOfferts ? (
  <div style={{ fontSize: '8.5pt', color: P.green, fontWeight: 600 }}>
    Intégration : <span style={{ textDecoration: 'line-through', color: P.grayLight }}>
      {formatMontant(fraisInt)}
    </span> → Offerts ✓ — {libelleOfferteRaison}
  </div>
) : (
  fraisInt > 0 && (
    <div style={{ fontSize: '8.5pt', color: P.gray }}>dont {formatMontant(fraisInt)} d'intégration</div>
  )
)}
```

### Fichier 2 : `src/pages/SoumissionPresentation.tsx`

**Ajouter les mêmes fonctions utilitaires** `nettoyerMarkdown` et `formaterLigneNote` au début du composant (dans les calculs).

**Bug 1 fix** — ligne 184 : `{textePortee}` → `{nettoyerMarkdown(textePortee)}`

**Bug 2 fix** — ligne 488 : remplacer le bloc bénéfice net pour distinguer positif/négatif :
```tsx
<span className="text-2xl font-bold"
  style={{ color: beneficePositif ? '#10b981' : '#dc2626' }}>
  {beneficePositif ? '+' : ''}{formatMontant(beneficeNetAnn)} / an
  {beneficePositif && ' ✓'}
</span>
```
Et les messages contextuels négatif/positif dans le verdict texte (lignes 513-515) doivent aussi refléter le vrai bénéfice.

**Bug 4 fix** — ligne 564 : `• {ligne}` → `{formaterLigneNote(ligne)}`

**Bug 5 fix** — carte 1re année (lignes 391-415) : même logique que le PDF — utiliser `totalAnnuel + fraisInt` comme montant barré quand les frais sont offerts.

## Fichiers modifiés

| Fichier | Bugs corrigés |
|---------|--------------|
| `src/components/pdf/SoumissionPDF.tsx` | Bug 1, 2, 4, 5 |
| `src/pages/SoumissionPresentation.tsx` | Bug 1, 2, 4, 5 |

## Tests de validation post-correction

1. La portée s'affiche sans astérisques ni markdown brut (test avec texte contenant `**gras**`)
2. Quand économies < investissement → bénéfice net négatif en rouge (ex. : `−35 265,20 $`)
3. Quand économies > investissement → bénéfice net positif en vert (ex. : `+12 500,00 $`)
4. Les notes n'ont qu'un seul bullet par ligne (test avec texte commençant par `• `, `-` ou `*`)
5. Carte 1re année avec frais offerts multi-sites : montant barré = annuel + frais intégration ; montant principal = annuel seul ; libellé "Intégration : [barré] → Offerts ✓ — multi-sites"
6. Les mêmes corrections s'appliquent dans la vue Présentation
