
# Ajout des Notes personnalisées sur les soumissions

## Contexte et état actuel

Le formulaire `Calculateur.tsx` possède déjà un champ "Notes internes" (variable `notes`, stocké dans `notes_internes`). Il faut ajouter un **deuxième champ distinct** : `notes_personnalisees`, visible dans le PDF et en mode présentation (les notes internes restent confidentielles, côté équipe seulement).

La table `soumissions` n'a pas encore la colonne `notes_personnalisees` — c'est la seule migration nécessaire.

---

## Périmètre des changements

| Fichier | Nature |
|---------|--------|
| Base de données | Migration : ajout colonne `notes_personnalisees TEXT DEFAULT NULL` |
| `src/pages/Calculateur.tsx` | Nouveau champ Textarea dans un Collapsible |
| `src/lib/supabase-queries.ts` | Passage de `notes_personnalisees` dans `sauvegarderSoumission` et `dupliquerSoumission` |
| `src/components/pdf/SoumissionPDF.tsx` | Section "Notes importantes" conditionnelle avant Conditions |
| `src/pages/SoumissionPresentation.tsx` | Encadré discret avec icône ℹ️ après les totaux |

---

## Détail technique par fichier

### 1. Migration base de données

```sql
ALTER TABLE soumissions
  ADD COLUMN notes_personnalisees TEXT DEFAULT NULL;
```

Colonne nullable, aucune valeur par défaut, compatible avec toutes les soumissions existantes.

### 2. `src/pages/Calculateur.tsx`

**Nouvel état :** `const [notesPerso, setNotesPerso] = useState('');`

**Nouvelle section UI** — insérée **après la section ROI et avant les boutons d'action** (ligne ~722) :

```text
Card "6. Notes et conditions spéciales"
  └── Collapsible (ouvert si notesPerso.trim() non vide)
       └── CollapsibleTrigger (label + chevron)
       └── CollapsibleContent
            └── Label "Notes personnalisées (apparaîtront sur la soumission)"
            └── Textarea
                 placeholder="Ex. : Le rabais volume de 10 % s'applique si..."
                 min-h: 4 lignes (min-h-[96px])
                 resize: vertical
```

**Imports à ajouter :** `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` depuis `@/components/ui/collapsible` ; `Textarea` depuis `@/components/ui/textarea`.

**Dans `handleSauvegarder`** : passer `notesPersonnalisees: notesPerso.trim()` à `sauvegarderSoumission`.

**Raccourci Ctrl+S** : ajouter `notesPerso` aux dépendances du `useEffect`.

### 3. `src/lib/supabase-queries.ts`

**Dans `sauvegarderSoumission`** :
- Ajouter `notesPersonnalisees: string` dans le type des `params`
- Passer `notes_personnalisees: params.notesPersonnalisees` dans l'insert Supabase

**Dans `dupliquerSoumission`** :
- Copier `notes_personnalisees: soumission.notes_personnalisees` dans l'insert de la nouvelle soumission (préservation lors de la duplication)

### 4. `src/components/pdf/SoumissionPDF.tsx`

**Logique** : lire `soumission.notes_personnalisees`, faire `.trim()`, et si non vide, splitter par `\n` pour créer les bullet points.

**Position dans le PDF** : entre le bloc Totaux (ligne ~168) et la section Conditions (ligne ~224).

```text
{/* Notes importantes */}
{notesPerso && notesPerso.length > 0 && (
  <div className="pdf-no-break" style={{ marginBottom: 24 }}>
    <div style={{ titre "Notes importantes", couleur #1e3a5f }} />
    <div style={{ fond #fffbeb, bordure gauche #f59e0b, padding 12-16, borderRadius 8 }}>
      {lignes.map(ligne => (
        <div>• {ligne}</div>
      ))}
    </div>
  </div>
)}
```

Pas besoin de modifier les props du composant — `soumission` est déjà passé et contiendra automatiquement `notes_personnalisees` une fois la colonne ajoutée (type généré depuis la DB).

### 5. `src/pages/SoumissionPresentation.tsx`

**Position** : après les cartes totaux (ligne ~129), avant la section Rabais (ligne ~131).

```text
{soumission.notes_personnalisees?.trim() && (
  <div style={{ fond gris clair, padding 16-20, borderRadius 16, border }}>
    <div className="flex items-center gap-2 mb-2">
      <span>ℹ️</span>
      <h4 className="font-semibold text-sm" style={{ couleur sidebar-foreground }}>Notes</h4>
    </div>
    {lignes.map(ligne => (
      <p style={{ fontStyle: italic, fontSize: 0.875rem, couleur sidebar-foreground/70 }}>• {ligne}</p>
    ))}
  </div>
)}
```

---

## Ordre d'exécution

```text
Étape 1 → Migration DB (colonne notes_personnalisees)
Étape 2 → supabase-queries.ts (sauvegarder + dupliquer)
Étape 3 → Calculateur.tsx (état + UI Collapsible + handler)
Étape 4 → SoumissionPDF.tsx (section Notes importantes)
Étape 5 → SoumissionPresentation.tsx (encadré discret)
```

---

## Edge cases couverts

- Espaces seuls → `trim()` avant sauvegarde et avant affichage → traité comme vide
- Retours à la ligne → `split('\n').filter(Boolean)` → bullet points propres
- Accents et guillemets français → passent nativement (UTF-8, pas d'encodage spécial)
- Long texte (500+ chars) → `word-wrap: break-word` dans le CSS print, retour automatique
- Soumission sans notes → section absente du PDF et de la présentation
- Duplication → notes copiées dans la nouvelle soumission
