
## Correction critique du PDF — Multi-page garanti via createPortal

### Diagnostic précis

Le `#pdf-content-wrapper` est rendu dans l'arbre DOM suivant :
```text
<body>
  <div id="root">          ← géré par React
    ...
    <div id="pdf-content-wrapper" style="left: -9999px">
      <div id="pdf-content">
        ...tout le contenu PDF...
      </div>
    </div>
  </div>
</body>
```

Le CSS d'impression actuel fait `body * { visibility: hidden }` puis repositionne `#pdf-content-wrapper` en `position: absolute; left: 0; top: 0`. Le problème : un élément `position: absolute` ne crée pas de hauteur de document — le navigateur imprime exactement 1 page (la hauteur du viewport) et tronque le reste.

### Solution : createPortal

En utilisant `createPortal`, on déplace le rendu PDF directement dans `<body>`, hors de `#root` :
```text
<body>
  <div id="root">...interface...</div>     ← on cache ça en print
  <div id="pdf-content" style="left: -9999px">  ← rendu direct dans body
    ...tout le contenu PDF...
  </div>
</body>
```

Ainsi, le CSS d'impression peut simplement faire :
- `#root { display: none !important }` — cache toute l'interface
- `#pdf-content { position: static; height: auto; overflow: visible }` — laisse le contenu s'étaler naturellement sur N pages

### Fichier modifié

**`src/components/pdf/SoumissionPDF.tsx`** — 3 changements précis :

**1. Import de `createPortal`**
Ajouter `ReactDOM` (ou `createPortal`) depuis `react-dom`.

**2. Nouveau CSS d'impression dans le `useEffect`**

Remplacer le bloc CSS actuel par :
```css
@media print {
  /* Cacher toute l'interface React */
  #root { display: none !important; }

  /* Le PDF prend toute la page, flux naturel = multi-page */
  #pdf-content {
    display: block !important;
    position: static !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    height: auto !important;
    overflow: visible !important;
    background: white !important;
    z-index: 99999 !important;
  }

  #pdf-content * {
    visibility: visible !important;
  }

  @page { size: A4; margin: 18mm 15mm; }

  .pdf-no-break {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .pdf-page-break {
    page-break-before: always !important;
    break-before: always !important;
  }
  .pdf-signature-block {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

**3. Structure JSX : supprimer le wrapper, utiliser createPortal**

Avant :
```tsx
return (
  <div id="pdf-content-wrapper" style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
    <div id="pdf-content" style={{ width: '100%', ... }}>
      ...contenu...
    </div>
  </div>
);
```

Après :
```tsx
import { createPortal } from 'react-dom';

// Dans le return :
return createPortal(
  <div
    id="pdf-content"
    style={{
      position: 'absolute',
      left: '-9999px',
      top: 0,
      width: '210mm',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: P.dark,
      fontSize: '11pt',
      lineHeight: '1.5',
      background: P.white,
    }}
  >
    ...tout le contenu PDF identique...
  </div>,
  document.body
);
```

Le `#pdf-content` est maintenant un enfant direct de `<body>`, hors de `#root`. En mode normal, il est caché à `left: -9999px`. En mode impression, le CSS le repositionne en `position: static` et cache `#root` via `display: none`.

### Ce qui ne change PAS

- Tout le contenu HTML du PDF (cartes, tableaux, verdict, signature) reste identique
- La palette de couleurs Octogone reste identique
- Les noms des modules ROI affichent déjà correctement leurs vrais noms (`modules_roi?.nom`) — pas de bug à corriger
- `supabase-queries.ts` a déjà le bon join SQL — pas de changement nécessaire
- `triggerPrint()` reste `window.print()` — aucun changement

### Tests de validation

1. Ctrl+P affiche 2-3 pages (le contenu complet déborde sur plusieurs pages)
2. Le tableau des établissements est visible
3. Les 3 cartes récapitulatives (Mensuel / Annuel / 1re année) sont présentes
4. Le bloc ROI et le verdict sont visibles (si activé)
5. Les conditions générales et le bloc signature apparaissent sur la dernière page, non coupés
6. Les noms des modules ROI sont corrects (pas "Module 1")
7. "Intégration offerte — multi-sites ✓" s'affiche correctement dans la carte 1re année
