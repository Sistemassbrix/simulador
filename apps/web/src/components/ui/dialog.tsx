import * as DialogPrimitive from '@radix-ui/react-dialog';
import {ReactNode} from 'react';

export function Dialog({open,onOpenChange,children,title='Detalles'}:{open:boolean;onOpenChange:(v:boolean)=>void;children:ReactNode;title?:string}){
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay
                    className="modal-backdrop fade show"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 1050
                    }}
                />
                <DialogPrimitive.Content
                    id={title}
                    className="modal fade show d-block original-dialog"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1055,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        outline: 'none',
                        boxShadow: 'none'
                    }}
                >
                    <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">Formulario o detalles del simulador</DialogPrimitive.Description>
                    {children}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
