import { useState } from "react";
import { ShoppingCart, FileText, Package, Truck, Receipt, CreditCard } from "lucide-react";
import DemandeAchatPage from "./DemandeAchatPage";
import DemandePrixPage from "./DemandePrixPage";
import BonCommandePage from "./BonCommandePage";
import ReceptionPage from "./ReceptionPage";
import FacturePage from "./FacturePage";
import PaiementPage from "./PaiementPage";

const TABS = [
  { key: 'da', label: 'Demande Achat', icon: FileText, component: DemandeAchatPage },
  { key: 'dp', label: 'Demande Prix', icon: ShoppingCart, component: DemandePrixPage },
  { key: 'bc', label: 'Bon de Commande', icon: Package, component: BonCommandePage },
  { key: 'reception', label: 'Réception', icon: Truck, component: ReceptionPage },
  { key: 'facture', label: 'Facture', icon: Receipt, component: FacturePage },
  { key: 'paiement', label: 'Paiement', icon: CreditCard, component: PaiementPage },
];
export default function AchatLayout() {
  const [activeTab, setActiveTab] = useState('da');
  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div>
      <h2 style={{fontSize: '22px', fontWeight: '700', marginBottom: 16}}>Module Achat</h2>
      <div style={{display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', marginBottom: 16}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} 
            style={{padding: '10px 16px', border: 'none', background: activeTab===tab.key?'#16a34a':'transparent', color: activeTab===tab.key?'white':'#475569', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'}}>
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