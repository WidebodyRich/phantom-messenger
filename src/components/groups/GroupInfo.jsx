import { motion } from 'framer-motion';
import { X, Users, Crown, UserPlus, Shield } from 'lucide-react';
import Avatar from '../common/Avatar';

export default function GroupInfo({ group, onClose }) {
  if (!group) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="absolute inset-y-0 right-0 w-80 bg-white border-l border-phantom-gray-200 shadow-elevated z-30 flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-phantom-gray-200">
        <h3 className="font-bold text-phantom-charcoal">Group Info</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-phantom-gray-50 flex items-center justify-center">
          <X className="w-5 h-5 text-phantom-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Group avatar & name */}
        <div className="text-center">
          <div className="w-20 h-20 bg-phantom-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-10 h-10 text-phantom-green" />
          </div>
          <h4 className="text-lg font-bold text-phantom-charcoal">{group.name}</h4>
          {group.description && (
            <p className="text-sm text-phantom-gray-400 mt-1">{group.description}</p>
          )}
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-phantom-charcoal">Members</h5>
            <button className="text-xs text-phantom-green font-semibold flex items-center gap-1 hover:underline">
              <UserPlus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {(group.members || []).map((member) => (
              <div key={member.id || member.userId} className="flex items-center gap-3 p-2 rounded-xl">
                <Avatar name={member.username || 'User'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-phantom-charcoal truncate">{member.username || 'User'}</p>
                  <p className="text-xs text-phantom-gray-400 capitalize">{member.role || 'member'}</p>
                </div>
                {member.role === 'owner' && <Crown className="w-4 h-4 text-amber-500" />}
                {member.role === 'admin' && <Shield className="w-4 h-4 text-blue-500" />}
              </div>
            ))}
            {(!group.members || group.members.length === 0) && (
              <p className="text-sm text-phantom-gray-400 text-center py-4">No members to display</p>
            )}
          </div>
        </div>

        {/* Encryption info */}
        <div className="bg-phantom-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-phantom-green" />
            <span className="text-sm font-medium text-phantom-charcoal">Encryption</span>
          </div>
          <p className="text-xs text-phantom-gray-400 leading-relaxed">
            Messages in this group are end-to-end encrypted using the Signal Protocol with sender keys.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
