import {
	IconBrandGithub,
	IconFrame,
	IconTypography,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { cn } from "../lib/cn";

export type NavItem = { id: string; label: string; children?: NavItem[] };

const Row = ({
	item,
	depth,
	activeId,
}: {
	item: NavItem;
	depth: number;
	activeId: string;
}) => {
	const Icon = depth === 0 ? IconFrame : IconTypography;
	const isActive = item.id === activeId;
	return (
		<>
			<a
				href={`#${item.id}`}
				aria-current={isActive ? "location" : undefined}
				style={{ paddingLeft: 8 + depth * 16 }}
				className={cn(
					"flex h-7 items-center gap-2 rounded-md pr-2 text-[13px] text-foreground/75 hover:bg-background/70 hover:text-foreground",
					isActive &&
						"bg-(--docs-accent) text-white hover:bg-(--docs-accent) hover:text-white"
				)}
			>
				<Icon size={14} className="shrink-0 opacity-70" />
				<span className="truncate">{item.label}</span>
			</a>
			{item.children?.map((child) => (
				<Row
					key={child.id}
					item={child}
					depth={depth + 1}
					activeId={activeId}
				/>
			))}
		</>
	);
};

const flatten = (items: NavItem[]): NavItem[] =>
	items.flatMap((item) => [item, ...flatten(item.children ?? [])]);

export const GITHUB_URL = "https://github.com/reallygoodwork/design-ui";

/** The page's navigation, drawn like the editor's layer tree. */
export const Rail = ({ items }: { items: NavItem[] }) => {
	const [activeId, setActiveId] = useState(items[0].id);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) setActiveId(entry.target.id);
				}
			},
			{ rootMargin: "-15% 0px -75% 0px" }
		);
		for (const item of flatten(items)) {
			const element = document.getElementById(item.id);
			if (element) observer.observe(element);
		}
		return () => observer.disconnect();
	}, [items]);

	return (
		<aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto p-3 [scrollbar-width:none] lg:flex">
			<a href="#overview" className="px-2 py-2 font-semibold text-[15px]">
				Coral Design
			</a>
			<nav aria-label="On this page" className="mt-3 grid gap-px">
				{items.map((item) => (
					<Row key={item.id} item={item} depth={0} activeId={activeId} />
				))}
			</nav>
			<div className="mt-auto grid gap-1 pt-4 text-[13px]">
				<a
					href="/demo/"
					className="flex h-8 items-center justify-center rounded-md bg-foreground font-medium text-background"
				>
					Open the editor
				</a>
				<a
					href={GITHUB_URL}
					className="flex h-8 items-center justify-center gap-1.5 rounded-md text-foreground/75 hover:text-foreground"
				>
					<IconBrandGithub size={15} /> GitHub
				</a>
			</div>
		</aside>
	);
};
