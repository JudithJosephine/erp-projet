import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage({ onLogin, error, loading }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <>
      <div className="login-container">
        <div className="login-box">
          
          <div className="logo-wrapper">
            <div className="logo-bg-jaune">
              <img 
                src="/leromba1.png" 
                alt="LE ROMBA" 
                className="logo-img"
                onError={(e) => {
                  e.target.src = "https://i.ibb.co/placeholder.png";
                }}
              />
            </div>
          </div>

          <h1 className="title">LE ROMBA</h1>
          <p className="subtitle">Entreprise générale de construction<br/>Manakara</p>
          
          <p className="description">
            Connexion à l'application de suivi. Utilisez le compte qui vous a été créé.
          </p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label>Nom d'utilisateur</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Mot de passe</label>
              <div className="input-pass">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="no-eye"
                />
                <button 
                  type="button" 
                  className="eye" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={18}/> : <EyeOff size={18}/>}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-login">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #fef9c3;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          padding: 16px;
        }
        .login-box {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 22px;
          padding: 28px 24px 26px;
          box-shadow: 0 4px 18px rgba(0,0,0,0.07);
          text-align: center;
        }
        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }
        .logo-bg-jaune {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: #fef9c3;
          border: 6px solid #fde68a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
          background: white;
        }
        .title {
          font-size: 26px;
          font-weight: 800;
          color: #6d4c41;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .subtitle {
          color: #8d6e63;
          font-size: 15px;
          margin: 6px 0 14px;
          line-height: 1.35;
        }
        .description {
          color: #6b7280;
          font-size: 13.5px;
          text-align: left;
          margin: 0 0 18px;
          line-height: 1.45;
        }
        .error-msg {
          background: #fee2e2;
          color: #b91c1c;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 14px;
          text-align: left;
        }
        .form { text-align: left; }
        .form-group { margin-bottom: 14px; }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
        }
        .form-group input:focus {
          border-color: #8d6e63;
        }
        .input-pass { position: relative; }
        .input-pass input { padding-right: 42px; }
        .eye {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          display: flex;
          padding: 6px;
        }
        /* MANALA MASO AUTOMATIQUE AN'NY NAVIGATEUR */
        .no-eye::-ms-reveal,
        .no-eye::-ms-clear {
          display: none !important;
        }
        input[type="password"]::-webkit-credentials-auto-fill-button,
        input[type="password"]::-webkit-textfield-decoration-container {
          display: none !important;
        }
        .btn-login {
          width: 100%;
          background: #6d4c41;
          color: white;
          border: none;
          padding: 13px;
          border-radius: 12px;
          font-size: 15.5px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 6px;
        }
        .btn-login:hover { background: #5d4037; }
        .btn-login:disabled { background: #bcaaa4; }
      `}</style>
    </>
  );
}