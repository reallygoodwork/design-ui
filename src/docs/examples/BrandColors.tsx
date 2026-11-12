import { DesignAction } from "../../components/DesignAction";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";

const brand = ["#155dfc", "#0f9d76", "#f5a524", "#18181b"];

export const BrandColors = () => {
	const { value, setValue } = useBreakpointCss("--background-color");

	return (
		<DesignAction label="Brand">
			{brand.map((color) => (
				<button
					key={color}
					type="button"
					aria-label={`Use ${color}`}
					aria-pressed={value === color}
					className="size-6 rounded-full outline-offset-2 aria-pressed:outline-2 aria-pressed:outline-foreground"
					style={{ background: color }}
					onClick={() => setValue(color)}
				/>
			))}
		</DesignAction>
	);
};
