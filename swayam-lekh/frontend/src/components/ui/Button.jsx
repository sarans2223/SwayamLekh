import React from 'react';

export default function Button({ children, variant = 'primary', size = 'md', disabled = false, onClick, fullWidth = false, icon = null }) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: 'var(--radius)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontWeight: 'bold',
    transition: 'all 0.1s',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-body)',
    textTransform: variant === 'primary' || variant === 'success' ? 'uppercase' : 'none',
  };

  const variants = {
    primary: { backgroundColor: 'var(--accent)', color: 'white', border: '1px solid var(--accent)' },
    secondary: { backgroundColor: '#FFFFFF', color: '#333333', border: '1px solid #CCCCCC' },
    outline: { backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--border)' },
    danger: { backgroundColor: 'var(--red)', color: 'white', border: '1px solid var(--red)' },
    success: { backgroundColor: 'var(--green)', color: 'white', border: '1px solid var(--green)' },
    ghost: { backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid transparent', boxShadow: 'none' },
  };

  const sizes = {
    sm: { padding: '4px 12px', fontSize: '13px', minHeight: '34px' },
    md: { padding: '8px 16px', fontSize: '14px', minHeight: '40px' },
    lg: { padding: '12px 24px', fontSize: '16px', minHeight: '48px' }
  };

  const style = { ...baseStyle, ...variants[variant], ...sizes[size] };

  return (
    <button 
      style={style} 
      disabled={disabled} 
      onClick={onClick}
      onMouseOver={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variant === 'primary' ? 'var(--accent-hover)' : e.currentTarget.style.backgroundColor;
          if (variant === 'secondary') e.currentTarget.style.backgroundColor = '#EEEEEE';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = variants[variant].backgroundColor;
        }
      }}
    >
      {icon}
      {children}
    </button>
  );
}