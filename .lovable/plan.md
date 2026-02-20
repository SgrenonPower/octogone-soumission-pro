
# Audit complet — État de l'implémentation

## Résumé

Après lecture complète de chaque fichier concerné et requête directe à la base de données, **l'ensemble des 7 modifications demandées est déjà en place**. Aucune action de développement n'est nécessaire.

---

## Vérification par fichier

### Base de données — TOUT EST EN PLACE

Requête directe sur `public.config` :

- `conditions_generales` : commence exactement par *"Les prix sont en dollars canadiens (CAD) et n'incluent pas les taxes applicables (TPS/TVQ)..."* — texte complet conforme.
- `texte_portee_defaut` : présent avec la valeur *"Octogone est une solution intégrée de gestion alimentaire..."*
- Colonne `texte_portee` : présente dans la table `soumissions` (confirmé par `information_schema.columns`).

### `src/lib/supabase-queries.ts` — COMPLET

- Ligne 256 : `.select('*, modules_roi(nom, description, slug)')` — le join est en place.
- Ligne 465 : `texte_portee: params.textePortee || null` — la sauvegarde inclut le champ.
- Ligne 304 : `texte_portee: (soumission as any).texte_portee || null` — la duplication inclut le champ.

### `src/components/pdf/SoumissionPDF.tsx` — COMPLET (618 lignes)

Structure vérifiée section par section :

1. En-tête (ligne 156)
2. Bloc CLIENT (ligne 175)
3. Bloc PORTÉE (lignes 186-201) — texte dynamique avec fallback config
4. Section "VOS PERTES INVISIBLES" (lignes 203-278) — conditionnel `hasRoi`, grille 2 colonnes, chiffre-choc budget alimentaire
5. Section "VOTRE INVESTISSEMENT" (lignes 280-424) — tableau avec prix barrés, badges rabais, 3 cartes récapitulatives
6. Section "CE QUE VOUS GAGNEZ" (lignes 426-523) — tableau ROI avec `m.modules_roi?.nom`, verdict comparatif, paragraphe conclusion
7. OPTIONS (ligne 525), NOTES (ligne 555)
8. CONDITIONS GÉNÉRALES (lignes 576-582) — mention TPS/TVQ depuis `config.conditions_generales`
9. Bloc ACCEPTATION / SIGNATURE (lignes 584-606) — `pageBreakInside: 'avoid'`, lignes Nom, Date, Signature
10. PIED DE PAGE (ligne 608)

### `src/pages/SoumissionPresentation.tsx` — COMPLET (581 lignes)

- Section PORTÉE (lignes 173-188) — italique centré, fallback config
- Section "VOS PERTES INVISIBLES" (lignes 190-271) — conditionnel `hasRoi`, cartes avec icônes Lucide, chiffre-choc
- Section "VOTRE INVESTISSEMENT" (lignes 273-416) — tableau avec prix barrés, badges, 3 cartes
- Section ROI + VERDICT (lignes 419-522) — vrais noms modules, bloc verdict, paragraphe conclusion
- PAS de bloc Acceptation/Signature — conforme à la demande

### `src/pages/SoumissionDetail.tsx` — COMPLET (471 lignes)

- Synthèse ROI en haut (lignes 221-252) — 4 cartes : Économies, Investissement, Bénéfice net, ROI multiplicateur
- Tableau établissements avec prix barrés + colonne Économie (lignes 260-319)
- Tableau détail ROI avec `m.modules_roi?.nom` (lignes 405-415)

### `src/pages/Calculateur.tsx` — COMPLET

- État `textePortee` (ligne 186)
- Textarea "Texte de portée" dans Section 6 Notes (lignes 900-915) — avec placeholder depuis config, label optionnel
- Passage de `textePortee: textePortee.trim() || undefined` dans `sauvegarderSoumission` (ligne 393)

### `src/pages/admin/ConfigSoumissions.tsx` — COMPLET

- État `textePortee` (ligne 17)
- Champ textarea "Texte de portée par défaut" (lignes 71-83) avec `details` pour voir la valeur actuelle
- Clé `texte_portee_defaut` dans `handleSave` (ligne 29)
- Condition `disabled` inclut `textePortee` (ligne 114)

---

## Recommandation

Tout le code est prêt. Procéder directement aux **tests de validation end-to-end** :

1. Créer une nouvelle soumission avec segment + 2 établissements + rabais engagement annuel + texte de portée personnalisé
2. Activer le ROI avec 3 modules et saisir un budget alimentaire
3. Sauvegarder → ouvrir la page de détail pour vérifier : synthèse ROI, prix barrés, noms de modules corrects
4. Ouvrir le mode Présentation pour vérifier toutes les sections dans le thème sidebar
5. Cliquer "Générer le PDF" (Ctrl+P) pour vérifier : bloc Portée, Pertes invisibles, Investissement, ROI, Verdict, Acceptation/Signature, mention TPS/TVQ dans les conditions
