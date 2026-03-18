import { useState, useRef, useEffect } from 'react';

export default function DateInput({
  value,
  onChange,
  className = '',
  title = '',
}: {
  value: string; // Format: YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
  title?: string;
}) {
  const [text, setText] = useState('');
  const dateRef = useRef<HTMLInputElement>(null);

  // Sync state with parent's value
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setText(`${parts[2]}/${parts[1]}/${parts[0]}`); // DD/MM/YYYY
      }
    } else {
      setText('');
    }
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    
    // Auto-format DD/MM/YYYY
    if (val.length > 8) val = val.slice(0, 8);
    if (val.length >= 3) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    if (val.length >= 6) {
      val = val.slice(0, 5) + '/' + val.slice(5);
    }
    
    setText(val);

    // If fully typed, convert to YYYY-MM-DD and save
    if (val.length === 10) {
      const [d, m, y] = val.split('/');
      // Basic validation
      if (Number(m) > 0 && Number(m) <= 12 && Number(d) > 0 && Number(d) <= 31) {
        onChange(`${y}-${m}-${d}`);
      }
    } else if (val.length === 0) {
      onChange('');
    }
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // Native YYYY-MM-DD
  };

  const openPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dateRef.current && 'showPicker' in HTMLInputElement.prototype) {
      try {
        dateRef.current.showPicker();
      } catch (err) {}
    }
  };

  return (
    <div className={`relative flex items-center p-0 overflow-hidden ${className}`} title={title}>
      <input
        type="text"
        placeholder="DD/MM/YYYY"
        value={text}
        onChange={handleTextChange}
        className="flex-1 w-24 bg-transparent px-3 py-3 outline-none text-slate-100 placeholder-slate-500"
      />
      
      <button 
        type="button"
        onClick={openPicker}
        className="relative flex items-center justify-center h-full px-3 border-l border-slate-700/50 hover:bg-slate-700/50 transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Hidden Native Picker */}
      <div className="absolute w-0 h-0 overflow-hidden">
        <input
          ref={dateRef}
          type="date"
          value={value}
          onChange={handleDateSelect}
          className="opacity-0 w-0 h-0"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}
