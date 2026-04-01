import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Calendar } from 'lucide-react';

const AgeGate = ({ onAgeVerified, onVerifiedDOB }) => {
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => ({
    value: String(1920 + i),
    label: String(1920 + i),
  })).reverse();

  const calculateAge = (birthMonth, birthDay, birthYear) => {
    const today = new Date();
    let age = today.getFullYear() - parseInt(birthYear);
    const monthDiff = today.getMonth() + 1 - parseInt(birthMonth);
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parseInt(birthDay))) {
      age--;
    }
    return age;
  };

  const handleVerify = () => {
    setError('');
    if (!month || !day || !year) {
      setError('Please select your complete date of birth');
      return;
    }
    const age = calculateAge(month, day, year);
    if (age < 18) {
      setError('You must be 18 or older to use Phantom Messenger');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const dateOfBirth = { month: parseInt(month), day: parseInt(day), year: parseInt(year) };
      onVerifiedDOB(dateOfBirth);
      onAgeVerified();
      setIsLoading(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md"
    >
      <div className="card bg-phantom-gray-50 border border-phantom-gray-200 rounded-lg p-8 shadow-lg">
        <div className="flex justify-center mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-phantom-green/10">
            <Shield className="w-7 h-7 text-phantom-green" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-phantom-charcoal text-center mb-2">Verify Your Age</h2>
        <p className="text-phantom-gray-600 text-center mb-8">Phantom Messenger is for users 18 and older</p>
        <div className="space-y-6">
          <div className="flex gap-3 justify-center items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-phantom-green">
                <option value="">Select</option>
                {months.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">Day</label>
              <select value={day} onChange={(e) => setDay(e.target.value)} className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-phantom-green">
                <option value="">Select</option>
                {days.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-phantom-charcoal mb-2">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field w-full bg-white border border-phantom-gray-300 text-phantom-charcoal rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-phantom-green">
                <option value="">Select</option>
                {years.map((y) => (<option key={y.value} value={y.value}>{y.label}</option>))}
              </select>
            </div>
          </div>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </motion.div>
          )}
          <button onClick={handleVerify} disabled={isLoading || !month || !day || !year} className="btn-primary w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5" />
            {isLoading ? 'Verifying...' : 'Continue'}
          </button>
        </div>
        <p className="text-xs text-phantom-gray-500 text-center mt-6">Your date of birth is used only for age verification and is never stored or shared.</p>
      </div>
    </motion.div>
  );
};

export default AgeGate;
