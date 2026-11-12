import {
	applyCssVars as applyCssVarsToStyle,
	type SupportedCssProperty,
} from "@design-ui/core";
import type { CSSProperties } from "react";

export {
	getCssPropertyName,
	isSupportedCssVar,
	type SupportedCssProperty,
	withoutTransitions,
} from "@design-ui/core";

/** `applyCssVars` from core, typed for React's `style` prop. */
export const applyCssVars = (
	cssVars: Record<string, string> | undefined,
	supportedProperties?: SupportedCssProperty[]
): CSSProperties =>
	applyCssVarsToStyle(cssVars, supportedProperties) as CSSProperties;
