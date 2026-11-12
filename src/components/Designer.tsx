import type { ReactNode } from "react";
import { DesignerProvider } from "../context/DesignerContext";
import { AgentLinkProvider } from "../hooks/useAgentLink";
import { AnnotationsProvider } from "../hooks/useAnnotations";
import { ChangeLogProvider } from "../hooks/useChangeLog";
import { FrameRegistryProvider } from "../hooks/useFrameRegistry";
import { useKeybindings } from "../hooks/useKeybindings";
import { TokensProvider } from "../hooks/useTokens";
import type { Annotation } from "../lib/annotations";
import type { ChangeEntry } from "../lib/changeLog";
import { frameLayerType } from "../lib/layers/frame";
import { imageLayerType } from "../lib/layers/image";
import { textLayerType } from "../lib/layers/text";
import type { Breakpoint, CSSVars, Layer, LayerType } from "../lib/Types";
import type { Token, TokenDimensions } from "../lib/tokens";
import { AddLayerDialog } from "./AddLayerDialog";
import { FontLoader } from "./FontLoader";
import { TokenStyles } from "./tokens/TokenStyles";

/**
 * Props for the `Designer` component.
 */
type DesignerProps = {
	/**
	 * The content of the designer.
	 */
	children: ReactNode;
	/**
	 * The initial layers for uncontrolled mode.
	 */
	defaultLayers?: Layer[];
	/**
	 * The current layers for controlled mode.
	 */
	layers?: Layer[];
	/**
	 * The layer types for the designer.
	 */
	layerTypes?: LayerType[];
	/**
	 * Callback for when the layers change in controlled mode.
	 */
	onLayersChange?: (layers: Layer[]) => void;
	/**
	 * The breakpoints (responsive frames) for the designer.
	 */
	breakpoints?: Breakpoint[];
	/**
	 * Shared document-level styles (like body styles).
	 */
	frameStyles?: CSSVars;
	/**
	 * Design tokens layers can use as `var(--token-name)`.
	 */
	tokens?: readonly Token[];
	/**
	 * Called with the whole token set after it's edited in the Tokens pane.
	 */
	onTokensChange?: (tokens: readonly Token[]) => void;
	/**
	 * Called with all dimensions after themes or modes are added, renamed or removed.
	 */
	onTokenDimensionsChange?: (dimensions: TokenDimensions) => void;
	/**
	 * Comments, notes, decisions and tasks to start with.
	 */
	annotations?: Annotation[];
	/**
	 * Called with all annotations after one is added, answered or resolved.
	 */
	onAnnotationsChange?: (annotations: Annotation[]) => void;
	/**
	 * Called with the whole change log after each change, to save or sync it.
	 */
	onChangeLogChange?: (entries: ChangeEntry[]) => void;
	/**
	 * An agent's WebSocket, e.g. the MCP server's `ws://localhost:8790`. The
	 * agent can then read the design and its tasks and make changes.
	 */
	agentUrl?: string;
	/**
	 * The modes tokens vary by besides breakpoint, such as
	 * `{ theme: ["light", "dark"] }`. The first value of each is the default.
	 */
	tokenDimensions?: TokenDimensions;
};

/**
 * Inner component that uses context hooks - must be rendered inside DesignerProvider.
 */
const DesignerInner = ({ children }: { children: ReactNode }) => {
	useKeybindings();

	return (
		<FrameRegistryProvider>
			<FontLoader />
			<TokenStyles />
			<div
				data-slot="designer"
				className="ds group/ds relative flex h-full min-h-32 w-full flex-col"
			>
				<div
					data-slot="designer-inner"
					className="relative z-10 flex h-full w-full flex-1 flex-col bg-muted data-[mounted=true]:z-50"
				>
					{children}
				</div>
				<AddLayerDialog />
			</div>
		</FrameRegistryProvider>
	);
};

/**
 * The main container for the designer.
 */
export const Designer = ({
	children,
	defaultLayers,
	layers,
	onLayersChange,
	layerTypes,
	breakpoints,
	frameStyles,
	tokens,
	tokenDimensions,
	onTokensChange,
	onTokenDimensionsChange,
	annotations,
	onAnnotationsChange,
	onChangeLogChange,
	agentUrl,
}: DesignerProps) => {
	const allLayerTypes = [
		textLayerType,
		imageLayerType,
		frameLayerType,
		...(layerTypes || []),
	];

	return (
		<DesignerProvider
			defaultLayers={defaultLayers}
			layers={layers}
			onLayersChange={onLayersChange}
			defaultLayerTypes={allLayerTypes}
			breakpoints={breakpoints}
			frameStyles={frameStyles}
		>
			<ChangeLogProvider onChange={onChangeLogChange}>
				<TokensProvider
					tokens={tokens}
					dimensions={tokenDimensions}
					onTokensChange={onTokensChange}
					onDimensionsChange={onTokenDimensionsChange}
				>
					<AnnotationsProvider
						initialAnnotations={annotations}
						onChange={onAnnotationsChange}
					>
						<AgentLinkProvider url={agentUrl}>
							<DesignerInner>{children}</DesignerInner>
						</AgentLinkProvider>
					</AnnotationsProvider>
				</TokensProvider>
			</ChangeLogProvider>
		</DesignerProvider>
	);
};
