import React, { SelectHTMLAttributes, ReactNode, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, name, error, children, className = '', containerClassName = '', ...props }, ref) => {
  const baseStyles = 'block w-full pl-3 pr-10 py-2 text-base border rounded-md focus:outline-none sm:text-sm';
  const normalBorder = 'border-gray-300 focus:ring-primary focus:border-primary';
  const errorBorder = 'border-red-500 focus:ring-red-500 focus:border-red-500';

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        ref={ref}
        className={`${baseStyles} ${error ? errorBorder : normalBorder} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';
export default Select;