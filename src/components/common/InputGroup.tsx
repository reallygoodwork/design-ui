"use client";
import { Input } from "@base-ui/react/input";
import type { ReactNode } from "react";

export const InputGroup = ({
	addon,
	value,
	onChange,
	type,
	placeholder,
}: {
	addon?: ReactNode;
	value: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	type?: string;
	placeholder?: string;
}) => {
	return (
		<div
			data-slot="input-group"
			className="group/input-group relative flex w-fit items-center [&:has([data-slot=addon]:first-child)_[data-slot=input]]:pl-6 [&:has([data-slot=addon]:last-child)_[data-slot=input]]:pr-6"
		>
			{addon ? (
				<div
					data-slot="addon"
					className="absolute inset-y-px isolate z-10 flex aspect-square items-center justify-center rounded-sm text-muted-foreground text-xs leading-tight first:left-px last:right-px [&_svg]:size-3 group-has-data-[slot=input-number-controls]/input-group:last:right-16"
				>
					<span className="inline-flex size-3 translate-y-[0.5px] text-center align-middle leading-none has-[svg]:translate-y-0">
						{addon}
					</span>
				</div>
			) : null}
			<div
				data-slot={"input-number"}
				className="relative flex items-center gap-1"
			>
				<Input
					className="flex h-7 w-full min-w-0 rounded-md border border-input bg-input px-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 cursor-text"
					data-slot="input"
					inputMode={"numeric"}
					type={type || "text"}
					spellCheck="false"
					aria-roledescription="Number input"
					autoCorrect="off"
					autoCapitalize="off"
					aria-valuenow={value ? parseInt(value, 10) : undefined}
					value={value || ""}
					onChange={onChange}
					placeholder={placeholder}
				/>
			</div>
		</div>
	);
};
