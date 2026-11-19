import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  }

  return (
    <div style={{padding: "50px"}}>
      <h1>Tongasoa! Nahomby ny Login ✅</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}