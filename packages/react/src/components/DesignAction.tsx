import { Fieldset } from "@base-ui/react/fieldset";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { usePropertyAccess } from "../hooks/useAllowed";
import { ClearButton } from "./common/ClearButton";
import { RowLabelContext } from "./common/RowLabel";

const OVERRIDE_MARK = "•";

/**
 * One row in a panel. The label sits inside the field, with the clear button
 * right after it, so every row keeps its full width in every state.
 */
export const DesignAction = ({
	children,
	label = "Action",
	orientation = "horizontal",
	property,
	clear,
}: {
	children: ReactNode;
	label?: string;
	orientation?: "horizontal" | "vertical";
	/** The CSS property this row edits, for showing it across breakpoints. */
	property?: string;
	clear?: { hasValue: boolean; onClear: () => void };
}) => {
	const labelRef = useRef<HTMLDivElement>(null);
	const hasClear = Boolean(clear);
	const { editable } = usePropertyAccess(property);

	// Values keep clear of the label, however long either of them is
	// biome-ignore lint/correctness/useExhaustiveDependencies: width depends on the label and its button
	useLayoutEffect(() => {
		const element = labelRef.current;
		element?.parentElement?.style.setProperty(
			"--label-width",
			`${element.offsetWidth}px`
		);
	}, [label, hasClear]);

	// The editing rules don't let this role change it: don't offer it.
	if (!editable) return null;

	const isOverride = label.endsWith(OVERRIDE_MARK);
	const name = label.replace(OVERRIDE_MARK, "").trim();

	return (
		<Fieldset.Root
			data-orientation={orientation}
			data-slot="action"
			data-css-prop={property}
			className="group/action relative flex min-w-0 items-start data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:gap-1.5 data-[orientation=horizontal]:[&_input]:text-right data-[orientation=horizontal]:[&_input]:pl-[calc(var(--label-width,0px)+12px)]"
		>
			<div
				data-slot="action-controls"
				className="flex min-w-0 flex-1 items-center justify-end gap-1 group-data-[orientation=vertical]/action:justify-start"
			>
				<RowLabelContext.Provider value={name}>
					{children}
				</RowLabelContext.Provider>
			</div>
			<div
				ref={labelRef}
				className="pointer-events-none absolute top-0 left-2 z-20 flex h-7 max-w-[70%] items-center gap-1 group-data-[orientation=vertical]/action:static group-data-[orientation=vertical]/action:order-first group-data-[orientation=vertical]/action:h-4 group-data-[orientation=vertical]/action:pl-2"
			>
				<Fieldset.Legend className="truncate font-medium text-caption text-muted-foreground leading-none transition-colors select-none group-focus-within/action:text-foreground">
					{label}
				</Fieldset.Legend>
				{clear && (
					<ClearButton
						className="pointer-events-auto"
						hasValue={clear.hasValue}
						handleClear={clear.onClear}
						label={isOverride ? `Reset ${name} to inherited` : `Clear ${name}`}
					/>
				)}
			</div>
		</Fieldset.Root>
	);
};
