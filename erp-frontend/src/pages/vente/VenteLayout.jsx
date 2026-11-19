import { useState } from "react";
import { FileText, ShoppingCart, Package, Receipt, CreditCard } from "lucide-react";
import DevisClientPage from "./DevisClientPage";
import CommandeClientPage from "./CommandeClientPage";
import BonLivraisonPage from "./BonLivraisonPage";
import FactureClientPage from "./FactureClientPage";
import PaiementClientPage from "./PaiementClientPage";

const TABS = [
  { key: 'devis', label: 'Devis Client', icon: FileText, component: DevisClientPage },
  { key: 'commande', label: 'Commande Client', icon: ShoppingCart, component: CommandeClientPage },
  { key: 'bl', label: 'Bon Livraison', icon: Package, component: BonLivraisonPage },
  { key: 'facture', label: 'Facture Client', icon: Receipt, component: FactureClientPage },
  { key: 'paiement', label: 'Paiement', icon: CreditCard, component: PaiementClientPage },
];
export default function VenteLayout() {
  const [activeTab, setActiveTab] = useState('devis');
  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div>
      <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: 16, color: '#0f172a'}}>Module Vente</h2>
      <div style={{display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 16}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{padding: '10px 16px', border: 'none', background: activeTab===tab.key?'#2563eb':'transparent', color: activeTab===tab.key?'white':'#475569', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600}}>
            <tab.icon size={16}/> {tab.label}
          </button>
        ))}
      </div>
      <div>
        {ActiveComponent? <ActiveComponent /> : <p>Onglet non trouvé</p>}
      </div>
    </div>
  )
}