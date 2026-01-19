import { NumericActionControl } from "./NumericActionControl";

export const ActionFontSize = () => {
  return (
    <NumericActionControl
      cssProperty="--font-size"
      label="Size"
      defaultValue={16}
      units={["px", "rem", "em"]}
      showSteppers={false}
      orientation="horizontal"
    />
  );
};
