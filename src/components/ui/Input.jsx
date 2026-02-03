import React from 'react';

export const Input = React.forwardRef(({ label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>}
    <input
      ref={ref}
      {...props}
      className={`h-10 px-3 rounded-xl border bg-white transition-all outline-none text-sm
        ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'}
      `}
    />
    {error && <span className="text-[11px] text-red-500 font-medium ml-1">{error.message}</span>}
  </div>
));

export const TextArea = React.forwardRef(({ label, error, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>}
    <textarea
      ref={ref}
      {...props}
      className={`p-3 rounded-xl border transition-all outline-none text-sm min-h-25
        ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50'}
      `}
    />
    {error && <span className="text-[11px] text-red-500 font-medium ml-1">{error.message}</span>}
  </div>
));