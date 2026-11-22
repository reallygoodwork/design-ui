import {
	allModes,
	BREAKPOINT_DIMENSION,
	checkTokens,
	indexTokens,
	matchingToken,
	resolveToken,
	sortBreakpointsByWidth,
	type Token,
	type TokenDimensions,
	type TokenIssue,
	type TokenMode,
	type TokenType,
	tokenFromCssValue,
} from "@design-ui/core";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useChangeLog } from "./useChangeLog";
import { useDesignerSelector } from "./useDesignerSelector";

/** A token shown on one layer property before it's applied. */
export type TokenPreview = {
	layerId: string;
	cssProperty: string;
	path: string;
};

type TokensStore = {
	tokens: readonly Token[];
	/** Replaces the token set. Not part of layer undo history. */
	setTokens: (update: (tokens: readonly Token[]) => readonly Token[]) => void;
	/** Replaces tokens and dimensions with saved ones, without logging a change. */
	loadTokens: (tokens: readonly Token[], dimensions: TokenDimensions) => void;
	dimensions: TokenDimensions;
	/** Replaces the dimensions (themes, brands…). Not part of layer undo history. */
	setDimensions: (
		update: (dimensions: TokenDimensions) => TokenDimensions
	) => void;
	/** Whether the token table under the canvas is open. */
	tableOpen: boolean;
	setTableOpen: (open: boolean) => void;
	/** Whether the token panel fills the whole middle column, over the canvas. */
	tableMaximized: boolean;
	setTableMaximized: (maximized: boolean) => void;
	/** The value of each dimension the canvas is showing. */
	mode: TokenMode;
	setMode: (dimension: string, value: string) => void;
	/** Breakpoint ids, smallest first: the `breakpoint` dimension's order. */
	breakpointOrder: string[];
	issues: TokenIssue[];
	/** A token whose users are outlined on the canvas. */
	hover: string | null;
	setHover: (path: string | null) => void;
	preview: TokenPreview | null;
	setPreview: (preview: TokenPreview | null) => void;
};

const EMPTY: readonly Token[] = [];
const NO_DIMENSIONS: TokenDimensions = {};

const TokensContext = createContext<TokensStore | null>(null);

export const TokensProvider = ({
	tokens: initialTokens = EMPTY,
	dimensions: initialDimensions = NO_DIMENSIONS,
	onTokensChange,
	onDimensionsChange,
	children,
}: {
	/** The starting tokens. Edits after that live here. */
	tokens?: readonly Token[];
	/** The starting dimensions. Edits after that live here. */
	dimensions?: TokenDimensions;
	onTokensChange?: (tokens: readonly Token[]) => void;
	onDimensionsChange?: (dimensions: TokenDimensions) => void;
	children: ReactNode;
}) => {
	const [dimensions, setDimensionState] = useState(initialDimensions);
	const onDimensionsRef = useRef(onDimensionsChange);
	onDimensionsRef.current = onDimensionsChange;
	const setDimensions = useCallback(
		(update: (dimensions: TokenDimensions) => TokenDimensions) =>
			setDimensionState((prev) => {
				const next = update(prev);
				queueMicrotask(() => onDimensionsRef.current?.(next));
				return next;
			}),
		[]
	);
	const [tableOpen, setTableOpenState] = useState(false);
	const [tableMaximized, setTableMaximized] = useState(false);
	// Closing always comes back to the canvas next time.
	const setTableOpen = useCallback((open: boolean) => {
		setTableOpenState(open);
		if (!open) setTableMaximized(false);
	}, []);
	const [tokens, setTokenState] = useState(initialTokens);
	const onChangeRef = useRef(onTokensChange);
	onChangeRef.current = onTokensChange;
	const setTokens = useCallback(
		(update: (tokens: readonly Token[]) => readonly Token[]) =>
			setTokenState((prev) => {
				const next = update(prev);
				// Report after React settles, not during the state update.
				queueMicrotask(() => onChangeRef.current?.(next));
				return next;
			}),
		[]
	);
	// Token and mode edits go in the change log. Compared after each render,
	// since StrictMode runs state updaters twice.
	const { logTokens, logDimensions } = useChangeLog();
	const seen = useRef({ tokens: initialTokens, dimensions: initialDimensions });
	useEffect(() => {
		if (seen.current.tokens !== tokens) logTokens(seen.current.tokens, tokens);
		if (seen.current.dimensions !== dimensions)
			logDimensions(seen.current.dimensions, dimensions);
		seen.current = { tokens, dimensions };
	}, [tokens, dimensions, logTokens, logDimensions]);

	// Shows saved tokens as they are: not an edit, so not logged.
	const loadTokens = useCallback(
		(next: readonly Token[], nextDimensions: TokenDimensions) => {
			seen.current = { tokens: next, dimensions: nextDimensions };
			setTokenState(next);
			setDimensionState(nextDimensions);
		},
		[]
	);

	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const breakpointOrder = useMemo(
		() => sortBreakpointsByWidth(breakpoints).map((bp) => bp.id),
		[breakpoints]
	);
	const [chosen, setChosen] = useState<TokenMode>({});
	const [hover, setHover] = useState<string | null>(null);
	const [preview, setPreview] = useState<TokenPreview | null>(null);

	const mode = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(dimensions).map(([dimension, values]) => [
					dimension,
					values.includes(chosen[dimension]) ? chosen[dimension] : values[0],
				])
			),
		[dimensions, chosen]
	);

	const issues = useMemo(
		() => checkTokens(tokens, dimensions, breakpointOrder),
		[tokens, dimensions, breakpointOrder]
	);

	const store = useMemo<TokensStore>(
		() => ({
			tokens,
			setTokens,
			loadTokens,
			dimensions,
			setDimensions,
			tableOpen,
			setTableOpen,
			tableMaximized,
			setTableMaximized,
			mode,
			setMode: (dimension, value) =>
				setChosen((prev) => ({ ...prev, [dimension]: value })),
			breakpointOrder,
			issues,
			hover,
			setHover,
			preview,
			setPreview,
		}),
		[
			tokens,
			setTokens,
			dimensions,
			setDimensions,
			tableOpen,
			setTableOpen,
			tableMaximized,
			mode,
			breakpointOrder,
			issues,
			hover,
			preview,
			loadTokens,
		]
	);

	return (
		<TokensContext.Provider value={store}>{children}</TokensContext.Provider>
	);
};

// Outside a Designer (some tests mount a bare DesignerProvider): no tokens.
const NO_TOKENS: TokensStore = {
	tokens: EMPTY,
	setTokens: () => {},
	loadTokens: () => {},
	dimensions: NO_DIMENSIONS,
	setDimensions: () => {},
	tableOpen: false,
	setTableOpen: () => {},
	tableMaximized: false,
	setTableMaximized: () => {},
	mode: {},
	setMode: () => {},
	breakpointOrder: [],
	issues: [],
	hover: null,
	setHover: () => {},
	preview: null,
	setPreview: () => {},
};

export const useTokens = (): TokensStore =>
	useContext(TokensContext) ?? NO_TOKENS;

/** The mode a breakpoint frame renders in. */
export const modeAt = (
	store: Pick<TokensStore, "mode">,
	breakpointId?: string | null
): TokenMode =>
	breakpointId
		? { ...store.mode, [BREAKPOINT_DIMENSION]: breakpointId }
		: store.mode;

/**
 * What a layer value means in token terms, at a breakpoint: the token it
 * points at and that token's value, or the token a raw value matches.
 */
export const useTokenValue = (
	value: string | undefined,
	type: TokenType,
	breakpointId?: string | null
) => {
	const store = useTokens();
	return useMemo(() => {
		const token = tokenFromCssValue(value, store.tokens);
		const mode = modeAt(store, breakpointId ?? store.breakpointOrder[0]);
		const resolution = token
			? resolveToken(
					token.path,
					mode,
					indexTokens(store.tokens),
					store.breakpointOrder
				)
			: undefined;
		const match =
			!token && value
				? matchingToken(
						value,
						type,
						store.tokens,
						[mode, ...allModes(store.dimensions)],
						store.breakpointOrder
					)
				: undefined;
		return {
			token,
			/** The token's value here, or the raw value when there's no token. */
			resolved: token ? resolution?.value : value,
			broken: Boolean(resolution?.error),
			match,
			hasTokens: store.tokens.some((t) => t.type === type),
		};
	}, [value, type, breakpointId, store]);
};
