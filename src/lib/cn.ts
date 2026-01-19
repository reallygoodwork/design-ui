import { twMerge } from "tailwind-merge";

export const cn = (...classes: (string | undefined | false | null)[]) => {
	return twMerge(classes.filter(Boolean).join(" ").trim());
};
