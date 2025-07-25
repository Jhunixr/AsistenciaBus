import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMsg('');
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        toast.success('¡Registro exitoso! Revisa tu correo y confirma tu cuenta antes de iniciar sesión.');
        setError('¡Registro exitoso! Revisa tu correo y confirma tu cuenta antes de iniciar sesión.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        onLogin();
      }
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg('');
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setForgotMsg('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
    }
  };

  const logoUrl = 'https://s3.amazonaws.com/evaluar-test-media-bucket/COMPANY/image/53/COMPANY_a2e27536-28be-4b70-b214-3d1e80bf5453_67c9518f-7304-4b55-b19e-c3fe3e868a7e.jpeg';

  if (isForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-white to-red-100 px-2">
        <form onSubmit={handleForgot} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 sm:p-8 border-t-8 border-red-800">
          <div className="flex flex-col items-center mb-6">
            <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl shadow mb-2 border-2 border-red-800" />
            <h2 className="text-2xl font-bold text-red-800">Recuperar Contraseña</h2>
          </div>
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border px-4 py-3 rounded w-full mb-4 focus:ring-2 focus:ring-red-800 text-base"
            required
            autoComplete="email"
          />
          <button type="submit" className="bg-red-800 text-white px-4 py-3 rounded w-full font-semibold hover:bg-red-900 transition text-base">
            Enviar enlace de recuperación
          </button>
          <button
            type="button"
            className="mt-3 text-sm text-red-800 underline w-full"
            onClick={() => { setIsForgot(false); setForgotMsg(''); setError(''); }}
          >
            Volver al inicio de sesión
          </button>
          {forgotMsg && <div className="text-green-700 mt-3 text-center">{forgotMsg}</div>}
          {error && <div className="text-red-600 mt-3 text-center">{error}</div>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-white to-red-100 px-2">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 sm:p-8 border-t-8 border-red-800">
        <div className="flex flex-col items-center mb-6">
          <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl shadow mb-2 border-2 border-red-800" />
          <h2 className="text-2xl font-bold text-red-800 mb-1">{isRegister ? 'Registrarse' : 'Iniciar Sesión'}</h2>
          <p className="text-gray-600 text-sm">Sistema de Asistencia UTP</p>
        </div>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border px-4 py-3 rounded w-full mb-4 focus:ring-2 focus:ring-red-800 text-base"
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border px-4 py-3 rounded w-full mb-4 focus:ring-2 focus:ring-red-800 text-base"
          required
          autoComplete="current-password"
        />
        <button type="submit" className="bg-red-800 text-white px-4 py-3 rounded w-full font-semibold hover:bg-red-900 transition text-base">
          {isRegister ? 'Registrarse' : 'Ingresar'}
        </button>
        {!isRegister && (
          <button
            type="button"
            className="mt-3 text-sm text-red-800 underline w-full"
            onClick={() => setIsForgot(true)}
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button
          type="button"
          className="mt-2 text-sm text-gray-700 underline w-full"
          onClick={() => setIsRegister(!isRegister)}
        >
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
        {error && <div className="text-red-600 mt-3 text-center">{error.includes('Revisa tu correo') ? <span className="text-green-700 font-semibold">{error}</span> : error}</div>}
      </form>
    </div>
  );
};

export default Login; 