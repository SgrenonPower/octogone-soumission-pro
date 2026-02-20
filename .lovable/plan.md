
# Ajout mention TPS/TVQ + Bloc Acceptation/Signature

## État actuel — Ce qui est déjà en place

Après lecture complète du fichier `SoumissionPDF.tsx` (594 lignes), voici ce qui existe :

- Sections A ("Vos pertes invisibles"), B ("Votre investissement"), C ("Ce que vous gagnez") et D ("Le verdict") — toutes déjà implémentées dans le PDF et la Présentation
- Section "Portée" — déjà en place
- Section "Conditions générales" (lignes 576-582) — texte actuel sans mention TPS/TVQ
- Pied de page (lignes 584-589) — directement après les conditions

## Ce qui est NOUVEAU dans cette demande

Deux changements ciblés uniquement :

### 1. Mention TPS/TVQ dans les conditions générales

Le texte actuel du fallback (ligne 80-81) ne mentionne pas les taxes. Le texte dans la DB non plus.

**Nouveau texte complet :**
```
Les prix sont en dollars canadiens (CAD) et n'incluent pas les taxes applicables (TPS/TVQ). Cette soumission est valide pour une période de 30 jours à compter de la date d'émission. Les prix sont sujets à changement sans préavis après la date d'expiration. Les frais d'intégration sont payables à la signature du contrat. Le prix mensuel s'applique à compter de la mise en service de chaque établissement.
```

Changements requis :
- **Migration SQL** : `UPDATE public.config SET valeur = '...' WHERE cle = 'conditions_generales'`
- **Code** (`SoumissionPDF.tsx`, ligne 81) : mettre à jour la valeur de fallback identique au texte DB

### 2. Bloc Acceptation / Signature (PDF uniquement)

À insérer entre le bloc "CONDITIONS" (qui se termine à la ligne 582) et le "PIED DE PAGE" (qui commence à la ligne 584).

Structure visuelle :
```
Acceptation
───────────
En signant ce document, le client confirme avoir pris connaissance des
termes et conditions et accepte la présente soumission.

Nom : ________________________________    Date : ____ / ____ / ______

Signature : ___________________________
```

Styles :
- `pageBreakInside: 'avoid'` pour éviter la coupure entre deux pages
- Titre "Acceptation" : 11pt, gras, `#1e3a5f`
- Texte descriptif : 9pt, gris (`#6b7280`)
- Lignes de signature : créées avec des `border-bottom` sur des `span` inline pour un rendu propre à l'impression
- Séparateur : `borderTop: '1px solid #e5e7eb'` identique aux conditions

Ce bloc **n'est pas ajouté** dans `SoumissionPresentation.tsx` ni dans `SoumissionDetail.tsx`.

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| Migration SQL | `UPDATE config SET valeur = '...' WHERE cle = 'conditions_generales'` |
| `src/components/pdf/SoumissionPDF.tsx` | 1. Mettre à jour le texte fallback ligne 81 ; 2. Insérer le bloc Acceptation entre lignes 582 et 584 |

## Ce qui ne change PAS

- `SoumissionPresentation.tsx` — aucune modification
- `SoumissionDetail.tsx` — aucune modification
- Toutes les sections A/B/C/D déjà implémentées
- La page Admin ConfigSoumissions — le champ conditions générales existant permet déjà de modifier ce texte via l'interface
