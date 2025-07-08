
import React from 'react';
import { Milestone, MilestoneStatus } from '../../types.ts';
import { Calendar, CheckCircle, Circle, DollarSign, Edit2, Trash2 } from 'lucide-react';
import Button from '../ui/Button.tsx';

interface MilestoneItemProps {
  milestone: Milestone;
  isEditable?: boolean;
  onUpdate?: (updatedMilestone: Milestone) => void;
  onDelete?: (milestoneId: string) => void;
  onMarkComplete?: (milestoneId: string) => void; // Research Lead action
  onFund?: (milestone: Milestone) => void; // Research Lead action for Stripe
}

const MilestoneItem: React.FC<MilestoneItemProps> = ({ 
  milestone, 
  isEditable, 
  onUpdate, 
  onDelete,
  onMarkComplete,
  onFund
}) => {

  const statusInfo = {
    [MilestoneStatus.PENDING]: { text: 'Pending', icon: <Circle size={18} className="text-yellow-500" />, color: 'text-yellow-600 bg-yellow-100' },
    [MilestoneStatus.COMPLETED]: { text: 'Completed', icon: <CheckCircle size={18} className="text-green-500" />, color: 'text-green-600 bg-green-100' },
    [MilestoneStatus.PAID]: { text: 'Paid', icon: <DollarSign size={18} className="text-blue-500" />, color: 'text-blue-600 bg-blue-100' },
  };
  
  // TODO: Implement edit functionality if isEditable is true and onUpdate is provided.
  // For now, it's display-only within the item, form handles editing.

  return (
    <div className="p-4 border border-gray-200 rounded-lg mb-3 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{milestone.description}</p>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <DollarSign size={16} className="mr-1" /> Amount: ${milestone.amount.toFixed(2)}
            {milestone.due_date && (
              <span className="ml-3 flex items-center">
                <Calendar size={16} className="mr-1" /> Due: {new Date(milestone.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo[milestone.status].color}`}>
          {statusInfo[milestone.status].icon}
          <span className="ml-1.5">{statusInfo[milestone.status].text}</span>
        </div>
      </div>
      {isEditable && (
        <div className="mt-3 flex justify-end space-x-2">
          {/* Example buttons, connect to actual logic */}
          {onFund && milestone.status === MilestoneStatus.PENDING && (
            <Button size="sm" variant="secondary" onClick={() => onFund(milestone)} leftIcon={<DollarSign size={14}/>}>Fund</Button>
          )}
          {onMarkComplete && milestone.status === MilestoneStatus.PENDING && ( // Assuming funded separately or not required for completion
             <Button size="sm" variant="primary" onClick={() => onMarkComplete(milestone.id)} leftIcon={<CheckCircle size={14}/>}>Mark Complete</Button>
          )}
          {onUpdate && (
             <Button size="sm" variant="outline" onClick={() => { /* Open edit modal or inline form */ }} leftIcon={<Edit2 size={14}/>}>Edit</Button>
          )}
          {onDelete && (
             <Button size="sm" variant="danger" onClick={() => onDelete(milestone.id)} leftIcon={<Trash2 size={14}/>}>Delete</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MilestoneItem;