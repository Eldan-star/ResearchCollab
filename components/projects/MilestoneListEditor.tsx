
import React, { useState } from 'react';
import { useFieldArray, Control, UseFormRegister, FieldErrors } from 'react-hook-form';
import { MilestoneInput, ProjectInput } from '../../types.ts';
import Input from '../ui/Input.tsx';
import Button from '../ui/Button.tsx';
import { PlusCircle, Trash2 } from 'lucide-react';

interface MilestoneListEditorProps {
  control: Control<ProjectInput>;
  register: UseFormRegister<ProjectInput>;
  errors: FieldErrors<ProjectInput>;
}

const MilestoneListEditor: React.FC<MilestoneListEditorProps> = ({ control, register, errors }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
  });

  const [showErrors, setShowErrors] = useState(false);

  const addMilestone = () => {
    append({ description: '', amount: 0, due_date: '' });
  };

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h4 className="text-lg font-medium text-gray-700">Project Milestones</h4>
      {fields.map((item, index) => (
        <div key={item.id} className="p-3 border border-gray-300 rounded-md bg-white shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <h5 className="font-medium text-gray-600">Milestone {index + 1}</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="text-red-500 hover:bg-red-100"
              leftIcon={<Trash2 size={16}/>}
            >
              Remove
            </Button>
          </div>
          <Input
            label="Description"
            {...register(`milestones.${index}.description` as const)}
            error={errors.milestones?.[index]?.description?.message}
            onFocus={() => setShowErrors(true)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              {...register(`milestones.${index}.amount` as const, { valueAsNumber: true })}
              error={errors.milestones?.[index]?.amount?.message}
              onFocus={() => setShowErrors(true)}
            />
            <Input
              label="Due Date (Optional)"
              type="date"
              {...register(`milestones.${index}.due_date` as const)}
              error={errors.milestones?.[index]?.due_date?.message}
              onFocus={() => setShowErrors(true)}
            />
          </div>
          {showErrors && errors.milestones?.[index] && (
            <p className="text-xs text-red-500 mt-1">Please correct errors in this milestone.</p>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={addMilestone}
        leftIcon={<PlusCircle size={18}/>}
      >
        Add Milestone
      </Button>
    </div>
  );
};

export default MilestoneListEditor;