import useAuth from "./useAuth";

export default function usePermission(){

    const {user}=useAuth();

    const isAdmin=user?.role==="ADMIN";

    const isMagasinier=user?.role==="MAGASINIER";

    const isAcheteur=user?.role==="ACHETEUR";

    return{

        isAdmin,
        isMagasinier,
        isAcheteur
    }

}
