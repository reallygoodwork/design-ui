import { ThemeProvider } from "@design-ui/react";
import React from "react";
import ReactDOM from "react-dom/client";
import "../../src/index.css";
import { installVirtualClock } from "../kit";
import { LayoutVideo } from "./LayoutVideo";

// ?record hands time to the recorder: it steps the clock one frame at a
// time and screenshots each, so every frame of the video is exact
const recording = new URLSearchParams(location.search).has("record");
if (recording) {
	installVirtualClock({ fps: 60 });
	document.documentElement.dataset.recording = "";
}

// Geist first, so the first frames are not a fallback font swapping out
await Promise.all(
	["400 13px Geist", "500 13px Geist", "400 11px Geist Mono"].map((font) =>
		document.fonts.load(font)
	)
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider defaultTheme="light" storageKey="video-theme">
			<main id="example" className="video-host">
				<LayoutVideo />
			</main>
		</ThemeProvider>
	</React.StrictMode>
);
