import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Shield,
  Copy,
  Check,
  AlertTriangle,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { validatePassword } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';
import { generateWallet, saveWalletToSession } from '../crypto/btcWallet';
import { initializeEncryption } from '../crypto/signalProtocol';
import client from '../api/client';
import toast from 'react-hot-toast';
import AgeGate from '../components/AgeGate';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Step state
  const [step, setStep] = useState('ageVerification');

  // Age verification state
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [ageVerified, setAgeVerified] = useState(false);

  // Username state
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Additional fields state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Seed phrase state
  const [seedPhrase, setSeedPhrase] = useState('');
  const [seedCopied, setSeedCopied] = useState(false);
  const [seedConfirmation, setSeedConfirmation] = useState('');
  const [seedError, setSeedError] = useState('');
  const [seedAcknowledged, setSeedAcknowledged] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Validation helpers
  const validateUsername = (username) => {
    if (username.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (username.length > 30) {
      return 'Username must be 30 characters or less';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return '';
  };

  const validatePassword = (pwd) => {
    const errors = [];
    if (pwd.length < 12) errors.push('At least 12 characters');
    if (!/[a-z]/.test(pwd)) errors.push('At least one lowercase letter');
    if (!/[A-Z]/.test(pwd)) errors.push('At least one uppercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('At least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd))
      errors.push('At least one special character');

    return errors;
  };

  const calculatePasswordStrength = (pwd) => {
    const errors = validatePassword(pwd);
    return 5 - errors.length;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
  };

  // Age gate handlers
  const handleAgeVerified = () => {
    setAgeVerified(true);
    setStep('username');
  };

  const handleVerifiedDOB = (dob) => {
    setDateOfBirth(dob);
  };

  // Username handlers
  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);

    const error = validateUsername(value);
    setUsernameError(error);
    setUsernameAvailable(false);
  };

  const handleCheckUsername = async () => {
    if (usernameError || !username) return;

    setUsernameChecking(true);
    try {
      const response = await client.get(`/api/auth/check-username/${username}`);
      setUsernameAvailable(response.data.available);
      if (!response.data.available) {
        setUsernameError('This username is already taken');
      }
    } catch (error) {
      setUsernameError('Error checking username availability');
    } finally {
      setUsernameChecking(false);
    }
  };

  const handleUsernameSubmit = () => {
    if (usernameError || !usernameAvailable) {
      handleCheckUsername();
      return;
    }
    // Generate seed phrase
    const wallet = generateWallet();
    setSeedPhrase(wallet.mnemonic);
    setStep('seedPhrase');
  };

  // Email validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Phone validation
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setPhone(value);
    if (value && !validatePhone(value)) {
      setPhoneError('Please enter a valid phone number');
    } else {
      setPhoneError('');
    }
  };

  // Password handlers
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    const errors = validatePassword(value);
    if (errors.length === 0) {
      setPasswordError('');
    } else {
      setPasswordError(`Missing: ${errors.join(', ')}`);
    }

    const strength = calculatePasswordStrength(value);
    setPasswordStrength(strength);
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
  };

  // Seed phrase handlers
  const handleCopySeed = () => {
    navigator.clipboard.writeText(seedPhrase);
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2000);
  };

  const handleSeedConfirmationChange = (e) => {
    setSeedConfirmation(e.target.value);
    setSeedError('');
  };

  const handleSeedPhraseContinue = () => {
    if (seedConfirmation !== seedPhrase) {
      setSeedError('Seed phrase does not match. Please try again.');
      return;
    }

    if (!seedAcknowledged) {
      setSeedError('Please acknowledge that you have saved your seed phrase');
      return;
    }

    // Move to password step (if needed) or proceed to registration
    handleRegistration();
  };

  // Registration handler
  const handleRegistration = async () => {
    // Final validation
    if (!username || usernameError || !usernameAvailable) {
      setUsernameError('Please select a valid username');
      setStep('username');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setStep('seedPhrase');
      return;
    }

    if (validatePassword(password).length > 0) {
      setPasswordError('Password does not meet requirements');
      setStep('seedPhrase');
      return;
    }

    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      setStep('seedPhrase');
      return;
    }

    if (phone && !validatePhone(phone)) {
      setPhoneError('Please enter a valid phone number');
      setStep('seedPhrase');
      return;
    }

    setRegistering(true);

    try {
      // Generate wallet
      const wallet = generateWallet();
      const publicKey = wallet.publicKey;
      const encryptedPrivateKey = wallet.encryptedPrivateKey;

      // Initialize encryption
      const identityKeyPair = await initializeEncryption();

      // Register user
      const registerData = {
        username,
        password,
        email,
        phone,
        publicKey,
        encryptedPrivateKey,
        identityKeyPair,
        dateOfBirth,
      };

      const response = await client.post('/api/auth/register', registerData);

      // Save wallet to session
      saveWalletToSession(wallet.mnemonic, publicKey);

      // Register in auth context
      register(response.data.user);

      setStep('success');

      // Redirect after success
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      setUsernameError(errorMessage);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-phantom-gray-50 to-phantom-gray-100 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <MessageCircle className="w-8 h-8 text-phantom-green" />
          <h1 className="text-3xl font-bold text-phantom-charcoal">Phantom Messenger</h1>
        </div>
        <p className="text-phantom-gray-600">Create your secure account</p>
      </motion.div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {/* Age Verification Step */}
        {step === 'ageVerification' && (
          <AgeGate key="ageGate" onAgeVerified={handleAgeVerified} onVerifiedDOB={handleVerifiedDOB} />
        )}

        {/* Username Step */}
        {step === 'username' && (
          <motion.div
            key="username"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="card bg-phantom-gray-50 border border-phantom-gray-200 rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-phantom-charcoal mb-6">Choose Your Username</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="Enter your username"
                    className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-phantom-green"
                  />
                  {usernameError && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {usernameError}
                    </p>
                  )}
                  {usernameAvailable && (
                    <p className="text-phantom-green text-sm mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Username is available
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Email (optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-phantom-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="your@email.com"
                      className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-phantom-green"
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-600 text-sm mt-1">{emailError}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Phone (optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-phantom-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+1 (555) 123-4567"
                      className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-phantom-green"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-red-600 text-sm mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="Enter your password"
                      className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-phantom-green"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-phantom-gray-600 hover:text-phantom-charcoal"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && <PasswordStrengthIndicator strength={passwordStrength} />}
                  {passwordError && (
                    <p className="text-red-600 text-sm mt-1">{passwordError}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      placeholder="Confirm your password"
                      className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-phantom-green"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-phantom-gray-600 hover:text-phantom-charcoal"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleUsernameSubmit}
                disabled={usernameError || !username || !password || !confirmPassword || passwordError}
                className="btn-primary w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Backup <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center text-sm text-phantom-gray-600 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-phantom-green hover:underline font-semibold">
                  Sign in
                </Link>
              </p>
            </div>
          </motion.div>
        )}

        {/* Seed Phrase Step */}
        {step === 'seedPhrase' && (
          <motion.div
            key="seedPhrase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <div className="card bg-phantom-gray-50 border border-phantom-gray-200 rounded-lg p-8 shadow-lg">
              <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Save Your Recovery Phrase</h3>
                  <p className="text-sm text-yellow-800">
                    This 12-word phrase is the only way to recover your account. Store it somewhere safe.
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-phantom-charcoal mb-6">Your Recovery Phrase</h2>

              {/* Seed Phrase Display */}
              <div className="bg-phantom-charcoal rounded-lg p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {seedPhrase.split(' ').map((word, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-phantom-gray-400 text-sm font-medium w-6">{index + 1}.</span>
                      <span className="text-phantom-green font-mono text-sm">{word}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleCopySeed}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-phantom-green hover:bg-phantom-green/90 text-white py-2 px-4 rounded transition-all duration-200"
                >
                  {seedCopied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>

              {/* Seed Confirmation */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-phantom-charcoal mb-2">
                  Verify Your Phrase
                </label>
                <textarea
                  value={seedConfirmation}
                  onChange={handleSeedConfirmationChange}
                  placeholder="Paste your seed phrase here to confirm you saved it correctly"
                  className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-phantom-green h-20"
                />
                {seedError && (
                  <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {seedError}
                  </p>
                )}
              </div>

              {/* Acknowledgment */}
              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedAcknowledged}
                  onChange={(e) => setSeedAcknowledged(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-phantom-green"
                />
                <span className="text-sm text-phantom-gray-700">
                  I have saved my recovery phrase in a safe location and understand that I cannot recover my
                  account without it
                </span>
              </label>

              <button
                onClick={handleSeedPhraseContinue}
                disabled={!seedAcknowledged || registering}
                className="btn-primary w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? 'Creating Account...' : 'Create Account'}
                {!registering && <ArrowRight className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setStep('username')}
                className="w-full mt-4 py-3 px-4 rounded-lg font-semibold text-phantom-charcoal hover:bg-phantom-gray-200 transition-all duration-200"
              >
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="card bg-phantom-gray-50 border border-phantom-gray-200 rounded-lg p-8 shadow-lg text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex justify-center mb-6"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-phantom-green/20">
                  <CheckCircle2 className="w-8 h-8 text-phantom-green" />
                </div>
              </motion.div>

              <h2 className="text-2xl font-bold text-phantom-charcoal mb-2">Account Created!</h2>
              <p className="text-phantom-gray-600 mb-8">
                Welcome to Phantom Messenger. Redirecting you to your inbox...
              </p>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="flex justify-center"
              >
                <MessageCircle className="w-8 h-8 text-phantom-green" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center text-sm text-phantom-gray-600 max-w-md"
      >
        <p>
          By registering, you agree to our{' '}
          <a href="#" className="text-phantom-green hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-phantom-green hover:underline">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
