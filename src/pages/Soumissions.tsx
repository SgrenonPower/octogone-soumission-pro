import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

const Soumissions = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Soumissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez toutes vos soumissions</p>
        </div>
        <Link to="/calculateur">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle soumission
          </Button>
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'hsl(var(--muted))' }}>
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Aucune soumission</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Créez votre première soumission depuis le calculateur.
        </p>
        <Link to="/calculateur">
          <Button>Créer une soumission</Button>
        </Link>
      </div>
    </div>
  );
};

export default Soumissions;
