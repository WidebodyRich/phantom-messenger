import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, AlertTriangle, X, Shield, Send } from 'lucide-react';

/**
 * ReportUser Component
 * Modal for reporting users or content with different severity categories
 * Supports CSAM reporting with special handling and visual prominence
 */
const ReportUser = ({ isOpen, onClose, reportedUsername, onSubmit }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reportCategories = [
    {
      id: 'csam',
      label: 'Child Exploitation (CSAM)',
      description: 'Child sexual abuse material',
      isCritical: true,
      icon: AlertTriangle,
    },
    {
      id: 'illegal',
      label: 'Illegal Activity',
      description: 'Criminal activity or illegal content',
      isCritical: false,
      icon: Shield,
    },
    {
      id: 'harassment',
      label: 'Harassment',
      description: 'Bullying, threats, or abusive behavior',
      isCritical: false,
      icon: Flag,
    },
    {
      id: 'spam',
      label: 'Spam',
      description: 'Repetitive unwanted content',
      isCritical: false,
      icon: Flag,
    },
    {
      id: 'other',
      label: 'Other',
      description: 'Something else not listed above',
      isCritical: false,
      icon: Flag,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory) {
      alert('Please select a report category');
      return;
    }

    setIsSubmitting(true);
    try {
      const reportData = {
        reportedUsername,
        category: selectedCategory,
        details,
        timestamp: new Date().toISOString(),
        isCritical: selectedCategory === 'csam',
      };

      if (onSubmit) {
        await onSubmit(reportData);
      }

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategory('');
    setDetails('');
    setSubmitted(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] bg-phantom-gray-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-phantom-charcoal border-opacity-10">
              <div className="flex items-center gap-3">
                <Flag className="w-6 h-6 text-phantom-green" />
                <h2 className="text-2xl font-bold text-phantom-charcoal">Report User</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-phantom-charcoal hover:bg-opacity-10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-phantom-charcoal" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              {!submitted ? (
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Reported User Info */}
                  <div className="card p-4 bg-phantom-gray-100 border-l-4 border-phantom-green">
                    <p className="text-sm text-phantom-charcoal text-opacity-70">Reporting user:</p>
                    <p className="text-lg font-semibold text-phantom-charcoal">{reportedUsername}</p>
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-phantom-charcoal mb-4">
                      Report Category
                    </label>
                    <div className="space-y-3">
                      {reportCategories.map((category) => {
                        const IconComponent = category.icon;
                        const isSelected = selectedCategory === category.id;
                        const isCritical = category.isCritical;

                        return (
                          <motion.button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                              isSelected
                                ? isCritical
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-phantom-green bg-phantom-gray-100'
                                : 'border-phantom-charcoal border-opacity-10 hover:border-phantom-green hover:border-opacity-50'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-start gap-3">
                              <IconComponent
                                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                  isCritical
                                    ? isSelected
                                      ? 'text-red-600'
                                      : 'text-red-500'
                                    : isSelected
                                      ? 'text-phantom-green'
                                      : 'text-phantom-charcoal text-opacity-50'
                                }`}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-phantom-charcoal">
                                    {category.label}
                                  </p>
                                  {isCritical && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                                      CRITICAL
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-phantom-charcoal text-opacity-60 mt-1">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Details Text Area */}
                  <div>
                    <label htmlFor="details" className="block text-sm font-semibold text-phantom-charcoal mb-2">
                      Additional Details (Optional)
                    </label>
                    <textarea
                      id="details"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Provide any additional context or evidence that helps us understand the issue..."
                      className="w-full p-4 border-2 border-phantom-charcoal border-opacity-10 rounded-lg bg-white text-phantom-charcoal placeholder-phantom-charcoal placeholder-opacity-40 focus:outline-none focus:border-phantom-green focus:ring-2 focus:ring-phantom-green focus:ring-opacity-20 resize-none"
                      rows={5}
                    />
                    <p className="text-xs text-phantom-charcoal text-opacity-50 mt-2">
                      Max 500 characters
                    </p>
                  </div>

                  {/* Warning for CSAM Reports */}
                  {selectedCategory === 'csam' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex gap-3"
                    >
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">CSAM reports are treated with highest priority</p>
                        <p className="text-sm text-red-800 mt-1">
                          These reports are immediately escalated to our specialized team and law enforcement authorities. Please be as detailed as possible.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-3 rounded-lg border-2 border-phantom-charcoal border-opacity-20 text-phantom-charcoal font-semibold hover:bg-phantom-charcoal hover:bg-opacity-5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedCategory}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className="w-4 h-4 border-2 border-white border-t-phantom-green rounded-full"
                          />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Success Message */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center p-12 text-center"
                >
                  <motion.div
                    animate={{ scale: [0, 1.1, 1] }}
                    transition={{ duration: 0.5 }}
                    className="w-16 h-16 bg-phantom-green rounded-full flex items-center justify-center mb-4"
                  >
                    <Send className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-phantom-charcoal mb-2">Report Submitted</h3>
                  <p className="text-phantom-charcoal text-opacity-70 mb-4">
                    Thank you for helping keep Phantom Messenger safe. Our moderation team will review your report shortly.
                  </p>
                  <p className="text-sm text-phantom-charcoal text-opacity-50">
                    This modal will close automatically...
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReportUser;
