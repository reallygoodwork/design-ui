// Records a stage page to an MP4, one exact frame at a time.
//
//   node video/record.mjs [page] [--out file.mp4] [--scale n] [--fps 60]
//
// The scale defaults to whatever makes the video 1080 wide.
//
// The page runs with ?record, which installs the stageshow kit's virtual
// clock: nothing moves until this script steps it by 1/fps, so the video has
// no dropped or doubled frames however slow the screenshots are. It records
// exactly one loop: from the script's first beat to the moment it starts
// again. Needs the dev server (`bun run dev`) and ffmpeg.

import { spawn } from "node:child_process";
import { homedir } from "node:os";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? fallback : args[i + 1];
};
const page = args[0]?.startsWith("http")
	? args[0]
	: "http://localhost:5173/video/layout/";
const out = flag("out", "video/out/layout.mp4");
const fps = Number(flag("fps", "60"));
const maxSeconds = Number(flag("max", "40"));

// playwright-core from this project if it has it, else from the stageshow skill
const { chromium } = await import("playwright-core").catch(
	() =>
		import(
			`${homedir()}/.claude/skills/stageshow/node_modules/playwright-core/index.mjs`
		)
);

const browser = await chromium.launch({ channel: "chrome" });
const url = new URL(page);
url.searchParams.set("record", "");

// The stage's design size sets the viewport; the scale turns it into pixels
const probe = await browser.newPage();
await probe.goto(url.href);
await probe.waitForSelector(".ss-stage");
const size = await probe.evaluate(() => {
	const r = document.querySelector(".ss-stage").getBoundingClientRect();
	return { width: Math.round(r.width), height: Math.round(r.height) };
});
await probe.close();

const tab = await browser.newPage({
	viewport: size,
	deviceScaleFactor: Number(flag("scale", String(1080 / size.width))),
});
await tab.goto(url.href);
await tab.waitForFunction(() => window.__stageshow?.clock);
await tab.waitForSelector(".ss-stage");

const { mkdirSync } = await import("node:fs");
const { dirname } = await import("node:path");
mkdirSync(dirname(out), { recursive: true });
const ffmpeg = spawn(
	"ffmpeg",
	[
		"-y",
		"-loglevel",
		"error",
		"-f",
		"image2pipe",
		"-framerate",
		String(fps),
		"-i",
		"-",
		"-c:v",
		"libx264",
		"-preset",
		"slow",
		"-crf",
		"14",
		"-pix_fmt",
		"yuv420p",
		"-movflags",
		"+faststart",
		out,
	],
	{ stdio: ["pipe", "inherit", "inherit"] }
);

const clip = await tab.evaluate(() => {
	const r = document.querySelector(".ss-stage").getBoundingClientRect();
	return { x: r.x, y: r.y, width: r.width, height: r.height };
});

let frames = 0;
let started = false;
for (; frames < maxSeconds * fps; ) {
	await tab.evaluate(() => window.__stageshow.clock.step());
	const loops = await tab.evaluate(() => window.__loops ?? 0);
	if (loops === 0) continue; // the stage is still mounting
	if (loops > 1) break; // the loop came round: stop on its seam
	started = true;
	const png = await tab.screenshot({ clip, type: "png" });
	if (!ffmpeg.stdin.write(png)) {
		await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
	}
	frames++;
	if (frames % fps === 0) process.stdout.write(`${frames / fps}s `);
}
ffmpeg.stdin.end();
await new Promise((resolve) => ffmpeg.on("close", resolve));
await browser.close();
console.log(
	`\n${started ? frames : 0} frames, ${(frames / fps).toFixed(2)}s -> ${out}`
);
