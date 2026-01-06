import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    maxWidth?: string;
    closeOnOverlayClick?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    actions,
    maxWidth = 'max-w-md',
    closeOnOverlayClick = true
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className={`w-full ${maxWidth} bg-[#1e293b] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-slide-up`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-slate-300 leading-relaxed">
                    {children}
                </div>

                {/* Footer (Actions) */}
                {actions && (
                    <div className="p-6 pt-0 flex justify-end gap-3">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
}
