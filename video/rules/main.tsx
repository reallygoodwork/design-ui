import React from "react";
import ReactDOM from "react-dom/client";
import { installVirtualClock } from "../kit";
import { RulesVideo } from "./RulesVideo";

// ?record hands time to the recorder: it steps the clock one frame at a
// time and screenshots each, so every frame of the video is exact
const recording = new URLSearchParams(location.search).has("record");
if (recording) {
	installVirtualClock({ fps: 60 });
	document.documentElement.dataset.recording = "";
}

// Geist first, so the first frames are not a fallback font swapping out
await Promise.all(
	[
		"400 13px Geist",
		"600 13px Geist",
		"700 28px Geist",
		"400 11px Geist Mono",
	].map((font) => document.fonts.load(font))
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<main id="example" className="video-host">
			<RulesVideo />
		</main>
	</React.StrictMode>
);
