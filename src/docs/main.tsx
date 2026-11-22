import { ThemeProvider } from "@design-ui/react";
import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import "./docs.css";
import { DocsPage } from "./DocsPage";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider>
			<DocsPage />
		</ThemeProvider>
	</React.StrictMode>
);
