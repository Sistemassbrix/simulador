import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva,VariantProps} from 'class-variance-authority';
import {clsx} from 'clsx';
// shadcn/ui composition, styled to the existing application.
const variants=cva('',{variants:{variant:{default:'btn btn-primary',secondary:'btn btn-secondary',outline:'btn btn-outline-secondary',destructive:'btn btn-outline-danger'},size:{default:'',sm:'btn-sm',lg:'btn-lg'}},defaultVariants:{variant:'default',size:'default'}});
export function Button({className,variant,size,asChild=false,...props}:React.ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){const Component=asChild?Slot:'button';return <Component className={clsx(variants({variant,size}),className)} {...props}/>;}
