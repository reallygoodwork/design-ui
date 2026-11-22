import { createContext, type ReactNode, useContext, useState } from "react";
import { ConnectAgentDialog } from "./ConnectAgentDialog";
import { WelcomeDialog } from "./WelcomeDialog";

type Help = {
	openWelcome: () => void;
	openConnectAgent: () => void;
};

const HelpContext = createContext<Help>({
	openWelcome: () => {},
	openConnectAgent: () => {},
});

const SEEN_KEY = "design-ui:welcome-seen";

/**
 * First visit only, and never inside the docs page's embedded editor, where a
 * dialog would cover the example the reader came to see.
 */
const shouldShowWelcome = () => {
	if (window.self !== window.top) return false;
	try {
		return localStorage.getItem(SEEN_KEY) === null;
	} catch {
		return false;
	}
};

const markWelcomeSeen = () => {
	try {
		localStorage.setItem(SEEN_KEY, "1");
	} catch {
		// Private windows can block storage. The guide just shows again next time.
	}
};

/** Holds the welcome guide and the agent setup dialog, so any control can open them. */
export const HelpProvider = ({ children }: { children: ReactNode }) => {
	const [welcomeOpen, setWelcomeOpen] = useState(shouldShowWelcome);
	const [connectOpen, setConnectOpen] = useState(false);

	return (
		<HelpContext.Provider
			value={{
				openWelcome: () => setWelcomeOpen(true),
				openConnectAgent: () => setConnectOpen(true),
			}}
		>
			{children}
			<WelcomeDialog
				open={welcomeOpen}
				onOpenChange={(open) => {
					setWelcomeOpen(open);
					if (!open) markWelcomeSeen();
				}}
				onConnectAgent={() => {
					setWelcomeOpen(false);
					markWelcomeSeen();
					setConnectOpen(true);
				}}
			/>
			<ConnectAgentDialog open={connectOpen} onOpenChange={setConnectOpen} />
		</HelpContext.Provider>
	);
};

export const useHelp = () => useContext(HelpContext);
