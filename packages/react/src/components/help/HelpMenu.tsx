import { Menu } from "@base-ui/react/menu";
import {
	IconBook,
	IconHelpCircle,
	IconPlugConnected,
	IconSparkles,
} from "@tabler/icons-react";
import { useAgentLink } from "../../hooks/useAgentLink";
import { cn } from "../../lib/cn";
import { useHelp } from "./HelpProvider";

const itemClass =
	"flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-control outline-none select-none data-highlighted:bg-hover data-highlighted:text-hover-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground";

/** Opens agent setup. Says so plainly until one is connected. */
export const ConnectAgentButton = () => {
	const { status } = useAgentLink();
	const { openConnectAgent } = useHelp();
	const connected = status === "connected";
	return (
		<button
			type="button"
			onClick={openConnectAgent}
			className={
				connected
					? "inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-control hover:bg-hover"
					: "inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 font-medium text-background text-control hover:opacity-90"
			}
		>
			{connected ? (
				<span
					aria-hidden="true"
					className="size-1.5 rounded-full bg-cat-image"
				/>
			) : (
				<IconPlugConnected className="size-3.5" aria-hidden="true" />
			)}
			{connected ? "Agent connected" : "Connect an agent"}
		</button>
	);
};

/** The way back to the tour, the docs and agent setup. */
export const HelpMenu = () => {
	const { openWelcome, openConnectAgent } = useHelp();
	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label="Help"
				className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground data-popup-open:bg-hover"
			>
				<IconHelpCircle className="size-4" aria-hidden="true" />
			</Menu.Trigger>
			<Menu.Portal className="ds">
				<Menu.Positioner sideOffset={6} align="end" className="z-50">
					<Menu.Popup
						className={cn("ds-popup ds-surface ds min-w-56 p-1 font-sans")}
					>
						<Menu.Item className={itemClass} onClick={openWelcome}>
							<IconSparkles aria-hidden="true" />
							Show welcome tour
						</Menu.Item>
						<Menu.Item className={itemClass} onClick={openConnectAgent}>
							<IconPlugConnected aria-hidden="true" />
							Connect an agent
						</Menu.Item>
						<Menu.Separator className="my-1 h-px bg-border" />
						<Menu.LinkItem
							className={itemClass}
							href="/"
							target="_top"
							closeOnClick
						>
							<IconBook aria-hidden="true" />
							Read the Design UI docs
						</Menu.LinkItem>
						<Menu.LinkItem
							className={itemClass}
							href="/#agents"
							target="_top"
							closeOnClick
						>
							<IconBook aria-hidden="true" />
							Read the agent guide
						</Menu.LinkItem>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};
