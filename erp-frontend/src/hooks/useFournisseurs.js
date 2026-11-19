import { useEffect, useState } from "react";
import api from "../utils/api";

export default function useFournisseurs() {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await api.get("fournisseurs/");
    setFournisseurs(res.data);
    setLoading(false);
  };

  const addFournisseur = async (data) => {
    await api.post("fournisseurs/", data);
    fetchData();
  };

  const deleteFournisseur = async (id) => {
    await api.delete(`fournisseurs/${id}/`);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    fournisseurs,
    loading,
    addFournisseur,
    deleteFournisseur,
  };
}