import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Tag, TrendingUp, Users, History, FileText, DollarSign } from 'lucide-react';

const adminItems = [
  { href: '/admin/tarification', label: 'Tarification', description: 'Segments et paliers de prix', icon: DollarSign },
  { href: '/admin/rabais', label: 'Rabais', description: 'Multi-sites, volume, engagement', icon: Tag },
  { href: '/admin/roi', label: 'Paramètres ROI', description: 'Modules et formules de calcul', icon: TrendingUp },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', description: 'Équipe de vente et admins', icon: Users },
  { href: '/admin/historique', label: 'Historique', description: 'Journal des modifications', icon: History },
  { href: '/admin/soumissions', label: 'Config soumissions', description: 'Validité, conditions, entreprise', icon: FileText },
];

const Admin = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuration et gestion de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminItems.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                      <Icon className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                    </div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {item.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
