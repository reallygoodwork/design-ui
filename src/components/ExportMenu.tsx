import { Menu } from "@base-ui/react/menu";
import { exportHtml, exportPage } from "@design-ui/core";
import {
	IconBraces,
	IconDownload,
	IconFileCode,
	IconHtml,
} from "@tabler/icons-react";
import { useDesignerApi } from "../hooks/useDesignerApi";

const download = (name: string, text: string, type: string) => {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
};

/** The web fonts the editor has loaded for the design, so the page uses them too. */
const fontLinks = () =>
	[
		...document.querySelectorAll<HTMLLinkElement>(
			'link[rel="stylesheet"][href*="fonts.googleapis.com"]'
		),
	]
		.map((link) => `<link rel="stylesheet" href="${link.href}">`)
		.join("\n");

const itemClass =
	"flex cursor-default items-center gap-2 rounded px-2 py-1.5 text-control outline-none select-none data-highlighted:bg-hover data-highlighted:text-hover-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground";

/** Saves the design as JSON, as HTML and CSS files, or as one page. */
export const ExportMenu = () => {
	const { exportDocument } = useDesignerApi();
	return (
		<Menu.Root>
			<Menu.Trigger className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-control text-muted-foreground hover:bg-hover hover:text-foreground data-popup-open:bg-hover">
				<IconDownload aria-hidden="true" className="size-3.5" />
				Export
			</Menu.Trigger>
			<Menu.Portal>
				<Menu.Positioner sideOffset={6} align="end" className="z-50">
					<Menu.Popup className="ds-popup ds-surface ds min-w-60 p-1 font-sans">
						<Menu.Item
							className={itemClass}
							onClick={() =>
								download(
									"design.html",
									exportPage(exportDocument(), { head: fontLinks() }),
									"text/html"
								)
							}
						>
							<IconHtml aria-hidden="true" />
							Download a web page
						</Menu.Item>
						<Menu.Item
							className={itemClass}
							onClick={() => {
								const { html, css } = exportHtml(exportDocument());
								download("design.html", `${html}\n`, "text/html");
								download("design.css", `${css}\n`, "text/css");
							}}
						>
							<IconFileCode aria-hidden="true" />
							Download HTML and CSS files
						</Menu.Item>
						<Menu.Separator className="my-1 h-px bg-border" />
						<Menu.Item
							className={itemClass}
							onClick={() =>
								download(
									"design.json",
									`${JSON.stringify(exportDocument(), null, 2)}\n`,
									"application/json"
								)
							}
						>
							<IconBraces aria-hidden="true" />
							Download the design file (JSON)
						</Menu.Item>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
};
